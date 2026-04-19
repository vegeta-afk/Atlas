const Student = require("../models/Student");
const Admission = require("../models/Admission");
const Course = require("../models/Course");
const { generateFeeSchedule } = require("../utils/feeGenerator");
const { generateFeeScheduleWithScholarship } = require("../utils/feeGenerator");

// @desc    Get all students
// @route   GET /api/students
// @access  Private
const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find({ isActive: true })
      .sort({ createdAt: -1 })
      .populate("admissionId", "admissionNo admissionDate")
      .populate("courseCode", "courseFullName duration monthlyFee examFee");

    res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate("admissionId")
      .populate(
        "courseCode",
        "courseFullName duration monthlyFee examFee examMonths numberOfExams"
      );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
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
};

// @desc    Create student from admission
// @route   POST /api/students/create-from-admission/:admissionId
// @access  Private
const createStudentFromAdmission = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.admissionId);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({
      admissionId: admission._id,
    });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: "Student already exists from this admission",
      });
    }

    // Get course details
    const course = await Course.findOne({
      courseFullName: admission.course,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found for this admission",
      });
    }

    // ========== CHECK FOR SCHOLARSHIP ==========
    const hasScholarship = admission.hasScholarship || false;
   let scholarshipData = null;
let finalTotalFee = 0;
let finalMonthlyFee = 0;
    
    if (hasScholarship && admission.scholarship) {
  const duration = parseInt(course.duration?.toString().match(/\d+/)?.[0]) || 12;
  const scholarshipData = admission.scholarship;

  // Use pre-calculated value if available
  finalTotalFee = scholarshipData.finalTotalFee || 0;
  finalMonthlyFee = scholarshipData.finalMonthlyFee || 0;

  // ✅ FALLBACK: Calculate if not pre-stored in admission
  if (!finalMonthlyFee || !finalTotalFee) {
    const originalMonthlyFee = parseFloat(course.monthlyFee) || 0;
    const examMonthsCount = course.examMonths ? course.examMonths.split(',').length : 0;
    const originalTotalFee = (course.admissionFee || 0) +
      (originalMonthlyFee * duration) +
      ((course.examFee || 0) * examMonthsCount) +
      (course.otherCharges || 0);

    const percent = scholarshipData.percent || scholarshipData.value || 0;
    finalMonthlyFee = originalMonthlyFee - (originalMonthlyFee * percent / 100);
    finalTotalFee = scholarshipData.finalTotalFee || 
      (originalTotalFee - (originalTotalFee * percent / 100));
  }

  console.log(`🎓 Scholarship applied:`);
  console.log(`   Original Monthly: ₹${course.monthlyFee}`);
  console.log(`   Final Monthly: ₹${finalMonthlyFee}`);   // Should now be 833
  console.log(`   Final Total: ₹${finalTotalFee}`);       // Should now be 12500
}

    // Create student object
    const studentData = {
      admissionId: admission._id,
      admissionNo: admission.admissionNo,
      fullName: admission.fullName,
      dateOfBirth: admission.dateOfBirth,
      gender: admission.gender,
      email: admission.email,
      mobileNumber: admission.mobileNumber,
      fatherName: admission.fatherName,
      fatherNumber: admission.fatherNumber,
      motherName: admission.motherName,
      motherNumber: admission.motherNumber,
      address: admission.address,
      city: admission.city,
      state: admission.state,
      pincode: admission.pincode,
      aadharNumber: admission.aadharNumber,
      course: admission.course,
      courseCode: course._id,
      specialization: admission.specialization,
      batchTime: admission.batchTime,
      facultyAllot: admission.facultyAllot || "Not Allotted",
      admissionDate: admission.admissionDate,
      admissionYear: admission.admissionYear,
      
      // ========== FEES ==========
      totalCourseFee: finalTotalFee,
      monthlyFee: finalMonthlyFee,  // ← THIS MUST BE THE DISCOUNTED FEE!
      examFee: course.examFee || 0,
      admissionFee: course.admissionFee || 0,
      otherCharges: course.otherCharges || 0,
      paidAmount: admission.paidFees || 0,
      balanceAmount: finalTotalFee - (admission.paidFees || 0),
      
      // ========== SCHOLARSHIP DATA ==========
      hasScholarship: hasScholarship,
      scholarship: scholarshipData,  // Store full scholarship object
      
      // Academic info
      lastQualification: admission.lastQualification,
      percentage: admission.percentage,
      yearOfPassing: admission.yearOfPassing,
      schoolCollege: admission.schoolCollege,
      createdBy: req.user?.id,
    };

    // Add enrolledBatches
    studentData.enrolledBatches = [{
      courseId: course._id,
      courseName: course.courseFullName,
      monthlyFee: finalMonthlyFee,  // Use discounted monthly fee
      examFee: course.examFee || 0,
      startMonth: 1,
      duration: parseInt(course.duration) || 12,
      isActive: true
    }];

    // ========== GENERATE FEE SCHEDULE ==========
    if (hasScholarship && scholarshipData) {
      // Use scholarship fee generator
      studentData.feeSchedule = generateFeeScheduleWithScholarship(
        course,
        scholarshipData,
        admission.admissionDate
      );
    } else {
      // Use regular fee generator
      studentData.feeSchedule = generateFeeSchedule(course, admission.admissionDate);
    }

    const student = new Student(studentData);
    await student.save();

    // ✅ AUTO-CREATE USER ACCOUNT FOR STUDENT
    await createStudentUserAccount(student);

    // Update admission status
    admission.status = "admitted";
    admission.updatedBy = req.user?.id;
    await admission.save();

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: student,
    });
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private
const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // ✅ Handle email change/removal — never store empty string
    if ("email" in req.body) {
      const newEmail = (req.body.email && req.body.email.trim())
        ? req.body.email.trim()
        : `${student.studentId.toLowerCase()}@student.lms`;

      req.body.email = newEmail;

      // Sync user account email
      const User = require("../models/user");
      const linkedUser = await User.findOne({ studentId: student.studentId });
      if (linkedUser) {
        const emailTaken = await User.findOne({
          email: newEmail,
          _id: { $ne: linkedUser._id }
        });
        if (emailTaken) {
          return res.status(400).json({
            success: false,
            message: `Email ${newEmail} is already in use by another account`
          });
        }
        await User.findByIdAndUpdate(linkedUser._id, { email: newEmail });
        console.log(`✅ User email synced: ${linkedUser.email} → ${newEmail}`);
      }
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?.id },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Delete/Deactivate student
// @route   DELETE /api/students/:id
// @access  Private
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Soft delete - set isActive to false
    student.isActive = false;
    student.status = "inactive";
    student.updatedBy = req.user?.id;
    await student.save();

    res.status(200).json({
      success: true,
      message: "Student deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Mark attendance for student
// @route   POST /api/students/:id/attendance
// @access  Private
const markAttendance = async (req, res) => {
  try {
    const { date, status, remarks } = req.body;

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Format date to start of day
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance already marked for this date
    const existingAttendanceIndex = student.attendance.findIndex((a) => {
      const aDate = new Date(a.date);
      aDate.setHours(0, 0, 0, 0);
      return aDate.getTime() === attendanceDate.getTime();
    });

    if (existingAttendanceIndex > -1) {
      // Update existing attendance
      student.attendance[existingAttendanceIndex] = {
        date: attendanceDate,
        status,
        remarks,
        markedBy: req.user?.id || "System",
      };
    } else {
      // Add new attendance
      student.attendance.push({
        date: attendanceDate,
        status,
        remarks,
        markedBy: req.user?.id || "System",
      });
    }

    await student.save();

    res.status(200).json({
      success: true,
      message: "Attendance marked successfully",
      data: student.attendance[student.attendance.length - 1],
    });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get attendance for student
// @route   GET /api/students/:id/attendance
// @route   GET /api/students/:id/attendance/:year/:month
// @access  Private
const getAttendance = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    let attendanceData = student.attendance;

    // Filter by month and year if provided
    if (req.params.year && req.params.month) {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month) - 1; // JS months are 0-indexed

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      attendanceData = student.attendance.filter((a) => {
        const date = new Date(a.date);
        return date >= startDate && date <= endDate;
      });
    }

    // Calculate statistics
    const stats = {
      present: attendanceData.filter((a) => a.status === "present").length,
      absent: attendanceData.filter((a) => a.status === "absent").length,
      leave: attendanceData.filter((a) => a.status === "leave").length,
      total: attendanceData.length,
    };

    stats.percentage =
      stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

    res.status(200).json({
      success: true,
      data: attendanceData,
      stats,
      student: {
        id: student._id,
        name: student.fullName,
        studentId: student.studentId,
      },
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Record enhanced payment for student (with partial, carry forward, fines)
// @route   POST /api/students/:id/payment
// @access  Private
const recordPayment = async (req, res) => {
  try {
    const {
      months,
      amounts,
      additionalCourseIndices,
      paymentDate,
      receiptNo,
      paymentMode,
      remarks,
      fineAmount,
      fineWaived,
      carryForwardAmount,
      carryForwardToMonth,
      isPromise,
      promisedDate
    } = req.body;

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const monthArray = Array.isArray(months) ? months : [months];
    const amountArray = Array.isArray(amounts) ? amounts : [amounts];
    const acIndices = Array.isArray(additionalCourseIndices) ? additionalCourseIndices : [];

    let totalPaid = 0;
    const updatedMonths = [];

    for (let i = 0; i < monthArray.length; i++) {
      const monthNumber = monthArray[i];
      const amount = parseFloat(amountArray[i]) || 0;
      const acIndex = acIndices[i] ?? null;

      if (acIndex !== null && acIndex !== undefined) {
        // ── Additional course payment ──
        const ac = student.additionalCourses?.[acIndex];
        if (!ac) continue;

        const feeIndex = ac.feeSchedule.findIndex(f => f.monthNumber === monthNumber);
        if (feeIndex === -1) continue;

        const fee = ac.feeSchedule[feeIndex];
        const newPaidAmount = (fee.paidAmount || 0) + amount;
        const newBalance = Math.max(0, (fee.totalFee || 0) - newPaidAmount);

        fee.paidAmount = newPaidAmount;
        fee.balanceAmount = newBalance;
        fee.status = newBalance === 0 ? "paid" : newPaidAmount > 0 ? "partial" : "pending";
        fee.paymentDate = new Date(paymentDate || Date.now());
        fee.receiptNo = receiptNo;
        fee.paymentMode = paymentMode || "cash";
        fee.remarks = remarks || "";

        student.additionalCourses[acIndex].feeSchedule[feeIndex] = fee;
        student.markModified(`additionalCourses.${acIndex}.feeSchedule`);

      } else {
        // ── Primary course payment ──
        const feeIndex = student.feeSchedule.findIndex(f => f.monthNumber === monthNumber);
        if (feeIndex === -1) continue;

        const fee = student.feeSchedule[feeIndex];
        const newPaidAmount = (fee.paidAmount || 0) + amount;
        const newBalance = Math.max(0, fee.totalFee - newPaidAmount);

        fee.paidAmount = newPaidAmount;
        fee.balanceAmount = newBalance;
        fee.status = newBalance === 0 ? "paid" : newPaidAmount > 0 ? "partial" : "pending";

        if (isPromise && promisedDate) {
          fee.status = "promised";
          fee.promisedDate = new Date(promisedDate);
          fee.finesPaused = true;
        }

        fee.paymentDate = new Date(paymentDate || Date.now());
        fee.receiptNo = receiptNo;
        fee.paymentMode = paymentMode || "cash";
        fee.remarks = remarks || "";

        if (fineAmount && !fineWaived) {
          fee.fines = fee.fines || {};
          fee.fines.amount = (fee.fines.amount || 0) + fineAmount;
        }

        student.feeSchedule[feeIndex] = fee;
        student.markModified("feeSchedule");
      }

      totalPaid += amount;
      updatedMonths.push(monthNumber);
    }

    // Carry forward (primary course only)
    if (carryForwardAmount > 0 && carryForwardToMonth) {
      const targetIdx = student.feeSchedule.findIndex(f => f.monthNumber === carryForwardToMonth);
      if (targetIdx !== -1) {
        student.feeSchedule[targetIdx].carryForwardAmount =
          (student.feeSchedule[targetIdx].carryForwardAmount || 0) + carryForwardAmount;
        student.feeSchedule[targetIdx].status = "carry_forward";
        student.markModified("feeSchedule");
      }
    }

    // Update student totals
    student.paidAmount = (student.paidAmount || 0) + totalPaid;
    student.balanceAmount = Math.max(0, student.totalCourseFee - student.paidAmount);

    // Payment history
    student.paymentHistory.push({
      date: new Date(paymentDate || Date.now()),
      amount: totalPaid,
      months: updatedMonths,
      receiptNo,
      collectedBy: req.user?.id || "admin",
      remarks: remarks || ""
    });

    // Use findByIdAndUpdate to avoid VersionError on double-submit
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

    res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        studentId: student._id,
        studentName: student.fullName,
        totalPaid,
        receiptNo,
        balance: student.balanceAmount,
        updatedMonths
      },
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Get students by course
// @route   GET /api/students/course/:courseId
// @access  Private
const getStudentsByCourse = async (req, res) => {
  try {
    const students = await Student.find({
      courseCode: req.params.courseId,
      isActive: true,
      status: "active",
    })
      .sort({ fullName: 1 })
      .select(
        "studentId fullName email mobileNumber batchTime paidAmount balanceAmount feeSchedule"
      );

    res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error("Error fetching students by course:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Bulk import students from admissions
// @route   POST /api/students/bulk-import
// @access  Private
const bulkImportStudents = async (req, res) => {
  try {
    const { admissionIds } = req.body;

    if (!Array.isArray(admissionIds) || admissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No admissions provided",
      });
    }

    let successful = 0;
    let failed = 0;
    const errors = [];

    for (const admissionId of admissionIds) {
      try {
        const admission = await Admission.findById(admissionId);
        if (!admission) {
          failed++;
          errors.push(`Admission not found: ${admissionId}`);
          continue;
        }

        const exists = await Student.findOne({ admissionId });
        if (exists) {
          failed++;
          errors.push(`Student already exists: ${admission.admissionNo}`);
          continue;
        }

        const course = await Course.findOne({
          courseFullName: admission.course,
        });

        if (!course) {
          failed++;
          errors.push(`Course not found for ${admission.fullName}`);
          continue;
        }

        // Calculate total course fee
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
          email: admission.email,
          mobileNumber: admission.mobileNumber,
          course: admission.course,
          courseCode: course._id,
          specialization: admission.specialization,
          batchTime: admission.batchTime,
          admissionDate: admission.admissionDate,
          admissionYear: admission.admissionYear,
          totalCourseFee: totalCourseFee,
          monthlyFee: course.monthlyFee || 0,
          examFee: course.examFee || 0,
          admissionFee: course.admissionFee || 0,
          otherCharges: course.otherCharges || 0,
          paidAmount: admission.paidFees || 0,
          balanceAmount: totalCourseFee - (admission.paidFees || 0),
          isActive: true,
          status: "active",
          createdBy: req.user?.id,
        };

        // Add enrolledBatches
        studentData.enrolledBatches = [{
          courseId: course._id,
          courseName: course.courseFullName,
          monthlyFee: course.monthlyFee || 0,
          examFee: course.examFee || 0,
          startMonth: 1,
          duration: duration,
          isActive: true
        }];

        // Generate fee schedule
        studentData.feeSchedule = generateFeeSchedule(
          course,
          admission.admissionDate
        );

        const student = new Student(studentData);
        await student.save();

        // ✅ AUTO-CREATE USER ACCOUNT FOR STUDENT
        await createStudentUserAccount(student);

        admission.status = "admitted";
        admission.updatedBy = req.user?.id;
        await admission.save();

        successful++;
      } catch (err) {
        failed++;
        errors.push(err.message);
      }
    }

    res.status(200).json({
      success: true,
      results: {
        successful,
        failed,
        errors,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Bulk import failed",
      error: error.message,
    });
  }
};

// @desc    Get student statistics
// @route   GET /api/students/statistics
// @access  Private
const getStudentStatistics = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments({ isActive: true });
    const activeStudents = await Student.countDocuments({
      isActive: true,
      status: "active",
    });
    const completedStudents = await Student.countDocuments({
      isActive: true,
      status: "completed",
    });

    // Get monthly enrollment statistics
    const monthlyStats = await Student.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $group: {
          _id: {
            year: { $year: "$admissionDate" },
            month: { $month: "$admissionDate" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 },
      },
      {
        $limit: 6,
      },
    ]);

    // Get course-wise distribution
    const courseStats = await Student.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $group: {
          _id: "$course",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Calculate total fees collected
    const feeStats = await Student.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $group: {
          _id: null,
          totalFees: { $sum: "$totalCourseFee" },
          totalPaid: { $sum: "$paidAmount" },
          totalBalance: { $sum: "$balanceAmount" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        completedStudents,
        monthlyStats,
        courseStats,
        feeStats: feeStats[0] || {
          totalFees: 0,
          totalPaid: 0,
          totalBalance: 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching student statistics:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


// @desc    Sync student with TeacherBatch (fix inconsistencies)
// @route   POST /api/students/:id/sync
// @access  Private (Admin)
const syncStudentWithTeacherBatch = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }
    
    console.log(`🔄 Syncing student: ${student.studentId} (${student.fullName})`);
    
    // Find which TeacherBatch this student is actually in
    const TeacherBatch = require("../models/TeacherBatch");
    const actualTB = await TeacherBatch.findOne({
      "assignedStudents.student": student._id
    }).populate('teacher').populate('batch');
    
    if (!actualTB) {
      // Student not in any TeacherBatch - recreate
      console.log(`⚠️ Student not in any TeacherBatch, recreating...`);
      const { assignStudentToFacultyBatch } = require("./admissionController");
      await assignStudentToFacultyBatch(student);
      
      return res.json({
        success: true,
        message: "Student was not in any batch. Recreated successfully.",
        data: student
      });
    }
    
    // Get faculty from teacher
    const faculty = await Faculty.findOne({ _id: actualTB.teacher.facultyId });
    
    // Update student to match actual TeacherBatch
    const updates = [];
    
    if (student.facultyAllot !== faculty.facultyName) {
      console.log(`   Fixing faculty: "${student.facultyAllot}" → "${faculty.facultyName}"`);
      student.facultyAllot = faculty.facultyName;
      updates.push('facultyAllot');
    }
    
    if (student.batchTime !== actualTB.batch.displayName) {
      console.log(`   Fixing batch: "${student.batchTime}" → "${actualTB.batch.displayName}"`);
      student.batchTime = actualTB.batch.displayName;
      updates.push('batchTime');
    }
    
    if (updates.length > 0) {
      await student.save();
      console.log(`✅ Student synced. Updated: ${updates.join(', ')}`);
    } else {
      console.log(`✅ Student already in sync`);
    }
    
    res.json({
      success: true,
      message: updates.length > 0 ? "Student synced successfully" : "Student already in sync",
      updates: updates,
      data: {
        student: {
          id: student._id,
          name: student.fullName,
          facultyAllot: student.facultyAllot,
          batchTime: student.batchTime
        },
        teacherBatch: {
          id: actualTB._id,
          faculty: faculty.facultyName,
          batch: actualTB.batch.displayName,
          studentsCount: actualTB.assignedStudents.length
        }
      }
    });
    
  } catch (error) {
    console.error("❌ Sync error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Sync ALL students (admin only)
// @route   POST /api/students/sync-all
// @access  Private (Admin)
const syncAllStudents = async (req, res) => {
  try {
    const students = await Student.find({ isActive: true });
    console.log(`🔄 Syncing ${students.length} students...`);
    
    const TeacherBatch = require("../models/TeacherBatch");
    const Faculty = require("../models/Faculty");
    const { Batch } = require("../models/Setup");
    
    let fixed = 0;
    const results = [];
    
    for (const student of students) {
      // Find which TeacherBatch this student is actually in
      const actualTB = await TeacherBatch.findOne({
        "assignedStudents.student": student._id
      }).populate('teacher').populate('batch');
      
      if (!actualTB) {
        results.push({
          studentId: student.studentId,
          name: student.fullName,
          status: 'NOT_IN_ANY_BATCH'
        });
        continue;
      }
      
      const faculty = await Faculty.findOne({ _id: actualTB.teacher.facultyId });
      
      const updates = [];
      if (student.facultyAllot !== faculty.facultyName) {
        student.facultyAllot = faculty.facultyName;
        updates.push('facultyAllot');
      }
      if (student.batchTime !== actualTB.batch.displayName) {
        student.batchTime = actualTB.batch.displayName;
        updates.push('batchTime');
      }
      
      if (updates.length > 0) {
        await student.save();
        fixed++;
        results.push({
          studentId: student.studentId,
          name: student.fullName,
          status: 'FIXED',
          updates
        });
      } else {
        results.push({
          studentId: student.studentId,
          name: student.fullName,
          status: 'OK'
        });
      }
    }
    
    res.json({
      success: true,
      message: `Synced ${students.length} students. Fixed ${fixed} inconsistencies.`,
      data: results
    });
    
  } catch (error) {
    console.error("❌ Sync all error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Clean up duplicate TeacherBatch entries
// @route   POST /api/students/cleanup-duplicates
// @access  Private (Admin)
const cleanupDuplicateTeacherBatches = async (req, res) => {
  try {
    const TeacherBatch = require("../models/TeacherBatch");
    const Student = require("../models/Student");
    
    const students = await Student.find({ isActive: true });
    let fixed = 0;
    
    for (const student of students) {
      // Find all TeacherBatches with this student
      const batches = await TeacherBatch.find({
        "assignedStudents.student": student._id
      });
      
      if (batches.length > 1) {
        console.log(`🔧 Fixing ${student.fullName} - in ${batches.length} batches`);
        
        // Keep only the correct one (matching student's current faculty)
        let correctBatch = null;
        
        for (const batch of batches) {
          const user = await User.findById(batch.teacher);
          const faculty = user ? await Faculty.findById(user.facultyId) : null;
          
          if (faculty && faculty.facultyName === student.facultyAllot) {
            correctBatch = batch;
          } else {
            // Remove from wrong batch
            batch.assignedStudents = batch.assignedStudents.filter(
              s => s.student.toString() !== student._id.toString()
            );
            await batch.save();
            fixed++;
          }
        }
      }
    }
    
    res.json({
      success: true,
      message: `Cleaned up ${fixed} duplicate entries`,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createStudentUserAccount = async (studentData) => {
  try {
    const User = require("../models/user");
    const bcrypt = require("bcryptjs");

    // ✅ Ensure we have a valid email (never empty string)
    const email = studentData.email && studentData.email.trim() !== ""
      ? studentData.email
      : `${studentData.studentId.toLowerCase()}@student.lms`;

    // ✅ Ensure we have a studentId
    if (!studentData.studentId) {
      console.error("❌ Cannot create user account: studentId is missing");
      return null;
    }

    // Check if user already exists by studentId OR non-empty email
    const existingUser = await User.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        { studentId: studentData.studentId }
      ]
    });

    if (existingUser) {
      console.log(`⚠️ User account already exists for: ${studentData.studentId}`);
      return existingUser;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(
      studentData.mobileNumber || studentData.studentId,
      salt
    );

    const newUser = new User({
      email,
      password: hashedPassword,
      role: "student",
      studentId: studentData.studentId,
      fullName: studentData.fullName,
      name: studentData.fullName,
      mobileNumber: studentData.mobileNumber || "",
      mustChangePassword: true,
      isActive: true,
      isVerified: true,
    });

    await newUser.save();
    console.log(`✅ User account created for: ${studentData.fullName} (${studentData.studentId}) → ${email}`);
    return newUser;

  } catch (error) {
    // ✅ Log the FULL error so you can see what's really failing
    console.error("❌ Error creating student user account:", error.message);
    console.error("   Stack:", error.stack);
    console.error("   Student data:", {
      studentId: studentData.studentId,
      email: studentData.email,
      fullName: studentData.fullName,
    });
    // Don't silently swallow — return null but log fully
    return null;
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudentFromAdmission,
  updateStudent,
  deleteStudent,
  markAttendance,
  getAttendance,
  recordPayment,
  getStudentsByCourse,
  getStudentStatistics,
  bulkImportStudents,
  createStudentUserAccount
};