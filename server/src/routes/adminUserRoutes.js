const express = require("express");
const router = express.Router();
const {
  createAdminUser,
  getAdminUsers,
} = require("../controllers/adminUserController");
const { protect, authorize } = require("../middlewares/authMiddleware");

// TEMPORARY - no auth for bootstrap admin creation
router.post("/create-admin", createAdminUser);
router.get("/admins", protect, authorize("admin"), getAdminUsers);

module.exports = router;