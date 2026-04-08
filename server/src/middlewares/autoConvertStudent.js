const Student = require("../models/Student");
const Course = require("../models/Course");
const { generateFeeSchedule } = require("../utils/feeGenerator");
const User = require("../models/user");
const bcrypt = require("bcryptjs");

// Function to create user account for student
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

// Middleware to auto-convert admission to student
const autoConvertAdmissionToStudent = async (admission, user) => {
  try {
    console.log(`🔄 Auto-converting admission ${admission.admissionNo} to student...`);

    // Check if already converted
    if (admission.isAutoConvertedToStudent) {
      console.log(`✅ Already auto-converted to student: ${admission.studentId}`);
      return;
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({
      admissionId: admission._id,
    });
    if (existingStudent) {
      console.log(`✅ Student already exists: ${existingStudent.studentId}`);
      admission.isAutoConvertedToStudent = true;
      admission.studentId = existingStudent.studentId;
      admission.convertedAt = new Date();
      await admission.save();
      return;
    }

    // Get course details
    const course = await Course.findOne({
      courseFullName: admission.course,
    });

    if (!course) {
      console.error(`❌ Course not found: ${admission.course}`);
      throw new Error(`Course not found: ${admission.course}`);
    }

    // Create student object
    const studentData = {
      admissionId: admission._id,
      admissionNo: admission.admissionNo,
      fullName: admission.fullName,
      dateOfBirth: admission.dateOfBirth,
      gender: admission.gender,
      email: (admission.email && admission.email.trim())
  ? admission.email.trim()
  : `${admission.fullName.replace(/\s+/g, ".").toLowerCase()}@student.lms`,
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
      totalCourseFee: (course.admissionFee || 0) + (course.monthlyFee || 0) * (parseInt(course.duration) || 12) + (course.examFee || 0) * (course.examMonths ? course.examMonths.split(",").length : 0) + (course.otherCharges || 0),
      monthlyFee: course.monthlyFee || 1000,
      examFee: course.examFee || 500,
      admissionFee: course.admissionFee || 500,
      paidAmount: admission.paidFees || 0,
      balanceAmount: (admission.totalFees || 10000) - (admission.paidFees || 0),
      lastQualification: admission.lastQualification || "12th",
      percentage: admission.percentage || "75",
      yearOfPassing: admission.yearOfPassing || "2024",
      schoolCollege: admission.schoolCollege || "Local School",
      cast: admission.cast || "General",
      speciallyAbled: admission.speciallyAbled || false,
      status: "active",
      isActive: true,
      createdBy: user ? user.id : null,
    };

    // Generate fee schedule
    studentData.feeSchedule = generateFeeSchedule(course, studentData.admissionDate);

    // Create and save student
    const student = new Student(studentData);
    const savedStudent = await student.save();

    // ✅ AUTO-CREATE USER ACCOUNT FOR STUDENT
    await createStudentUserAccount(savedStudent);

    // Update admission tracking
    admission.isAutoConvertedToStudent = true;
    admission.studentId = savedStudent.studentId;
    admission.convertedAt = new Date();
    await admission.save();

    console.log(`✅ Successfully auto-created student: ${savedStudent.studentId}`);

    return savedStudent;
  } catch (error) {
    console.error(`❌ Error auto-converting admission ${admission.admissionNo}:`, error);
    throw error;
  }
};

module.exports = { autoConvertAdmissionToStudent };