const express = require("express");
const router = express.Router();
const {
  createAdminUser,
  getAdminUsers,
} = require("../controllers/adminUserController");
const { protect, authorize } = require("../middlewares/authMiddleware");

// Protected routes (admin only)
// router.post("/create-admin", protect, authorize("admin"), createAdminUser);
router.get("/admins", protect, authorize("admin"), getAdminUsers);

module.exports = router;