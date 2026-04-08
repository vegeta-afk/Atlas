// routes/enquiryRoutes.js
const express = require("express");
const router = express.Router();
const enquiryController = require("../controllers/enquiryController");
const { protect, authorize } = require("../middlewares/authMiddleware");

// All routes protected
router.use(protect);

// ✅ ALLOWED ROLES: added "instructor" and "faculty"
const ENQUIRY_ROLES = ["admin", "front_office", "counsellor", "instructor", "faculty"];

// ── Stats routes FIRST (before /:id so they don't get treated as IDs) ────
router.get("/stats/dashboard", authorize(...ENQUIRY_ROLES), async (req, res) => {
  try {
    // If enquiryController.getDashboardStats exists, swap to:
    // return enquiryController.getDashboardStats(req, res);
    res.status(200).json({ success: true, message: "Dashboard stats endpoint working" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/stats/monthly", authorize(...ENQUIRY_ROLES), async (req, res) => {
  try {
    res.status(200).json({ success: true, message: "Monthly stats endpoint working" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── Main CRUD ─────────────────────────────────────────────────────────────
router
  .route("/")
  .get(authorize(...ENQUIRY_ROLES), enquiryController.getEnquiries)
  .post(authorize(...ENQUIRY_ROLES), enquiryController.createEnquiry);

router
  .route("/:id")
  .get(authorize(...ENQUIRY_ROLES), enquiryController.getEnquiry)
  .put(authorize(...ENQUIRY_ROLES), enquiryController.updateEnquiry)
  .delete(authorize("admin"), enquiryController.deleteEnquiry);

// ── Special routes ────────────────────────────────────────────────────────
router
  .route("/:id/status")
  .put(authorize(...ENQUIRY_ROLES), enquiryController.updateStatus);

router
  .route("/:id/convert-to-admission")
  .post(authorize(...ENQUIRY_ROLES), enquiryController.convertToAdmission);

module.exports = router;