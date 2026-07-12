// controllers/bridgeBatch.controller.js
const BridgeBatch = require('../models/BridgeBatch');
const Attendance = require('../models/Attendance');
const TopicCompletion = require('../models/TopicCompletion');
const Notification = require('../models/Notification');
const Student = require('../models/Student');
const Course = require('../models/Course');
const User = require('../models/user');
const TeacherBatch = require('../models/TeacherBatch');

// 1. Faculty requests a bridge batch for their student
// body: { parentBatchId, courseId, studentIds: [], tempFacultyId, selectedTopics: [{topicKey, topicName}], timeSlot }
exports.requestBridgeBatch = async (req, res) => {
  try {
    const { parentBatchId, courseId, studentIds, tempFacultyId, tempBatchId, selectedTopics, selectedSubtopics, timeSlot, reason } = req.body;
    const requestingFacultyId = req.user.id;

    if (!parentBatchId || !courseId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'parentBatchId, courseId, and studentIds are required' });
    }
    if (!tempFacultyId) {
      return res.status(400).json({ success: false, message: 'Please select a temp faculty' });
    }
    if (!Array.isArray(selectedTopics) || selectedTopics.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one pending topic' });
    }

    const [course, tempFacultyUser] = await Promise.all([
  Course.findById(courseId).select('courseFullName').lean(),
  User.findOne({ facultyId: tempFacultyId }).select('name').lean(),
]);

if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
if (!tempFacultyUser) return res.status(404).json({ success: false, message: 'Temp faculty (linked user account) not found' });

    const bridgeBatch = await BridgeBatch.create({
  parentBatchId,
  courseId,
  courseName: course.courseFullName,
  studentIds,
  tempBatchId,
  tempFacultyId: tempFacultyUser._id,
  tempFacultyName: tempFacultyUser.name,
  selectedTopics: (selectedTopics || []).map((t) => ({
    topicKey: t.topicKey,
    topicName: t.topicName,
    completed: false,
  })),
  selectedSubtopics: (selectedSubtopics || []).map((s) => ({
    subtopicKey: s.subtopicKey,
    subtopicName: s.subtopicName,
    completed: false,
  })),
  timeSlot: timeSlot || {},
  reason,
  status: 'pending',
  requestedBy: requestingFacultyId,
  createdBy: requestingFacultyId,
});

    res.status(201).json({ success: true, message: 'Bridge batch request submitted for admin approval', data: bridgeBatch });
  } catch (error) {
    console.error('Error in requestBridgeBatch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get bridge batches assigned to the logged-in temp faculty (for their dashboard)
exports.getMyBridgeBatches = async (req, res) => {
  try {
    const tempFacultyId = req.user.id;

    const bridgeBatches = await BridgeBatch.find({
      $or: [{ tempFacultyId: req.user.id }, { requestedBy: req.user.id }],
      status: { $in: ['pending', 'active', 'ready_to_merge'] },
    })
      .populate('studentIds', 'studentId fullName photo')
      .populate('parentBatchId', 'batchName displayName startTime endTime')
      .lean();

    res.status(200).json({ success: true, count: bridgeBatches.length, data: bridgeBatches });
  } catch (error) {
    console.error('Error in getMyBridgeBatches:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get single bridge batch detail (students + topics) — used by temp faculty's session screen
exports.getBridgeBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const bridgeBatch = await BridgeBatch.findById(id)
      .populate('studentIds', 'studentId fullName photo')
      .populate('parentBatchId', 'batchName displayName startTime endTime')
      .lean();

    if (!bridgeBatch) {
      return res.status(404).json({ success: false, message: 'Bridge batch not found' });
    }

    // Only the assigned temp faculty or an admin should see this — adjust role check as needed
    if (
      req.user.role !== 'admin' &&
      bridgeBatch.tempFacultyId.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized for this bridge batch' });
    }

    res.status(200).json({ success: true, data: bridgeBatch });
  } catch (error) {
    console.error('Error in getBridgeBatchById:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Mark attendance for a bridge session (temp faculty action)
// body: { bridgeBatchId, date, attendance: [{studentId, status, checkInTime, remarks}] }
exports.markBridgeAttendance = async (req, res) => {
  try {
    const { bridgeBatchId, date, attendance } = req.body;
    const tempFacultyId = req.user.id;
    const tempFacultyName = req.user.name || req.user.fullName;

    const bridgeBatch = await BridgeBatch.findById(bridgeBatchId);
    if (!bridgeBatch) {
      return res.status(404).json({ success: false, message: 'Bridge batch not found' });
    }
    if (bridgeBatch.tempFacultyId.toString() !== tempFacultyId.toString()) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this bridge batch' });
    }
    if (bridgeBatch.status === 'merged' || bridgeBatch.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This bridge batch is no longer active' });
    }

    const allowedStudentIds = bridgeBatch.studentIds.map((s) => s.toString());
    const invalid = attendance.filter((r) => !allowedStudentIds.includes(r.studentId));
    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${invalid.length} student(s) are not part of this bridge batch`,
      });
    }

    const attendanceDate = new Date(date);

    const operations = attendance.map((record) => ({
      updateOne: {
        filter: {
          student: record.studentId,
          teacher: tempFacultyId,
          batch: bridgeBatch.parentBatchId, // keeps it grouped under the same batch for reports
          date: attendanceDate,
        },
        update: {
          $set: {
            student: record.studentId,
            teacher: tempFacultyId,
            batch: bridgeBatch.parentBatchId,
            date: attendanceDate,
            status: record.status,
            courseType: 'bridge',
            bridgeBatchId: bridgeBatch._id,
            checkInTime: record.checkInTime || null,
            remarks: record.remarks || '',
            markedBy: tempFacultyId,
            markedByName: tempFacultyName,
          },
        },
        upsert: true,
      },
    }));

    const result = await Attendance.bulkWrite(operations);

    res.status(200).json({
      success: true,
      message: `Bridge attendance marked for ${attendance.length} student(s)`,
      data: { inserted: result.upsertedCount, modified: result.modifiedCount },
    });
  } catch (error) {
    console.error('Error in markBridgeAttendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Save which topics/subtopics were covered today (temp faculty action)
// body: { bridgeBatchId, date, completedTopicKeys: [], completedSubtopicKeys: [] }
exports.saveBridgeTopicCompletion = async (req, res) => {
  try {
    const { bridgeBatchId, date, completedTopicKeys, completedSubtopicKeys } = req.body;
    const tempFacultyId = req.user.id;

    const topicKeys = completedTopicKeys || [];
    const subtopicKeys = completedSubtopicKeys || [];

    if (topicKeys.length === 0 && subtopicKeys.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one topic or subtopic covered today' });
    }

    const bridgeBatch = await BridgeBatch.findById(bridgeBatchId);
    if (!bridgeBatch) {
      return res.status(404).json({ success: false, message: 'Bridge batch not found' });
    }
    if (bridgeBatch.tempFacultyId.toString() !== tempFacultyId.toString()) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this bridge batch' });
    }

    const validTopicKeys = new Set(bridgeBatch.selectedTopics.map((t) => t.topicKey));
    const invalidTopicKeys = topicKeys.filter((k) => !validTopicKeys.has(k));
    if (invalidTopicKeys.length > 0) {
      return res.status(400).json({ success: false, message: 'Some topics are not part of this bridge batch' });
    }

    const validSubtopicKeys = new Set(bridgeBatch.selectedSubtopics.map((s) => s.subtopicKey));
    const invalidSubtopicKeys = subtopicKeys.filter((k) => !validSubtopicKeys.has(k));
    if (invalidSubtopicKeys.length > 0) {
      return res.status(400).json({ success: false, message: 'Some subtopics are not part of this bridge batch' });
    }

    bridgeBatch.selectedTopics.forEach((t) => {
      if (topicKeys.includes(t.topicKey)) {
        t.completed = true;
        t.completedDate = new Date();
      }
    });
    bridgeBatch.selectedSubtopics.forEach((s) => {
      if (subtopicKeys.includes(s.subtopicKey)) {
        s.completed = true;
        s.completedDate = new Date();
      }
    });

    const wasActive = bridgeBatch.status === 'active';
    await bridgeBatch.save();

    await TopicCompletion.findOneAndUpdate(
      { batchId: bridgeBatch.parentBatchId, courseId: bridgeBatch.courseId, date: new Date(date) },
      {
        $set: { teacherId: tempFacultyId },
        $addToSet: {
          completedTopicKeys: { $each: topicKeys },
          completedSubtopicKeys: { $each: subtopicKeys },
          studentIds: { $each: bridgeBatch.studentIds },
        },
      },
      { upsert: true, new: true }
    );

    if (wasActive && bridgeBatch.status === 'ready_to_merge') {
      const students = await Student.find({ _id: { $in: bridgeBatch.studentIds } })
        .select('fullName')
        .lean();
      const studentNames = students.map((s) => s.fullName).join(', ');

      await Notification.create({
        type: 'bridge_ready_to_merge',
        recipientRole: 'admin',
        bridgeBatchId: bridgeBatch._id,
        studentIds: bridgeBatch.studentIds,
        message: `${studentNames} completed all bridge topics for ${bridgeBatch.courseName}. Ready to merge back into the main batch.`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bridge topics saved',
      data: { status: bridgeBatch.status },
    });
  } catch (error) {
    console.error('Error in saveBridgeTopicCompletion:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Admin: list bridge batches (for a dashboard/table view)
exports.getAllBridgeBatches = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const bridgeBatches = await BridgeBatch.find(filter)
      .populate('studentIds', 'studentId fullName')
      .populate('parentBatchId', 'batchName displayName')
      .populate('tempBatchId', 'batchName displayName')
      .populate('requestedBy', 'name')      // NEW
      .populate('tempFacultyId', 'name')    // NEW — in case tempFacultyName wasn't denormalized correctly
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: bridgeBatches.length, data: bridgeBatches });
  } catch (error) {
    console.error('Error in getAllBridgeBatches:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Admin: merge — finalizes the bridge batch, student now fully rejoins the main batch
exports.mergeBridgeBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const bridgeBatch = await BridgeBatch.findById(id);
    if (!bridgeBatch) {
      return res.status(404).json({ success: false, message: 'Bridge batch not found' });
    }
    if (bridgeBatch.status === 'merged') {
      return res.status(400).json({ success: false, message: 'Already merged' });
    }

    bridgeBatch.status = 'merged';
    bridgeBatch.mergedBy = adminId;
    bridgeBatch.mergedDate = new Date();
    await bridgeBatch.save();

    // Mark related notification(s) as read/resolved
    await Notification.updateMany(
      { bridgeBatchId: bridgeBatch._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ success: true, message: 'Student(s) merged back into main batch', data: bridgeBatch });
  } catch (error) {
    console.error('Error in mergeBridgeBatch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Admin: cancel a bridge batch (e.g. created by mistake)
exports.cancelBridgeBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const bridgeBatch = await BridgeBatch.findByIdAndUpdate(
      id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!bridgeBatch) {
      return res.status(404).json({ success: false, message: 'Bridge batch not found' });
    }
    res.status(200).json({ success: true, message: 'Bridge batch cancelled', data: bridgeBatch });
  } catch (error) {
    console.error('Error in cancelBridgeBatch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 9. Admin: get notifications (bell dropdown)
exports.getNotifications = async (req, res) => {
  try {
    const { isRead } = req.query;
    const filter = { recipientRole: 'admin' };
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    console.error('Error in getNotifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingTopicsForStudent = async (req, res) => {
  try {
    const { studentId, courseId } = req.query;
    if (!studentId || !courseId) {
      return res.status(400).json({ success: false, message: 'studentId and courseId are required' });
    }

    const course = await Course.findById(courseId).select('courseFullName syllabus').lean();
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const completions = await TopicCompletion.find({ courseId, studentIds: studentId })
      .select('completedTopicKeys completedSubtopicKeys')
      .lean();

    const completedTopicKeys = new Set();
    const completedSubtopicKeys = new Set();
    completions.forEach((c) => {
      (c.completedTopicKeys || []).forEach((k) => completedTopicKeys.add(k));
      (c.completedSubtopicKeys || []).forEach((k) => completedSubtopicKeys.add(k));
    });

    const topics = [];
    (course.syllabus || []).forEach((sem, sIdx) => {
      (sem.topics || []).forEach((topic, tIdx) => {
        const topicKey = `${sIdx}_${tIdx}`;
        topics.push({
          topicKey,
          topicName: topic.name,
          semesterName: sem.name,
          completed: completedTopicKeys.has(topicKey),
          subtopics: (topic.subtopics || []).map((sub, subIdx) => {
            const subtopicKey = `${sIdx}_${tIdx}_${subIdx}`;
            return {
              subtopicKey,
              subtopicName: sub.name,
              completed: completedSubtopicKeys.has(subtopicKey),
            };
          }),
        });
      });
    });

    res.json({ success: true, data: { courseName: course.courseFullName, topics } });
  } catch (error) {
    console.error('Error in getPendingTopicsForStudent:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: approve a pending bridge request -> becomes active
exports.approveBridgeBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const bridgeBatch = await BridgeBatch.findById(id);
    if (!bridgeBatch) return res.status(404).json({ success: false, message: 'Bridge batch not found' });
    if (bridgeBatch.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be approved' });
    }

    bridgeBatch.status = 'active';
    bridgeBatch.approvedBy = adminId;
    bridgeBatch.approvedDate = new Date();
    await bridgeBatch.save();

    res.status(200).json({ success: true, message: 'Bridge batch approved', data: bridgeBatch });
  } catch (error) {
    console.error('Error in approveBridgeBatch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: reject a pending bridge request
exports.rejectBridgeBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const bridgeBatch = await BridgeBatch.findById(id);
    if (!bridgeBatch) return res.status(404).json({ success: false, message: 'Bridge batch not found' });
    if (bridgeBatch.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be rejected' });
    }

    bridgeBatch.status = 'rejected';
    bridgeBatch.rejectedReason = reason || '';
    await bridgeBatch.save();

    res.status(200).json({ success: true, message: 'Bridge batch rejected', data: bridgeBatch });
  } catch (error) {
    console.error('Error in rejectBridgeBatch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// NEW: resolve a student's actual courseId + batchId (Student has no direct batchId field)
// query: ?studentId=
exports.getStudentBatchInfo = async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId is required' });
    }

    const student = await Student.findById(studentId).select('courseCode').lean();
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const teacherBatch = await TeacherBatch.findOne({
      'assignedStudents.student': studentId,
      isActive: true,
    }).select('batch').lean();

    res.json({
      success: true,
      data: {
        courseId: student.courseCode || null,
        batchId: teacherBatch?.batch || null,
      },
    });
  } catch (error) {
    console.error('Error in getStudentBatchInfo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// NEW: Get a bridge batch's students in the same response shape as a regular batch
// (so the frontend's existing student-attendance table can render it unchanged)
// GET /api/bridge-batch/:id/students?date=
exports.getBridgeBatchStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const bridgeBatch = await BridgeBatch.findById(id)
      .populate('studentIds', 'studentId fullName fatherName photo mobileNumber email')
      .populate('tempFacultyId', 'name')
      .lean();

    if (!bridgeBatch) {
      return res.status(404).json({ success: false, message: 'Bridge batch not found' });
    }

    if (req.user.role !== 'admin' && bridgeBatch.tempFacultyId._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this bridge batch' });
    }

    let attendanceMap = {};
    if (date) {
      const attendanceDate = new Date(date);
      const startOfDay = new Date(attendanceDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(attendanceDate);
      endOfDay.setHours(23, 59, 59, 999);

      const attendance = await Attendance.find({
        bridgeBatchId: id,
        date: { $gte: startOfDay, $lte: endOfDay },
      }).lean();

      attendance.forEach((a) => {
        attendanceMap[a.student.toString()] = { status: a.status, checkInTime: a.checkInTime };
      });
    }

    const students = (bridgeBatch.studentIds || []).map((s) => ({
  _id: s._id,
  studentId: s.studentId,
  fullName: s.fullName,
  fatherName: s.fatherName || 'N/A',
  photo: s.photo,
  contact: s.mobileNumber,
  email: s.email,
  courseId: bridgeBatch.courseId,       // NEW
  courseName: bridgeBatch.courseName,   // NEW
  courses: [bridgeBatch.courseName],
  batchTiming: bridgeBatch.timeSlot?.startTime && bridgeBatch.timeSlot?.endTime
    ? `${bridgeBatch.timeSlot.startTime} - ${bridgeBatch.timeSlot.endTime}`
    : 'N/A',
  todayStatus: attendanceMap[s._id.toString()]?.status || 'not_marked',
  todayCheckInTime: attendanceMap[s._id.toString()]?.checkInTime || '',
}));

    res.json({
      success: true,
      data: {
        faculty: { _id: bridgeBatch.tempFacultyId._id, name: bridgeBatch.tempFacultyId.name },
        batch: {
          _id: bridgeBatch._id,
          name: bridgeBatch.courseName,
          displayName: bridgeBatch.courseName,
          timing: bridgeBatch.timeSlot?.startTime && bridgeBatch.timeSlot?.endTime
            ? `${bridgeBatch.timeSlot.startTime} - ${bridgeBatch.timeSlot.endTime}`
            : 'N/A',
          roomNumber: 'Bridge Batch',
          subject: bridgeBatch.courseName,
          isTemporary: true,
        },
        students,
        totalStudents: students.length,
      },
    });
  } catch (error) {
    console.error('Error in getBridgeBatchStudents:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: delete a rejected/cancelled bridge batch request permanently
exports.deleteBridgeBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const bridgeBatch = await BridgeBatch.findById(id);
    if (!bridgeBatch) {
      return res.status(404).json({ success: false, message: 'Bridge batch not found' });
    }
    if (!['rejected', 'cancelled'].includes(bridgeBatch.status)) {
      return res.status(400).json({ success: false, message: 'Only rejected or cancelled requests can be deleted' });
    }

    await BridgeBatch.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Bridge batch request deleted' });
  } catch (error) {
    console.error('Error in deleteBridgeBatch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: revert an approved (active) request back to pending — e.g. approved by mistake
exports.revertApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const bridgeBatch = await BridgeBatch.findById(id);
    if (!bridgeBatch) {
      return res.status(404).json({ success: false, message: 'Bridge batch not found' });
    }
    if (bridgeBatch.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Only active (approved) requests can be reverted to pending' });
    }

    // Safety check — don't revert if the temp faculty has already started work on it
    const anyTopicDone = bridgeBatch.selectedTopics.some((t) => t.completed) ||
      bridgeBatch.selectedSubtopics.some((s) => s.completed);
    const attendanceCount = await Attendance.countDocuments({ bridgeBatchId: id });

    if (anyTopicDone || attendanceCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot revert — attendance or topics have already been recorded for this bridge batch',
      });
    }

    bridgeBatch.status = 'pending';
    bridgeBatch.approvedBy = undefined;
    bridgeBatch.approvedDate = undefined;
    await bridgeBatch.save();

    res.status(200).json({ success: true, message: 'Bridge batch reverted to pending', data: bridgeBatch });
  } catch (error) {
    console.error('Error in revertApproval:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: revert a merged batch back to active/ready_to_merge — e.g. merged by mistake
exports.revertMerge = async (req, res) => {
  try {
    const { id } = req.params;
    const bridgeBatch = await BridgeBatch.findById(id);
    if (!bridgeBatch) {
      return res.status(404).json({ success: false, message: 'Bridge batch not found' });
    }
    if (bridgeBatch.status !== 'merged') {
      return res.status(400).json({ success: false, message: 'Only merged batches can be reverted' });
    }

    const topicsDone = bridgeBatch.selectedTopics.length === 0 || bridgeBatch.selectedTopics.every((t) => t.completed);
    const subtopicsDone = bridgeBatch.selectedSubtopics.length === 0 || bridgeBatch.selectedSubtopics.every((s) => s.completed);

    // Restore to whichever state the pre-save hook would have put it in
    bridgeBatch.status = (topicsDone && subtopicsDone) ? 'ready_to_merge' : 'active';
    bridgeBatch.mergedBy = undefined;
    bridgeBatch.mergedDate = undefined;
    await bridgeBatch.save();

    res.status(200).json({ success: true, message: 'Merge reverted', data: bridgeBatch });
  } catch (error) {
    console.error('Error in revertMerge:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: get active/ready bridge batches tagged with their Faculty._id (not User._id)
// so the Faculty tab can group them alongside regular batches
exports.getBridgeBatchesForFacultyTab = async (req, res) => {
  try {
    const bridgeBatches = await BridgeBatch.find({ status: { $in: ['active', 'ready_to_merge'] } })
      .populate('studentIds', 'studentId fullName')
      .populate({ path: 'tempFacultyId', select: 'facultyId name' })
      .lean();

    const mapped = bridgeBatches.map((b) => ({
      ...b,
      facultyObjectId: b.tempFacultyId?.facultyId ? b.tempFacultyId.facultyId.toString() : null,
    }));

    res.status(200).json({ success: true, count: mapped.length, data: mapped });
  } catch (error) {
    console.error('Error in getBridgeBatchesForFacultyTab:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};