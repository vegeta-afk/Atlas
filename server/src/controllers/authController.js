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