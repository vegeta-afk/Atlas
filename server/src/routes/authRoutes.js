const express = require("express");
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  verifyToken,
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const { googleLogin } = require("../controllers/googleAuthController");
// router.post("/google-login", googleLogin);

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/google-login", googleLogin);

// Protected routes (require authentication)
router.get("/verify", protect, verifyToken);

module.exports = router;
