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
    const { parentBatchId, courseId, studentIds, tempFacultyId, selectedTopics, timeSlot } = req.body;
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

    const [course, tempFaculty] = await Promise.all([
      Course.findById(courseId).select('courseFullName').lean(),
      User.findById(tempFacultyId).select('name').lean(),
    ]);

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (!tempFaculty) return res.status(404).json({ success: false, message: 'Temp faculty not found' });

    const bridgeBatch = await BridgeBatch.create({
      parentBatchId,
      courseId,
      courseName: course.courseFullName,
      studentIds,
      tempFacultyId,
      tempFacultyName: tempFaculty.name,
      selectedTopics: selectedTopics.map((t) => ({
        topicKey: t.topicKey,
        topicName: t.topicName,
        completed: false,
      })),
      timeSlot: timeSlot || {},
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

// 5. Save which of the selected topics were covered today (temp faculty action)
// body: { bridgeBatchId, date, completedTopicKeys: [] }
// Writes a normal TopicCompletion record too, so ViewStudent's Syllabus Progress
// tab picks it up automatically (getStudentTopicProgress matches by courseId + studentIds only).
exports.saveBridgeTopicCompletion = async (req, res) => {
  try {
    const { bridgeBatchId, date, completedTopicKeys } = req.body;
    const tempFacultyId = req.user.id;

    if (!Array.isArray(completedTopicKeys) || completedTopicKeys.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one topic covered today' });
    }

    const bridgeBatch = await BridgeBatch.findById(bridgeBatchId);
    if (!bridgeBatch) {
      return res.status(404).json({ success: false, message: 'Bridge batch not found' });
    }
    if (bridgeBatch.tempFacultyId.toString() !== tempFacultyId.toString()) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this bridge batch' });
    }

    // Only allow marking topics that were actually assigned to this bridge batch
    const validKeys = new Set(bridgeBatch.selectedTopics.map((t) => t.topicKey));
    const invalidKeys = completedTopicKeys.filter((k) => !validKeys.has(k));
    if (invalidKeys.length > 0) {
      return res.status(400).json({ success: false, message: 'Some topics are not part of this bridge batch' });
    }

    // Flip completed flags on the bridge batch
    bridgeBatch.selectedTopics.forEach((t) => {
      if (completedTopicKeys.includes(t.topicKey)) {
        t.completed = true;
        t.completedDate = new Date();
      }
    });

    const wasActive = bridgeBatch.status === 'active';
    await bridgeBatch.save(); // pre-save hook flips status -> ready_to_merge if all done

    // Write the normal TopicCompletion record — this is what makes progress show
    // up correctly in ViewStudent without any extra "sync" step.
    await TopicCompletion.findOneAndUpdate(
      { batchId: bridgeBatch.parentBatchId, courseId: bridgeBatch.courseId, date: new Date(date) },
      {
        $set: { teacherId: tempFacultyId },
        $addToSet: {
          completedTopicKeys: { $each: completedTopicKeys },
          studentIds: { $each: bridgeBatch.studentIds },
        },
      },
      { upsert: true, new: true }
    );

    // If this save just completed every topic, notify admin (once)
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

// Get a student's full topic list for a course, each flagged completed/pending
// query: ?studentId=&courseId=
exports.getPendingTopicsForStudent = async (req, res) => {
  try {
    const { studentId, courseId } = req.query;
    if (!studentId || !courseId) {
      return res.status(400).json({ success: false, message: 'studentId and courseId are required' });
    }

    const course = await Course.findById(courseId).select('courseFullName syllabus').lean();
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const completions = await TopicCompletion.find({ courseId, studentIds: studentId })
      .select('completedTopicKeys')
      .lean();

    const completedTopicKeys = new Set();
    completions.forEach((c) => (c.completedTopicKeys || []).forEach((k) => completedTopicKeys.add(k)));

    const topics = [];
    (course.syllabus || []).forEach((sem, sIdx) => {
      (sem.topics || []).forEach((topic, tIdx) => {
        const topicKey = `${sIdx}_${tIdx}`;
        topics.push({
          topicKey,
          topicName: topic.name,
          semesterName: sem.name,
          completed: completedTopicKeys.has(topicKey),
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