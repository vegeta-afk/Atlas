const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/authMiddleware");
const reportController = require("../controllers/reportController");

// Public test route
router.get("/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "Report routes are working!",
    time: new Date().toISOString()
  });
});

// All routes below require authentication and admin access
router.use(protect);
router.use(authorize("admin"));

// @route   GET /api/reports/countdown
router.get("/countdown", reportController.getCountdownReport);

// @route   GET /api/reports/countdown/export
router.get("/countdown/export", reportController.exportCountdownReport);

// @route   GET /api/reports/exams/upcoming
router.get("/exams/upcoming", reportController.getUpcomingExamReport);

// @route   GET /api/reports/exams/upcoming/export
router.get("/exams/upcoming/export", reportController.exportUpcomingExamReport);

// @route   GET /api/reports/completion-stats
router.get("/completion-stats", reportController.getCompletionStats);

module.exports = router;