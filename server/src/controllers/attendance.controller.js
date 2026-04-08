// controllers/attendance.controller.js
const Attendance = require('../models/Attendance');
const TeacherBatch = require('../models/TeacherBatch');
const AttendanceSummary = require('../models/AttendanceSummary');
const Student = require('../models/Student');
const { Batch } = require('../models/Setup');
const activeQRSessions = new Map();


setInterval(() => {
  const now = Date.now();
  for (const [key, session] of activeQRSessions.entries()) {
    if (now > session.expiresAt) activeQRSessions.delete(key);
  }
}, 30 * 60 * 1000);

exports.generateQR = async (req, res) => {
  try {
    const { batchId } = req.body;
    const teacherId = req.user.id;

    // Verify teacher owns this batch
    const teacherBatch = await TeacherBatch.findOne({
      teacher: teacherId,
      batch: batchId,
      isActive: true
    }).populate('batch', 'batchName startTime endTime displayName');

    if (!teacherBatch) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this batch'
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2 hours

    const sessionKey = `${batchId}_${today}`;
    activeQRSessions.set(sessionKey, {
      token,
      teacherId: teacherId.toString(),
      batchId: batchId.toString(),
      date: today,
      expiresAt
    });

    const qrPayload = JSON.stringify({
      batchId: batchId.toString(),
      date: today,
      teacherId: teacherId.toString(),
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
    const studentMongoId = req.user.id;

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
    const student = await Student.findById(studentMongoId);
    let courseType = 'primary';

    if (student?.additionalCourses?.length > 0) {
      const isAdditional = student.additionalCourses.some(
        ac => ac.batchId?.toString() === batchId.toString() && ac.isActive
      );
      if (isAdditional) courseType = 'additional';
    }

    const checkInTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true
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
    const teacherBatches = await TeacherBatch.find({
      teacher: teacherId,
      isActive: true
    })
    .populate('batch', 'batchName startTime endTime displayName')
    .lean();

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
    const teacherBatch = await TeacherBatch.findOne({
      teacher: teacherId,
      batch: batchId,
      isActive: true
    })
    .populate(
      'assignedStudents.student',
      'studentId fullName photo mobileNumber email fatherName enrolledBatches course'
    )
    .populate('batch', 'batchName startTime endTime displayName')
    .lean();

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

      return {
        _id: student._id,
        studentId: student.studentId,
        fullName: student.fullName,
        fatherName: student.fatherName || 'N/A',
        photo: student.photo,
        contact: student.mobileNumber,
        email: student.email,
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
    const { batchId, date, attendance } = req.body;
    const teacherId = req.user.id;
    const teacherName = req.user.name || req.user.fullName;

    // Verify teacher has access to this batch
    const teacherBatch = await TeacherBatch.findOne({
      teacher: teacherId,
      batch: batchId,
      isActive: true
    }).populate('batch', 'batchName startTime endTime displayName');

    if (!teacherBatch) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this batch'
      });
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
    const attendanceDate = new Date(date);
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
    teacher: teacherId,
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
        update: { $set: record },
        upsert: true
      }
    }));

    const result = await Attendance.bulkWrite(operations);

await Promise.all(attendance.map(async (record) => {
  const student = await Student.findById(record.studentId);
  if (!student) return;

  // Determine primary vs additional
  let additionalCourseIndex = -1;
  if (student.additionalCourses && student.additionalCourses.length > 0) {
    additionalCourseIndex = student.additionalCourses.findIndex(ac => {
      if (ac.batchId && batchId) {
        return ac.batchId.toString() === batchId.toString();
      }
      return normalize(ac.batchTime) === normalize(batchDisplayName) ||
             normalize(ac.batchTime) === normalize(batchTimeString);
    });
  }

  const courseType = additionalCourseIndex !== -1 ? 'additional' : 'primary';
  console.log(`📌 Student ${record.studentId} → courseType: ${courseType}`);

  // ✅ Update the Attendance record with courseType in ONE step
  await Attendance.findOneAndUpdate(
    {
      student: record.studentId,
      teacher: teacherId,
      batch: batchId,
      date: attendanceDate
    },
    { $set: { courseType } }
  );

  // ✅ Update student document
  if (additionalCourseIndex !== -1) {
    await Student.findByIdAndUpdate(record.studentId, {
      $push: {
        [`additionalCourses.${additionalCourseIndex}.attendance`]: {
          date: attendanceDate,
          status: record.status,
          markedBy: teacherName,
          remarks: record.remarks || ''
        }
      }
    });
  } else {
    await Student.findByIdAndUpdate(record.studentId, {
      $push: {
        attendance: {
          date: attendanceDate,
          status: record.status,
          markedBy: teacherName,
          remarks: record.remarks || ''
        }
      }
    });
  }
}));
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