const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/authMiddleware");

const {
  getAllSetupData,
  getActiveData,
  createQualification,
  updateQualification,
  deleteQualification,

  updateQualificationOrder,
  createArea,
  updateArea,
  deleteArea,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  createBatch,
  updateBatch,
  deleteBatch,
  updateBatchOrder,
  createEnquiryMethod,
  updateEnquiryMethod,
  deleteEnquiryMethod,
  updateEnquiryMethodOrder,
  createFee,
  updateFee,
  deleteFee,
  // ✅ Add these
  createCallStatus,
  getCallStatuses,
  updateCallStatus,
  deleteCallStatus,
  createCallReason,
  getCallReasons,
  updateCallReason,
  deleteCallReason,
  createNextAction,
  getNextActions,
  updateNextAction,
  deleteNextAction,
  // ✅ Add qualification order controller (you need to create this)
  updateQualificationOrder,
} = require("../controllers/setupController");

router.use(protect);
router.get("/", protect, authorize("admin", "instructor"), getAllSetupData);
router.get("/active", protect, authorize("admin", "instructor"), getActiveData);

// Setup data
router.get("/", getAllSetupData);
router.get("/active", getActiveData);

// Qualification routes
router.post("/qualifications", createQualification);
router.put("/qualifications/order", updateQualificationOrder); // ⚠️ MUST be BEFORE /:id
router.put("/qualifications/:id", updateQualification);
router.delete("/qualifications/:id", deleteQualification);

// Area routes
router.post("/areas", createArea);
router.put("/areas/:id", updateArea);
router.delete("/areas/:id", deleteArea);

// Holiday routes
router.post("/holidays", createHoliday);
router.put("/holidays/:id", updateHoliday);
router.delete("/holidays/:id", deleteHoliday);

// Batch routes
router.post("/batches", createBatch);
router.put("/batches/order", updateBatchOrder); // ⚠️ must be BEFORE /:id
router.put("/batches/:id", updateBatch);
router.delete("/batches/:id", deleteBatch);

// Enquiry Method routes
router.post("/enquiry-methods", createEnquiryMethod);
router.put("/enquiry-methods/order", updateEnquiryMethodOrder); // ⚠️ must be BEFORE /:id
router.put("/enquiry-methods/:id", updateEnquiryMethod);
router.delete("/enquiry-methods/:id", deleteEnquiryMethod);

// Fee routes
router.post("/fees", createFee);
router.put("/fees/:id", updateFee);
router.delete("/fees/:id", deleteFee);

// ✅ Call Status routes (no extra protect/authorize needed, already applied above)
router.post("/call-status", createCallStatus);
router.get("/call-status", getCallStatuses);
router.put("/call-status/:id", updateCallStatus);
router.delete("/call-status/:id", deleteCallStatus);

// ✅ Call Reason routes
router.post("/call-reasons", createCallReason);
router.get("/call-reasons", getCallReasons);
router.put("/call-reasons/:id", updateCallReason);
router.delete("/call-reasons/:id", deleteCallReason);

// ✅ Next Action routes
router.post("/next-actions", createNextAction);
router.get("/next-actions", getNextActions);
router.put("/next-actions/:id", updateNextAction);
router.delete("/next-actions/:id", deleteNextAction);

module.exports = router;