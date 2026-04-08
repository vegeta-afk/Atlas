const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/authMiddleware");
const courseConversionController = require("../controllers/courseConversionController");

// Public test route (no auth required)
router.get("/test", courseConversionController.testRoute);

// All routes below require authentication and admin access
router.use(protect);
router.use(authorize("admin"));

// @route   GET /api/course-conversion/eligible-students
router.get("/eligible-students", courseConversionController.getEligibleStudents);

// @route   POST /api/course-conversion/preview
router.post("/preview", courseConversionController.getConversionPreview);

// @route   POST /api/course-conversion/convert
router.post("/convert", courseConversionController.convertStudentCourse);

module.exports = router;