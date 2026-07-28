const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const FacultyLeave = require('../models/FacultyLeave');
const Faculty = require('../models/Faculty');
const User = require('../models/user');

const BatchSubstitution = require('../models/BatchSubstitution');
const TeacherBatch = require('../models/TeacherBatch');

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

// @desc  Admin views the on-leave teacher's batches + faculty list, to assign substitutes
// @route GET /api/faculty-leaves/:id/batches
exports.getFacultyBatchesForLeave = async (req, res) => {
  try {
    const leave = await FacultyLeave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });

    const onLeaveUser = await User.findOne({ facultyId: leave.faculty, role: 'instructor' });
    if (!onLeaveUser) return res.status(404).json({ success: false, message: 'Faculty login account not found' });

    const batches = await TeacherBatch.find({ teacher: onLeaveUser._id, isActive: true })
      .populate('batch', 'batchName displayName startTime endTime')
      .lean();

    const facultyOptions = await User.find({ role: 'instructor', _id: { $ne: onLeaveUser._id } })
      .select('name facultyId')
      .lean();

    res.json({
      success: true,
      data: {
        batches: batches.filter(tb => tb.batch).map((tb) => ({
          batchId: tb.batch._id,
          batchName: tb.batch.displayName || tb.batch.batchName,
          timing: `${tb.batch.startTime} - ${tb.batch.endTime}`,
          studentCount: tb.assignedStudents.filter(s => s.isActive).length,
        })),
        facultyOptions,
      },
    });
  } catch (error) {
    console.error('Get faculty batches for leave error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc  Admin approves — assigns a substitute faculty PER BATCH, no shared password anymore
// @route PUT /api/faculty-leaves/:id/approve
// body: { assignments: [{ batchId, substituteFacultyUserId }] }
exports.approveLeave = async (req, res) => {
  try {
    const { assignments } = req.body;
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one batch assignment is required' });
    }

    const leave = await FacultyLeave.findById(req.params.id);
if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
if (leave.status !== 'pending') {
  return res.status(400).json({ success: false, message: `Request is already ${leave.status}` });
}

// Block approving a second leave for the same faculty while one is still active
const now = new Date();
const existingActiveLeave = await FacultyLeave.findOne({
  faculty: leave.faculty,
  status: 'approved',
  toDate: { $gte: now },
  _id: { $ne: leave._id },
});
if (existingActiveLeave) {
  return res.status(400).json({
    success: false,
    message: `This faculty already has an active approved leave until ${new Date(existingActiveLeave.toDate).toLocaleDateString('en-IN')}. Please end that leave first, or wait for it to complete.`,
  });
}

const onLeaveUser = await User.findOne({ facultyId: leave.faculty, role: 'instructor' });
    if (!onLeaveUser) return res.status(404).json({ success: false, message: 'Faculty login account not found' });

    const subDocs = await Promise.all(assignments.map(async (a) => {
      const subUser = await User.findById(a.substituteFacultyUserId).select('name');
      return BatchSubstitution.create({
        leave: leave._id,
        batch: a.batchId,
        onLeaveFacultyUser: onLeaveUser._id,
        substituteFacultyUser: a.substituteFacultyUserId,
        substituteFacultyName: subUser?.name || '',
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        isActive: true,
      });
    }));

    leave.status = 'approved';
    leave.approvedBy = req.user.id;
    leave.approvedDate = new Date();
    await leave.save();

    res.json({ success: true, message: 'Leave approved and substitutes assigned', data: { leave, substitutions: subDocs } });
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

exports.endLeaveNow = async (req, res) => {
  try {
    const leave = await FacultyLeave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    if (leave.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'This leave is not currently active' });
    }

    await BatchSubstitution.updateMany({ leave: leave._id, isActive: true }, { $set: { isActive: false } });

    // Mark as ended-as-of-now so future approve-checks (existingActiveLeave) don't
    // mistake this for a still-running leave
    leave.toDate = new Date();
    await leave.save();

    res.json({ success: true, message: 'Leave ended, substitute access revoked for all batches' });
  } catch (error) {
    console.error('End leave now error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.extendLeave = async (req, res) => {
  try {
    const { newToDate } = req.body;
    if (!newToDate) return res.status(400).json({ success: false, message: 'newToDate is required' });

    const leave = await FacultyLeave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    if (leave.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Only an active approved leave can be extended' });
    }
    if (new Date(newToDate) <= new Date(leave.toDate)) {
      return res.status(400).json({ success: false, message: 'New end date must be after the current end date' });
    }

    leave.toDate = newToDate;
    await leave.save();
    await BatchSubstitution.updateMany({ leave: leave._id, isActive: true }, { $set: { toDate: newToDate } });

    res.json({ success: true, message: 'Leave extended', data: leave });
  } catch (error) {
    console.error('Extend leave error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc  Report: every batch substitution (past + active), for the admin report page
// @route GET /api/faculty-leaves/batch-report
exports.getLeaveBatchReport = async (req, res) => {
  try {
    const { status } = req.query; // 'active' | 'ended' | undefined(all)
    const filter = {};
    if (status === 'active') filter.isActive = true;
    if (status === 'ended') filter.isActive = false;

    const rows = await BatchSubstitution.find(filter)
      .populate('batch', 'batchName displayName startTime endTime')
      .populate('onLeaveFacultyUser', 'name email')
      .populate('substituteFacultyUser', 'name email')
      .populate('leave', 'leaveType reason status')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get leave batch report error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};