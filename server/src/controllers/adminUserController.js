const User = require("../models/user");
const bcrypt = require("bcryptjs");

// @desc    Create a new admin (by an existing admin)
// @route   POST /api/admin/create-admin
// @access  Private (admin only)
exports.createAdminUser = async (req, res) => {
  try {
    const { name, email, password, mobileNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Hash password — same pattern as register()
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = await User.create({
      name,
      fullName: name,
      email,
      password: hashedPassword,
      mobileNumber,
      role: "admin",
      isVerified: true,
      isActive: true,
      mustChangePassword: true, // force them to change temp password on first login
    });

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: {
        id: newAdmin._id,
        name: newAdmin.fullName || newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        mobileNumber: newAdmin.mobileNumber,
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get all admin users
// @route   GET /api/admin/admins
// @access  Private (admin only)
exports.getAdminUsers = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select("-password");
    res.status(200).json({
      success: true,
      admins,
    });
  } catch (error) {
    console.error("Get admins error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};