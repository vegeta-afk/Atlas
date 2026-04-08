const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/authMiddleware");
const examReportController = require("../controllers/examReportController");

// Public test route
router.get("/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "Exam report routes are working!",
    time: new Date().toISOString()
  });
});

// All routes below require authentication and admin access
router.use(protect);
router.use(authorize("admin"));

// @route   GET /api/reports/exams/upcoming
router.get("/upcoming", examReportController.getUpcomingExamReport);

// @route   GET /api/reports/exams/upcoming/export
router.get("/upcoming/export", examReportController.exportUpcomingExamReport);

// @route   GET /api/reports/exams/stats
router.get("/stats", examReportController.getExamStats);

module.exports = router;