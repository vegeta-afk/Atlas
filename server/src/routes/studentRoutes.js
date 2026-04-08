const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const Admission = require("../models/Admission");
const Course = require("../models/Course");
const { protect , authorize } = require("../middlewares/authMiddleware");
const { generateFeeSchedule } = require("../utils/feeGenerator");
const studentController = require("../controllers/studentController");
const User = require("../models/user");
const bcrypt = require("bcryptjs");


router.use(protect);

// ========== SPECIFIC ROUTES FIRST ==========

// @route   GET /api/students/test-public
router.get("/test-public", async (req, res) => {
  try {
    console.log("🎯 Public test route called");
    res.json({
      success: true,
      message: "Public route working!",
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   GET /api/students/debug-simple
router.get("/debug-simple", async (req, res) => {
  try {
    console.log("🔍 Simple debug route called");
    const activeStudents = await Student.countDocuments({ isActive: true });
    const inactiveStudents = await Student.countDocuments({ isActive: false });
    const totalStudents = await Student.countDocuments({});
    const sampleStudent = await Student.findOne({});

    res.json({
      success: true,
      counts: {
        total: totalStudents,
        active: activeStudents,
        inactive: inactiveStudents,
      },
      hasStudents: totalStudents > 0,
      sampleStudent: sampleStudent
        ? {
            id: sampleStudent._id,
            studentId: sampleStudent.studentId,
            name: sampleStudent.fullName,
            isActive: sampleStudent.isActive,
            status: sampleStudent.status,
          }
        : null,
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

// @route   GET /api/students/debug/db
router.get("/debug/db", async (req, res) => {
  try {
    console.log("🔍 Debug route called");
    const mongoose = require("mongoose");
    const dbState = mongoose.connection.readyState;
    const dbStates = [
      "disconnected",
      "connected",
      "connecting",
      "disconnecting",
    ];

    console.log(`📊 MongoDB State: ${dbStates[dbState]} (${dbState})`);

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log("📋 Collections in database:");
    collections.forEach((col) => console.log(`  - ${col.name}`));

    const studentCollectionExists = collections.some(
      (col) => col.name === "students"
    );
    console.log(`📊 Student collection exists: ${studentCollectionExists}`);

    const studentCount = await Student.countDocuments({});
    const allCount = await Student.countDocuments({ isActive: true });

    console.log(`📈 Total students: ${studentCount}`);
    console.log(`📈 Active students: ${allCount}`);

    const sampleStudent = await Student.findOne({}).limit(1);

    res.json({
      success: true,
      data: {
        dbConnection: dbStates[dbState],
        collections: collections.map((c) => c.name),
        studentCollectionExists,
        counts: {
          totalStudents: studentCount,
          activeStudents: allCount,
        },
        sampleStudent: sampleStudent || null,
      },
    });
  } catch (error) {
    console.error("❌ Debug route error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// @route   GET /api/students/test-import
router.get("/test-import", async (req, res) => {
  try {
    console.log("🧪 Test import route called");
    const admissions = await Admission.find({ status: { $ne: "admitted" } })
      .limit(5)
      .select("_id admissionNo fullName course status");

    console.log(
      `Found ${admissions.length} admissions not marked as 'admitted'`
    );

    if (admissions.length === 0) {
      const totalAdmissions = await Admission.countDocuments({});
      return res.json({
        success: true,
        message: "No admissions found to import",
        totalAdmissions: totalAdmissions,
        admissions: [],
      });
    }

    res.json({
      success: true,
      message: `Found ${admissions.length} admissions ready for import`,
      admissions: admissions,
      testCommand: `curl -X POST http://localhost:5000/api/students/bulk-import -H "Content-Type: application/json" -d '{"admissionIds": ["${admissions[0]._id}"]}'`,
    });
  } catch (error) {
    console.error("Test import error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// @route   GET /api/students/admission-student-links
router.get("/admission-student-links", async (req, res) => {
  try {
    console.log("🔗 Checking admission-student links...");
    const students = await Student.find({ admissionId: { $exists: true } })
      .select("admissionId studentId fullName isActive status")
      .populate("admissionId", "admissionNo fullName status");

    const admissions = await Admission.find({})
      .select("admissionNo fullName status")
      .limit(10);

    res.json({
      success: true,
      studentsWithAdmissions: students,
      totalStudentsWithAdmissions: students.length,
      sampleAdmissions: admissions,
    });
  } catch (error) {
    console.error("Admission-student links error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// @route   GET /api/students/check-all-admissions
router.get("/check-all-admissions", async (req, res) => {
  try {
    console.log("📊 Checking ALL admissions...");
    const totalAdmissions = await Admission.countDocuments({});
    const admissions = await Admission.find({})
      .limit(5)
      .select("_id admissionNo fullName course status admissionDate");

    const statusCounts = await Admission.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      totalAdmissions: totalAdmissions,
      statusCounts: statusCounts,
      admissions: admissions,
    });
  } catch (error) {
    console.error("Check all admissions error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== ROOT ROUTE ==========

// @route   GET /api/students
router.get("/", async (req, res) => {
  try {
    console.log("📋 GET /api/students called");
    console.log("📊 Query params:", req.query);

    const students = await Student.find({ isActive: true })
      .sort({ createdAt: -1 })
      .populate("admissionId", "admissionNo admissionDate fullName")
      .populate("courseCode", "courseFullName duration monthlyFee examFee");

    console.log(`✅ Found ${students.length} students`);

    if (students.length === 0) {
      console.log("⚠️ No students found in database");
      const count = await Student.countDocuments({});
      console.log(`📊 Total documents in Student collection: ${count}`);
    } else {
      console.log("📝 First student:", {
        id: students[0]._id,
        studentId: students[0].studentId,
        name: students[0].fullName,
        course: students[0].course,
      });
    }

    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error("❌ Error fetching students:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// ========== POST ROUTES ==========

// @route   POST /api/students/bulk-import
router.post("/bulk-import", async (req, res) => {
  try {
    console.log("🔵 Bulk import request received");
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));
    console.log("👤 req.user =", req.user);
    const { admissionIds } = req.body;

    if (
      !admissionIds ||
      !Array.isArray(admissionIds) ||
      admissionIds.length === 0
    ) {
      console.log("❌ No admission IDs provided");
      return res.status(400).json({
        success: true,
        message: "No admission IDs provided",
      });
    }

    console.log(`🔄 Processing ${admissionIds.length} admissions`);

    const results = {
      successful: 0,
      failed: 0,
      errors: [],
      students: [],
    };

    for (let i = 0; i < admissionIds.length; i++) {
      const admissionId = admissionIds[i];
      console.log(
        `\n--- Processing admission ${i + 1}/${
          admissionIds.length
        }: ${admissionId} ---`
      );

      try {
        const admission = await Admission.findById(admissionId);

        if (!admission) {
          console.log(`❌ Admission not found: ${admissionId}`);
          results.errors.push(`Admission ${admissionId} not found`);
          results.failed++;
          continue;
        }

        console.log(
          `✅ Found admission: ${admission.admissionNo} - ${admission.fullName}`
        );

        const existingStudent = await Student.findOne({
          admissionId: admission._id,
        });

        if (existingStudent) {
          console.log(
            `⚠️ Student already exists for admission ${admission.admissionNo}`
          );
          results.errors.push(
            `Student already exists for admission ${admission.admissionNo}`
          );
          results.failed++;
          continue;
        }

        const course = await Course.findOne({
          courseFullName: admission.course,
        });

        if (!course) {
          console.log(`❌ Course not found: ${admission.course}`);
          results.errors.push(`Course not found: ${admission.course}`);
          results.failed++;
          continue;
        }

        console.log(`✅ Found course: ${course.courseFullName}`);

        const duration = parseInt(course.duration) || 12;
        const examMonthsCount = course.examMonths ? course.examMonths.split(',').length : 0;
        
        const totalCourseFee = 
          (course.admissionFee || 0) +
          ((course.monthlyFee || 0) * duration) +
          ((course.examFee || 0) * examMonthsCount) +
          (course.otherCharges || 0);

        const studentData = {
          admissionId: admission._id,
          admissionNo: admission.admissionNo,
          fullName: admission.fullName,
          dateOfBirth: admission.dateOfBirth,
          gender: admission.gender,
          email:
            admission.email ||
            `${admission.fullName
              .replace(/\s+/g, ".")
              .toLowerCase()}@example.com`,
          mobileNumber: admission.mobileNumber,
          fatherName: admission.fatherName,
          fatherNumber: admission.fatherNumber,
          motherName: admission.motherName,
          motherNumber: admission.motherNumber,
          address: admission.address,
          city: admission.city,
          state: admission.state,
          pincode: admission.pincode,
          aadharNumber: admission.aadharNumber || "NOT_PROVIDED",
          course: admission.course,
          courseCode: course._id,
          specialization: admission.specialization || "General",
          batchTime: admission.batchTime || "Morning",
          facultyAllot: admission.facultyAllot || "Not Allotted",
          admissionDate: admission.admissionDate || new Date(),
          admissionYear: admission.admissionYear || new Date().getFullYear(),
          totalCourseFee: totalCourseFee,
          balanceAmount: totalCourseFee - (admission.paidFees || 0),
          monthlyFee: course.monthlyFee || 1000,
          examFee: course.examFee || 500,
          admissionFee: course.admissionFee || 500,
          otherCharges: course.otherCharges || 0,
          paidAmount: admission.paidFees || 0,
          lastQualification: admission.lastQualification || "12th",
          percentage: admission.percentage || "75",
          yearOfPassing: admission.yearOfPassing || "2024",
          schoolCollege: admission.schoolCollege || "Local School",
          cast: admission.cast || "General",
          speciallyAbled: admission.speciallyAbled || false,
          status: "active",
          isActive: true,
          createdBy: req.user.id,
        };

        studentData.enrolledBatches = [{
          courseId: course._id,
          courseName: course.courseFullName,
          monthlyFee: course.monthlyFee || 0,
          examFee: course.examFee || 0,
          startMonth: 1,
          duration: duration,
          isActive: true
        }];

        console.log("📝 Student data prepared:", {
          name: studentData.fullName,
          course: studentData.course,
          fees: studentData.totalCourseFee,
        });

        studentData.feeSchedule = generateFeeSchedule(
          course,
          studentData.admissionDate
        );

        console.log(
          "💰 Generated fee schedule with",
          studentData.feeSchedule.length,
          "months"
        );

        const student = new Student(studentData);
        console.log("💾 Attempting to save student to database...");

        const savedStudent = await student.save();

        console.log(
          `✅ Student saved successfully! Student ID: ${savedStudent.studentId}`
        );
        console.log(`📊 MongoDB ID: ${savedStudent._id}`);

        await studentController.createStudentUserAccount(savedStudent);

        admission.status = "admitted";
        admission.updatedAt = new Date();
        await admission.save();
        console.log(
          `✅ Admission ${admission.admissionNo} marked as 'admitted'`
        );

        results.students.push(savedStudent);
        results.successful++;
      } catch (error) {
        console.error(
          `❌ Error processing admission ${admissionId}:`,
          error.message
        );
        console.error("Stack trace:", error.stack);
        results.errors.push(
          `Error processing admission ${admissionId}: ${error.message}`
        );
        results.failed++;
      }
    }

    console.log("\n📊 Import Summary:");
    console.log(`✅ Successful: ${results.successful}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📋 Errors: ${results.errors.length}`);

    res.status(200).json({
      success: true,
      message: `Import completed: ${results.successful} successful, ${results.failed} failed`,
      results,
    });
  } catch (error) {
    console.error("❌ Critical error in bulk import:", error);
    console.error("Full error:", error.stack);
    res.status(500).json({
      success: false,
      message: "Server error during bulk import",
      error: error.message,
    });
  }
});



// ========== PAYMENT ROUTES ==========

// @route   POST /api/students/payment
router.post("/payment", async (req, res) => {
  try {
    console.log("💰 POST /api/students/payment");
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));

    const {
      studentId,
      months,
      amounts,
      paymentType,
      paymentDate,
      receiptNo,
      paymentMode,
      remarks,
      isPartial,
      partialAmount,
      promisedDate,
      fineAmount,
      fineReason,
      carryForward,
      carryForwardAmount,
      carryToMonth
    } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    console.log("🔍 Student fee schedule structure:");
    student.feeSchedule.forEach((fee, idx) => {
      console.log(`[${idx}] monthNumber: ${fee.monthNumber} (type: ${typeof fee.monthNumber}), month: "${fee.month}"`);
    });

    let totalPaid = 0;
    const updatedMonths = [];
    const errors = [];

    // Handle multiple months payment
    if (paymentType === "multiple" && Array.isArray(months) && Array.isArray(amounts)) {
      for (let i = 0; i < months.length; i++) {
        const monthNumber = months[i];
        const amount = parseFloat(amounts[i]) || 0;
        
        if (amount <= 0) continue;

        console.log(`\n--- Processing payment ${i + 1}/${months.length} ---`);
        console.log(`📅 Month number from frontend: ${monthNumber} (type: ${typeof monthNumber})`);
        console.log(`💰 Amount: ${amount}`);

        const monthNum = Number(monthNumber);
const { additionalCourseIndices } = req.body;
const acIndex = Array.isArray(additionalCourseIndices) ? additionalCourseIndices[i] : null;
const isAdditionalCourse = acIndex !== null && acIndex !== undefined;

let feeIndex, fee, feeArray;

if (isAdditionalCourse) {
  const ac = student.additionalCourses?.[acIndex];
  if (!ac) { errors.push(`Additional course ${acIndex} not found`); continue; }
  feeIndex = ac.feeSchedule.findIndex(f => f.monthNumber === monthNum);
  if (feeIndex === -1) { errors.push(`Month ${monthNumber} not found in additional course ${acIndex}`); continue; }
  feeArray = student.additionalCourses[acIndex].feeSchedule;
  fee = feeArray[feeIndex];
} else {
  feeIndex = student.feeSchedule.findIndex(f => f.monthNumber === monthNum);
  if (feeIndex === -1) {
    console.log(`❌ Could not find monthNumber ${monthNum} in fee schedule`);
    errors.push(`Month ${monthNumber} not found in fee schedule`);
    continue;
  }
  feeArray = student.feeSchedule;
  fee = feeArray[feeIndex];
}

console.log(`✅ Found fee at index ${feeIndex} for month ${monthNum}`);
        
        if (fee.status === "paid") {
          errors.push(`Month ${monthNumber} is already paid`);
          continue;
        }

        // FIXED CALCULATION - THIS WAS THE PROBLEM
        console.log(`🔢 Fee details before calculation:`, {
          monthNumber: fee.monthNumber,
          totalFee: fee.totalFee,
          typeOfTotalFee: typeof fee.totalFee,
          paidAmount: fee.paidAmount,
          typeOfPaidAmount: typeof fee.paidAmount,
          amountToAdd: amount
        });

        const feeTotal = parseFloat(fee.totalFee) || 0;
        const currentPaid = parseFloat(fee.paidAmount) || 0;
        const newPaidAmount = currentPaid + amount;
        const newBalance = Math.max(0, feeTotal - newPaidAmount);

        console.log(`💰 Fee calculation: total=${feeTotal}, currentPaid=${currentPaid}, newPaid=${newPaidAmount}, newBalance=${newBalance}`);

        // Update fee entry
        fee.paidAmount = newPaidAmount;
        fee.balanceAmount = newBalance; // THIS WAS NaN BEFORE!
        fee.status = newBalance === 0 ? "paid" : "partial";
        fee.paymentDate = new Date(paymentDate);
        fee.receiptNo = receiptNo;
        fee.paymentMode = paymentMode;
        fee.remarks = remarks || "";

        if (fineAmount > 0) {
          fee.fines = {
            amount: (fee.fines?.amount || 0) + fineAmount,
            reason: fineReason || "Late payment fine",
            waived: false
          };
        }

        if (paymentType === "promise" && promisedDate) {
          fee.status = "promised";
          fee.promisedDate = new Date(promisedDate);
          fee.finesPaused = true;
        }

        feeArray[feeIndex] = fee;
if (isAdditionalCourse) {
  student.markModified(`additionalCourses.${acIndex}.feeSchedule`);
} else {
  student.markModified("feeSchedule");
}
        totalPaid += amount;
        updatedMonths.push(monthNumber);
      }
    } 
    // Handle single month payment (backward compatibility)
    else if (months && amounts) {
      const monthNumber = months;
      const amount = parseFloat(amounts) || 0;
      
      const monthNum = Number(monthNumber);
      const feeIndex = student.feeSchedule.findIndex(
        f => f.monthNumber === monthNum
      );

      if (feeIndex === -1) {
        return res.status(404).json({
          success: false,
          message: `Month ${monthNumber} not found in fee schedule`,
        });
      }

      const fee = student.feeSchedule[feeIndex];
      
      if (fee.status === "paid") {
        return res.status(400).json({
          success: false,
          message: `Month ${monthNumber} is already paid`,
        });
      }

      // FIXED CALCULATION - THIS WAS THE PROBLEM
      console.log(`🔢 Fee details before calculation:`, {
        monthNumber: fee.monthNumber,
        totalFee: fee.totalFee,
        typeOfTotalFee: typeof fee.totalFee,
        paidAmount: fee.paidAmount,
        typeOfPaidAmount: typeof fee.paidAmount,
        amountToAdd: amount
      });

      const feeTotal = parseFloat(fee.totalFee) || 0;
      const currentPaid = parseFloat(fee.paidAmount) || 0;
      const newPaidAmount = currentPaid + amount;
      const newBalance = Math.max(0, feeTotal - newPaidAmount);

      console.log(`💰 Fee calculation: total=${feeTotal}, currentPaid=${currentPaid}, newPaid=${newPaidAmount}, newBalance=${newBalance}`);

      // Update fee entry
      fee.paidAmount = newPaidAmount;
      fee.balanceAmount = newBalance;
      fee.status = newBalance === 0 ? "paid" : "partial";
      fee.paymentDate = new Date(paymentDate);
      fee.receiptNo = receiptNo;
      fee.paymentMode = paymentMode;
      fee.remarks = remarks || "";

      if (fineAmount > 0) {
        fee.fines = {
          amount: (fee.fines?.amount || 0) + fineAmount,
          reason: fineReason || "Late payment fine",
          waived: false
        };
      }

      if (paymentType === "promise" && promisedDate) {
        fee.status = "promised";
        fee.promisedDate = new Date(promisedDate);
        fee.finesPaused = true;
      }

   student.feeSchedule[feeIndex] = fee;
student.markModified("feeSchedule");
      totalPaid = amount;
      updatedMonths.push(monthNumber);
    }

    // Handle carry forward
    if (carryForward && carryForwardAmount > 0 && carryToMonth) {
      const targetMonthIndex = student.feeSchedule.findIndex(
        f => f.monthNumber === carryToMonth
      );
      
      if (targetMonthIndex !== -1) {
        student.feeSchedule[targetMonthIndex].carryForwardAmount = 
          (student.feeSchedule[targetMonthIndex].carryForwardAmount || 0) + carryForwardAmount;
        student.feeSchedule[targetMonthIndex].status = "carry_forward";
      }
    }

    // Update student totals
    student.paidAmount = (student.paidAmount || 0) + totalPaid;
    student.balanceAmount = Math.max(0, student.totalCourseFee - student.paidAmount);

    // Add to payment history
    student.paymentHistory.push({
      date: new Date(paymentDate),
      amount: totalPaid,
      months: updatedMonths,
      receiptNo: receiptNo,
      collectedBy: req.user?.id || "admin",
      remarks: remarks || "",
      paymentType: paymentType,
      fineAmount: fineAmount || 0
    });

    await Student.findByIdAndUpdate(
  student._id,
  {
    feeSchedule: student.feeSchedule,
    additionalCourses: student.additionalCourses,
    paidAmount: student.paidAmount,
    balanceAmount: student.balanceAmount,
    paymentHistory: student.paymentHistory,
  },
  { new: true }
);

console.log(`✅ Payment recorded for ${student.fullName}`);
    console.log(`💰 Total: ₹${totalPaid}, Receipt: ${receiptNo}`);
    console.log(`📅 Months: ${updatedMonths.join(", ")}`);

    res.json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        studentId: student._id,
        studentName: student.fullName,
        totalPaid: totalPaid,
        receiptNo: receiptNo,
        balance: student.balanceAmount,
        updatedMonths: updatedMonths,
        errors: errors.length > 0 ? errors : undefined
      },
    });
  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// ========== NEW FEE MANAGEMENT ROUTES ==========

// @route   POST /api/students/:id/fees/pay
router.post("/:id/fees/pay", async (req, res) => {
  try {
    console.log("💰 POST /api/students/:id/fees/pay");
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const { 
      monthNumber, 
      amount, 
      paymentDate, 
      receiptNo, 
      paymentMode, 
      remarks,
      action = "add" 
    } = req.body;

    // Validate required fields
    if (!monthNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: "Month number and amount are required",
      });
    }

    const paymentAmount = parseFloat(amount);
    const monthNum = parseInt(monthNumber);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    // Find the fee entry
    const feeIndex = student.feeSchedule.findIndex(
      f => f.monthNumber === monthNum
    );

    if (feeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Month ${monthNumber} not found in fee schedule`,
      });
    }

    const fee = student.feeSchedule[feeIndex];
    
    // Check if payment exceeds month total
    const feeTotal = parseFloat(fee.totalFee) || 0;
    const currentPaid = parseFloat(fee.paidAmount) || 0;
    let newPaidAmount = currentPaid;
    
    if (action === "edit") {
      // Editing: set to new amount
      newPaidAmount = paymentAmount;
    } else {
      // Adding: add to existing amount
      newPaidAmount = currentPaid + paymentAmount;
    }
    
    // Check if payment exceeds month total
    if (newPaidAmount > feeTotal) {
      return res.status(400).json({
        success: false,
        message: `Payment (₹${newPaidAmount}) exceeds month total (₹${feeTotal})`,
      });
    }

    // Check if payment exceeds total course fee
    const totalPaidSoFar = student.paidAmount || 0;
    const paymentDifference = action === "edit" ? 
      (paymentAmount - currentPaid) : paymentAmount;
    const newTotalPaid = totalPaidSoFar + paymentDifference;
    
    if (newTotalPaid > student.totalCourseFee) {
      return res.status(400).json({
        success: false,
        message: "Payment would exceed total course fee",
      });
    }

    // Update fee entry
    const newBalance = feeTotal - newPaidAmount;
    fee.paidAmount = newPaidAmount;
    fee.balanceAmount = newBalance;
    fee.status = newBalance === 0 ? "paid" : "partial";
    fee.paymentDate = new Date(paymentDate || new Date());
    fee.receiptNo = receiptNo || `RC${Date.now()}`;
    fee.paymentMode = paymentMode || "cash";
    fee.remarks = remarks || "";

    student.feeSchedule[feeIndex] = fee;
student.markModified("feeSchedule");

    // Update student totals
    student.paidAmount = newTotalPaid;
    student.balanceAmount = Math.max(0, student.totalCourseFee - newTotalPaid);

    // Add to payment history
    student.paymentHistory.push({
      date: new Date(paymentDate || new Date()),
      amount: paymentAmount,
      months: [monthNum],
      receiptNo: receiptNo || `RC${Date.now()}`,
      collectedBy: req.user?.id || "admin",
      remarks: remarks || "",
      paymentType: "monthly",
    });

    student.markModified("feeSchedule");
    await student.save();

    console.log(`✅ Payment ${action === 'edit' ? 'updated' : 'recorded'} for ${student.fullName}`);
    console.log(`💰 Amount: ₹${paymentAmount}, Month: ${monthNumber}, Receipt: ${fee.receiptNo}`);

    res.json({
      success: true,
      message: `Payment ${action === 'edit' ? 'updated' : 'recorded'} successfully`,
      data: {
        studentId: student._id,
        studentName: student.fullName,
        amount: paymentAmount,
        receiptNo: fee.receiptNo,
        balance: student.balanceAmount,
        month: monthNumber,
        feeSchedule: student.feeSchedule,
        receipt: {
          receiptNo: fee.receiptNo,
          date: fee.paymentDate,
          studentId: student.studentId,
          studentName: student.fullName,
          course: student.course,
          month: fee.month || `Month ${monthNumber}`,
          amount: paymentAmount,
          paymentMode: fee.paymentMode,
          balance: student.balanceAmount,
          action: action
        }
      },
    });
  } catch (error) {
    console.error("Fee payment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @route   PUT /api/students/:id/fees/schedule
router.put("/:id/fees/schedule", async (req, res) => {
  try {
    console.log("📅 PUT /api/students/:id/fees/schedule");
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const { feeSchedule, totalCourseFee, paidAmount, balanceAmount } = req.body;
    
    // Validate fee schedule
    if (!Array.isArray(feeSchedule)) {
      return res.status(400).json({
        success: false,
        message: "Fee schedule must be an array",
      });
    }

    // Update fee schedule
    student.feeSchedule = feeSchedule;
    
    // Recalculate totals if not provided
    if (totalCourseFee === undefined || paidAmount === undefined || balanceAmount === undefined) {
      const newTotalCourseFee = feeSchedule.reduce((sum, fee) => sum + (fee.totalFee || 0), 0);
      const newPaidAmount = feeSchedule.reduce((sum, fee) => sum + (fee.paidAmount || 0), 0);
      const newBalanceAmount = Math.max(0, newTotalCourseFee - newPaidAmount);
      
      student.totalCourseFee = newTotalCourseFee;
      student.paidAmount = newPaidAmount;
      student.balanceAmount = newBalanceAmount;
    } else {
      // Use provided values
      if (totalCourseFee !== undefined) student.totalCourseFee = totalCourseFee;
      if (paidAmount !== undefined) student.paidAmount = paidAmount;
      if (balanceAmount !== undefined) student.balanceAmount = balanceAmount;
    }

    student.markModified("feeSchedule");
    await student.save();

    console.log(`✅ Fee schedule updated for ${student.fullName}`);
    console.log(`📊 Total months: ${feeSchedule.length}, Total fee: ₹${student.totalCourseFee}`);

    res.json({
      success: true,
      message: "Fee schedule updated successfully",
      data: {
        studentId: student._id,
        studentName: student.fullName,
        totalCourseFee: student.totalCourseFee,
        paidAmount: student.paidAmount,
        balanceAmount: student.balanceAmount,
        feeSchedule: student.feeSchedule,
      },
    });
  } catch (error) {
    console.error("Update fee schedule error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @route   PUT /api/students/:id/fees/month/:monthNumber
router.put("/:id/fees/month/:monthNumber", async (req, res) => {
  try {
    console.log("📝 PUT /api/students/:id/fees/month/:monthNumber");
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const monthNumber = parseInt(req.params.monthNumber);
    const { baseFee, examFee, isExamMonth, dueDate } = req.body;
    
    // Find the fee entry
    const feeIndex = student.feeSchedule.findIndex(
      f => f.monthNumber === monthNumber
    );

    if (feeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Month ${monthNumber} not found in fee schedule`,
      });
    }

    const fee = student.feeSchedule[feeIndex];
    
    // Calculate new total fee
    const newBaseFee = parseFloat(baseFee) || fee.baseFee || fee.monthlyFee || fee.amount || 0;
    const newExamFee = (isExamMonth ? parseFloat(examFee || 0) : 0);
    const newTotalFee = newBaseFee + newExamFee;
    
    // Calculate new balance
    const currentPaid = parseFloat(fee.paidAmount) || 0;
    const newBalance = newTotalFee - currentPaid;
    
    // Update fee entry
    student.feeSchedule[feeIndex] = {
      ...fee,
      baseFee: newBaseFee,
      monthlyFee: newBaseFee,
      amount: newBaseFee,
      isExamMonth: isExamMonth || false,
      examFee: newExamFee,
      totalFee: newTotalFee,
      balanceAmount: newBalance,
      status: newBalance === 0 ? "paid" : newBalance < newTotalFee ? "partial" : "pending",
      dueDate: dueDate || fee.dueDate,
    };

    // Recalculate student totals
    const totalCourseFee = student.feeSchedule.reduce((sum, f) => sum + (f.totalFee || 0), 0);
    const totalPaid = student.feeSchedule.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
    
    student.totalCourseFee = totalCourseFee;
    student.paidAmount = totalPaid;
    student.balanceAmount = Math.max(0, totalCourseFee - totalPaid);

    student.markModified("feeSchedule");
    await student.save();

    console.log(`✅ Month ${monthNumber} updated for ${student.fullName}`);
    console.log(`💰 New fee: ₹${newTotalFee} (Base: ₹${newBaseFee}, Exam: ₹${newExamFee})`);

    res.json({
      success: true,
      message: "Month fee updated successfully",
      data: {
        studentId: student._id,
        studentName: student.fullName,
        monthNumber: monthNumber,
        totalFee: newTotalFee,
        feeSchedule: student.feeSchedule,
      },
    });
  } catch (error) {
    console.error("Update month fee error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @route   DELETE /api/students/:id/fees/month/:monthNumber
router.delete("/:id/fees/month/:monthNumber", async (req, res) => {
  try {
    console.log("🗑️ DELETE /api/students/:id/fees/month/:monthNumber");

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const monthNumber = parseInt(req.params.monthNumber);
    
    // Remove the month
    const originalLength = student.feeSchedule.length;
    student.feeSchedule = student.feeSchedule.filter(
      f => f.monthNumber !== monthNumber
    );
    
    if (student.feeSchedule.length === originalLength) {
      return res.status(404).json({
        success: false,
        message: `Month ${monthNumber} not found in fee schedule`,
      });
    }

    // Renumber remaining months
    student.feeSchedule = student.feeSchedule.map((fee, index) => ({
      ...fee,
      monthNumber: index + 1,
    }));

    // Recalculate student totals
    const totalCourseFee = student.feeSchedule.reduce((sum, f) => sum + (f.totalFee || 0), 0);
    const totalPaid = student.feeSchedule.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
    
    student.totalCourseFee = totalCourseFee;
    student.paidAmount = totalPaid;
    student.balanceAmount = Math.max(0, totalCourseFee - totalPaid);

    student.markModified("feeSchedule");
    await student.save();

    console.log(`✅ Month ${monthNumber} deleted from ${student.fullName}'s fee schedule`);
    console.log(`📊 Remaining months: ${student.feeSchedule.length}`);

    res.json({
      success: true,
      message: "Month deleted successfully",
      data: {
        studentId: student._id,
        studentName: student.fullName,
        deletedMonth: monthNumber,
        remainingMonths: student.feeSchedule.length,
        feeSchedule: student.feeSchedule,
      },
    });
  } catch (error) {
    console.error("Delete month error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @route   DELETE /api/students/:id/fees/payment/:monthNumber
router.delete("/:id/fees/payment/:monthNumber", async (req, res) => {
  try {
    console.log("🗑️ DELETE /api/students/:id/fees/payment/:monthNumber");

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const monthNumber = parseInt(req.params.monthNumber);
    
    // Find the fee entry
    const feeIndex = student.feeSchedule.findIndex(
      f => f.monthNumber === monthNumber
    );

    if (feeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Month ${monthNumber} not found in fee schedule`,
      });
    }

    const fee = student.feeSchedule[feeIndex];
    const paidAmount = parseFloat(fee.paidAmount) || 0;
    
    if (paidAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: `No payment found for month ${monthNumber}`,
      });
    }

    // Reset payment details
    student.feeSchedule[feeIndex] = {
      ...fee,
      status: "pending",
      paymentDate: null,
      receiptNo: "",
      paymentMode: "",
      remarks: "",
      paidAmount: 0,
      balanceAmount: fee.totalFee || 0,
      fines: fee.fines ? { ...fee.fines, amount: 0 } : undefined,
      carryForwardAmount: 0,
    };

    // Recalculate student totals
    const totalPaid = student.feeSchedule.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
    
    student.paidAmount = totalPaid;
    student.balanceAmount = Math.max(0, student.totalCourseFee - totalPaid);

    student.markModified("feeSchedule");
    await student.save();

    console.log(`✅ Payment deleted for month ${monthNumber} for ${student.fullName}`);
    console.log(`💰 Refunded amount: ₹${paidAmount}`);

    res.json({
      success: true,
      message: "Payment deleted successfully",
      data: {
        studentId: student._id,
        studentName: student.fullName,
        monthNumber: monthNumber,
        refundedAmount: paidAmount,
        feeSchedule: student.feeSchedule,
      },
    });
  } catch (error) {
    console.error("Delete payment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// ========== SEARCH ROUTE ==========

// @route   GET /api/students/search
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const searchRegex = new RegExp(q, "i");
    
    const students = await Student.find({
      isActive: true,
      $or: [
        { admissionNo: searchRegex },
        { fullName: searchRegex },
        { studentId: searchRegex },
        { course: searchRegex }
      ]
    })
      .sort({ fullName: 1 })
      .select("studentId admissionNo fullName course monthlyFee paidAmount balanceAmount feeSchedule")
      .limit(50);

    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// ========== PARAMETERIZED ROUTES LAST ==========

// @route   GET /api/students/:id
router.get("/:id", async (req, res) => {
  try {
    console.log(`🔍 GET /api/students/:id called with ID: ${req.params.id}`);

    const isMongoId = req.params.id.match(/^[0-9a-fA-F]{24}$/);
const student = await Student.findOne(
  isMongoId
    ? { $or: [{ _id: req.params.id }, { admissionId: req.params.id }] }
    : { studentId: req.params.id }
)
.populate("admissionId")
.populate("courseCode", "courseFullName duration monthlyFee examFee examMonths");

    if (!student) {
      console.log(`❌ Student not found with ID: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    console.log(`✅ Found student: ${student.fullName} (${student.studentId})`);

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @route   GET /api/students/:id/fees
router.get("/:id/fees", async (req, res) => {
  try {
    console.log(
      `💰 GET /api/students/:id/fees for student ID: ${req.params.id}`
    );

    const isMongoId = req.params.id.match(/^[0-9a-fA-F]{24}$/);
const student = await Student.findOne(
  isMongoId ? { _id: req.params.id } : { studentId: req.params.id }
).populate("courseCode", "courseFullName duration monthlyFee examFee examMonths admissionFee otherCharges");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const course = student.courseCode;
    
    if (!student.feeSchedule || student.feeSchedule.length === 0) {
      console.log("🔄 Generating fee schedule as it's empty");
      student.feeSchedule = generateFeeSchedule(
        course,
        student.admissionDate
      );
      
      student.markModified("feeSchedule");
      await student.save();
    }

    const admissionDate = new Date(student.admissionDate);
    const duration = course?.duration || 12;
    
    const shouldStartFromNextMonth = 
      (duration === 15 || duration === 18) && 
      admissionDate.getDate() > 16;
    
    let startDate = new Date(admissionDate);
    if (shouldStartFromNextMonth) {
      startDate.setMonth(startDate.getMonth() + 1);
      startDate.setDate(1);
    }
    
  const feeSchedule = (() => {
  const admissionDate = new Date(student.admissionDate);
  const duration = course?.duration || 12;
  const shouldStartFromNextMonth = 
    (duration === 15 || duration === 18) && 
    admissionDate.getDate() > 16;
  let startDate = new Date(admissionDate);
  if (shouldStartFromNextMonth) {
    startDate.setMonth(startDate.getMonth() + 1);
    startDate.setDate(1);
  }

  return student.feeSchedule.map((fee, index) => {
    const isExamMonth = fee.isExamMonth || false;
    const examFee     = fee.examFee || 0;
    const baseFee     = fee.baseFee || fee.monthlyFee || student.monthlyFee || course?.monthlyFee || 0;
    const totalFee    = (fee.totalFee > 0) ? fee.totalFee : (baseFee + examFee);
    const paidAmount  = fee.paidAmount || 0;
    const pendingAmount = (fee.balanceAmount !== undefined && fee.balanceAmount >= 0)
      ? fee.balanceAmount
      : totalFee - paidAmount;

    let monthName = fee.month;
    if (!monthName || monthName.startsWith('Month ')) {
      const monthDate = new Date(startDate);
      monthDate.setMonth(startDate.getMonth() + ((fee.monthNumber || index + 1) - 1));
      monthName = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }

    return {
      _id:         fee._id || `fee-${index}`,
      monthNumber: fee.monthNumber || index + 1,
      month:       monthName,
      monthlyFee:  baseFee,
      examFee,
      totalFee,
      paidAmount,
      pendingAmount,
      balanceAmount: pendingAmount,
      status:      fee.status || (paidAmount === 0 ? "pending" : paidAmount >= totalFee ? "paid" : "partial"),
      isExamMonth,
      dueDate:     fee.dueDate || null,
      paymentDate: fee.paymentDate,
      receiptNo:   fee.receiptNo,
      paymentMode: fee.paymentMode,
      remarks:     fee.remarks,
    };
  });
})();

    const summary = {
      totalCourseFee: student.totalCourseFee || 
                     feeSchedule.reduce((sum, fee) => sum + fee.totalAmount, 0),
      paidAmount: student.paidAmount || 
                 feeSchedule.reduce((sum, fee) => sum + fee.paidAmount, 0),
      balanceAmount: student.balanceAmount || 
                    feeSchedule.reduce((sum, fee) => sum + fee.pendingAmount, 0),
      admissionFee: student.admissionFee || course?.admissionFee || 0,
      monthlyFee: student.monthlyFee || course?.monthlyFee || 0,
      examFee: student.examFee || course?.examFee || 0,
      otherCharges: student.otherCharges || course?.otherCharges || 0,

      totalInstallments: feeSchedule.length,
      paidInstallments: feeSchedule.filter((f) => f.status === "paid").length,
      partialInstallments: feeSchedule.filter((f) => f.status === "partial").length,
      pendingInstallments: feeSchedule.filter((f) => 
        f.status === "pending" || f.status === "overdue"
      ).length,
      overdueInstallments: feeSchedule.filter((f) => f.status === "overdue")
        .length,

      totalMonthlyFees: feeSchedule.reduce(
        (sum, fee) => sum + (fee.monthlyFee || 0),
        0
      ),
      totalExamFees: feeSchedule.reduce(
        (sum, fee) => sum + (fee.examFee || 0),
        0
      ),
    };

    const today = new Date();
    const nextPending = feeSchedule
      .filter((f) => 
        (f.status === "pending" || f.status === "partial") && 
        new Date(f.dueDate) >= today
      )
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

    if (nextPending) {
      summary.nextDue = {
        month: nextPending.month,
        dueDate: nextPending.dueDate,
        amount: nextPending.pendingAmount || nextPending.totalAmount,
        isExamMonth: nextPending.isExamMonth,
      };
    }

    res.json({
      success: true,
      data: {
        student: {
          _id: student._id,
          studentId: student.studentId,
          admissionNo: student.admissionNo,
          fullName: student.fullName,
          course: student.course,
          admissionDate: student.admissionDate,
          batch: student.batchTime || "N/A",
          status: student.status || "active",
          fatherName: student.fatherName,
          monthlyFee: student.monthlyFee,
          examFee: student.examFee,
          admissionFee: student.admissionFee,
          totalCourseFee: student.totalCourseFee,
          paidAmount: student.paidAmount,
          balanceAmount: student.balanceAmount,
          conversionHistory: student.conversionHistory || [],
          feeSchedule: feeSchedule
        },
        course: {
          _id: course?._id,
          courseFullName: course?.courseFullName || student.course,
          duration: course?.duration || 12,
          monthlyFee: course?.monthlyFee,
          examFee: course?.examFee,
          admissionFee: course?.admissionFee,
          examMonths: course?.examMonths,
          otherCharges: course?.otherCharges
        },
        summary,
        feeSchedule,
      },
    });
  } catch (error) {
    console.error("Get student fees error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @route   GET /api/students/:id/fees/overdue
router.get("/:id/fees/overdue", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const today = new Date();
    const overduePayments = student.feeSchedule.filter((fee) => {
      return fee.status === "pending" && new Date(fee.dueDate) < today;
    });

    let updated = false;
    overduePayments.forEach((fee) => {
      if (fee.status === "pending") {
        fee.status = "overdue";
        updated = true;
      }
    });

    if (updated) {
      student.markModified("feeSchedule");
      await student.save();
    }

    const totalOverdue = overduePayments.reduce((sum, fee) => {
      const totalFee = fee.totalFee || 0;
      return sum + totalFee;
    }, 0);

    res.json({
      success: true,
      data: {
        count: overduePayments.length,
        totalAmount: totalOverdue,
        overduePayments: overduePayments.map((fee) => ({
          month: fee.month,
          dueDate: fee.dueDate,
          amount: fee.totalFee || 0,
          daysOverdue: Math.floor(
            (today - new Date(fee.dueDate)) / (1000 * 60 * 60 * 24)
          ),
        })),
      },
    });
  } catch (error) {
    console.error("Overdue check error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @route   GET /api/students/:id/fees/receipt/:receiptNo
router.get("/:id/fees/receipt/:receiptNo", async (req, res) => {
  try {
    const { id, receiptNo } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const feeEntry = student.feeSchedule.find(
      (fee) => fee.receiptNo === receiptNo && fee.status === "paid"
    );

    if (!feeEntry) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    const receiptData = {
      receiptNo: feeEntry.receiptNo,
      date: feeEntry.paymentDate,
      studentId: student.studentId,
      studentName: student.fullName,
      course: student.course,
      month: feeEntry.month,
      amount: feeEntry.totalFee || 0,
      paymentMode: feeEntry.paymentMode,
      remarks: feeEntry.remarks,
    };

    res.json({
      success: true,
      data: receiptData,
    });
  } catch (error) {
    console.error("Get receipt error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});


router.put("/:id/additional-course-fees/schedule", async (req, res) => {
  try {
    const { additionalCourseIndex, feeSchedule } = req.body;

    if (additionalCourseIndex === undefined || !Array.isArray(feeSchedule)) {
      return res.status(400).json({ success: false, message: "additionalCourseIndex and feeSchedule are required" });
    }

    await Student.findByIdAndUpdate(
      req.params.id,
      { [`additionalCourses.${additionalCourseIndex}.feeSchedule`]: feeSchedule },
      { new: true }
    );

    res.json({ success: true, message: "Additional course fee schedule updated" });
  } catch (error) {
    console.error("Additional course fee schedule error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

router.get("/profile", protect, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const student = await Student.findOne({ studentId: req.user.studentId });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router; 