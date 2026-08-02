const express = require("express");
const router = express.Router();
const {
  createAdminUser,
  getAdminUsers,
  deleteAdminUser,
} = require("../controllers/adminUserController");
const { protect, authorize } = require("../middlewares/authMiddleware");

router.post("/create-admin", protect, authorize("admin"), createAdminUser);
router.get("/admins", protect, authorize("admin"), getAdminUsers);
router.delete("/:id", protect, authorize("admin"), deleteAdminUser);

module.exports = router;