const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const FacultyLeave = require('../models/FacultyLeave');
const Faculty = require('../models/Faculty');
const User = require('../models/user');

function generateTempPassword() {
  return crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
}

// @desc  Faculty submits a leave request
// @route POST /api/faculty-leaves
exports.createLeaveRequest = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;
    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({ success: false, message: 'fromDate, toDate and reason are required' });
    }
    if (new Date(toDate) < new Date(fromDate)) {
      return res.status(400).json({ success: false, message: 'toDate cannot be before fromDate' });
    }
    if (!req.user.facultyId) {
      return res.status(400).json({ success: false, message: 'This account is not linked to a faculty record' });
    }

    const faculty = await Faculty.findById(req.user.facultyId).select('facultyName');

    const leave = await FacultyLeave.create({
      faculty: req.user.facultyId,
      user: req.user.id,
      facultyName: faculty?.facultyName || '',
      leaveType: leaveType || 'casual',
      fromDate,
      toDate,
      reason,
    });

    res.status(201).json({ success: true, message: 'Leave request submitted', data: leave });
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc  Faculty views their own leave history
// @route GET /api/faculty-leaves/me
exports.getMyLeaves = async (req, res) => {
  try {
    const leaves = await FacultyLeave.find({ faculty: req.user.facultyId })
      .sort({ createdAt: -1 })
      .select('-tempCredentials.passwordPlain'); // never show the temp password back to the faculty themselves
    res.json({ success: true, data: leaves });
  } catch (error) {
    console.error('Get my leaves error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc  Admin views all leave requests
// @route GET /api/faculty-leaves
exports.getAllLeaves = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const leaves = await FacultyLeave.find(filter)
      .populate('faculty', 'facultyName facultyNo email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: leaves });
  } catch (error) {
    console.error('Get all leaves error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc  Admin approves — generates the temporary substitute-login password
// @route PUT /api/faculty-leaves/:id/approve
exports.approveLeave = async (req, res) => {
  try {
    const leave = await FacultyLeave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${leave.status}` });
    }

    const user = await User.findOne({ facultyId: leave.faculty, role: 'instructor' });
    if (!user) return res.status(404).json({ success: false, message: 'Faculty login account not found' });

    const originalHash = user.password; // save the real teacher's current hash before overwriting

    const tempPassword = generateTempPassword();
    user.password = await bcrypt.hash(tempPassword, 10);
    await user.save();

    leave.status = 'approved';
    leave.approvedBy = req.user.id;
    leave.approvedDate = new Date();
    leave.tempCredentials = {
      username: user.email,
      passwordPlain: tempPassword,
      isActive: true,
      originalPasswordHash: originalHash,
    };
    await leave.save();

    res.json({
      success: true,
      message: 'Leave approved. Share these temporary credentials with the substitute faculty.',
      data: { leave, credentials: { username: user.email, password: tempPassword } },
    });
  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc  Admin rejects
// @route PUT /api/faculty-leaves/:id/reject
exports.rejectLeave = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const leave = await FacultyLeave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${leave.status}` });
    }

    leave.status = 'rejected';
    leave.rejectionReason = rejectionReason || '';
    leave.approvedBy = req.user.id;
    leave.approvedDate = new Date();
    await leave.save();

    res.json({ success: true, message: 'Leave rejected', data: leave });
  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Runs on a schedule (see server.js) — kills the temp password once the leave window has passed
exports.revokeExpiredLeaveCredentials = async () => {
  try {
    const now = new Date();
    const expiredLeaves = await FacultyLeave.find({
      status: 'approved',
      toDate: { $lt: now },
      'tempCredentials.isActive': true,
    }).select('+tempCredentials.originalPasswordHash');

    for (const leave of expiredLeaves) {
      const user = await User.findOne({ facultyId: leave.faculty, role: 'instructor' });
      if (user && leave.tempCredentials.originalPasswordHash) {
        user.password = leave.tempCredentials.originalPasswordHash; // restore the real teacher's original password
        await user.save();
      }
      leave.tempCredentials.isActive = false;
      leave.tempCredentials.passwordPlain = undefined;
      leave.tempCredentials.originalPasswordHash = undefined;
      await leave.save();
      console.log(`🔓 Restored original login for leave ${leave._id}`);
    }
  } catch (error) {
    console.error('Error revoking expired leave credentials:', error);
  }
};

// @desc  Admin manually ends an active leave early and restores original password
// @route PUT /api/faculty-leaves/:id/end-now
exports.endLeaveNow = async (req, res) => {
  try {
    const leave = await FacultyLeave.findById(req.params.id).select('+tempCredentials.originalPasswordHash');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    if (leave.status !== 'approved' || !leave.tempCredentials.isActive) {
      return res.status(400).json({ success: false, message: 'This leave has no active temp credentials' });
    }

    const user = await User.findOne({ facultyId: leave.faculty, role: 'instructor' });
    if (user && leave.tempCredentials.originalPasswordHash) {
      user.password = leave.tempCredentials.originalPasswordHash;
      await user.save();
    }

    leave.tempCredentials.isActive = false;
    leave.tempCredentials.passwordPlain = undefined;
    leave.tempCredentials.originalPasswordHash = undefined;
    await leave.save();

    res.json({ success: true, message: 'Leave ended, original password restored' });
  } catch (error) {
    console.error('End leave now error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc  Admin extends an already-approved leave's end date
// @route PUT /api/faculty-leaves/:id/extend
exports.extendLeave = async (req, res) => {
  try {
    const { newToDate } = req.body;
    if (!newToDate) {
      return res.status(400).json({ success: false, message: 'newToDate is required' });
    }

    const leave = await FacultyLeave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    if (leave.status !== 'approved' || !leave.tempCredentials.isActive) {
      return res.status(400).json({ success: false, message: 'Only an active approved leave can be extended' });
    }
    if (new Date(newToDate) <= new Date(leave.toDate)) {
      return res.status(400).json({ success: false, message: 'New end date must be after the current end date' });
    }

    leave.toDate = newToDate;
    await leave.save();

    res.json({ success: true, message: 'Leave extended', data: leave });
  } catch (error) {
    console.error('Extend leave error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};