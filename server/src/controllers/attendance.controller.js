// controllers/attendance.controller.js
const Attendance = require('../models/Attendance');
const TeacherBatch = require('../models/TeacherBatch');
const crypto = require('crypto');
const AttendanceSummary = require('../models/AttendanceSummary');
const Student = require('../models/Student');
const { Batch , Holiday } = require('../models/Setup');
const Course = require('../models/Course');
const TopicCompletion = require('../models/TopicCompletion');
const activeQRSessions = new Map();

const LATE_THRESHOLD_MINUTES = 15;
const EDIT_WINDOW_MINUTES = 120;
const LEAVE_STATUSES = ['sick_leave', 'casual_leave', 'official_leave'];

const User = require('../models/user');

const SENTINEL_COMPLETION_DATE = new Date(0);

const BridgeBatch = require('../models/BridgeBatch');

const BatchSubstitution = require('../models/BatchSubstitution');


setInterval(() => {
  const now = Date.now();
  for (const [key, session] of activeQRSessions.entries()) {
    if (now > session.expiresAt) activeQRSessions.delete(key);
  }
}, 30 * 60 * 1000);

// Resolves the effective TeacherBatch a logged-in user can act on for a batch:
// their own assignment, OR an active substitution covering it during someone's leave.
// Returns the on-leave teacher's TeacherBatch doc (correct roster) either way —
// callers must use req.user.id (not teacherBatch.teacher) for "who did this" fields.
const getEffectiveTeacherBatch = async (loggedInTeacherId, batchId) => {
  let teacherBatch = await TeacherBatch.findOne({
    teacher: loggedInTeacherId, batch: batchId, isActive: true,
  }).populate('batch', 'batchName startTime endTime displayName');
  if (teacherBatch) return teacherBatch;

  const now = new Date();
  const sub = await BatchSubstitution.findOne({
    batch: batchId, substituteFacultyUser: loggedInTeacherId, isActive: true,
    fromDate: { $lte: now }, toDate: { $gte: now },
  });
  if (!sub) return null;

  return TeacherBatch.findOne({
    teacher: sub.onLeaveFacultyUser, batch: batchId, isActive: true,
  }).populate('batch', 'batchName startTime endTime displayName');
};

// Same idea as getEffectiveTeacherBatch, but when the caller already knows the exact
// TeacherBatch doc (from the dashboard card), verify ownership/substitution against
// THAT doc instead of blindly re-resolving — removes ambiguity when a batch slot
// has multiple teacher/subject TeacherBatch docs.
const resolveTeacherBatchForAction = async (loggedInTeacherId, batchId, teacherBatchId) => {
  if (teacherBatchId) {
    const candidate = await TeacherBatch.findOne({ _id: teacherBatchId, isActive: true })
      .populate('batch', 'batchName startTime endTime displayName');
    if (candidate) {
      const isOwn = candidate.teacher.toString() === loggedInTeacherId.toString();
      let isCoveredBySub = false;
      if (!isOwn) {
        const now = new Date();
        isCoveredBySub = !!(await BatchSubstitution.findOne({
          batch: batchId,
          onLeaveFacultyUser: candidate.teacher,
          substituteFacultyUser: loggedInTeacherId,
          isActive: true,
          fromDate: { $lte: now },
          toDate: { $gte: now },
        }));
      }
      if (isOwn || isCoveredBySub) return candidate;
    }
  }
  // Fallback: old behavior, for any caller not yet passing teacherBatchId
  return getEffectiveTeacherBatch(loggedInTeacherId, batchId);
};

exports.generateQR = async (req, res) => {
  try {
    const { batchId } = req.body;
    const teacherId = req.user.id;

    // Verify teacher owns this batch
    const teacherBatch = await getEffectiveTeacherBatch(teacherId, batchId);

    if (!teacherBatch) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this batch'
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 30 * 1000; // 30 seconds

    const sessionKey = `${batchId}_${today}`;
    activeQRSessions.set(sessionKey, {
      token,
      teacherId: teacherBatch.teacher.toString(),
      batchId: batchId.toString(),
      date: today,
      expiresAt
    });

    const qrPayload = JSON.stringify({
      batchId: batchId.toString(),
      date: today,
      teacherId: teacherBatch.teacher.toString(),
      token
    });

    res.json({
      success: true,
      data: {
        qrData: qrPayload,
        batchName: teacherBatch.batch?.displayName || teacherBatch.batch?.batchName,
        timing: `${teacherBatch.batch?.startTime} - ${teacherBatch.batch?.endTime}`,
        expiresAt,
        date: today,
        totalStudents: teacherBatch.assignedStudents.filter(s => s.isActive).length
      }
    });
  } catch (error) {
    console.error('Error generating QR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// Student scans QR → marked present
exports.scanQR = async (req, res) => {
  try {
    const { qrData } = req.body;

    // req.user.id is the User collection's _id; Attendance/TeacherBatch
    // reference the separate Student collection's _id — resolve via admission code.
    const studentDoc = await Student.findOne({ studentId: req.user.studentId }).select('_id additionalCourses');
    if (!studentDoc) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }
    const studentMongoId = studentDoc._id;

    // Parse QR
    let parsed;
    try {
      parsed = JSON.parse(qrData);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid QR code format' });
    }

    const { batchId, date, teacherId, token } = parsed;

    // Validate session
    const sessionKey = `${batchId}_${date}`;
    const session = activeQRSessions.get(sessionKey);

    if (!session || session.token !== token || Date.now() > session.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'QR code has expired or is invalid. Ask your teacher to regenerate.'
      });
    }

    // Check student is enrolled in batch
    const teacherBatch = await TeacherBatch.findOne({
      teacher: teacherId,
      batch: batchId,
      isActive: true
    }).populate('batch', 'batchName startTime endTime displayName');

    if (!teacherBatch) {
      return res.status(403).json({ success: false, message: 'Batch not found' });
    }

    console.log('studentMongoId:', studentMongoId, 'assignedStudents:', teacherBatch.assignedStudents.map(s => s.student.toString()));

    const isEnrolled = teacherBatch.assignedStudents.some(
      s => s.student.toString() === studentMongoId.toString() && s.isActive
    );

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this batch'
      });
    }

    // Check if already marked today
    const attendanceDate = new Date(date);
    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await Attendance.findOne({
      student: studentMongoId,
      batch: batchId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Already marked as "${existing.status}" for today`
      });
    }


    // Determine courseType (same logic as manual attendance)
    const student = studentDoc;
    let courseType = 'primary';

    if (student?.additionalCourses?.length > 0) {
      const isAdditional = student.additionalCourses.some(
        ac => ac.batchId?.toString() === batchId.toString() && ac.isActive
      );
      if (isAdditional) courseType = 'additional';
    }

    const checkInTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });

    // Create Attendance record
    await Attendance.create({
      student: studentMongoId,
      teacher: teacherId,
      batch: batchId,
      date: attendanceDate,
      status: 'present',
      courseType,
      checkInTime,
      markedBy: studentMongoId,
      markedByName: 'QR Scan'
    });

    // Update Student document
    if (courseType === 'additional') {
      const idx = student.additionalCourses.findIndex(
        ac => ac.batchId?.toString() === batchId.toString()
      );
      if (idx !== -1) {
        await Student.findByIdAndUpdate(studentMongoId, {
          $push: {
            [`additionalCourses.${idx}.attendance`]: {
              date: attendanceDate,
              status: 'present',
              markedBy: 'QR Scan',
              remarks: 'Marked via QR Code'
            }
          }
        });
      }
    } else {
      await Student.findByIdAndUpdate(studentMongoId, {
        $push: {
          attendance: {
            date: attendanceDate,
            status: 'present',
            markedBy: 'QR Scan',
            remarks: 'Marked via QR Code'
          }
        }
      });
    }

    // Update monthly summary
    const d = new Date(date);
    await updateMonthlySummary(batchId, teacherId, d.getMonth() + 1, d.getFullYear());

    res.json({
      success: true,
      message: 'Attendance marked successfully!',
      data: {
        status: 'present',
        checkInTime,
        date,
        batchName: teacherBatch.batch?.displayName || teacherBatch.batch?.batchName,
        timing: `${teacherBatch.batch?.startTime} - ${teacherBatch.batch?.endTime}`
      }
    });
  } catch (error) {
    console.error('Error scanning QR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to calculate working days in month
const getWorkingDaysInMonth = (month, year) => {
  let count = 0;
  const date = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= lastDay; day++) {
    date.setDate(day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sunday (0) and Saturday (6)
      count++;
    }
  }
  return count;
};

// 1. Get Teacher's Batches
exports.getTeacherBatches = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const currentDate = new Date();
    
    // Get all batches assigned to teacher
    const ownBatches = await TeacherBatch.find({ teacher: teacherId, isActive: true })
      .populate('batch', 'batchName startTime endTime displayName')
      .lean();

    const now = new Date();
    const activeSubs = await BatchSubstitution.find({
      substituteFacultyUser: teacherId, isActive: true,
      fromDate: { $lte: now }, toDate: { $gte: now },
    }).lean();
    console.log('🔍 DEBUG getTeacherBatches — teacherId:', teacherId, typeof teacherId, '| now:', now.toISOString(), '| activeSubs found:', activeSubs.length, JSON.stringify(activeSubs));

    const subTeacherBatches = activeSubs.length > 0
      ? await TeacherBatch.find({
          teacher: { $in: activeSubs.map(s => s.onLeaveFacultyUser) },
          batch: { $in: activeSubs.map(s => s.batch) },
          isActive: true,
        }).populate('batch', 'batchName startTime endTime displayName').lean()
      : [];

    const teacherBatches = [
      ...ownBatches,
      ...subTeacherBatches.map(tb => ({ ...tb, isSubstitute: true })),
    ];

    if (!teacherBatches || teacherBatches.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: 'No batches assigned to you'
      });
    }

    // Transform data
    const batchesWithStats = await Promise.all(teacherBatches.map(async (tb) => {
      const batch = tb.batch;
      if (!batch) return null;
      
      // Count active students
      const activeStudents = tb.assignedStudents.filter(s => s.isActive);
      
      // Get today's attendance for this batch
      const todayStart = new Date(currentDate);
      todayStart.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date(currentDate);
      todayEnd.setHours(23, 59, 59, 999);

      const todayAttendance = await Attendance.find({
        teacher: teacherId,
        batch: batch._id,
        date: { $gte: todayStart, $lte: todayEnd }
      }).lean();

      const todayPresent = todayAttendance.filter(a => a.status === 'present').length;
      const todayAbsent = todayAttendance.filter(a => a.status === 'absent').length;
      
      // Calculate attendance rate for current month
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthAttendance = await Attendance.find({
        teacher: teacherId,
        batch: batch._id,
        date: { $gte: firstDay }
      }).lean();

      const totalDays = currentDate.getDate();
      const presentDays = monthAttendance.filter(a => a.status === 'present').length;
      const attendanceRate = activeStudents.length > 0 && totalDays > 0 
        ? Math.round((presentDays / (activeStudents.length * totalDays)) * 100) 
        : 0;

      return {
        _id: batch._id,
        batchId: batch._id,
        name: batch.batchName || batch.displayName,
        displayName: batch.displayName,
        startTime: batch.startTime,
        endTime: batch.endTime,
        timing: `${batch.startTime} - ${batch.endTime}`,
        totalStudents: activeStudents.length,
        attendanceRate: attendanceRate,
        todayPresent: todayPresent,
        todayAbsent: todayAbsent,
        teacherBatchId: tb._id,
        roomNumber: tb.roomNumber,
        subject: tb.subject
      };
    }));

    // Filter out null batches and sort by start time
    const validBatches = batchesWithStats.filter(b => b !== null);
    validBatches.sort((a, b) => a.startTime.localeCompare(b.startTime));

    res.status(200).json({
      success: true,
      count: validBatches.length,
      data: validBatches
    });
  } catch (error) {
    console.error('Error in getTeacherBatches:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 2. Get Teacher's Students in a Batch
// 2. Get Teacher's Students in a Batch
exports.getTeacherBatchStudents = async (req, res) => {
  try {
    console.log("========== GET TEACHER BATCH STUDENTS START ==========");
    console.log("📌 Params:", req.params);
    console.log("📌 Query:", req.query);
    console.log("📌 User:", req.user);
    
    const { batchId } = req.params;
    const teacherId = req.user.id;
    const { date } = req.query;

    console.log(`🔍 Looking for TeacherBatch with teacher: ${teacherId}, batch: ${batchId}`);

    // Get teacher's assigned students for this batch
    let teacherBatchDoc = await getEffectiveTeacherBatch(teacherId, batchId);
    if (teacherBatchDoc) {
      teacherBatchDoc = await TeacherBatch.findById(teacherBatchDoc._id)
        .populate('assignedStudents.student', 'studentId fullName photo mobileNumber email fatherName enrolledBatches course')
        .populate('batch', 'batchName startTime endTime displayName')
        .lean();
    }
    const teacherBatch = teacherBatchDoc;

    if (!teacherBatch) {
      console.log("❌ No TeacherBatch found!");
      return res.status(404).json({
        success: false,
        message: 'No students assigned to you in this batch'
      });
    }

    console.log("✅ TeacherBatch found:", teacherBatch._id);
    console.log(`📊 Total assignedStudents: ${teacherBatch.assignedStudents?.length || 0}`);

    // Get active students
    const activeStudents = teacherBatch.assignedStudents.filter(s => s.isActive && s.student);
    console.log(`✅ Active students: ${activeStudents.length}`);

    // Get student IDs
    const studentIds = activeStudents.map(s => s.student._id);
    console.log("🔍 Student IDs:", studentIds.map(id => id.toString()));

    // Get student details with their courses
    const students = await Student.find({ _id: { $in: studentIds } })
  .select('studentId fullName fatherName photo mobileNumber email enrolledBatches course additionalCourses')
  .lean();

    console.log(`✅ Students fetched from DB: ${students.length}`);
    console.log("📊 STUDENT DATA FROM DB:", JSON.stringify(students, null, 2));

    // If students array is empty, log the IDs that didn't match
    if (students.length === 0) {
      console.log("❌ No students found with these IDs!");
      console.log("🔍 Check if these IDs exist in database:", studentIds);
    } else {
      // Log each student's fatherName
      students.forEach((s, i) => {
        console.log(`📝 Student ${i+1}: ${s.fullName} - fatherName: "${s.fatherName || 'NOT FOUND'}"`);
      });
    }

    // Get today's attendance if date provided
    let attendanceData = {};
    if (date) {
      const attendanceDate = new Date(date);
      const startOfDay = new Date(attendanceDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(attendanceDate);
      endOfDay.setHours(23, 59, 59, 999);

      const attendance = await Attendance.find({
        teacher: teacherId,
        batch: batchId,
        student: { $in: studentIds },
        date: { $gte: startOfDay, $lte: endOfDay }
      }).lean();

      console.log(`📅 Attendance records found: ${attendance.length}`);
      
      attendance.forEach(att => {
        attendanceData[att.student.toString()] = {
          status: att.status,
          checkInTime: att.checkInTime,
          remarks: att.remarks
        };
      });
    }

    // Prepare response with attendance history
    const studentsWithAttendance = await Promise.all(students.map(async (student) => {
      // Get attendance history (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const attendanceHistory = await Attendance.aggregate([
        {
          $match: {
            student: student._id,
            teacher: teacherId,
            batch: batchId,
            date: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Convert to object
      const historyObj = {};
      attendanceHistory.forEach(item => {
        historyObj[item._id] = item.count;
      });

      // Get student's courses from enrolledBatches
      let studentCourses = [];
if (student.course) studentCourses.push(student.course);
if (student.additionalCourses?.length > 0) {
  student.additionalCourses
    .filter(ac => ac.isActive)
    .forEach(ac => {
      if (!studentCourses.includes(ac.courseName)) {
        studentCourses.push(ac.courseName);
      }
    });
}

      // Determine which course applies to this student IN THIS BATCH
      // (a batch can host students on their primary course OR an additional course)
      const normalize = (s) => (s || '').replace(/\s+/g, ' ').toLowerCase().trim();
      const currentBatchDisplayName = teacherBatch.batch?.displayName || '';
      const currentBatchTimeString = `${teacherBatch.batch?.startTime || ''} to ${teacherBatch.batch?.endTime || ''}`;

      let applicableCourseId = student.courseCode || null;
      let applicableCourseName = student.course || studentCourses[0] || 'Course';
      if (student.additionalCourses?.length > 0) {
        const ac = student.additionalCourses.find((a) => {
          if (!a.isActive) return false;
          if (a.batchId && batchId) {
            return a.batchId.toString() === batchId.toString();
          }
          // fallback: batchId missing/null on this record, match by batch time/name instead
          return normalize(a.batchTime) === normalize(currentBatchDisplayName) ||
                 normalize(a.batchTime) === normalize(currentBatchTimeString);
        });
        if (ac) {
          applicableCourseId = ac.courseId;
          applicableCourseName = ac.courseName;
        }
      }

      return {
        _id: student._id,
        studentId: student.studentId,
        fullName: student.fullName,
        fatherName: student.fatherName || 'N/A',
        photo: student.photo,
        contact: student.mobileNumber,
        email: student.email,
        courseId: applicableCourseId,
        courseName: applicableCourseName,
        courses: studentCourses,
        batchTiming: teacherBatch.batch?.displayName || `${teacherBatch.batch?.startTime} - ${teacherBatch.batch?.endTime}`,
        attendanceHistory: {
          present: historyObj.present || 0,
          absent: historyObj.absent || 0,
          leave: (historyObj.sick_leave || 0) + (historyObj.casual_leave || 0) + (historyObj.official_leave || 0),
          late: historyObj.late || 0
        },
        todayStatus: attendanceData[student._id.toString()]?.status || 'present',
        todayCheckInTime: attendanceData[student._id.toString()]?.checkInTime || '',
        todayRemarks: attendanceData[student._id.toString()]?.remarks || ''
      };
    }));

    console.log(`✅ Final students prepared: ${studentsWithAttendance.length}`);
    console.log("========== GET TEACHER BATCH STUDENTS END ==========");

    res.status(200).json({
      success: true,
      data: {
        batch: {
          _id: batchId,
          name: teacherBatch.batch?.batchName,
          timing: `${teacherBatch.batch?.startTime} - ${teacherBatch.batch?.endTime}`,
          roomNumber: teacherBatch.roomNumber,
          subject: teacherBatch.subject
        },
        students: studentsWithAttendance,
        totalStudents: studentsWithAttendance.length
      }
    });
  } catch (error) {
    console.error('❌ Error in getTeacherBatchStudents:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// 3. Mark Attendance for Teacher's Batch
exports.markTeacherAttendance = async (req, res) => {
  try {
    const { batchId, date, attendance, teacherBatchId } = req.body;
    const teacherId = req.user.id;
    const teacherName = req.user.name || req.user.fullName;

    // Verify teacher has access to this batch
    const teacherBatch = await resolveTeacherBatchForAction(teacherId, batchId, teacherBatchId);

    if (!teacherBatch) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this batch'
      });
    }

    // Attendance.teacher must match TeacherBatch.teacher (the roster owner) so existing
    // report joins keep working; markedBy/markedByName stay as the real logged-in person.
    const rosterOwnerId = teacherBatch.teacher;

    // Check if attendance already exists for this date/batch — if so, this is an EDIT,
    // and edits are only allowed within the window (batch start time + EDIT_WINDOW_MINUTES)
    const attendanceDate = new Date(date);
    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingCount = await Attendance.countDocuments({
      teacher: teacherId,
      batch: batchId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existingCount > 0) {
      const windowOpen = isWithinEditWindow(date, teacherBatch.batch?.startTime, EDIT_WINDOW_MINUTES);
      if (!windowOpen) {
        return res.status(403).json({
          success: false,
          message: 'Edit window has closed. Please contact admin to request a correction.'
        });
      }
    }

    // Get assigned student IDs
    const assignedStudentIds = teacherBatch.assignedStudents
      .filter(s => s.isActive)
      .map(s => s.student.toString());

    // Validate all students belong to teacher
    const invalidStudents = attendance.filter(record =>
      !assignedStudentIds.includes(record.studentId)
    );

    if (invalidStudents.length > 0) {
      return res.status(400).json({
        success: false,
        message: `You cannot mark attendance for ${invalidStudents.length} unassigned students`
      });
    }

    // Prepare attendance records for Attendance collection
    // (attendanceDate already declared above for the edit-window check)
const batchDisplayName = teacherBatch.batch?.displayName || '';
const batchTimeString = `${teacherBatch.batch?.startTime || ''} to ${teacherBatch.batch?.endTime || ''}`;
const normalize = (s) => (s || '').replace(/\s+/g, ' ').toLowerCase().trim();

const attendanceRecords = await Promise.all(attendance.map(async (record) => {
  const student = await Student.findById(record.studentId);
  
  let courseType = 'primary'; // default
  
  if (student?.additionalCourses?.length > 0) {
    const additionalCourseIndex = student.additionalCourses.findIndex(ac => {
      if (ac.batchId && batchId) {
        return ac.batchId.toString() === batchId.toString();
      }
      return normalize(ac.batchTime) === normalize(batchDisplayName) ||
             normalize(ac.batchTime) === normalize(batchTimeString);
    });
    if (additionalCourseIndex !== -1) courseType = 'additional';
  }

  console.log(`📌 Student ${record.studentId} → courseType: ${courseType}`);

  return {
    student: record.studentId,
    teacher: rosterOwnerId,
    batch: batchId,
    date: attendanceDate,
    status: record.status,
    courseType,               // ✅ set here directly
    checkInTime: record.checkInTime,
    checkOutTime: record.checkOutTime,
    reason: record.reason,
    remarks: record.remarks,
    markedBy: teacherId,
    markedByName: teacherName
  };
}));

    // Use bulkWrite for efficiency
    const operations = attendanceRecords.map(record => ({
  updateOne: {
    filter: {
      student: record.student,
      teacher: teacherId,
      batch: batchId,
      date: attendanceDate
    },
    update: { $set: record },  // record already has courseType ✅
    upsert: true
  }
}));

const result = await Attendance.bulkWrite(operations);



    // Update monthly summary
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    await updateMonthlySummary(batchId, teacherId, month, year);

    res.status(200).json({
      success: true,
      message: `Attendance marked for ${attendance.length} students`,
      data: {
        inserted: result.upsertedCount,
        modified: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error in markTeacherAttendance:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to update monthly summary
const updateMonthlySummary = async (batchId, teacherId, month, year) => {
  try {
    // Get all students assigned to teacher in this batch
    const teacherBatch = await TeacherBatch.findOne({
      teacher: teacherId,
      batch: batchId,
      isActive: true
    });

    if (!teacherBatch) return;

    const studentIds = teacherBatch.assignedStudents
      .filter(s => s.isActive)
      .map(s => s.student);

    // Get attendance for this month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const attendanceData = await Attendance.aggregate([
      {
        $match: {
          student: { $in: studentIds },
          teacher: teacherId,
          batch: batchId,
          date: { $gte: firstDay, $lte: lastDay }
        }
      },
      {
        $group: {
          _id: '$student',
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          sickLeave: { $sum: { $cond: [{ $eq: ['$status', 'sick_leave'] }, 1, 0] } },
          casualLeave: { $sum: { $cond: [{ $eq: ['$status', 'casual_leave'] }, 1, 0] } },
          officialLeave: { $sum: { $cond: [{ $eq: ['$status', 'official_leave'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          halfDay: { $sum: { $cond: [{ $eq: ['$status', 'half_day'] }, 1, 0] } }
        }
      }
    ]);

    // Get total working days
    const totalWorkingDays = getWorkingDaysInMonth(month, year);

    // Update or create summary for each student
    const summaryOperations = attendanceData.map(data => ({
      updateOne: {
        filter: {
          student: data._id,
          teacher: teacherId,
          batch: batchId,
          month: month,
          year: year
        },
        update: {
          $set: {
            student: data._id,
            teacher: teacherId,
            batch: batchId,
            month: month,
            year: year,
            totalWorkingDays: totalWorkingDays,
            present: data.present,
            absent: data.absent,
            sickLeave: data.sickLeave,
            casualLeave: data.casualLeave,
            officialLeave: data.officialLeave,
            late: data.late,
            halfDay: data.halfDay
          }
        },
        upsert: true
      }
    }));

    if (summaryOperations.length > 0) {
      await AttendanceSummary.bulkWrite(summaryOperations);
    }
  } catch (error) {
    console.error('Error updating monthly summary:', error);
  }
};


// Get attendance for a specific student - FIXED VERSION
exports.getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    console.log(`📊 Fetching attendance for student ID: ${studentId}`);

    // ✅ FIX: Find actual student first to get their MongoDB _id
    const isMongoId = studentId.match(/^[0-9a-fA-F]{24}$/);
    const studentDoc = await Student.findOne(
      isMongoId ? { _id: studentId } : { studentId: studentId }
    ).select('_id studentId fullName');

    if (!studentDoc) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    console.log(`✅ Found student: ${studentDoc.fullName} (${studentDoc._id})`);

    // ✅ Now query with correct MongoDB _id
    const attendance = await Attendance.find({
      student: studentDoc._id,   // use _id not studentId string
      courseType: 'primary'
    })
    .populate({ path: 'batch', select: 'batchName displayName startTime endTime roomNumber' })
    .populate({ path: 'teacher', select: 'name email' })
    .populate({ path: 'markedBy', select: 'name email' })
    .sort({ date: -1 })
    .lean();

    console.log(`📊 Found ${attendance.length} attendance records`);

    const formattedAttendance = attendance.map(record => {
      let facultyName = 'Unknown Faculty';
      if (record.markedBy?.name) facultyName = record.markedBy.name;
      else if (record.teacher?.name) facultyName = record.teacher.name;

      return {
        id: record._id,
        date: record.date,
        status: record.status,
        remarks: record.remarks || '',
        batchName: record.batch?.batchName || record.batch?.displayName || 'Unknown Batch',
        subject: record.subject || '',
        timing: record.batch?.startTime && record.batch?.endTime
          ? `${record.batch.startTime} - ${record.batch.endTime}`
          : 'N/A',
        roomNumber: record.batch?.roomNumber || 'N/A',
        facultyName,
        time: record.checkInTime || record.batch?.startTime || 'N/A'
      };
    });

    const totalRecords = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount  = attendance.filter(a => a.status === 'absent').length;
    const leaveCount   = attendance.filter(a =>
      ['sick_leave', 'casual_leave', 'official_leave', 'leave'].includes(a.status)
    ).length;
    const lateCount    = attendance.filter(a => a.status === 'late').length;

    const batchIds = [...new Set(attendance.map(a => a.batch?._id?.toString()).filter(Boolean))];
    const distinctDates = await Attendance.distinct('date', {
      batch: { $in: batchIds },
      courseType: 'primary'
    });

    const totalClasses = distinctDates.length;
    const attendancePercentage = totalClasses > 0
      ? Math.round((presentCount / totalClasses) * 100)
      : 0;

    res.status(200).json({
      success: true,
      count: formattedAttendance.length,
      stats: {
        total: totalRecords,
        totalClasses,
        present: presentCount,
        absent: absentCount,
        leave: leaveCount,
        late: lateCount,
        attendancePercentage
      },
      data: formattedAttendance
    });

  } catch (error) {
    console.error('❌ Error fetching student attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance records',
      error: error.message
    });
  }
};

// 4. Get Today's Attendance Summary for Teacher
exports.getTeacherTodaySummary = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all batches for teacher
    const teacherBatches = await TeacherBatch.find({
      teacher: teacherId,
      isActive: true
    }).populate('batch', 'batchName startTime endTime displayName');

    let totalStudents = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    
    const batchSummaries = await Promise.all(teacherBatches.map(async (tb) => {
      const activeStudents = tb.assignedStudents.filter(s => s.isActive).length;
      totalStudents += activeStudents;

      // Get today's attendance for this batch
      const todayAttendance = await Attendance.find({
        teacher: teacherId,
        batch: tb.batch._id,
        date: { $gte: today, $lt: tomorrow }
      }).lean();

      const present = todayAttendance.filter(a => a.status === 'present').length;
      const absent = todayAttendance.filter(a => a.status === 'absent').length;
      
      totalPresent += present;
      totalAbsent += absent;

      return {
        batchId: tb.batch._id,
        batchName: tb.batch.batchName || tb.batch.displayName,
        timing: `${tb.batch.startTime} - ${tb.batch.endTime}`,
        totalStudents: activeStudents,
        present: present,
        absent: absent,
        attendanceMarked: (present + absent) > 0
      };
    }));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalBatches: batchSummaries.length,
          totalStudents: totalStudents,
          totalPresent: totalPresent,
          totalAbsent: totalAbsent,
          attendanceRate: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0
        },
        batches: batchSummaries
      }
    });
  } catch (error) {
    console.error('Error in getTeacherTodaySummary:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 5. Get Monthly Report for Teacher
exports.getTeacherMonthlyReport = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { month, year } = req.params;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get attendance for the month
    const monthlyAttendance = await Attendance.aggregate([
      {
        $match: {
          teacher: teacherId,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            batch: '$batch',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'batches',
          localField: '_id.batch',
          foreignField: '_id',
          as: 'batchInfo'
        }
      },
      { $unwind: '$batchInfo' },
      {
        $group: {
          _id: '$batchInfo.displayName',
          stats: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: monthlyAttendance
    });
  } catch (error) {
    console.error('Error in getTeacherMonthlyReport:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const timeStringToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
  if (!match) return null;
  let [, hh, mm, ampm] = match;
  hh = parseInt(hh, 10);
  mm = parseInt(mm, 10);
  if (ampm) {
    ampm = ampm.toUpperCase();
    if (ampm === 'PM' && hh !== 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;
  }
  return hh * 60 + mm;
};

const isWithinEditWindow = (dateStr, startTimeStr, windowMinutes) => {
  const startMin = timeStringToMinutes(startTimeStr);
  if (startMin === null) return false; // if we can't parse batch start time, fail safe (closed)

  const batchStart = new Date(dateStr);
  batchStart.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

  const windowEnd = new Date(batchStart.getTime() + windowMinutes * 60000);
  return Date.now() <= windowEnd.getTime();
};

// Maps raw Attendance.status + checkInTime-vs-batch-start into: present | absent | late | leave
const resolveDisplayStatus = (rawStatus, checkInTime, batchStartTime) => {
  if (!rawStatus || rawStatus === 'absent' || rawStatus === 'not_marked') return 'absent';
  if (LEAVE_STATUSES.includes(rawStatus)) return 'leave';
  if (rawStatus === 'half_day') return 'present';
  if (rawStatus === 'late') return 'late';
  if (rawStatus === 'present') {
    const startMin = timeStringToMinutes(batchStartTime);
    const checkInMin = timeStringToMinutes(checkInTime);
    if (startMin !== null && checkInMin !== null && (checkInMin - startMin) > LATE_THRESHOLD_MINUTES) {
      return 'late';
    }
    return 'present';
  }
  return 'absent';
};

exports.getAttendanceReport = async (req, res) => {
  try {
    const { date, batchId, facultyId, status, search } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // facultyId from the dropdown is a Faculty._id — TeacherBatch/Attendance
    // store the linked User._id (User.facultyId -> Faculty._id), so resolve it first
    let resolvedTeacherId = null;
    if (facultyId) {
      const userDoc = await User.findOne({ facultyId }).select('_id').lean();
      if (!userDoc) {
        return res.status(200).json({
          success: true,
          date: startOfDay,
          stats: { total: 0, present: 0, absent: 0, late: 0, leave: 0 },
          count: 0,
          data: []
        });
      }
      resolvedTeacherId = userDoc._id;
    }

    // Roster: which batch/teacher assignments to include
    const tbQuery = { isActive: true };
    if (batchId) tbQuery.batch = batchId;
    if (resolvedTeacherId) tbQuery.teacher = resolvedTeacherId;

    const teacherBatches = await TeacherBatch.find(tbQuery)
      .populate('batch', 'batchName displayName startTime endTime')
      .populate('teacher', 'name email')
      .populate('assignedStudents.student', 'studentId fullName photo course additionalCourses')
      .lean();

    if (!teacherBatches.length) {
      return res.status(200).json({
        success: true,
        date: startOfDay,
        stats: { total: 0, present: 0, absent: 0, late: 0, leave: 0 },
        count: 0,
        data: []
      });
    }

    // Attendance already marked for the day, same scope
    const attQuery = { date: { $gte: startOfDay, $lte: endOfDay } };
    if (batchId) attQuery.batch = batchId;
    if (resolvedTeacherId) attQuery.teacher = resolvedTeacherId;

    const attendanceRecords = await Attendance.find(attQuery).lean();
    const attendanceMap = new Map();
    attendanceRecords.forEach((rec) => {
      attendanceMap.set(`${rec.student}_${rec.teacher}_${rec.batch}`, rec);
    });

    const rows = [];

    teacherBatches.forEach((tb) => {
      if (!tb.batch) return;
      const activeStudents = (tb.assignedStudents || []).filter((s) => s.isActive && s.student);

      activeStudents.forEach((as) => {
        const student = as.student;
        const key = `${student._id}_${tb.teacher?._id}_${tb.batch._id}`;
        const record = attendanceMap.get(key);

        const rawStatus = record?.status || 'absent';
        const displayStatus = resolveDisplayStatus(rawStatus, record?.checkInTime, tb.batch.startTime);

        let course = student.course || 'N/A';
        if (record?.courseType === 'additional' && student.additionalCourses?.length) {
          const ac = student.additionalCourses.find(
            (a) => a.batchId?.toString() === tb.batch._id.toString()
          );
          if (ac?.courseName) course = ac.courseName;
        }

        rows.push({
          attendanceId: record?._id || null,
          studentDbId: student._id,
          studentId: student.studentId,
          studentName: student.fullName,
          photo: student.photo || null,
          course,
          batchId: tb.batch._id,
          batchName: tb.batch.batchName || tb.batch.displayName,
          batchTiming: `${tb.batch.startTime} - ${tb.batch.endTime}`,
          facultyId: tb.teacher?._id || null,
          facultyName: tb.teacher?.name || 'Unknown',
          status: displayStatus,
          presentTime: ['present', 'late'].includes(displayStatus) ? (record?.checkInTime || null) : null,
        });
      });
    });

    let filteredRows = rows;

    if (status && status !== 'all') {
      filteredRows = filteredRows.filter((r) => r.status === status);
    }

    if (search) {
      const term = search.trim().toLowerCase();
      filteredRows = filteredRows.filter(
        (r) =>
          r.studentName?.toLowerCase().includes(term) ||
          r.studentId?.toLowerCase().includes(term)
      );
    }

    filteredRows.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));

    const stats = {
      total: filteredRows.length,
      present: filteredRows.filter((r) => r.status === 'present').length,
      absent: filteredRows.filter((r) => r.status === 'absent').length,
      late: filteredRows.filter((r) => r.status === 'late').length,
      leave: filteredRows.filter((r) => r.status === 'leave').length,
    };

    res.status(200).json({
      success: true,
      date: startOfDay,
      stats,
      count: filteredRows.length,
      data: filteredRows,
    });
  } catch (error) {
    console.error('Error in getAttendanceReport:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getMonthlyAttendanceReport = async (req, res) => {
  try {
    const {
      month, year, batchId, facultyId, search,
      page = 1, limit = 10
    } = req.query;

    const targetMonth = parseInt(month) || (new Date().getMonth() + 1);
    const targetYear = parseInt(year) || new Date().getFullYear();
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const pageLimit = Math.max(parseInt(limit) || 10, 1);

    const firstDay = new Date(targetYear, targetMonth - 1, 1);
    const lastDay = new Date(targetYear, targetMonth, 0);
    const daysInMonth = lastDay.getDate();

    // Resolve facultyId (Faculty._id from dropdown) -> User._id (stored on TeacherBatch.teacher)
    let resolvedTeacherId = null;
    if (facultyId) {
      const userDoc = await User.findOne({ facultyId }).select('_id').lean();
      if (!userDoc) {
        return res.status(200).json({
          success: true, data: [], daysInMonth,
          pagination: { page: pageNum, limit: pageLimit, total: 0, totalPages: 0 }
        });
      }
      resolvedTeacherId = userDoc._id;
    }

    // Build full roster (lightweight — no attendance fetched yet)
    const tbQuery = { isActive: true };
    if (batchId) tbQuery.batch = batchId;
    if (resolvedTeacherId) tbQuery.teacher = resolvedTeacherId;

    const teacherBatches = await TeacherBatch.find(tbQuery)
      .populate('batch', 'batchName displayName startTime endTime')
      .populate('teacher', 'name')
      .populate('assignedStudents.student', 'studentId fullName')
      .lean();

    let roster = [];
    teacherBatches.forEach((tb) => {
      if (!tb.batch) return;
      (tb.assignedStudents || [])
        .filter((s) => s.isActive && s.student)
        .forEach((as) => {
          roster.push({
            studentDbId: as.student._id,
            studentId: as.student.studentId,
            studentName: as.student.fullName,
            teacherId: tb.teacher?._id || null,
            facultyName: tb.teacher?.name || 'Unknown',
            batchId: tb.batch._id,
            batchName: tb.batch.batchName || tb.batch.displayName,
            batchTiming: `${tb.batch.startTime} - ${tb.batch.endTime}`,
          });
        });
    });

    if (search) {
      const term = search.trim().toLowerCase();
      roster = roster.filter(
        (r) =>
          r.studentName?.toLowerCase().includes(term) ||
          r.studentId?.toLowerCase().includes(term)
      );
    }

    roster.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));

    const total = roster.length;
    const totalPages = Math.max(Math.ceil(total / pageLimit), 1);
    const startIdx = (pageNum - 1) * pageLimit;
    const pageRoster = roster.slice(startIdx, startIdx + pageLimit);

    if (pageRoster.length === 0) {
      return res.status(200).json({
        success: true, data: [], daysInMonth,
        pagination: { page: pageNum, limit: pageLimit, total, totalPages }
      });
    }

    // Only fetch Attendance for THIS PAGE's students — this is what keeps the DB load small
    const studentIds = pageRoster.map((r) => r.studentDbId);
    const attendanceRecords = await Attendance.find({
      student: { $in: studentIds },
      date: { $gte: firstDay, $lte: lastDay }
    }).select('student teacher batch date status checkInTime').lean();

    const attMap = new Map();
    attendanceRecords.forEach((rec) => {
      const day = new Date(rec.date).getDate();
      const key = `${rec.student}_${rec.teacher}_${rec.batch}_${day}`;
      attMap.set(key, rec);
    });

    // Holidays for this month (date-only, applies regardless of batch)
    const holidays = await Holiday.find({
      holidayDate: { $gte: firstDay, $lte: lastDay }
    }).select('holidayDate').lean();
    const holidayDays = new Set(holidays.map((h) => new Date(h.holidayDate).getDate()));

    const data = pageRoster.map((r) => {
      const days = {};
      let present = 0, absent = 0, leave = 0, holidayCount = 0, sundayCount = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(targetYear, targetMonth - 1, d);
        const isSunday = dateObj.getDay() === 0;
        const isHoliday = holidayDays.has(d);

        if (isSunday) {
          days[d] = 'S';
          sundayCount++;
          continue;
        }
        if (isHoliday) {
          days[d] = 'H';
          holidayCount++;
          continue;
        }

        const key = `${r.studentDbId}_${r.teacherId}_${r.batchId}_${d}`;
        const rec = attMap.get(key);
        if (!rec) {
          days[d] = ''; // not marked
          continue;
        }
        if (rec.status === 'present') { days[d] = 'P'; present++; }
        else if (rec.status === 'late') { days[d] = 'La'; present++; }
        else if (['sick_leave', 'casual_leave', 'official_leave'].includes(rec.status)) { days[d] = 'L'; leave++; }
        else if (rec.status === 'absent') { days[d] = 'A'; absent++; }
        else { days[d] = ''; }
      }

      return {
        studentDbId: r.studentDbId,
        studentId: r.studentId,
        studentName: r.studentName,
        facultyName: r.facultyName,
        batchName: r.batchName,
        batchTiming: r.batchTiming,
        days,
        present, absent, leave, holidayCount, sundayCount
      };
    });

    res.status(200).json({
      success: true,
      daysInMonth,
      pagination: { page: pageNum, limit: pageLimit, total, totalPages },
      data
    });
  } catch (error) {
    console.error('Error in getMonthlyAttendanceReport:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Get topics/subtopics for one or more courses (used to build the topic-completion modal)
exports.getCourseTopics = async (req, res) => {
  try {
    const { groups } = req.query;
    if (!groups) {
      return res.status(400).json({ success: false, message: 'groups is required' });
    }

    let parsedGroups;
    try {
      parsedGroups = JSON.parse(groups);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid groups format' });
    }

    const courseIds = parsedGroups.map((g) => g.courseId).filter(Boolean);
    const courses = await Course.find({ _id: { $in: courseIds } })
      .select('courseFullName syllabus')
      .lean();
    const courseMap = {};
    courses.forEach((c) => { courseMap[c._id.toString()] = c; });

    const result = await Promise.all(parsedGroups.map(async (group) => {
      const course = courseMap[group.courseId];
      if (!course) return null;

      const studentIds = (group.studentIds || []).map(String);

      const completions = await TopicCompletion.find({
        courseId: group.courseId,
        studentIds: { $in: studentIds },
      }).select('completedTopicKeys completedSubtopicKeys studentIds date').lean();

      const topicTaught = {}, topicCompleted = {};
      const subtopicTaught = {}, subtopicCompleted = {};
      const subtopicTaughtDates = {}; // subKey -> Set of ISO date strings

      studentIds.forEach((sid) => {
        topicTaught[sid] = new Set(); topicCompleted[sid] = new Set();
        subtopicTaught[sid] = new Set(); subtopicCompleted[sid] = new Set();
      });

      completions.forEach((c) => {
        const isSentinel = new Date(c.date).getTime() === SENTINEL_COMPLETION_DATE.getTime();
        (c.studentIds || []).forEach((sid) => {
          const sidStr = sid.toString();
          if (!topicTaught[sidStr]) return;

          (c.completedTopicKeys || []).forEach((k) => {
            if (isSentinel) topicCompleted[sidStr].add(k);
            else topicTaught[sidStr].add(k);
          });

          (c.completedSubtopicKeys || []).forEach((k) => {
            if (isSentinel) {
              subtopicCompleted[sidStr].add(k);
            } else {
              subtopicTaught[sidStr].add(k);
              if (!subtopicTaughtDates[k]) subtopicTaughtDates[k] = new Set();
              subtopicTaughtDates[k].add(new Date(c.date).toISOString().split('T')[0]);
            }
          });
        });
      });

      const topics = [];
      (course.syllabus || []).forEach((sem, sIdx) => {
        (sem.topics || []).forEach((topic, tIdx) => {
          const topicKey = `${sIdx}_${tIdx}`;
          const tCompleted = studentIds.length > 0 && studentIds.every((sid) => topicCompleted[sid]?.has(topicKey));
          const tTaught = studentIds.some((sid) => topicTaught[sid]?.has(topicKey));

          topics.push({
            key: topicKey,
            name: topic.name,
            semesterName: sem.name,
            completed: tCompleted,
            inProgress: !tCompleted && tTaught,
            subtopics: (topic.subtopics || []).map((sub, subIdx) => {
              const subKey = `${sIdx}_${tIdx}_${subIdx}`;
              const sCompleted = studentIds.length > 0 && studentIds.every((sid) => subtopicCompleted[sid]?.has(subKey));
              const sTaught = studentIds.some((sid) => subtopicTaught[sid]?.has(subKey));
              return {
                key: subKey,
                name: sub.name,
                completed: sCompleted,
                inProgress: !sCompleted && sTaught,
                taughtDaysCount: subtopicTaughtDates[subKey]?.size || 0,
              };
            }),
          });
        });
      });

      return { courseId: course._id, courseName: course.courseFullName, topics };
    }));

    res.json({ success: true, data: result.filter(Boolean) });
  } catch (error) {
    console.error('Error in getCourseTopics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Save which topics/subtopics were covered, per course, for a batch+date
exports.saveTopicCompletion = async (req, res) => {
  try {
    const { batchId, date, courseGroups, teacherBatchId } = req.body;
    const teacherId = req.user.id;
    const attendanceDate = new Date(date);

    if (!Array.isArray(courseGroups) || courseGroups.length === 0) {
      return res.status(400).json({ success: false, message: 'courseGroups is required' });
    }

    const teacherBatch = await resolveTeacherBatchForAction(teacherId, batchId, teacherBatchId);
    if (!teacherBatch) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this batch' });
    }
    const operations = courseGroups.map((group) => ({
      updateOne: {
        filter: { batchId, courseId: group.courseId, date: attendanceDate },
        update: {
          $set: {
            batchId,
            courseId: group.courseId,
            teacherId,
            date: attendanceDate,
            completedTopicKeys: group.completedTopicKeys || [],
            completedSubtopicKeys: group.completedSubtopicKeys || [],
            studentIds: group.studentIds || [],
          },
        },
        upsert: true,
      },
    }));

    await TopicCompletion.bulkWrite(operations);
    res.json({ success: true, message: 'Topics saved successfully' });
  } catch (error) {
    console.error('Error in saveTopicCompletion:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Faculty explicitly marks a subtopic as fully, permanently completed —
// separate from the daily "taught today" log, using a sentinel date doc
exports.completeSubtopic = async (req, res) => {
  try {
    const { batchId, courseId, studentIds, subtopicKey, teacherBatchId } = req.body;
    const teacherId = req.user.id;

    if (!batchId || !courseId || !subtopicKey || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'batchId, courseId, studentIds and subtopicKey are required' });
    }

    const teacherBatch = await resolveTeacherBatchForAction(teacherId, batchId, teacherBatchId);
    if (!teacherBatch) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this batch' });
    }

    const existing = await TopicCompletion.findOne({ batchId, courseId, date: SENTINEL_COMPLETION_DATE }).lean();
    if (existing?.completedSubtopicKeys?.includes(subtopicKey)) {
      return res.status(400).json({ success: false, message: 'This subtopic is already marked completed' });
    }

    await TopicCompletion.findOneAndUpdate(
      { batchId, courseId, date: SENTINEL_COMPLETION_DATE },
      {
        $set: { teacherId },
        $addToSet: {
          completedSubtopicKeys: subtopicKey,
          studentIds: { $each: studentIds },
        },
        $push: {
          subtopicCompletions: { subtopicKey, completedDate: new Date(), teacherId },
        },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Subtopic marked as fully completed' });
  } catch (error) {
    console.error('Error in completeSubtopic:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Get a student's syllabus completion status for ViewStudent page
exports.getStudentTopicProgress = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required' });
    }

    const course = await Course.findById(courseId).select('courseFullName syllabus').lean();
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const completions = await TopicCompletion.find({
      courseId,
      studentIds: studentId,
    }).select('completedTopicKeys completedSubtopicKeys').lean();

    const completedTopicKeys = new Set();
    const completedSubtopicKeys = new Set();
    completions.forEach((c) => {
      (c.completedTopicKeys || []).forEach((k) => completedTopicKeys.add(k));
      (c.completedSubtopicKeys || []).forEach((k) => completedSubtopicKeys.add(k));
    });

    const syllabusStatus = [];
    (course.syllabus || []).forEach((sem, sIdx) => {
      (sem.topics || []).forEach((topic, tIdx) => {
        const topicKey = `${sIdx}_${tIdx}`;
        syllabusStatus.push({
          key: topicKey,
          name: topic.name,
          semesterName: sem.name,
          completed: completedTopicKeys.has(topicKey),
          subtopics: (topic.subtopics || []).map((sub, subIdx) => {
            const subKey = `${sIdx}_${tIdx}_${subIdx}`;
            return { key: subKey, name: sub.name, completed: completedSubtopicKeys.has(subKey) };
          }),
        });
      });
    });

    res.json({ success: true, data: { courseName: course.courseFullName, syllabus: syllabusStatus } });
  } catch (error) {
    console.error('Error in getStudentTopicProgress:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBatchCourseProgress = async (req, res) => {
  try {
    const { batchId } = req.query;
    const tbQuery = { isActive: true };
    if (batchId) tbQuery.batch = batchId;

    const teacherBatches = await TeacherBatch.find(tbQuery)
      .populate('batch', 'batchName displayName startTime endTime')
      .populate('teacher', 'name')
      .populate('assignedStudents.student', 'studentId fullName courseCode course additionalCourses')
      .lean();

    const batchCourseMap = {};

    teacherBatches.forEach((tb) => {
      if (!tb.batch) return;
      const bId = tb.batch._id.toString();
      if (!batchCourseMap[bId]) {
        batchCourseMap[bId] = {
          batchInfo: {
            _id: tb.batch._id,
            batchName: tb.batch.batchName,
            displayName: tb.batch.displayName,
            startTime: tb.batch.startTime,
            endTime: tb.batch.endTime,
          },
          teachers: new Set(),
          courses: {},
        };
      }
      if (tb.teacher?.name) batchCourseMap[bId].teachers.add(tb.teacher.name);

      const bIdStr = bId;
      const activeStudents = (tb.assignedStudents || []).filter((s) => s.isActive && s.student);
      activeStudents.forEach((as) => {
        const student = as.student;

        // Resolve the ONE course this student is actually attending in THIS batch —
        // prefer an additionalCourses entry scoped to this batch, else fall back to primary courseCode.
        let applicableCourseId = student.courseCode ? student.courseCode.toString() : null;
        if (student.additionalCourses?.length > 0) {
          const ac = student.additionalCourses.find(
            (a) => a.isActive && a.courseId && a.batchId && a.batchId.toString() === bIdStr
          );
          if (ac) applicableCourseId = ac.courseId.toString();
        }

        if (applicableCourseId) {
          if (!batchCourseMap[bId].courses[applicableCourseId]) {
            batchCourseMap[bId].courses[applicableCourseId] = { studentIds: new Set() };
          }
          batchCourseMap[bId].courses[applicableCourseId].studentIds.add(student._id.toString());
        }
      });
    });

    const allCourseIds = new Set();
    Object.values(batchCourseMap).forEach((b) => Object.keys(b.courses).forEach((cid) => allCourseIds.add(cid)));
    const courses = await Course.find({ _id: { $in: [...allCourseIds] } }).select('courseFullName syllabus').lean();
    const courseMap = {};
    courses.forEach((c) => { courseMap[c._id.toString()] = c; });

    const result = [];

    for (const [bId, bData] of Object.entries(batchCourseMap)) {
      const courseResults = [];

      for (const [cid, cData] of Object.entries(bData.courses)) {
        const course = courseMap[cid];
        if (!course) continue;
        const studentIds = [...cData.studentIds];

        const completions = await TopicCompletion.find({
          batchId: bId, courseId: cid, studentIds: { $in: studentIds },
        }).select('completedSubtopicKeys subtopicCompletions studentIds date teacherId').lean();

        // Collect every teacherId we'll need to resolve to a name
        const teacherIdsNeeded = new Set();

        const subtopicTaught = {}, subtopicCompleted = {};
        const subtopicDatesSet = {};
        const subtopicLastTeacher = {}; // subKey -> teacherId (from most recent daily doc)
        const subtopicCompletionInfo = {}; // subKey -> { completedDate, teacherId }

        studentIds.forEach((sid) => { subtopicTaught[sid] = new Set(); subtopicCompleted[sid] = new Set(); });

        completions.forEach((c) => {
          const isSentinel = new Date(c.date).getTime() === SENTINEL_COMPLETION_DATE.getTime();
          (c.studentIds || []).forEach((sid) => {
            const sidStr = sid.toString();
            if (!subtopicTaught[sidStr]) return;
            (c.completedSubtopicKeys || []).forEach((k) => {
              if (isSentinel) {
                subtopicCompleted[sidStr].add(k);
              } else {
                subtopicTaught[sidStr].add(k);
                if (!subtopicDatesSet[k]) subtopicDatesSet[k] = new Set();
                subtopicDatesSet[k].add(new Date(c.date).toISOString().split('T')[0]);
                if (c.teacherId) {
                  subtopicLastTeacher[k] = c.teacherId.toString();
                  teacherIdsNeeded.add(c.teacherId.toString());
                }
              }
            });
          });
          if (isSentinel) {
            (c.subtopicCompletions || []).forEach((sc) => {
              subtopicCompletionInfo[sc.subtopicKey] = {
                completedDate: sc.completedDate,
                teacherId: sc.teacherId ? sc.teacherId.toString() : null,
              };
              if (sc.teacherId) teacherIdsNeeded.add(sc.teacherId.toString());
            });
          }
        });

        const teacherDocs = teacherIdsNeeded.size > 0
          ? await User.find({ _id: { $in: [...teacherIdsNeeded] } }).select('name').lean()
          : [];
        const teacherNameMap = {};
        teacherDocs.forEach((t) => { teacherNameMap[t._id.toString()] = t.name; });

        let totalSubtopics = 0, completedSubtopics = 0;
        const subtopicDetails = [];

        (course.syllabus || []).forEach((sem, sIdx) => {
          (sem.topics || []).forEach((topic, tIdx) => {
            (topic.subtopics || []).forEach((sub, subIdx) => {
              totalSubtopics++;
              const subKey = `${sIdx}_${tIdx}_${subIdx}`;
              const sCompleted = studentIds.length > 0 && studentIds.every((sid) => subtopicCompleted[sid]?.has(subKey));
              const sTaught = studentIds.some((sid) => subtopicTaught[sid]?.has(subKey));
              if (sCompleted) completedSubtopics++;

              if (sCompleted || sTaught) {
                const dates = subtopicDatesSet[subKey] ? [...subtopicDatesSet[subKey]].sort() : [];
                const completionInfo = subtopicCompletionInfo[subKey];
                subtopicDetails.push({
                  subtopicKey: subKey,
                  topicName: topic.name,
                  subtopicName: sub.name,
                  status: sCompleted ? 'completed' : 'in_progress',
                  taughtDaysCount: dates.length,
                  startedDate: dates[0] || null,
                  lastTaughtDate: dates[dates.length - 1] || null,
                  completedDate: sCompleted ? (completionInfo?.completedDate || null) : null,
                  facultyName: sCompleted
                    ? (completionInfo?.teacherId ? teacherNameMap[completionInfo.teacherId] || 'Unknown' : 'Unknown')
                    : (subtopicLastTeacher[subKey] ? teacherNameMap[subtopicLastTeacher[subKey]] || 'Unknown' : 'Unknown'),
                });
              }
            });
          });
        });

        subtopicDetails.sort((a, b) => {
          if (a.status !== b.status) return a.status === 'in_progress' ? -1 : 1;
          return new Date(b.lastTaughtDate || 0) - new Date(a.lastTaughtDate || 0);
        });

        courseResults.push({
          courseId: cid,
          courseName: course.courseFullName,
          totalSubtopics,
          completedSubtopics,
          progressPercent: totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0,
          subtopicDetails,
          studentCount: studentIds.length,
        });
      }

      result.push({
        batchId: bId,
        ...bData.batchInfo,
        teachers: [...bData.teachers],
        courses: courseResults,
      });
    }

    result.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in getBatchCourseProgress:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: for a given batch+course+studentIds, find the current in-progress topic + its start date
const getCurrentTopicForCourse = async (batchId, courseId, studentIds, course) => {
  if (!course || studentIds.length === 0) return { topicName: null, startDate: null, subtopicName: null };

  const completions = await TopicCompletion.find({
  batchId, courseId, studentIds: { $in: studentIds },
}).select('completedSubtopicKeys completedTopicKeys studentIds date updatedAt').lean();

  const subtopicTaught = {}, subtopicCompleted = {}, subtopicFirstDate = {}, subtopicLastDate = {};
  // NEW — tracks activity on the topic ITSELF (used when a topic-with-subtopics was
  // marked via its own checkbox without touching any subtopic dropdown)
  const topicTaught = {}, topicFirstDate = {}, topicLastDate = {};
  studentIds.forEach((sid) => { subtopicTaught[sid] = new Set(); subtopicCompleted[sid] = new Set(); topicTaught[sid] = new Set(); });

  completions.forEach((c) => {
    const isSentinel = new Date(c.date).getTime() === SENTINEL_COMPLETION_DATE.getTime();
    // Use `date` for the DISPLAYED start-date (which day it was first taught),
    // but use `updatedAt` (full timestamp) to figure out what's most RECENT —
    // `date` only has day-precision, so same-day edits can't be ordered by it.
    const cDate = new Date(c.date);
    const cRecency = new Date(c.updatedAt || c.date);
    (c.studentIds || []).forEach((sid) => {
      const sidStr = sid.toString();
      if (!subtopicTaught[sidStr]) return;
      (c.completedSubtopicKeys || []).forEach((k) => {
        if (isSentinel) subtopicCompleted[sidStr].add(k);
        else {
          subtopicTaught[sidStr].add(k);
          if (!subtopicFirstDate[k] || cDate < subtopicFirstDate[k]) subtopicFirstDate[k] = cDate;
          if (!subtopicLastDate[k] || cRecency > subtopicLastDate[k]) subtopicLastDate[k] = cRecency;
        }
      });
      if (!isSentinel) {
        (c.completedTopicKeys || []).forEach((tk) => {
          topicTaught[sidStr].add(tk);
          if (!topicFirstDate[tk] || cDate < topicFirstDate[tk]) topicFirstDate[tk] = cDate;
          if (!topicLastDate[tk] || cRecency > topicLastDate[tk]) topicLastDate[tk] = cRecency;
        });
      }
    });
  });

  let currentTopic = null; // { topicName, startDate, lastActivity }
  let currentSubtopic = null;

  (course.syllabus || []).forEach((sem, sIdx) => {
    (sem.topics || []).forEach((topic, tIdx) => {
      const topicKey = `${sIdx}_${tIdx}`;
      const subKeys = (topic.subtopics || []).map((_, subIdx) => `${sIdx}_${tIdx}_${subIdx}`);

      // NEW — was the topic itself (not any subtopic) marked taught by anyone?
      const topicItselfTaught = studentIds.some((sid) => topicTaught[sid]?.has(topicKey));

      if (subKeys.length === 0) {
        // Topic has no subtopics at all — its own checkbox activity IS the only signal
        if (topicItselfTaught) {
          const tFirst = topicFirstDate[topicKey] || null;
          const tLast = topicLastDate[topicKey] || null;
          if (!currentTopic || (tLast && (!currentTopic.lastActivity || tLast > currentTopic.lastActivity))) {
            currentTopic = { topicName: topic.name, startDate: tFirst, lastActivity: tLast };
            currentSubtopic = null;
          }
        }
        return;
      }

      const allCompleted = studentIds.every((sid) =>
        subKeys.every((k) => subtopicCompleted[sid]?.has(k))
      );
      const anyTaught = studentIds.some((sid) =>
        subKeys.some((k) => subtopicTaught[sid]?.has(k))
      ) || topicItselfTaught; // NEW — checkbox-only activity also counts as "taught"

      if (anyTaught && !allCompleted) {
        const firstDates = subKeys.map((k) => subtopicFirstDate[k]).filter(Boolean);
        const lastDates = subKeys.map((k) => subtopicLastDate[k]).filter(Boolean);
        // NEW — fold in the topic-level date too, so checkbox-only saves count
        if (topicFirstDate[topicKey]) firstDates.push(topicFirstDate[topicKey]);
        if (topicLastDate[topicKey]) lastDates.push(topicLastDate[topicKey]);
        const earliest = firstDates.length > 0 ? new Date(Math.min(...firstDates.map((d) => d.getTime()))) : null;
        const mostRecentActivity = lastDates.length > 0 ? new Date(Math.max(...lastDates.map((d) => d.getTime()))) : null;

        // Pick whichever topic was touched MOST RECENTLY — not whichever started most recently
        if (!currentTopic || (mostRecentActivity && (!currentTopic.lastActivity || mostRecentActivity > currentTopic.lastActivity))) {
          currentTopic = { topicName: topic.name, startDate: earliest, lastActivity: mostRecentActivity };

          let bestSub = null;
          (topic.subtopics || []).forEach((sub, subIdx) => {
            const subKey = `${sIdx}_${tIdx}_${subIdx}`;
            const subCompleted = studentIds.every((sid) => subtopicCompleted[sid]?.has(subKey));
            const subTaught = studentIds.some((sid) => subtopicTaught[sid]?.has(subKey));
            if (subTaught && !subCompleted) {
              const lastDate = subtopicLastDate[subKey];
              if (!bestSub || (lastDate && (!bestSub.lastDate || lastDate > bestSub.lastDate))) {
                bestSub = { name: sub.name, lastDate };
              }
            }
          });
          currentSubtopic = bestSub ? bestSub.name : null;
        }
      }
    });
  });

  return {
    topicName: currentTopic?.topicName || null,
    startDate: currentTopic?.startDate || null,
    subtopicName: currentSubtopic,
  };
};

// Helper: checks whether EVERY subtopic in the course syllabus is marked completed
// for every one of the given students, under this batchId — used to detect a bridge
// batch that has finished its entire catch-up syllabus and is ready to merge back.
const isCourseFullyCompleted = async (batchId, courseId, studentIds, course) => {
  if (!course || studentIds.length === 0) return false;

  let totalSubtopics = 0;
  (course.syllabus || []).forEach((sem) => {
    (sem.topics || []).forEach((topic) => {
      totalSubtopics += (topic.subtopics || []).length;
    });
  });
  if (totalSubtopics === 0) return false;

  const completions = await TopicCompletion.find({
    batchId, courseId, studentIds: { $in: studentIds }, date: SENTINEL_COMPLETION_DATE,
  }).select('completedSubtopicKeys studentIds').lean();

  const subtopicCompleted = {};
  studentIds.forEach((sid) => { subtopicCompleted[sid] = new Set(); });
  completions.forEach((c) => {
    (c.studentIds || []).forEach((sid) => {
      const sidStr = sid.toString();
      if (!subtopicCompleted[sidStr]) return;
      (c.completedSubtopicKeys || []).forEach((k) => subtopicCompleted[sidStr].add(k));
    });
  });

  let allDone = true;
  (course.syllabus || []).forEach((sem, sIdx) => {
    (sem.topics || []).forEach((topic, tIdx) => {
      (topic.subtopics || []).forEach((sub, subIdx) => {
        const subKey = `${sIdx}_${tIdx}_${subIdx}`;
        if (!studentIds.every((sid) => subtopicCompleted[sid]?.has(subKey))) allDone = false;
      });
    });
  });
  return allDone;
};

exports.getBatchTopicBoard = async (req, res) => {
  try {
    const { batchId, facultyId } = req.query;

    const tbQuery = { isActive: true };
    if (batchId) tbQuery.batch = batchId;
    if (facultyId) {
      const userDoc = await User.findOne({ facultyId }).select('_id').lean();
      if (!userDoc) {
        return res.json({ success: true, data: [] });
      }
      tbQuery.teacher = userDoc._id;
    }

    const teacherBatches = await TeacherBatch.find(tbQuery)
      .populate('batch', 'batchName displayName startTime endTime')
      .populate('teacher', 'name')
      .populate('assignedStudents.student', 'studentId fullName courseCode additionalCourses')
      .lean();

    const allCourseIds = new Set();
    teacherBatches.forEach((tb) => {
      if (!tb.batch) return;
      const bIdStr = tb.batch._id.toString();
      (tb.assignedStudents || []).filter((s) => s.isActive && s.student).forEach((as) => {
        const student = as.student;
        if (student.courseCode) allCourseIds.add(student.courseCode.toString());
        (student.additionalCourses || []).forEach((ac) => {
          if (ac.isActive && ac.courseId && ac.batchId && ac.batchId.toString() === bIdStr) {
            allCourseIds.add(ac.courseId.toString());
          }
        });
      });
    });

    // Fetch these two independent things IN PARALLEL instead of sequentially
    const [bridgeBatches, allActiveSubs] = await Promise.all([
      BridgeBatch.find({ status: { $in: ['active', 'ready_to_merge'] } }).lean(),
      (() => {
        const now = new Date();
        const teacherIds = [...new Set(teacherBatches.filter((tb) => tb.teacher).map((tb) => tb.teacher._id.toString()))];
        return teacherIds.length > 0
          ? BatchSubstitution.find({
              onLeaveFacultyUser: { $in: teacherIds },
              isActive: true,
              fromDate: { $lte: now },
              toDate: { $gte: now },
            }).select('batch onLeaveFacultyUser substituteFacultyName').lean()
          : Promise.resolve([]);
      })(),
    ]);

    // O(1) lookup instead of one DB call per row
    const activeSubMap = {};
    allActiveSubs.forEach((s) => {
      activeSubMap[`${s.batch.toString()}_${s.onLeaveFacultyUser.toString()}`] = s.substituteFacultyName;
    });

    bridgeBatches.forEach((b) => allCourseIds.add(b.courseId.toString()));

    // Fetch names for every bridge student across all batches, once, up front
    const allBridgeStudentIds = new Set();
    bridgeBatches.forEach((b) => (b.studentIds || []).forEach((sid) => allBridgeStudentIds.add(sid.toString())));
    const bridgeStudentDocs = allBridgeStudentIds.size > 0
      ? await Student.find({ _id: { $in: [...allBridgeStudentIds] } }).select('fullName studentId').lean()
      : [];
    const bridgeStudentNameMap = {};
    const bridgeStudentAdmissionMap = {};
    bridgeStudentDocs.forEach((s) => {
      bridgeStudentNameMap[s._id.toString()] = s.fullName;
      bridgeStudentAdmissionMap[s._id.toString()] = s.studentId;
    });

    const courses = await Course.find({ _id: { $in: [...allCourseIds] } }).select('courseFullName courseShortName syllabus').lean();
    const courseMap = {};
    courses.forEach((c) => { courseMap[c._id.toString()] = c; });

    // Process every teacherBatch IN PARALLEL instead of one-by-one
    const rows = (await Promise.all(teacherBatches.map(async (tb) => {
      if (!tb.batch || !tb.teacher) return null;

      const substituteFacultyName = activeSubMap[`${tb.batch._id.toString()}_${tb.teacher._id.toString()}`] || null;

      const activeStudents = (tb.assignedStudents || []).filter((s) => s.isActive && s.student);

      // Resolve each student's ACTUAL applicable course for THIS batch —
      // prefer an additionalCourses entry scoped to this batch, else fall back to primary courseCode.
      const bIdStr = tb.batch._id.toString();
      const courseGroupMap = {}; // courseId -> Set of studentIds

      const studentCourseIdMap = {}; // studentId -> resolved courseId, for Total tooltip tags
      activeStudents.forEach((as) => {
        const student = as.student;
        let applicableCourseId = student.courseCode ? student.courseCode.toString() : null;
        if (student.additionalCourses?.length > 0) {
          const ac = student.additionalCourses.find(
            (a) => a.isActive && a.courseId && a.batchId && a.batchId.toString() === bIdStr
          );
          if (ac) applicableCourseId = ac.courseId.toString();
        }
        if (!applicableCourseId) return;
        if (!courseGroupMap[applicableCourseId]) courseGroupMap[applicableCourseId] = new Set();
        courseGroupMap[applicableCourseId].add(student._id.toString());
        studentCourseIdMap[student._id.toString()] = applicableCourseId;
      });

      // Compute current topic for EVERY course present in this batch, IN PARALLEL —
      // not just the dominant one, and not sequentially either
      const regularTopics = await Promise.all(
        Object.entries(courseGroupMap).map(async ([cid, sidSet]) => {
          const sids = [...sidSet];
          const topicInfo = await getCurrentTopicForCourse(tb.batch._id, cid, sids, courseMap[cid]);
          return {
            courseName: courseMap[cid]?.courseFullName || 'Course',
            studentCount: sids.length,
            startDate: topicInfo.startDate,
            topicName: topicInfo.topicName,
            subtopicName: topicInfo.subtopicName,
          };
        })
      );
      regularTopics.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));

      // Detect whether every course group has actually converged on the same TOPIC *and* SUBTOPIC —
      // matching topic name alone isn't enough, since two courses can be on the same topic
      // but different subtopics within it (that's still "mixed", not converged).
      const distinctTopicSubtopicPairs = new Set(
        regularTopics
          .map((t) => `${t.topicName || ''}||${t.subtopicName || ''}`)
          .filter((k) => k !== '||')
      );
      const hasConverged = distinctTopicSubtopicPairs.size <= 1;

      // Bridge students where this same person is the temp faculty, tied to this batch
      const relevantBridges = bridgeBatches.filter(
        (b) => b.tempFacultyId.toString() === tb.teacher._id.toString() && b.parentBatchId.toString() === tb.batch._id.toString()
      );
      let doubleExtra = 0, bridgeTopic = { topicName: null, startDate: null, subtopicName: null };
      let bridgeCompleted = false;
      if (relevantBridges.length > 0) {
        doubleExtra = relevantBridges.reduce((sum, b) => sum + (b.studentIds?.length || 0), 0);
        const b = relevantBridges[0];

        // Bridge completion lives directly on the BridgeBatch document itself
        // (selectedTopics/selectedSubtopics, each with their own `completed` flag) —
        // it is NOT stored in TopicCompletion, so read it straight from `b`.
        const topics = b.selectedTopics || [];
        const subtopics = b.selectedSubtopics || [];

        const allTopicsDone = topics.length === 0 || topics.every((t) => t.completed);
        const allSubtopicsDone = subtopics.length === 0 || subtopics.every((s) => s.completed);
        bridgeCompleted = (topics.length > 0 || subtopics.length > 0) && allTopicsDone && allSubtopicsDone;

        if (!bridgeCompleted) {
          // A topic's own checkbox can be ticked "complete" while its subtopics are still
          // pending (they're tracked independently) — so find "current" by PENDING SUBTOPIC
          // first, not by the topic-level flag, otherwise an already-checked topic hides
          // its own still-pending subtopics.
          let currentTopic = null;
          let currentSubtopicName = null;

          for (const t of topics) {
            const subsUnderTopic = subtopics.filter((s) => s.subtopicKey.startsWith(`${t.topicKey}_`));
            const pendingSub = subsUnderTopic.find((s) => !s.completed);
            if (pendingSub) {
              currentTopic = t;
              currentSubtopicName = pendingSub.subtopicName;
              break;
            }
          }
          // Fallback: no subtopic-level match found (e.g. topic has no subtopics at all) —
          // use the first topic not yet marked complete
          if (!currentTopic) {
            currentTopic = topics.find((t) => !t.completed) || null;
          }

          bridgeTopic = {
            topicName: currentTopic ? currentTopic.topicName : null,
            startDate: b.approvedDate || b.createdAt || null,
            subtopicName: currentSubtopicName,
          };
        }
      }

      const primary = regularTopics[0] || { topicName: null, startDate: null, subtopicName: null };

      // Build the name+tag list for the Total column tooltip: regular students first, then bridge students
      const studentList = [
        ...activeStudents.map((as) => {
          const cid = studentCourseIdMap[as.student._id.toString()];
          const admissionNo = as.student.studentId || '';
          return {
            name: as.student.fullName,
            tag: 'Reg',
            courseShortName: courseMap[cid]?.courseShortName || '',
            last4: admissionNo ? admissionNo.slice(-4) : '',
          };
        }),
        ...relevantBridges.flatMap((b) => {
          const cid = b.courseId.toString();
          return (b.studentIds || []).map((sid) => {
            const admissionNo = bridgeStudentAdmissionMap[sid.toString()] || '';
            return {
              name: bridgeStudentNameMap[sid.toString()] || 'Unknown',
              tag: 'Bridge',
              courseShortName: courseMap[cid]?.courseShortName || '',
              last4: admissionNo ? admissionNo.slice(-4) : '',
            };
          });
        }),
      ];

      return {
        batchId: tb.batch._id.toString(),
        batchTime: tb.batch.displayName || `${tb.batch.startTime} to ${tb.batch.endTime}`,
        batchStartTime: tb.batch.startTime,
        facultyName: tb.teacher.name,
        substituteFacultyName,
        bsCount: activeStudents.length,
        studentList,
        courseStartDate: primary.startDate,
        runningCourse: primary.topicName,
        runningSubtopic: primary.subtopicName,
        hasConverged,
        regularTopics,
        doubleExtra,
        bridgeStartDate: bridgeTopic.startDate,
        bridgeRunningCourse: bridgeTopic.topicName,
        bridgeRunningSubtopic: bridgeTopic.subtopicName,
        bridgeCompleted,
        total: activeStudents.length + doubleExtra,
      };
    }))).filter(Boolean);

    rows.sort((a, b) => (a.batchStartTime || '').localeCompare(b.batchStartTime || ''));
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getBatchTopicBoard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};