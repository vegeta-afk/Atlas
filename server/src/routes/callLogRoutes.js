// routes/callLogRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/authMiddleware");

const {
  createCallLog,
  getAllCallLogs,
  getCallLogsByStudent,
  getCallLog,
  updateCallLog,
  deleteCallLog,
  getStatistics,
} = require("../controllers/callLogController");

// All routes require login
router.use(protect);

// Statistics  (must be BEFORE /:id so it's not treated as an id)
router.get("/statistics", getStatistics);

// Student-specific logs  (must be BEFORE /:id)
router.get("/student/:studentId/:studentType", getCallLogsByStudent);

// Main CRUD
router.get("/", getAllCallLogs);
router.post("/", createCallLog);
router.get("/:id", getCallLog);
router.put("/:id", updateCallLog);
router.delete("/:id", authorize("admin"), deleteCallLog);

module.exports = router;