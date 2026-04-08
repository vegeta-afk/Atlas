const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/authMiddleware");
const courseExtensionController = require("../controllers/courseExtensionController");

// Public test route
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Course extension routes are working!",
    time: new Date().toISOString()
  });
});

// All routes below require authentication and admin access
router.use(protect);
router.use(authorize("admin"));

// @route   GET /api/course-extension/eligible-students
router.get("/eligible-students", courseExtensionController.getEligibleStudents);

// @route   POST /api/course-extension/preview
router.post("/preview", courseExtensionController.getExtensionPreview);

// @route   POST /api/course-extension/extend
router.post("/extend", courseExtensionController.extendStudentCourse);

module.exports = router;