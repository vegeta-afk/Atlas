const express = require("express");
const router = express.Router();
const facultyController = require("../controllers/facultyController");
const { protect, authorize } = require("../middlewares/authMiddleware");

router.use(protect);

// ======================
// STATIC / SPECIFIC ROUTES FIRST
// ======================

router.post("/", authorize("admin", "hr"), facultyController.createFaculty);

router.get("/", authorize("admin", "hr", "instructor"), facultyController.getFaculty);

router.get("/stats/dashboard", authorize("admin", "hr"), facultyController.getFacultyStats);

router.get("/admin/with-batches", authorize("admin"), facultyController.getFacultyWithBatches);

// Faculty's own routes — MUST be before /:id
router.get("/me/batches", authorize("instructor"), facultyController.getMyBatches);

router.get("/me/batches/:batchId/students", authorize("instructor"), facultyController.getMyBatchStudents);

// ======================
// PARAM ROUTES AFTER — these must come last
// ======================

router.put("/:id/status", authorize("admin", "hr"), facultyController.updateFacultyStatus);

router.route("/:id")
  .get(authorize("admin", "hr"), facultyController.getFacultyById)
  .put(authorize("admin", "hr"), facultyController.updateFaculty)
  .delete(authorize("admin"), facultyController.deleteFaculty);

// Shared routes (admin views any, faculty views own — enforced in controller)
router.get("/:id/batches", authorize("admin", "instructor"), facultyController.getFacultyBatches);

router.get("/:facultyId/batches/:batchId/students", authorize("admin", "instructor"), facultyController.getFacultyBatchStudents);

module.exports = router;