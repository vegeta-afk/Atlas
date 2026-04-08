// routes/courseRoutes.js - Updated with validation
const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const { protect, authorize } = require("../middlewares/authMiddleware");
// const {
//   validateCourse,
//   validateCourseQuery,
//   validateCourseId,
// } = require("../middlewares/courseValidation");

// NEW: Get active courses for enquiry form (without requiring admin auth)
router.get("/active", courseController.getActiveCourses);


// All routes are protected and admin only
router.use(protect);
router.use(authorize("admin"));

// Course routes with validation
router
  .route("/")
  .get(courseController.getCourses)
  .post(courseController.createCourse);

// Courses for dropdown (simplified data for forms)
router.get("/dropdown/list", courseController.getCoursesForDropdown);


router
  .route("/:id")
  .get(courseController.getCourse)
  .put(courseController.updateCourse)
  .delete(courseController.deleteCourse);
// Course status management
// router.put(
//   "/:id/toggle-status",
//   validateCourseId,
//   courseController.toggleStatus
// );

// Course statistics and reports
router.get("/stats/summary", courseController.getCourseStats);


// NEW: Get courses by batch type
router.get(
  "/batch/:batchType",
  (req, res, next) => {
    const { batchType } = req.params;
    const validBatches = ["morning", "afternoon", "evening", "weekend"];

    if (!validBatches.includes(batchType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch type",
      });
    }
    next();
  },
  async (req, res) => {
    try {
      const { batchType } = req.params;
      const courses = await require("../models/Course")
        .find({
          isActive: true,
          availableBatches: batchType,
        })
        .select("_id courseCode courseFullName courseShortName duration");

      res.json({
        success: true,
        data: courses,
      });
    } catch (error) {
      console.error("Get courses by batch error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// NEW: Get courses by course type
router.get(
  "/type/:courseType",
  (req, res, next) => {
    const { courseType } = req.params;
    const validTypes = [
      "undergraduate",
      "postgraduate",
      "diploma",
      "certificate",
    ];

    if (!validTypes.includes(courseType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course type",
      });
    }
    next();
  },
  async (req, res) => {
    try {
      const { courseType } = req.params;
      const courses = await require("../models/Course")
        .find({
          isActive: true,
          courseType: courseType,
        })
        .select(
          "_id courseCode courseFullName courseShortName duration totalFee netFee"
        );

      res.json({
        success: true,
        data: courses,
      });
    } catch (error) {
      console.error("Get courses by type error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

module.exports = router;