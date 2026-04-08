const express = require("express");
const router = express.Router();
const facultyController = require("../controllers/facultyController");
const { protect, authorize } = require("../middlewares/authMiddleware");

// Apply protect middleware to ALL routes
router.use(protect);

// ======================
// ADMIN/HR ONLY ROUTES
// ======================

// Create faculty (Admin/HR only)
router.post(
  "/",
  authorize("admin", "hr"),
  facultyController.createFaculty
);

// Get all faculty with search/filter (Admin/HR only)
router.get("/", authorize("admin", "hr", "instructor"), facultyController.getFaculty);

// Get faculty stats dashboard (Admin/HR only)
router.get(
  "/stats/dashboard",
  authorize("admin", "hr"),
  facultyController.getFacultyStats
);

// Get all faculty with batch assignments (Admin only)
router.get(
  "/admin/with-batches",
  authorize("admin"),
  facultyController.getFacultyWithBatches
);

// Update faculty status (Admin/HR only)
router.put(
  "/:id/status",
  authorize("admin", "hr"),
  facultyController.updateFacultyStatus
);

// CRUD operations on faculty (Admin/HR only)
router
  .route("/:id")
  .get(authorize("admin", "hr"), facultyController.getFacultyById)
  .put(authorize("admin", "hr"), facultyController.updateFaculty)
  .delete(authorize("admin"), facultyController.deleteFaculty);

// ======================
// FACULTY-SPECIFIC ROUTES (for their own data)
// ======================

// Get current faculty's batches (Faculty can view their own)
router.get(
  "/me/batches",
  authorize("instructor"),
  facultyController.getMyBatches
);

// Get current faculty's batch students (Faculty can view their own)
router.get(
  "/me/batches/:batchId/students",
  authorize("instructor"),
  facultyController.getMyBatchStudents
);

// ======================
// SHARED ROUTES (Admin can view any, Faculty can view their own)
// ======================

// Get specific faculty's batches 
// ADMIN: can view any faculty's batches
// FACULTY: can only view their own (handled in controller)
router.get(
  "/:id/batches",
  protect,  
  facultyController.getFacultyBatches
);

// Get students in faculty's batch
// ADMIN: can view any faculty's batch students  
// FACULTY: can only view their own (handled in controller)
router.get(
  "/:facultyId/batches/:batchId/students",
  protect,
  facultyController.getFacultyBatchStudents
);

module.exports = router;