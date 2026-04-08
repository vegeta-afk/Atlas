const express = require("express");
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  verifyToken,
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);

// Protected routes (require authentication)
router.get("/verify", protect, verifyToken);

module.exports = router;
