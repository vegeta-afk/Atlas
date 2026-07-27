const crypto = require('crypto');
const FacultyAttendance = require('../models/FacultyAttendance');
const Faculty = require('../models/Faculty');
const User = require('../models/user');
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:admin@iitcomputerinstitute.example', // change to your real contact email
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const activeFacultyQRSessions = new Map();
const QR_TTL_MS = 30 * 1000;
const MIN_CHECKOUT_GAP_MINUTES = 60; // stop instant in+out farming

setInterval(() => {
  const now = Date.now();
  for (const [key, session] of activeFacultyQRSessions.entries()) {
    if (now > session.expiresAt) activeFacultyQRSessions.delete(key);
  }
}, 5 * 60 * 1000);

// Haversine distance in meters between two lat/lng points
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// @desc   Admin generates the rotating faculty QR (shown on a fixed reception device)
// @route  POST /api/faculty-attendance/qr/generate
// @access Admin only
exports.generateFacultyQR = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + QR_TTL_MS;

    activeFacultyQRSessions.set(`faculty_${today}`, { token, date: today, expiresAt });

    res.json({
      success: true,
      data: { qrData: JSON.stringify({ date: today, token }), date: today, expiresAt },
    });
  } catch (error) {
    console.error('Error generating faculty QR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};



// @desc   Faculty scans QR from their phone — first scan of the day = check-in, next = check-out
// @route  POST /api/faculty-attendance/qr/scan
// @access Instructor only
exports.scanFacultyQR = async (req, res) => {
  console.log('📷 SCAN ATTEMPT:', {
    userId: req.user?.id,
    role: req.user?.role,
    facultyId: req.user?.facultyId,
    body: req.body,
    time: new Date().toISOString(),
  });
  try {
    const { qrData, latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Location permission is required to mark attendance' });
    }

    let parsed;
    try {
      parsed = JSON.parse(qrData);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid QR code format' });
    }

    const { date, token } = parsed;
    const session = activeFacultyQRSessions.get(`faculty_${date}`);

    if (!session || session.token !== token || Date.now() > session.expiresAt) {
      return res.status(400).json({ success: false, message: 'QR code has expired. Ask admin to refresh it.' });
    }

    // ── GPS geofence check ──
    const instituteLat = parseFloat(process.env.INSTITUTE_LAT);
    const instituteLng = parseFloat(process.env.INSTITUTE_LNG);
    const allowedRadius = parseFloat(process.env.INSTITUTE_RADIUS_METERS || '150');

    const distance = getDistanceMeters(latitude, longitude, instituteLat, instituteLng);
    if (distance > allowedRadius) {
      return res.status(403).json({
        success: false,
        message: `You're ${Math.round(distance)}m from the institute — too far to mark attendance (allowed: ${allowedRadius}m).`,
      });
    }

    if (!req.user.facultyId) {
      return res.status(400).json({ success: false, message: 'This account is not linked to a faculty record' });
    }

    const facultyId = req.user.facultyId;
    const userId = req.user.id;

    const attendanceDate = new Date(date);
    const startOfDay = new Date(attendanceDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate); endOfDay.setHours(23, 59, 59, 999);

    let record = await FacultyAttendance.findOne({
      faculty: facultyId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    const nowTimeStr = new Date().toLocaleTimeString('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
});
    const faculty = await Faculty.findById(facultyId).select('facultyName');

    if (!record) {
      // ── CHECK-IN ──
      await FacultyAttendance.create({
        faculty: facultyId,
        user: userId,
        date: attendanceDate,
        checkInTime: nowTimeStr,
        checkInLocation: { lat: latitude, lng: longitude, distanceMeters: Math.round(distance) },
        status: 'present',
      });

      notifyAdminsOfCheckIn(faculty?.facultyName || 'A faculty member', nowTimeStr).catch((e) =>
        console.error('Push notify failed:', e)
      );

      return res.json({
        success: true,
        message: 'Checked in successfully!',
        data: { type: 'check-in', time: nowTimeStr, facultyName: faculty?.facultyName },
      });
    }

    if (record.checkInTime && !record.checkOutTime) {
      const [inH, inM] = record.checkInTime.split(':').map(Number);
      const checkInMinutes = inH * 60 + inM;
      const nowDate = new Date();
      const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

      if (nowMinutes - checkInMinutes < MIN_CHECKOUT_GAP_MINUTES) {
        return res.status(400).json({
          success: false,
          message: `Checked in at ${record.checkInTime}. Check-out unlocks ${MIN_CHECKOUT_GAP_MINUTES} minutes after check-in.`,
        });
      }

      // ── CHECK-OUT ──
      record.checkOutTime = nowTimeStr;
      record.checkOutLocation = { lat: latitude, lng: longitude, distanceMeters: Math.round(distance) };
      await record.save();

      return res.json({
        success: true,
        message: 'Checked out successfully!',
        data: { type: 'check-out', time: nowTimeStr, facultyName: faculty?.facultyName },
      });
    }

    return res.status(400).json({
      success: false,
      message: `Already checked in (${record.checkInTime}) and checked out (${record.checkOutTime}) today`,
    });
  } catch (error) {
    console.error('Error scanning faculty QR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Admin dashboard: today's faculty attendance
// @route  GET /api/faculty-attendance/today
// @access Admin only
exports.getTodayFacultyAttendance = async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const records = await FacultyAttendance.find({ date: { $gte: todayStart, $lte: todayEnd } })
      .populate('faculty', 'facultyName facultyNo photo')
      .lean();

    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Error fetching today faculty attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Frontend fetches this to know which public key to subscribe with
// @route  GET /api/faculty-attendance/vapid-public-key
exports.getVapidPublicKey = (req, res) => {
  res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY });
};

// @desc   Admin's browser registers itself to receive push notifications
// @route  POST /api/faculty-attendance/push-subscribe
// @access Admin only
exports.subscribePush = async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) {
      return res.status(400).json({ success: false, message: 'subscription is required' });
    }
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { pushSubscriptions: subscription } });
    res.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper — pushes a notification to every admin's registered browser subscriptions
async function notifyAdminsOfCheckIn(facultyName, time) {
  const admins = await User.find({ role: 'admin', pushSubscriptions: { $exists: true, $ne: [] } }).lean();
  const payload = JSON.stringify({
    title: 'Faculty Check-In',
    body: `${facultyName} checked in at ${time}`,
  });

  for (const admin of admins) {
    for (const sub of admin.pushSubscriptions || []) {
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err) {
        console.error(`Push failed for admin ${admin._id}:`, err.message);
        // A 410/404 here means that subscription is dead (browser data cleared, etc.) —
        // fine to leave it for now, just won't send there anymore.
      }
    }
  }
}