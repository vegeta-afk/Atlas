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
      mustChangePassword: true,
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

// @desc    Delete an admin user
// @route   DELETE /api/admin/:id
// @access  Private (admin only)
exports.deleteAdminUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent an admin from deleting their own account
    if (req.user && req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own admin account",
      });
    }

    const admin = await User.findOne({ _id: id, role: "admin" });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Optional safety net: block deleting the last remaining admin
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete the last remaining admin account",
      });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("Delete admin error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Suspend or reactivate an admin user
// @route   PUT /api/admin/:id/toggle-status
// @access  Private (admin only)
exports.toggleAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent an admin from suspending their own account
    if (req.user && req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot suspend your own admin account",
      });
    }

    const admin = await User.findOne({ _id: id, role: "admin" });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // If this admin is currently active and we're about to suspend them,
    // block suspending the last remaining active admin
    if (admin.isActive !== false) {
      const activeAdminCount = await User.countDocuments({
        role: "admin",
        isActive: { $ne: false },
      });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot suspend the last remaining active admin account",
        });
      }
    }

    admin.isActive = admin.isActive === false ? true : false;
    await admin.save();

    res.status(200).json({
      success: true,
      message: admin.isActive ? "Admin reactivated successfully" : "Admin suspended successfully",
      admin: {
        id: admin._id,
        isActive: admin.isActive,
      },
    });
  } catch (error) {
    console.error("Toggle admin status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};