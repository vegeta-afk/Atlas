const jwt = require("jsonwebtoken");
const User = require("../models/user");

const protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default-secret-key");
    
    // Get user from database to verify
    const user = await User.findById(decoded.userId || decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // ✅ CRITICAL: Use facultyId from token OR from user document
    // The token should have facultyId from login function above
    const facultyId = decoded.facultyId || (user.facultyId ? user.facultyId.toString() : null);
    
    // Add user info to req.user
    req.user = {
      _id: user._id,
      id: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      facultyId: facultyId, // ✅ This should now have the correct facultyId
      studentId: decoded.studentId || user.studentId || null
    };
    
    console.log("🔐 Authenticated user:", {
      id: req.user.id,
      role: req.user.role,
      facultyId: req.user.facultyId, // Should be "697493e7be301eba08798704"
      studentId: req.user.studentId 
    });
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }
};

// ✅ Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('🔐 AUTHORIZE - User role:', req.user?.role, 'Required:', roles);
    
    if (!req.user) {
      console.log('❌ No user found');
      return res.status(403).json({
        success: false,
        message: 'No user found',
      });
    }
    
    // Convert both to lowercase for case-insensitive comparison
    const userRole = req.user.role ? req.user.role.toString().toLowerCase().trim() : '';
    const allowedRoles = roles.map(r => r.toString().toLowerCase().trim());
    
    console.log('🔍 Normalized - User role:', userRole, 'Allowed:', allowedRoles);
    
    if (!allowedRoles.includes(userRole)) {
      console.log(`❌ Role mismatch: ${userRole} not in ${allowedRoles}`);
      return res.status(403).json({
        success: false,
        message: `Role (${req.user.role}) is not allowed to access this resource`,
      });
    }
    
    console.log('✅ Authorization passed!');
    next();
  };
};

// ✅ EXPORT BOTH
module.exports = {
  protect,
  authorize,
};
