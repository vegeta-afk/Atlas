// controllers/authController.js
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Generate JWT Token
const generateToken = (userId, email, role, facultyId, studentId) => {
  return jwt.sign(
    { 
      userId, 
      email, 
      role, 
      facultyId: facultyId || null,
      studentId: studentId || null
    },
    process.env.JWT_SECRET || "default-secret-key",
    { expiresIn: "7d" }
  );
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log("Login attempt for:", email);
    
    // Find user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log("User not found:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
    
    console.log("User found:", {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      fullName: user.fullName,
      studentId: user.studentId,
      facultyId: user.facultyId
    });
    
    // Check password
    let isPasswordValid = false;
    
    // Check if password is bcrypt hashed
    if (user.password && user.password.startsWith('$2')) {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      // For plain text passwords (temporary during migration)
      isPasswordValid = (user.password === password);
      
      // If valid and plain text, hash it
      if (isPasswordValid) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user.password = hashedPassword;
        await user.save();
        console.log("Password hashed for:", email);
      }
    }
    
    if (!isPasswordValid) {
      console.log("Invalid password for:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
    
    // Get facultyId as string
    let facultyIdString = null;
    if (user.facultyId) {
      facultyIdString = user.facultyId.toString();
    }
    
    // Get student data if user is a student
    let studentData = null;
    if (user.role === "student" && user.studentId) {
      try {
        // Try to fetch from students collection
        const { getDb } = require("../config/db");
        const db = getDb();
        studentData = await db.collection("students").findOne({ 
          studentId: user.studentId 
        });
        console.log("Student data fetched:", studentData ? "Yes" : "No");
      } catch (err) {
        console.log("Error fetching student data:", err.message);
      }
    }
    
    // Generate token
    const token = generateToken(
      user._id,
      user.email,
      user.role,
      facultyIdString,
      user.studentId
    );
    
    // Send response
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.fullName || user.name,
        fullName: user.fullName || user.name,
        email: user.email,
        role: user.role,
        mobileNumber: user.mobileNumber,
        facultyId: facultyIdString,
        studentId: user.studentId,
        studentData: studentData,
        mustChangePassword: user.mustChangePassword || false
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, mobileNumber, role = "student", facultyId } = req.body;
    
    // Check required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await User.create({
      name,
      fullName: name,
      email,
      password: hashedPassword,
      mobileNumber,
      role,
      facultyId: facultyId || null,
      mustChangePassword: role === "student",
      isActive: true,
      isVerified: true
    });
    
    // Generate token
    const token = generateToken(
      user._id,
      user.email,
      user.role,
      user.facultyId,
      user.studentId
    );
    
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.fullName || user.name,
        email: user.email,
        role: user.role,
        mobileNumber: user.mobileNumber,
        facultyId: user.facultyId,
        studentId: user.studentId,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with this email",
      });
    }
    
    // TODO: Send password reset email
    res.status(200).json({
      success: true,
      message: "Password reset instructions sent to your email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Verify token
// @route   GET /api/auth/verify
// @access  Private
exports.verifyToken = async (req, res) => {
  try {
    const user = req.user;
    
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.fullName || user.name,
        email: user.email,
        role: user.role,
        mobileNumber: user.mobileNumber,
        facultyId: user.facultyId,
        studentId: user.studentId,
      },
    });
  } catch (error) {
    console.error("Verify token error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// controllers/authController.js — add this export
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let isValid = false;
    if (user.password.startsWith('$2')) {
      isValid = await bcrypt.compare(currentPassword, user.password);
    } else {
      isValid = user.password === currentPassword;
    }

    if (!isValid) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    await user.save();

    res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};




// ── Replace your existing sendEmailVerification and changeEmail exports
// ── in authController.js with these three functions.
//
// Flow:
//   1. sendEmailVerification: user submits {newEmail, password}. We check
//      the password (proves it's really them), check the email isn't
//      taken, then EMAIL a verification link to the NEW address. Nothing
//      in the database changes yet.
//   2. confirmEmailChange: fires when the user clicks that link. We
//      re-validate the token and email uniqueness, THEN actually update
//      user.email. This is the only place the email is written.
//
// (changeEmail / the old direct-update route is removed — it was the
// insecure path that let someone skip verification entirely.)

const sendEmail = require("../utils/sendEmail"); // adjust path if needed

exports.sendEmailVerification = async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res.status(400).json({ success: false, message: "New email and password are required" });
    }

    const user = await User.findById(req.user._id).select("+password");

    // Confirm it's really the account owner requesting this
    let isValid = false;
    if (user.password.startsWith("$2")) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      isValid = user.password === password;
    }
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Password is incorrect" });
    }

    const normalizedEmail = newEmail.toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    // Short-lived token carrying who's changing and to what — nothing
    // is written to the DB until the link is clicked.
    const verifyToken = jwt.sign(
      { userId: user._id.toString(), newEmail: normalizedEmail, purpose: "email-change" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const verifyLink = `${process.env.CLIENT_URL}/verify-email-change?token=${verifyToken}`;

    await sendEmail({
      to: normalizedEmail,
      subject: "Confirm your new email — IIT Computer Institute",
      html: `
        <p>Hi ${user.fullName || user.name || ""},</p>
        <p>Click the link below to confirm this is your new email address for your IMS account:</p>
        <p><a href="${verifyLink}">${verifyLink}</a></p>
        <p>This link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
      `,
    });

    res.status(200).json({ success: true, message: "Verification link sent to your new email" });
  } catch (error) {
    console.error("Send verification error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Finalize an email change after the user clicks the emailed link
// @route   POST /api/auth/verify-email-change
// @access  Public (token itself is the auth — same pattern as password reset links)
exports.confirmEmailChange = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Missing token" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ success: false, message: "Link is invalid or has expired" });
    }

    if (payload.purpose !== "email-change") {
      return res.status(400).json({ success: false, message: "Invalid token" });
    }

    // Re-check uniqueness in case someone else grabbed the email in the meantime
    const existing = await User.findOne({ email: payload.newEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.email = payload.newEmail;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email updated successfully. Please log in again with your new email.",
      email: user.email,
    });
  } catch (error) {
    console.error("Confirm email change error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};