const Student  = require("../models/Student");
const Course   = require("../models/Course");
const mongoose = require("mongoose");
const { generateConvertedFeeSchedule } = require("../utils/feeGenerator");

exports.testRoute = (req, res) => {
  res.json({ success: true, message: "Course conversion routes are working!", time: new Date().toISOString() });
};

// ─── HELPER: Add months without day overflow ─────────────────
function addMonthsSafe(baseDate, months) {
  const d = new Date(baseDate);
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ─── HELPER: "6, 14" → [6, 14] filtered to valid range ───────
function parseExamMonths(str, maxMonth = Infinity) {
  if (!str || str.trim() === "") return [];
  return str
    .split(",")
    .map(m => parseInt(m.trim(), 10))
    .filter(m => !isNaN(m) && m > 0 && m <= maxMonth);
}

// GET /api/course-conversion/eligible-students
exports.getEligibleStudents = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const filter = { isActive: true, status: "active" };
    if (search) {
      filter.$or = [
        { fullName:    { $regex: search, $options: "i" } },
        { studentId:   { $regex: search, $options: "i" } },
        { admissionNo: { $regex: search, $options: "i" } },
      ];
    }

    const students = await Student.find(filter)
      .populate("courseCode", "courseFullName duration")
      .select("studentId fullName course admissionDate feeSchedule paidAmount balanceAmount")
      .limit(20);

    const formattedStudents = students.map(student => {
  const courseDuration = parseInt(student.courseCode?.duration, 10) || 999;
  const paidEntries  = student.feeSchedule?.filter(m => m.paidAmount > 0) || [];
  const paidAmount   = paidEntries.reduce((sum, m) => sum + (m.paidAmount || 0), 0);
  const currentMonth = Math.min(paidEntries.length + 1, courseDuration);

      return {
        id: student._id, studentId: student.studentId, rollNo: student.studentId,
        name: student.fullName, courseName: student.course,
        courseDuration: student.courseCode?.duration || "N/A",
        admissionDate: student.admissionDate,
        currentMonth, paidMonths: paidEntries.length,
        paidAmount, balanceAmount: student.balanceAmount || 0,
      };
    });

    res.json({ success: true, data: formattedStudents });
  } catch (error) {
    console.error("❌ Get eligible students error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// POST /api/course-conversion/preview
exports.getConversionPreview = async (req, res) => {
  try {
    const { 
  studentId, 
  newCourseId, 
  conversionMonth,
  scholarshipPercent,
  finalMonthlyFee,
} = req.body;
    const student = await Student.findById(studentId).populate("courseCode");
    const newCourse = await Course.findById(newCourseId);

    if (!student || !newCourse)
      return res.status(404).json({ success: false, message: "Student or course not found" });

    const oldCourse = student.courseCode;
    const oldDuration = parseInt(oldCourse?.duration, 10) || 0;
    const newDuration = parseInt(newCourse.duration, 10) || 0;
    const conversionMonthNum = parseInt(conversionMonth, 10);
    const originalMonthlyFee = parseFloat(newCourse.monthlyFee) || 0;
const newMonthlyFee = (finalMonthlyFee && parseFloat(finalMonthlyFee) > 0)
  ? parseFloat(finalMonthlyFee)
  : originalMonthlyFee;
    const newExamFee = parseFloat(newCourse.examFee) || 0;

    // ✅ Get ALL paid months (regardless of month number)
    const allPaidEntries = student.feeSchedule?.filter(m => m.paidAmount > 0) || [];
    const actualCashPaid = allPaidEntries.reduce((sum, m) => sum + (m.paidAmount || 0), 0);
    const totalPaidMonths = allPaidEntries.length;

    // ✅ Count paid months BEFORE conversion (for display only)
    const paidBeforeConversion = student.feeSchedule?.filter(
      m => m.monthNumber < conversionMonthNum && m.paidAmount > 0
    ) || [];
    const paidBeforeConversionCount = paidBeforeConversion.length;

    // New course always contributes its FULL duration, starting at conversionMonth
    const monthsAfterConversion = newDuration;
    if (newDuration <= 0)
      return res.status(400).json({ 
        success: false, 
        message: "Selected course has invalid duration" 
      });

    // Parse exam months (relative to the NEW course's own numbering)
    const examMonths = newCourse.examMonths
      ? newCourse.examMonths.split(',').map(m => parseInt(m.trim())).filter(m => !isNaN(m))
      : [];

    // ✅ Calculate future fees for the new course's full duration
    let futureMonthlyTotal = 0;
    let futureExamTotal = 0;
    const futureExamMonths = [];

    for (let relativeMonth = 1; relativeMonth <= newDuration; relativeMonth++) {
      const absoluteMonth = conversionMonthNum - 1 + relativeMonth;
      const isExam = examMonths.includes(relativeMonth);
      futureMonthlyTotal += newMonthlyFee;
      if (isExam) {
        futureExamTotal += newExamFee;
        futureExamMonths.push(absoluteMonth);
      }
    }
    
    const futureFeeTotal = futureMonthlyTotal + futureExamTotal;

    // ✅ NEW TOTAL COURSE FEE = future fees + already paid amount
    const newTotalCourseFee = futureFeeTotal + actualCashPaid;
    
    // ✅ NEW BALANCE = future fees (what's left to pay)
    const newBalanceAmount = futureFeeTotal;
    
    // ✅ Fee difference = new total - old total
    const feeDifference = newTotalCourseFee - (student.totalCourseFee || 0);

    console.log("📊 PREVIEW CALCULATION:");
    console.log("   Actual cash paid:", actualCashPaid);
    console.log("   Future monthly total:", futureMonthlyTotal);
    console.log("   Future exam total:", futureExamTotal);
    console.log("   Future fee total:", futureFeeTotal);
    console.log("   New total course fee:", newTotalCourseFee);
    console.log("   New balance:", newBalanceAmount);

    res.json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.fullName,
          rollNo: student.studentId,
          currentCourse: oldCourse?.courseFullName,
          currentDuration: oldDuration,
          admissionDate: student.admissionDate,
          paidMonths: totalPaidMonths,
          paidAmount: actualCashPaid,
        },
        oldCourse: {
          name: oldCourse?.courseFullName,
          duration: oldDuration,
          monthlyFee: oldCourse?.monthlyFee,
          examFee: oldCourse?.examFee,
          examMonths: oldCourse?.examMonths,
        },
        newCourse: {
          name: newCourse.courseFullName,
          duration: newDuration,
          monthlyFee: newMonthlyFee,
          originalMonthlyFee: originalMonthlyFee,
          examFee: newExamFee,
          examMonths: newCourse.examMonths,
        },
        conversion: {
          conversionMonth: conversionMonthNum,
          paidMonthsBeforeConversion: paidBeforeConversionCount,
          totalPaidMonths: totalPaidMonths,
          actualCashPaid: actualCashPaid,
          oldTotalFee: student.totalCourseFee || 0,
          newTotalFee: newTotalCourseFee,
          futureFeeTotal: futureFeeTotal,
          newBalanceAmount: newBalanceAmount,
          remainingMonths: monthsAfterConversion,
          feeDifference: feeDifference,
          examMonthsAfterConversion: futureExamMonths,
          examFeeTotal: futureExamTotal,
          monthlyTotal: futureMonthlyTotal,
        },
      },
    });
  } catch (error) {
    console.error("❌ Preview error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// @desc    Convert student course
// @route   POST /api/course-conversion/convert
// @access  Private (Admin)
exports.convertStudentCourse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
  studentId,
  newCourseId,
  conversionMonth,
  conversionReason,
  convertedBy,
  hasScholarship,
  scholarshipPercent,
  finalMonthlyFee,
} = req.body;

    // Get student with current course details
    const student = await Student.findById(studentId)
      .populate("courseCode")
      .session(session);

    if (!student) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Get new course
    const newCourse = await Course.findById(newCourseId).session(session);
    if (!newCourse) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "New course not found"
      });
    }

    const oldCourse = student.courseCode;
    const conversionMonthNum = parseInt(conversionMonth);

    // Validate conversion month
    if (isNaN(conversionMonthNum) || conversionMonthNum < 1) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Invalid conversion month"
      });
    }

    // Calculate current month (based on paid months, not calendar time)
    const oldCourseDuration = parseInt(oldCourse?.duration, 10) || 999;
    const paidEntriesForCurrentMonth = student.feeSchedule?.filter(m => m.paidAmount > 0) || [];
    const currentMonth = Math.min(paidEntriesForCurrentMonth.length + 1, oldCourseDuration);

    if (conversionMonthNum < currentMonth) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Cannot convert in past months. Current month is ${currentMonth}`
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("🔄 COURSE CONVERSION - OLD COURSE WILL BE REPLACED");
    console.log("=".repeat(60));
    console.log("Student:", student.fullName);
    console.log("Old Course:", oldCourse?.courseFullName);
    console.log("New Course:", newCourse.courseFullName);
    console.log("Conversion Month:", conversionMonthNum);

    // ✅ USE THE NEW DEDICATED FUNCTION TO GENERATE CONVERTED FEE SCHEDULE
    const courseForSchedule = (hasScholarship && finalMonthlyFee && parseFloat(finalMonthlyFee) > 0)
  ? { ...newCourse.toObject(), monthlyFee: parseFloat(finalMonthlyFee) }
  : newCourse.toObject();

console.log("💰 Monthly fee for schedule:", courseForSchedule.monthlyFee, hasScholarship ? `(${scholarshipPercent}% scholarship)` : "(no scholarship)");

const newFeeSchedule = generateConvertedFeeSchedule(student, courseForSchedule, conversionMonthNum);

    if (!newFeeSchedule || newFeeSchedule.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({
        success: false,
        message: "Failed to generate converted fee schedule"
      });
    }

    // Calculate totals from new fee schedule
    const newTotalCourseFee = newFeeSchedule.reduce((sum, month) => sum + (month.totalFee || 0), 0);
    const newPaidAmount = newFeeSchedule.reduce((sum, month) => sum + (month.paidAmount || 0), 0);
    const newBalanceAmount = newTotalCourseFee - newPaidAmount;

    console.log("\n💰 FINANCIAL SUMMARY:");
    console.log("   Old Total Fee:", student.totalCourseFee || 0);
    console.log("   New Total Fee:", newTotalCourseFee);
    console.log("   Paid Amount (preserved):", newPaidAmount);
    console.log("   New Balance:", newBalanceAmount);

    const oldTotalFee = student.totalCourseFee || 0;
const oldPaidAmount = student.paidAmount || 0;

    // ✅ UPDATE STUDENT - OLD COURSE IS COMPLETELY REPLACED
    student.course = newCourse.courseFullName;
    student.courseCode = newCourse._id;
    student.feeSchedule = newFeeSchedule;
    student.totalCourseFee = newTotalCourseFee;
    student.paidAmount = newPaidAmount;
    student.balanceAmount = newBalanceAmount;

    if (hasScholarship && finalMonthlyFee && parseFloat(finalMonthlyFee) > 0) {
  student.hasScholarship = true;
  student.monthlyFee = parseFloat(finalMonthlyFee);
  student.scholarship = {
    applied: true,
    scholarshipName: `${scholarshipPercent}% Scholarship`,
    scholarshipCode: `SCH${scholarshipPercent}`,
    percent: parseFloat(scholarshipPercent),
    type: "percentage",
    originalMonthlyFee: newCourse.monthlyFee,
    finalMonthlyFee: parseFloat(finalMonthlyFee),
  };
  console.log(`🎓 Scholarship saved: ${scholarshipPercent}% → ₹${finalMonthlyFee}/month`);
}

    // Add conversion history
    if (!student.conversionHistory) {
      student.conversionHistory = [];
    }

    student.conversionHistory.push({
      fromCourse: oldCourse?.courseFullName,
      toCourse: newCourse.courseFullName,
      conversionMonth: conversionMonthNum,
      conversionDate: new Date(),
      reason: conversionReason,
      convertedBy: convertedBy || req.user?.id,
      oldTotalFee: oldTotalFee, 
      newTotalFee: newTotalCourseFee,
      oldPaidAmount: oldPaidAmount,
      newPaidAmount: newPaidAmount
    });

    await student.save({ session });
    await session.commitTransaction();
    session.endSession();

    // Calculate exam months in new schedule for response
    const examMonthsInNewSchedule = newFeeSchedule
      .filter(month => month.isExamMonth)
      .map(month => month.monthNumber);

    console.log("\n✅ CONVERSION COMPLETE");
    console.log("=".repeat(60));

    res.json({
      success: true,
      message: "Course converted successfully - Old course completely replaced",
      data: {
        studentId: student._id,
        studentName: student.fullName,
        oldCourse: oldCourse?.courseFullName,
        newCourse: newCourse.courseFullName,
        conversionMonth: conversionMonthNum,
        oldTotalFee: oldTotalFee,
        newTotalFee: newTotalCourseFee,
        oldPaidAmount: oldPaidAmount,
        newPaidAmount: newPaidAmount,
        newBalanceAmount: newBalanceAmount,
        examMonths: examMonthsInNewSchedule,
        totalExamFees: newFeeSchedule.reduce((sum, m) => sum + (m.examFee || 0), 0),
        paidMonths: newFeeSchedule.filter(m => m.paidAmount > 0).length,
        totalMonths: newFeeSchedule.length
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("❌ Course conversion error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during course conversion",
      error: error.message
    });
  }
};