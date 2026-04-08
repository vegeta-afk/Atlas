// routes/admissionRoutes.js
const express = require("express");
const router = express.Router();
const admissionController = require("../controllers/admissionController");
const { protect, authorize } = require("../middlewares/authMiddleware");
const { upload } = require("../config/cloudinary");

// All routes protected
router.use(protect);

// ✅ ALLOWED ROLES: added "instructor" and "faculty"
const READ_ROLES  = ["admin", "front_office", "accountant", "instructor", "faculty"];
const WRITE_ROLES = ["admin", "front_office", "instructor", "faculty"];
const ADMIN_ONLY  = ["admin"];

// ── Special named routes (MUST come before /:id) ──────────────────────────

router.get("/approved", authorize(...READ_ROLES), async (req, res) => {
  try {
    const Admission = require("../models/Admission");
    const admissions = await Admission.find({ status: "approved", isActive: true })
      .sort({ admissionDate: -1 })
      .select("_id admissionNo fullName course admissionDate totalFees paidFees balanceFees mobileNumber email batchTime facultyAllot");
    res.json({ success: true, count: admissions.length, data: admissions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

router.get("/:id/student-status", authorize(...READ_ROLES), async (req, res) => {
  try {
    const Student = require("../models/Student");
    const student = await Student.findOne({ admissionId: req.params.id });
    res.json({ success: true, isConverted: !!student, studentId: student ? student._id : null, studentData: student || null });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/check-bulk-conversion", authorize(...READ_ROLES), async (req, res) => {
  try {
    const { admissionIds } = req.body;
    const Student = require("../models/Student");
    if (!admissionIds || !Array.isArray(admissionIds)) {
      return res.status(400).json({ success: false, message: "No admission IDs provided" });
    }
    const students = await Student.find({ admissionId: { $in: admissionIds } }).select("admissionId _id studentId");
    const conversionMap = {};
    students.forEach((s) => { conversionMap[s.admissionId.toString()] = { isConverted: true, studentId: s._id, studentCode: s.studentId }; });
    const results = admissionIds.map((id) => {
      const info = conversionMap[id];
      return { admissionId: id, isConverted: !!info, studentId: info ? info.studentId : null, studentCode: info ? info.studentCode : null };
    });
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── Stats (before /:id) ───────────────────────────────────────────────────
router.route("/stats/dashboard")
  .get(authorize(...READ_ROLES), admissionController.getDashboardStats);

// ── Main CRUD ─────────────────────────────────────────────────────────────
router.route("/")
  .get(authorize(...READ_ROLES), admissionController.getAdmissions)
  .post(authorize(...WRITE_ROLES),  upload.single("photo"), admissionController.createAdmission);

router.route("/:id")
  .get(authorize(...READ_ROLES), admissionController.getAdmission)
  .put(authorize(...WRITE_ROLES), upload.single("photo"), admissionController.updateAdmission)
  .delete(authorize(...ADMIN_ONLY), admissionController.deleteAdmission);

// ── Additional routes ─────────────────────────────────────────────────────
router.route("/:id/export")
  .get(authorize(...READ_ROLES), admissionController.exportAdmission);

router.route("/:id/activities")
  .get(authorize(...READ_ROLES), admissionController.getAdmissionActivities);

router.route("/:id/status")
  .put(authorize(...WRITE_ROLES), admissionController.updateStatus);

router.route("/:id/fees")
  .put(authorize("admin", "accountant", "instructor", "faculty"), admissionController.updateFees);

// ── Status management ─────────────────────────────────────────────────────
router.put("/:id/cancel",     authorize(...WRITE_ROLES), admissionController.cancelAdmission);
router.put("/:id/hold",       authorize(...WRITE_ROLES), admissionController.holdAdmission);
router.put("/:id/complete",   authorize(...WRITE_ROLES), admissionController.completeAdmission);
router.put("/:id/reactivate", authorize(...WRITE_ROLES), admissionController.reactivateAdmission);
router.post("/auto-complete", authorize(...ADMIN_ONLY),  admissionController.autoCompleteStudents);
router.post("/auto-hold",     authorize(...ADMIN_ONLY),  admissionController.autoHoldStudents);

module.exports = router;