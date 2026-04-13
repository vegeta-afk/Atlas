// controllers/admissionController.js
const Admission = require("../models/Admission");
const Enquiry = require("../models/Enquiry");
const Student = require("../models/Student");
const Course = require("../models/Course");
const { generateFeeSchedule, generateFeeScheduleWithScholarship } = require("../utils/feeGenerator");
const { createStudentUserAccount } = require("./studentController");

// @desc    Get all admissions
// @route   GET /api/admissions
// @access  Private (Admin, Front Office, Accountant)
exports.getAdmissions = async (req, res) => {
  console.log("Backend received params:", req.query);

  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      course,
      batch,
      faculty,
      startDate,
      endDate,
      sortBy = "admissionDate",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};

    // Search filter
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { admissionNo: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
        { aadharNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Course filter
    if (course && course !== "all") {
      filter.course = { $regex: `^${course}$`, $options: "i" };
    }

    

    // Batch filter
    if (batch && batch !== "all") {
      filter.batchTime = batch.toLowerCase().trim();
    }

    // Faculty filter
    if (faculty && faculty !== "all") {
      filter.facultyAllot = { $regex: `^${faculty}$`, $options: "i" };
    }

    // Date range filter
    if (startDate && endDate) {
      filter.admissionDate = {
        $gte: new Date(startDate + "T00:00:00.000Z"),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }

    // Build sort object
    let sortObject = {};
    const fieldMapping = {
      studentId: "admissionNo",
      name: "fullName",
      course: "course",
      admissionDate: "admissionDate",
    };

    const dbField = fieldMapping[sortBy] || sortBy || "admissionDate";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    sortObject[dbField] = sortDirection;

    // Execute query with pagination
    const admissions = await Admission.find(filter)
      .sort(sortObject)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count
    const total = await Admission.countDocuments(filter);

    res.json({
      success: true,
      count: admissions.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: admissions,
    });
  } catch (error) {
    console.error("Get admissions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get single admission
// @route   GET /api/admissions/:id
// @access  Private (Admin, Front Office, Accountant)
exports.getAdmission = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    res.json({
      success: true,
      data: admission,
    });
  } catch (error) {
    console.error("Get admission error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Create new admission (WITH AUTO STUDENT CREATION)
// @route   POST /api/admissions
// @access  Private (Admin, Front Office)
exports.createAdmission = async (req, res) => {


  let scholarshipBody = req.body.scholarship;
if (typeof scholarshipBody === 'string') {
  try {
    scholarshipBody = JSON.parse(scholarshipBody);
  } catch (e) {
    scholarshipBody = null;
  }
}

const hasScholarship = req.body.hasScholarship === true || req.body.hasScholarship === 'true';

  console.log("req.file:", req.file);        // should print file info now
  console.log("Content-Type:", req.headers["content-type"]); // should show boundary
  try {
    console.log("📦 Create Admission - Request Body:", req.body);

     let photoUrl = null;
    if (req.file) {
      const { uploadToCloudinary } = require("../config/cloudinary");
      const result = await uploadToCloudinary(req.file.buffer);
      photoUrl = result.secure_url;
    }

    // Check duplicate admission number
    if (req.body.admissionNo) {
      const existing = await Admission.findOne({
        admissionNo: req.body.admissionNo,
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Admission number already exists",
        });
      }
    }

    // Create admission data
    const admissionData = {
      admissionNo: req.body.admissionNo,
      admissionDate: req.body.admissionDate || new Date(),
      admissionBy: req.body.admissionBy || (req.user ? req.user.name : "Admin"),
      fullName: req.body.fullName,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      fatherName: req.body.fatherName,
      motherName: req.body.motherName,
      email: req.body.email?.toLowerCase().trim(),
      mobileNumber: req.body.mobileNumber,
      fatherNumber: req.body.fatherNumber,
      motherNumber: req.body.motherNumber,
      alternateNumber: req.body.alternateNumber || "",
      aadharNumber: req.body.aadharNumber || "",
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      pincode: req.body.pincode,
      place: req.body.place || "",
      lastQualification: req.body.lastQualification,
      percentage: req.body.percentage || "",
      yearOfPassing: req.body.yearOfPassing,
      schoolCollege: req.body.schoolCollege || "",
      course: req.body.course || req.body.interestedCourse,
      specialization: req.body.specialization || "",
      batchTime: req.body.batchTime || req.body.preferredBatch,
      facultyAllot: req.body.facultyAllot || "Not Allotted",
      admissionYear: req.body.admissionYear || new Date().getFullYear(),
      cast: req.body.cast || "",
      speciallyAbled: req.body.speciallyAbled || false,
      source: req.body.source || "website",
      referenceName: req.body.referenceName || "",
      referenceContact: req.body.referenceContact || "",
      referenceRelation: req.body.referenceRelation || "",
      totalFees: req.body.totalFees || 0,
      paidFees: req.body.paidFees || 0,
      balanceFees: req.body.balanceFees || 0,
      nextInstallmentDate: req.body.nextInstallmentDate || null,
      status: req.body.status || "admitted", // Changed to "admitted"
      isAutoConvertedToStudent: false, // ← CRITICAL: Add this!
      priority: req.body.priority || "medium",
      remarks: req.body.remarks || "",
      enquiryNo: req.body.enquiryNo || null,
      enquiryId: req.body.enquiryId || null,
      createdBy: req.user ? req.user.id : null,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      hasScholarship: hasScholarship,
scholarship: hasScholarship && scholarshipBody
  ? {
      applied:            true,
      scholarshipId:      scholarshipBody.scholarshipId || null,
      scholarshipName:    scholarshipBody.scholarshipName || "",
      scholarshipCode:    scholarshipBody.scholarshipCode || "",
      percent:            scholarshipBody.percent || 0,
      type:               scholarshipBody.type || "percentage",
      originalTotalFee:   scholarshipBody.originalTotalFee || 0,
      originalMonthlyFee: scholarshipBody.originalMonthlyFee || 0,
      scholarshipValue:   scholarshipBody.scholarshipValue || 0,
      finalTotalFee:      scholarshipBody.finalTotalFee || 0,
      finalMonthlyFee:    scholarshipBody.finalMonthlyFee || 0,
      documents:          scholarshipBody.documents || [],
    }
  : null,

    photo: photoUrl,
    };

    console.log("📝 Admission Data being saved:", admissionData);

    // Create admission
    const admission = await Admission.create(admissionData);

    // Update enquiry if created from enquiry
    if (req.body.enquiryNo) {
      await Enquiry.findOneAndUpdate(
        { enquiryNo: req.body.enquiryNo },
        {
          status: "converted",
          convertedToAdmission: true,
          admissionId: admission._id,
        }
      );
    }

    // 🔥🔥🔥 100% AUTO STUDENT CREATION 🔥🔥🔥
    try {
      // Check if status qualifies for auto-conversion
      if (admission.status === "admitted" || admission.status === "approved") {
        await autoCreateStudentFromAdmission(admission, req.user);
        console.log(
          `✅ AUTO: Student created for admission: ${admission.admissionNo}`
        );
      } else {
        console.log(
          `⚠️ Skipping auto-creation: Admission status is ${admission.status}`
        );
      }
    } catch (studentError) {
      console.error("❌ Auto student creation failed:", studentError.message);
      // Continue even if auto-creation fails
    }

    res.status(201).json({
      success: true,
      message: "Admission created successfully. Student auto-generated.",
      data: admission,
    });
  } catch (error) {
    console.error("❌ Create admission error:", error);

    if (error.name === "ValidationError") {
      console.error("Validation errors:", error.errors);
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create admission",
      error: error.message,
    });
  }
};

// @desc    Update admission (WITH AUTO STUDENT CREATION ON STATUS CHANGE)
// @route   PUT /api/admissions/:id
// @access  Private (Admin, Front Office)
// admissionController.js — updateAdmission — replace the current handler body:

exports.updateAdmission = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);

    if (!admission) {
      return res.status(404).json({ success: false, message: "Admission not found" });
    }

    const oldStatus = admission.status;

    // Handle photo upload if a new file was sent
    if (req.file) {
      const { uploadToCloudinary } = require("../config/cloudinary");
      const result = await uploadToCloudinary(req.file.buffer);
      req.body.photo = result.secure_url;
    }

    // FIX: Never let scholarship: null reach Mongoose — remove key if null/falsy
    const bodyToApply = { ...req.body };
    if (bodyToApply.scholarship === null || bodyToApply.scholarship === undefined) {
      delete bodyToApply.scholarship;   // ← don't touch the existing subdocument
    }
    // If hasScholarship explicitly false, unset scholarship cleanly
    if (bodyToApply.hasScholarship === false || bodyToApply.hasScholarship === "false") {
      admission.scholarship = undefined;
    }

    Object.assign(admission, bodyToApply);
    await admission.save();

    // Auto-create student if status changed to admitted/approved
    if (
      oldStatus !== "approved" && oldStatus !== "admitted" &&
      (admission.status === "approved" || admission.status === "admitted")
    ) {
      try {
        const existingStudent = await Student.findOne({ admissionId: admission._id });
        if (!existingStudent) {
          await autoCreateStudentFromAdmission(admission, req.user);
        }
      } catch (studentError) {
        console.error("❌ Auto student creation failed:", studentError.message);
      }
    }

    res.json({ success: true, message: "Admission updated successfully", data: admission });
  } catch (error) {
    console.error("Update admission error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: "Validation Error", errors: error.errors });
    }
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Delete admission
// @route   DELETE /api/admissions/:id
// @access  Private (Admin)
exports.deleteAdmission = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    // Delete associated student
    await Student.deleteOne({ admissionId: admission._id });

    await admission.deleteOne();

    res.json({
      success: true,
      message: "Admission and associated student deleted successfully",
    });
  } catch (error) {
    console.error("Delete admission error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update admission status (WITH AUTO STUDENT CREATION)
// @route   PUT /api/admissions/:id/status
// @access  Private (Admin, Front Office)
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const admission = await Admission.findById(req.params.id);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    const oldStatus = admission.status;

    // Update status
    admission.status = status;
    await admission.save();

    // 🔥 AUTO CREATE STUDENT if status changed to approved/admitted
    if (
      (admission.status === "approved" || admission.status === "admitted") &&
      !admission.isAutoConvertedToStudent
    ) {
      try {
        const existingStudent = await Student.findOne({
          admissionId: admission._id,
        });
        if (!existingStudent) {
          await autoCreateStudentFromAdmission(admission, req.user);
          console.log(
            `✅ AUTO: Student created after status update: ${admission.admissionNo}`
          );
        }
      } catch (studentError) {
        console.error("❌ Auto student creation failed:", studentError.message);
      }
    }

    res.json({
      success: true,
      message: "Admission status updated successfully",
      data: admission,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get approved admissions
// @route   GET /api/admissions/approved
// @access  Private (Admin, Front Office)
exports.getApprovedAdmissions = async (req, res) => {
  try {
    console.log("📋 GET /api/admissions/approved called");

    const admissions = await Admission.find({
      status: "approved",
      isActive: true,
    })
      .sort({ admissionDate: -1 })
      .select(
        "_id admissionNo fullName course admissionDate totalFees paidFees balanceFees mobileNumber email batchTime facultyAllot aadharNumber fatherName motherName address"
      );

    console.log(`✅ Found ${admissions.length} approved admissions`);

    res.json({
      success: true,
      count: admissions.length,
      data: admissions,
    });
  } catch (error) {
    console.error("Get approved admissions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Check which admissions are already converted to students
// @route   POST /api/admissions/check-bulk-conversion
// @access  Private (Admin, Front Office)
exports.checkBulkConversion = async (req, res) => {
  try {
    console.log("🔍 POST /api/admissions/check-bulk-conversion called");
    const { admissionIds } = req.body;

    if (!admissionIds || !Array.isArray(admissionIds)) {
      return res.status(400).json({
        success: false,
        message: "Please provide admissionIds array",
      });
    }

    const results = [];

    for (const admissionId of admissionIds) {
      try {
        const student = await Student.findOne({ admissionId: admissionId });

        results.push({
          admissionId: admissionId,
          isConverted: !!student,
          studentId: student ? student._id : null,
          studentCode: student ? student.studentId : null,
        });
      } catch (error) {
        results.push({
          admissionId: admissionId,
          isConverted: false,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Check bulk conversion error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update admission fees (SYNC WITH STUDENT)
// @route   PUT /api/admissions/:id/fees
// @access  Private (Admin, Accountant)
exports.updateFees = async (req, res) => {
  try {
    const admission = await Admission.findByIdAndUpdate(
      req.params.id,
      {
        totalFees: req.body.totalFees,
        paidFees: req.body.paidFees,
        balanceFees: req.body.balanceFees,
        nextInstallmentDate: req.body.nextInstallmentDate,
      },
      { new: true, runValidators: true }
    );

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    // Sync with student if exists
    const student = await Student.findOne({ admissionId: admission._id });
    if (student) {
      student.totalCourseFee = admission.totalFees;
      student.paidAmount = admission.paidFees;
      student.balanceAmount = admission.balanceFees;
      await student.save();
    }

    res.json({
      success: true,
      message: "Admission fees updated successfully",
      data: admission,
    });
  } catch (error) {
    console.error("Update fees error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admissions/stats/dashboard
// @access  Private (Admin, Front Office, Accountant)
exports.getDashboardStats = async (req, res) => {
  try {
    const totalAdmissions = await Admission.countDocuments();
    const facultyAllotted = await Admission.countDocuments({
      facultyAllot: { $ne: "Not Allotted" },
    });
    const activeStudents = await Admission.countDocuments({ status: "active" });

    const courseStats = await Admission.aggregate([
      {
        $group: {
          _id: "$course",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalAdmissions,
        facultyAllotted,
        activeStudents,
        differentCourses: courseStats.length,
        courseStats,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Export admission as PDF
// @route   GET /api/admissions/:id/export
// @access  Private (Admin, Front Office, Accountant)
exports.exportAdmission = async (req, res) => {
  try {
    const { id } = req.params;

    const admission = await Admission.findById(id);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    res.json({
      success: true,
      message: "PDF export functionality coming soon",
      data: admission,
    });
  } catch (error) {
    console.error("Export admission error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while exporting admission",
      error: error.message,
    });
  }
};

// @desc    Get admission activities
// @route   GET /api/admissions/:id/activities
// @access  Private (Admin, Front Office, Accountant)
exports.getAdmissionActivities = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found",
      });
    }

    const defaultActivities = [
      {
        id: 1,
        action: "Admission Created",
        by: admission.createdBy || "System",
        date: admission.createdAt,
        notes: "Admission record created successfully",
      },
    ];

    const activities = admission.activities || defaultActivities;

    if (admission.updatedAt && admission.updatedAt !== admission.createdAt) {
      activities.push({
        id: 2,
        action: "Admission Updated",
        by: "System",
        date: admission.updatedAt,
        notes: "Admission details were modified",
      });
    }

    if (admission.paidFees > 0) {
      activities.push({
        id: 3,
        action: "Fee Payment",
        by: "Accountant",
        date: admission.updatedAt || new Date(),
        notes: `₹${admission.paidFees} paid. Remaining balance: ₹${admission.balanceFees}`,
      });
    }

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Get admission activities error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// 🔥🔥🔥 AUTO STUDENT CREATION FUNCTION 🔥🔥🔥
// ============================================

const autoCreateStudentFromAdmission = async (admission, user) => {
  try {
    console.log(`🔄 AUTO: Creating student for admission ${admission.admissionNo}`);

    // Check if already converted
    if (admission.isAutoConvertedToStudent) {
      console.log(`✅ Already converted: ${admission.studentId}`);
      return;
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({ admissionId: admission._id });
    if (existingStudent) {
      console.log(`✅ Student already exists: ${existingStudent.studentId}`);
      admission.isAutoConvertedToStudent = true;
      admission.studentId = existingStudent.studentId;
      admission.convertedAt = new Date();
      await admission.save();
      try {
        await assignStudentToFacultyBatch(existingStudent);
      } catch (assignError) {
        console.error("Failed to assign existing student to faculty batch:", assignError);
      }
      return existingStudent;
    }

    // Get course details
    const course = await Course.findOne({ courseFullName: admission.course });
    if (!course) {
      console.error(`❌ Course not found: ${admission.course}`);
      throw new Error(`Course not found: ${admission.course}`);
    }

    // ========== SCHOLARSHIP CHECK ==========
    const hasScholarship = admission.hasScholarship || false;
    let finalTotalFee = 0;
    let finalMonthlyFee = 0;
    let scholarshipData = null;

    if (hasScholarship && admission.scholarship) {
      scholarshipData = admission.scholarship;
      finalTotalFee   = scholarshipData.finalTotalFee   || 0;
      finalMonthlyFee = scholarshipData.finalMonthlyFee || 0;

      // Fallback: recalculate if values somehow missing
      if (!finalMonthlyFee || !finalTotalFee) {
        const durationMatch = course.duration?.toString().match(/\d+/);
        const dur = durationMatch ? parseInt(durationMatch[0]) : 12;
        const examCount = course.examMonths
          ? course.examMonths.split(",").length : 0;
        const origTotal =
          (course.admissionFee  || 0) +
          (course.monthlyFee    || 0) * dur +
          (course.examFee       || 0) * examCount +
          (course.otherCharges  || 0);
        const pct = scholarshipData.percent || 0;
        finalMonthlyFee = (course.monthlyFee || 0) * (1 - pct / 100);
        finalTotalFee   = origTotal * (1 - pct / 100);
      }

      console.log(`🎓 Scholarship applied:`);
      console.log(`   Percent:       ${scholarshipData.percent}%`);
      console.log(`   Final Monthly: ₹${finalMonthlyFee}`);  // ✅ 833.33
      console.log(`   Final Total:   ₹${finalTotalFee}`);    // ✅ 12500

    } else {
      // Regular fee calculation
      const durationMatch = course.duration?.toString().match(/\d+/);
      const dur = durationMatch ? parseInt(durationMatch[0]) : 12;
      const examCount = course.examMonths
        ? course.examMonths.split(",").length : 0;
      finalTotalFee =
        (course.admissionFee  || 0) +
        (course.monthlyFee    || 0) * dur +
        (course.examFee       || 0) * examCount +
        (course.otherCharges  || 0);
      finalMonthlyFee = course.monthlyFee || 0;

      console.log(`💰 Regular fees: Monthly ₹${finalMonthlyFee} | Total ₹${finalTotalFee}`);
    }
    // ========================================

    // Create student data
    const studentData = {
      admissionId:       admission._id,
      admissionNo:       admission.admissionNo,
      fullName:          admission.fullName,
      dateOfBirth:       admission.dateOfBirth,
      gender:            admission.gender,
      email: (admission.email && admission.email.trim())
  ? admission.email.trim()
  : `${admission.fullName.replace(/\s+/g, ".").toLowerCase()}@student.lms`,
      mobileNumber:      admission.mobileNumber,
      fatherName:        admission.fatherName,
      fatherNumber:      admission.fatherNumber,
      motherName:        admission.motherName,
      motherNumber:      admission.motherNumber,
      address:           admission.address,
      city:              admission.city,
      state:             admission.state,
      pincode:           admission.pincode,
      aadharNumber:      admission.aadharNumber || "NOT_PROVIDED",
      course:            admission.course,
      courseCode:        course._id,
      specialization:    admission.specialization || "General",
      batchTime:         admission.batchTime || "Morning",
      facultyAllot:      admission.facultyAllot || "Not Allotted",
      admissionDate:     admission.admissionDate || new Date(),
      admissionYear:     admission.admissionYear || new Date().getFullYear(),
      lastQualification: admission.lastQualification || "12th",
      percentage:        admission.percentage || "75",
      yearOfPassing:     admission.yearOfPassing || "2024",
      schoolCollege:     admission.schoolCollege || "Local School",
      cast:              admission.cast || "General",
      speciallyAbled:    admission.speciallyAbled || false,
      status:            "active",
      isActive:          true,
      createdBy:         user ? user.id : null,
      photo: admission.photo || "/default-avatar.png",

      // ✅ FEES — always use final (discounted if scholarship) values
      totalCourseFee: finalTotalFee,
      monthlyFee:     finalMonthlyFee,   // ← 833.33 for 50% scholarship ✅
      examFee:        course.examFee     || 0,
      admissionFee:   course.admissionFee || 0,
      otherCharges:   course.otherCharges || 0,
      paidAmount:     admission.paidFees  || 0,
      balanceAmount:  finalTotalFee - (admission.paidFees || 0),

      // ✅ SCHOLARSHIP DATA stored on student
      hasScholarship: hasScholarship,
      scholarship:    scholarshipData,
    };

    // ✅ FEE SCHEDULE — use scholarship generator if applicable
    const courseWithDiscount = hasScholarship
  ? { ...course.toObject(), monthlyFee: finalMonthlyFee }  // finalMonthlyFee = 1250 ✅
  : course.toObject();

studentData.feeSchedule = generateFeeSchedule(courseWithDiscount, studentData.admissionDate);
// No need for generateFeeScheduleWithScholarship at all!

    // Create and save student
    const student = new Student(studentData);
    const savedStudent = await student.save();

    await createStudentUserAccount(savedStudent);

    // Assign to faculty-batch
    try {
      await assignStudentToFacultyBatch(savedStudent);
    } catch (assignError) {
      console.error("Failed to assign student to faculty batch:", assignError);
    }

    // Update admission tracking
    admission.isAutoConvertedToStudent = true;
    admission.studentId = savedStudent.studentId;
    admission.convertedAt = new Date();
    await admission.save();

    console.log(`✅ AUTO SUCCESS: Created student ${savedStudent.studentId} for admission ${admission.admissionNo}`);
    return savedStudent;

  } catch (error) {
    console.error(`❌ AUTO FAILED for admission ${admission.admissionNo}:`, error);
    throw error;
  }
};

// ============================================
// 🔥 STUDENT-FACULTY-BATCH ASSIGNMENT FUNCTION
// ============================================

// ============================================
// 🔥 ULTRA DEBUG - STUDENT-FACULTY-BATCH ASSIGNMENT
// ============================================

// ============================================
// 🔥 FIXED: STUDENT-FACULTY-BATCH ASSIGNMENT WITH SYNC
// ============================================

const assignStudentToFacultyBatch = async (student) => {
  try {
    console.log(`🎯 Assigning student ${student.studentId} to faculty-batch...`);
    
    // Skip if faculty not allotted
    if (!student.facultyAllot || student.facultyAllot === "Not Allotted") {
      console.log(`⚠️ Skipping: No faculty allotted for student ${student.studentId}`);
      return;
    }
    
    // 1. Get faculty by name
    const Faculty = require("../models/Faculty");
    const faculty = await Faculty.findOne({
      facultyName: student.facultyAllot,
      isActive: true
    });
    
    if (!faculty) {
      console.error(`❌ Faculty not found: ${student.facultyAllot}`);
      return;
    }
    
    // 2. Get faculty's user account
    const User = require("../models/user");
    let user = await User.findOne({
      facultyId: faculty._id,
      role: "instructor"
    });
    
    // If user not found by facultyId, try by email and auto-repair
    if (!user) {
      console.log(`⚠️ User not found by facultyId, trying email: ${faculty.email}`);
      user = await User.findOne({ email: faculty.email.toLowerCase() });
      
      if (user) {
        console.log(`✅ Found user by email, repairing facultyId link`);
        user.facultyId = faculty._id;
        await user.save();
      } else {
        console.error(`❌ No user found for faculty: ${faculty.facultyName}`);
        return;
      }
    }
    
    // 3. Get batch by timing
    const { Batch } = require("../models/Setup");
    let batch = await Batch.findOne({
      $or: [
        { displayName: student.batchTime },
        { displayName: { $regex: student.batchTime, $options: "i" } }
      ]
    });
    
    if (!batch) {
      // Try to find by batchName
      batch = await Batch.findOne({
        batchName: { $regex: student.batchTime, $options: "i" }
      });
    }
    
    if (!batch) {
      console.error(`❌ Batch not found for timing: ${student.batchTime}`);
      return;
    }
    
    // 4. CRITICAL: Update student's batchTime to match exact batch displayName
    if (student.batchTime !== batch.displayName) {
      console.log(`🔄 Syncing student batchTime: "${student.batchTime}" → "${batch.displayName}"`);
      student.batchTime = batch.displayName;
      await student.save();
    }
    
    // 5. Find or create TeacherBatch
    const TeacherBatch = require("../models/TeacherBatch");
    
    // First, remove student from ANY other TeacherBatch (cleanup)
    const otherTeacherBatches = await TeacherBatch.find({
      "assignedStudents.student": student._id
    });
    
    for (const tb of otherTeacherBatches) {
      if (tb.teacher.toString() !== user._id.toString() || tb.batch.toString() !== batch._id.toString()) {
        console.log(`🗑️ Removing student from incorrect TeacherBatch: ${tb._id}`);
        tb.assignedStudents = tb.assignedStudents.filter(
          s => s.student.toString() !== student._id.toString()
        );
        await tb.save();
      }
    }
    
    // Now find or create correct TeacherBatch
    let teacherBatch = await TeacherBatch.findOne({
      teacher: user._id,
      batch: batch._id,
      isActive: true
    });
    
    if (!teacherBatch) {
      // Create new TeacherBatch
      teacherBatch = new TeacherBatch({
        teacher: user._id,
        batch: batch._id,
        assignedStudents: [{
          student: student._id,
          assignedDate: new Date(),
          isActive: true
        }],
        isActive: true,
        roomNumber: "Default",
        subject: faculty.courseAssigned || "General"
      });
      
      await teacherBatch.save();
      console.log(`✅ Created new TeacherBatch for ${faculty.facultyName}`);
    } else {
      // Check if student already in this batch
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
        console.log(`✅ Added student to existing TeacherBatch`);
      }
    }
    
    // Final verification
    const finalTB = await TeacherBatch.findOne({
      "assignedStudents.student": student._id
    }).populate('teacher').populate('batch');
    
    if (finalTB) {
      const finalFaculty = await Faculty.findOne({ _id: finalTB.teacher.facultyId });
      console.log(`✅ VERIFICATION: Student ${student.studentId} is with:`);
      console.log(`   Faculty: ${finalFaculty.facultyName}`);
      console.log(`   Batch: ${finalTB.batch.displayName}`);
      
      // Double-check student document matches
      if (student.facultyAllot !== finalFaculty.facultyName) {
        console.log(`⚠️ Student faculty mismatch! Fixing...`);
        student.facultyAllot = finalFaculty.facultyName;
        await student.save();
      }
      if (student.batchTime !== finalTB.batch.displayName) {
        console.log(`⚠️ Student batch mismatch! Fixing...`);
        student.batchTime = finalTB.batch.displayName;
        await student.save();
      }
    }
    
  } catch (error) {
    console.error("❌ Error in assignStudentToFacultyBatch:", error);
  }
};

// Helper function for fee schedule
const generateFeeScheduleForStudent = (course, startDate) => {
  try {
    console.log("💰 Generating fee schedule...");

    const feeSchedule = [];
    const start = new Date(startDate || new Date());

    const durationMatch = course.duration?.match(/\d+/);
    const durationMonths = durationMatch ? parseInt(durationMatch[0]) : 12;

    let examMonths = [];
    if (course.examMonths && course.examMonths.trim() !== "") {
      examMonths = course.examMonths
        .split(",")
        .map((m) => parseInt(m.trim()))
        .filter((m) => !isNaN(m));
    }

    for (let month = 1; month <= durationMonths; month++) {
      const dueDate = new Date(start);
      dueDate.setMonth(start.getMonth() + month - 1);
      dueDate.setDate(5);

      const isExamMonth = examMonths.includes(month);
      const totalAmount =
        (course.monthlyFee || 0) + (isExamMonth ? course.examFee || 0 : 0);

      feeSchedule.push({
        month: `Month ${month}`,
        monthNumber: month,
        amount: course.monthlyFee || 0,
        dueDate: dueDate,
        status: "pending",
        isExamMonth: isExamMonth,
        examFee: isExamMonth ? course.examFee || 0 : 0,
        totalAmount: totalAmount,
        paymentDate: null,
        receiptNo: "",
        paymentMode: "",
      });
    }

    console.log(`✅ Generated ${feeSchedule.length} fee schedule entries`);
    return feeSchedule;
  } catch (error) {
    console.error("❌ Error generating fee schedule:", error);
    return [];
  }
};

// @desc    Cancel admission
// @route   PUT /api/admissions/:id/cancel
// @access  Private
exports.cancelAdmission = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const admission = await Admission.findById(req.params.id);
    
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found"
      });
    }

    // Store old status for history
    const oldStatus = admission.status;
    
    // Update admission status
    admission.status = "cancelled";
    admission.remarks = `[CANCELLED] ${reason || 'No reason provided'} | Previous: ${oldStatus}`;
    admission.updatedBy = req.user?.id;
    
    await admission.save();
    
    // Also update associated student if exists
    const student = await Student.findOne({ admissionId: admission._id });
    if (student) {
      student.status = "discontinued";
      student.remarks = student.remarks ? 
        `${student.remarks} | Cancelled: ${reason}` : 
        `Cancelled: ${reason}`;
      await student.save();
      
      // Remove from TeacherBatch
      try {
        const TeacherBatch = require("../models/TeacherBatch");
        const teacherBatches = await TeacherBatch.find({
          "assignedStudents.student": student._id
        });
        
        for (const tb of teacherBatches) {
          tb.assignedStudents = tb.assignedStudents.filter(
            s => s.student.toString() !== student._id.toString()
          );
          await tb.save();
        }
      } catch (tbError) {
        console.error("Error removing from TeacherBatch:", tbError);
      }
    }

    res.json({
      success: true,
      message: "Admission cancelled successfully",
      data: admission
    });
  } catch (error) {
    console.error("Cancel admission error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Put admission on hold
// @route   PUT /api/admissions/:id/hold
// @access  Private
exports.holdAdmission = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const admission = await Admission.findById(req.params.id);
    
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found"
      });
    }

    // Store old status
    const oldStatus = admission.status;
    
    // Update admission status
    admission.status = "on_hold";
    admission.remarks = `[ON HOLD] ${reason || 'No reason provided'} | Previous: ${oldStatus}`;
    admission.updatedBy = req.user?.id;
    
    await admission.save();
    
    // Update associated student if exists
    const student = await Student.findOne({ admissionId: admission._id });
    if (student) {
      student.status = "inactive";
      student.remarks = student.remarks ? 
        `${student.remarks} | On Hold: ${reason}` : 
        `On Hold: ${reason}`;
      await student.save();
    }

    res.json({
      success: true,
      message: "Admission put on hold successfully",
      data: admission
    });
  } catch (error) {
    console.error("Hold admission error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Mark admission as complete (Manual)
// @route   PUT /api/admissions/:id/complete
// @access  Private
exports.completeAdmission = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const admission = await Admission.findById(req.params.id);
    
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found"
      });
    }

    // Store old status
    const oldStatus = admission.status;
    
    // Update admission status
    admission.status = "completed";
    admission.remarks = `[COMPLETED] ${reason || 'Manually completed'} | Previous: ${oldStatus}`;
    admission.updatedBy = req.user?.id;
    
    await admission.save();
    
    // Update associated student if exists
    const student = await Student.findOne({ admissionId: admission._id });
    if (student) {
      student.status = "completed";
      student.remarks = student.remarks ? 
        `${student.remarks} | Completed: ${reason}` : 
        `Completed: ${reason}`;
      await student.save();
    }

    res.json({
      success: true,
      message: "Admission marked as complete successfully",
      data: admission
    });
  } catch (error) {
    console.error("Complete admission error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Reactivate cancelled/on-hold admission
// @route   PUT /api/admissions/:id/reactivate
// @access  Private
exports.reactivateAdmission = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const admission = await Admission.findById(req.params.id);
    
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found"
      });
    }

    // Store old status
    const oldStatus = admission.status;
    
    // Update admission status back to admitted
    admission.status = "admitted";
    admission.remarks = `[REACTIVATED] ${reason || 'Reactivated'} | Previous: ${oldStatus}`;
    admission.updatedBy = req.user?.id;
    
    await admission.save();
    
    // Update associated student if exists
    const student = await Student.findOne({ admissionId: admission._id });
    if (student) {
      student.status = "active";
      student.remarks = student.remarks ? 
        `${student.remarks} | Reactivated: ${reason}` : 
        `Reactivated: ${reason}`;
      await student.save();
      
      // Re-add to TeacherBatch if needed
      try {
        const { assignStudentToFacultyBatch } = require("./admissionController");
        await assignStudentToFacultyBatch(student);
      } catch (tbError) {
        console.error("Error reassigning to TeacherBatch:", tbError);
      }
    }

    res.json({
      success: true,
      message: "Admission reactivated successfully",
      data: admission
    });
  } catch (error) {
    console.error("Reactivate admission error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Auto-check for completed students (Run via cron job)
// @access  Internal
exports.autoCompleteStudents = async () => {
  try {
    console.log("🤖 Running auto-complete check...");

    const students = await Student.find({
      status: "active",
      isActive: true
    }).populate('courseCode');

    let completed = 0;

    for (const student of students) {

      // ✅ FIX 1: Parse duration correctly (e.g. "12 months" → 12)
      const durationRaw = student.courseCode?.duration || "12";
      const durationMatch = String(durationRaw).match(/\d+/);
      const courseDuration = durationMatch ? parseInt(durationMatch[0]) : 12;

      const monthsSinceAdmission = Math.floor(
        (new Date() - new Date(student.admissionDate)) / (1000 * 60 * 60 * 24 * 30)
      );

      // ✅ FIX 2: Check fees using correct field (status === "paid")
      const allFeesPaid = student.feeSchedule.length > 0 &&
        student.feeSchedule.every(fee => fee.status === "paid");

      // ✅ FIX 3: Check all exam months are paid
      const allExamsPaid = student.feeSchedule
        .filter(fee => fee.isExamMonth === true)
        .every(fee => fee.status === "paid");

      // ✅ Complete only if: duration passed AND all fees paid AND all exams paid
      if (monthsSinceAdmission >= courseDuration && allFeesPaid && allExamsPaid) {

        student.status = "completed";
        student.remarks = `${student.remarks || ''} | Auto-completed on ${new Date().toLocaleDateString()}`;
        await student.save();

        const admission = await Admission.findById(student.admissionId);
        if (admission) {
          admission.status = "completed";
          admission.remarks = `${admission.remarks || ''} | Auto-completed on ${new Date().toLocaleDateString()}`;
          await admission.save();
        }

        completed++;
        console.log(`✅ Auto-completed: ${student.fullName} (${student.studentId})`);
      }
    }

    console.log(`🤖 Auto-complete finished: ${completed} students marked complete`);
    return { success: true, completed };

  } catch (error) {
    console.error("❌ Auto-complete error:", error);
    return { success: false, error: error.message };
  }
};

// @desc    Auto-check for hold students (Run via cron job)
// @access  Internal
exports.autoHoldStudents = async () => {
  try {
    console.log("🤖 Running auto-hold check...");
    
    // Find all active students
    const students = await Student.find({ 
      status: "active",
      isActive: true 
    }).populate('courseCode');
    
    let onHold = 0;
    
    for (const student of students) {
      // Check course duration completed
      const courseDuration = student.courseCode?.duration || 12;
      const monthsSinceAdmission = Math.floor(
        (new Date() - new Date(student.admissionDate)) / (1000 * 60 * 60 * 24 * 30)
      );
      
      // If duration completed but fees pending
      if (monthsSinceAdmission >= courseDuration) {
        const hasPendingFees = student.feeSchedule.some(
          fee => fee.status !== "paid" && fee.balanceAmount > 0
        );
        
        if (hasPendingFees) {
          // Update student
          student.status = "inactive";
          student.remarks = `${student.remarks || ''} | Auto-hold: Duration completed but fees pending`;
          await student.save();
          
          // Update associated admission
          const admission = await Admission.findById(student.admissionId);
          if (admission) {
            admission.status = "on_hold";
            admission.remarks = `${admission.remarks || ''} | Auto-hold: Duration completed but fees pending`;
            await admission.save();
          }
          
          onHold++;
          console.log(`⚠️ Auto-hold: ${student.fullName} (${student.studentId}) - Duration completed, fees pending`);
        }
      }
    }
    
    console.log(`🤖 Auto-hold finished: ${onHold} students put on hold`);
    return { success: true, onHold };
    
  } catch (error) {
    console.error("❌ Auto-hold error:", error);
    return { success: false, error: error.message };
  }
};