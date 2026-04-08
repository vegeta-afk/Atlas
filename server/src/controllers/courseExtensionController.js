const Student = require("../models/Student");
const Course = require("../models/Course");
const Faculty = require("../models/Faculty");
const TeacherBatch = require("../models/TeacherBatch");
const User = require("../models/user");
const { Batch } = require("../models/Setup");
const { generateFeeSchedule } = require("../utils/feeGenerator");
const mongoose = require("mongoose");

// @desc    Get eligible students for extension
// @route   GET /api/course-extension/eligible-students
// @access  Private (Admin)
exports.getEligibleStudents = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const filter = { isActive: true, status: "active" };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
        { admissionNo: { $regex: search, $options: "i" } },
      ];
    }

    // ✅ FIXED: removed .populate("courseCode") - courseCode is String type, cannot be populated
    const students = await Student.find(filter)
      .select("studentId fullName course admissionDate feeSchedule paidAmount balanceAmount enrolledBatches additionalCourses")
      .limit(20);

    const formattedStudents = students.map(student => {
      const admissionDate = new Date(student.admissionDate);
      const today = new Date();
      const diffDays = Math.ceil(Math.abs(today - admissionDate) / (1000 * 60 * 60 * 24));
      const currentMonth = Math.floor(diffDays / 30) + 1;
      const paidEntries = student.feeSchedule?.filter(m => m.paidAmount > 0) || [];
      const paidAmount = paidEntries.reduce((sum, m) => sum + (m.paidAmount || 0), 0);

      let totalPaid = paidAmount;
      if (student.additionalCourses && student.additionalCourses.length > 0) {
        student.additionalCourses.forEach(course => {
          if (course.feeSchedule) {
            course.feeSchedule.forEach(fee => {
              totalPaid += fee.paidAmount || 0;
            });
          }
        });
      }

      return {
        id: student._id,
        studentId: student.studentId,
        rollNo: student.studentId,
        name: student.fullName,
        courseName: student.course,         // ✅ course is a String field, use directly
        courseDuration: "N/A",              // ✅ no populate needed, duration not critical here
        admissionDate: student.admissionDate,
        currentMonth,
        paidMonths: paidEntries.length,
        paidAmount: totalPaid,
        balanceAmount: student.balanceAmount || 0,
        enrolledBatches: student.enrolledBatches || [],
        hasAdditionalCourses: (student.additionalCourses?.length || 0) > 0
      };
    });

    res.json({ success: true, data: formattedStudents });
  } catch (error) {
    console.error("❌ Get eligible students error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Get extension preview
// @route   POST /api/course-extension/preview
// @access  Private (Admin)
exports.getExtensionPreview = async (req, res) => {
  try {
    const { studentId, newCourseId, extensionMonth } = req.body;

    // ✅ FIXED: removed .populate("courseCode"), use courseCode2 if needed
    const student = await Student.findById(studentId);
    const newCourse = await Course.findById(newCourseId);

    if (!student || !newCourse) {
      return res.status(404).json({ success: false, message: "Student or course not found" });
    }

    // ✅ student.course is the primary course name (String) - use it directly
    const primaryCourseName = student.course;
    const newDuration = parseInt(newCourse.duration) || 0;
    const extensionMonthNum = parseInt(extensionMonth);

    const newMonthlyFee = parseFloat(newCourse.monthlyFee) || 0;
    const newExamFee = parseFloat(newCourse.examFee) || 0;
    const newExamMonths = newCourse.examMonths
      ? newCourse.examMonths.split(',').map(m => parseInt(m.trim()))
      : [];

    let additionalFees = 0;
    let examFeesTotal = 0;
    const examMonthsInExtension = [];

    for (let month = 1; month <= newDuration; month++) {
      const isExamMonth = newExamMonths.includes(month);
      const monthlyTotal = newMonthlyFee + (isExamMonth ? newExamFee : 0);
      additionalFees += monthlyTotal;
      
      if (isExamMonth) {
        examFeesTotal += newExamFee;
        examMonthsInExtension.push(month);
      }
    }

    const oldTotalFee = student.totalCourseFee || 0;
    const newTotalFee = oldTotalFee + additionalFees;
    const paidAmount = student.paidAmount || 0;

    res.json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.fullName,
          rollNo: student.studentId,
          currentCourse: primaryCourseName,
          admissionDate: student.admissionDate,
          currentMonth: extensionMonthNum,
          paidAmount,
        },
        oldCourse: {
          name: primaryCourseName,
        },
        newCourse: {
          name: newCourse.courseFullName,
          duration: newDuration,
          monthlyFee: newMonthlyFee,
          examFee: newExamFee,
          examMonths: newCourse.examMonths,
        },
        extension: {
          extensionMonth: extensionMonthNum,
          additionalFees,
          examFeesTotal,
          examMonthsInExtension,
          oldTotalFee,
          newTotalFee,
          monthsAdded: newDuration,
        },
      },
    });
  } catch (error) {
    console.error("❌ Extension preview error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Extend student course - add new course to student
// @route   POST /api/course-extension/extend
// @access  Private (Admin)
exports.extendStudentCourse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("\n" + "=".repeat(60));
    console.log("📚 COURSE EXTENSION - ADDING NEW COURSE");
    console.log("=".repeat(60));
    
    const {
      studentId,
      newCourseId,
      extensionReason,
      facultyId,
      batchTime
    } = req.body;

    console.log("Request body:", { studentId, newCourseId, facultyId, batchTime, extensionReason });

    // Find student
    const student = await Student.findById(studentId).session(session);

    if (!student) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Find new course
    const newCourse = await Course.findById(newCourseId).session(session);
    if (!newCourse) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "New course not found" });
    }

    // Find faculty
    const faculty = await Faculty.findById(facultyId).session(session);
    if (!faculty) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Faculty not found" });
    }

    // Primary course name comes from student.course (String field)
    const primaryCourseName = student.course;

    const newMonthlyFee = parseFloat(newCourse.monthlyFee) || 0;
    const newExamFee = parseFloat(newCourse.examFee) || 0;
    const newDuration = parseInt(newCourse.duration) || 0;
    const startDate = new Date(student.admissionDate);

    const examMonths = newCourse.examMonths
      ? newCourse.examMonths.split(',').map(m => parseInt(m.trim()))
      : [];

    // ============================================
    // STEP 1: Generate fee schedule for new course
    // ============================================
    const newFeeSchedule = [];

    for (let month = 1; month <= newDuration; month++) {
      const monthDate = new Date(startDate);
      monthDate.setMonth(startDate.getMonth() + month - 1);

      const isExamMonth = examMonths.includes(month);
      const examFee = isExamMonth ? newExamFee : 0;
      const totalFee = newMonthlyFee + examFee;

      const dueDate = new Date(monthDate);
      dueDate.setDate(5);

      newFeeSchedule.push({
        _id: new mongoose.Types.ObjectId(),
        month: monthDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        monthNumber: month,
        baseFee: newMonthlyFee,
        examFee: examFee,
        totalFee: totalFee,
        paidAmount: 0,
        balanceAmount: totalFee,
        status: "pending",
        dueDate: dueDate,
        paymentDate: null,
        receiptNo: "",
        paymentMode: "",
        isExamMonth: isExamMonth,
        remarks: ""
      });
    }

    console.log(`✅ Generated ${newFeeSchedule.length} months for new course`);

    const additionalFees = newFeeSchedule.reduce((sum, m) => sum + (m.totalFee || 0), 0);

    const batch = await Batch.findOne({ displayName: batchTime }).session(session);

    // ============================================
    // STEP 2: Build additionalCourse object
    // ============================================
    const additionalCourse = {
      _id: new mongoose.Types.ObjectId(),
      courseId: newCourse._id,
      courseName: newCourse.courseFullName,
      monthlyFee: newMonthlyFee,
      examFee: newExamFee,
      duration: newDuration,
      facultyId: faculty._id,
      facultyName: faculty.facultyName,
      batchTime: batchTime,
      batchId: batch?._id || null,
      feeSchedule: newFeeSchedule,
      attendance: [],
      payments: [],
      isActive: true,
      enrolledAt: new Date()
    };

    if (!student.additionalCourses) {
      student.additionalCourses = [];
    }
    student.additionalCourses.push(additionalCourse);

    // ============================================
    // STEP 3: Set courseCode2 to the new course ObjectId
    // ============================================
    student.courseCode2 = newCourse._id;

    // ============================================
    // STEP 4: Update fee totals
    // ============================================
    const newTotalFee = (student.totalCourseFee || 0) + additionalFees;
    student.totalCourseFee = newTotalFee;
    student.balanceAmount = newTotalFee - (student.paidAmount || 0);

    // ============================================
    // STEP 5: Add to extension history
    // ============================================
    if (!student.extensionHistory) {
      student.extensionHistory = [];
    }

    student.extensionHistory.push({
      fromCourse: primaryCourseName,
      toCourse: newCourse.courseFullName,
      extensionDate: new Date(),
      reason: extensionReason,
      extendedBy: req.user?.id,
      additionalFees: additionalFees,
      newTotalFee: newTotalFee,
    });

    // ============================================
    // STEP 6: Save student
    // ============================================
    console.log("💾 Saving student...");
    await student.save({ session });
    console.log("✅ Student saved successfully!");

    // ============================================
    // STEP 7: CREATE TEACHERBATCH FOR ADDITIONAL COURSE
    // ============================================
    console.log("\n🔍 Creating TeacherBatch for additional course...");

    // Find faculty user
    const facultyUser = await User.findOne({ facultyId: faculty._id });

    if (facultyUser) {
  // ✅ REMOVED: const batch = await Batch.findOne({ displayName: batchTime });
  
  if (batch) {  // batch is now available from above
    let teacherBatch = await TeacherBatch.findOne({
      teacher: facultyUser._id,
      batch: batch._id,
      isActive: true
    });

    if (!teacherBatch) {
      teacherBatch = new TeacherBatch({
        teacher: facultyUser._id,
        batch: batch._id,
        assignedStudents: [{
          student: student._id,
          assignedDate: new Date(),
          isActive: true
        }],
        isActive: true,
        roomNumber: "Default",
        subject: newCourse.courseFullName,
        assignedBy: req.user?.id
      });
      
      await teacherBatch.save();
      console.log(`✅ Created new TeacherBatch: ${teacherBatch._id}`);
    } else {
      const alreadyAssigned = teacherBatch.assignedStudents.some(
        s => s.student.toString() === student._id.toString()
      );
      
      if (!alreadyAssigned) {
        teacherBatch.assignedStudents.push({
          student: student._id,
          assignedDate: new Date(),
          isActive: true
        });
        await teacherBatch.save();
        console.log(`✅ Added student to existing TeacherBatch: ${teacherBatch._id}`);
      } else {
        console.log(`✅ Student already in TeacherBatch`);
      }
    }
  } else {
    console.log(`❌ Batch not found: ${batchTime}`);
    const availableBatches = await Batch.find({ isActive: true });
    console.log("📋 Available batches:");
    availableBatches.forEach(b => console.log(`   - ${b.displayName}`));
  }
} else {
  console.log(`❌ User not found for faculty: ${faculty.facultyName}`);
}

    await session.commitTransaction();
    session.endSession();

    console.log("\n✅ COURSE EXTENSION COMPLETE");
    console.log("=".repeat(60));

    res.json({
      success: true,
      message: "Course extended successfully - New course added",
      data: {
        studentId: student._id,
        studentName: student.fullName,
        primaryCourse: primaryCourseName,
        newCourse: newCourse.courseFullName,
        additionalFees: additionalFees,
        newTotalFee: student.totalCourseFee,
        newBalanceAmount: student.balanceAmount,
        monthsAdded: newDuration,
        additionalCourseId: additionalCourse._id
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("\n❌ COURSE EXTENSION ERROR:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      message: "Server error during course extension", 
      error: error.message 
    });
  }
};