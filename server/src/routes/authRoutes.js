const express = require("express");
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  verifyToken,
  changePassword,
  sendEmailVerification,
  confirmEmailChange,
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const { googleLogin } = require("../controllers/googleAuthController");

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/google-login", googleLogin);
router.post("/verify-email-change", confirmEmailChange); // public — the token itself is the auth

// Protected routes (require authentication)
router.get("/verify", protect, verifyToken);
router.put("/change-password", protect, changePassword);
router.post("/send-email-verification", protect, sendEmailVerification);

module.exports = router;