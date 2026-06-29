const express = require("express");
const router = express.Router();
const { getBatchReport } = require("../controllers/batchReportController");
const { protect, authorize } = require("../middlewares/authMiddleware");

const READ_ROLES = ["admin", "front_office", "accountant", "instructor", "faculty"];

router.use(protect);

router.get("/", authorize(...READ_ROLES), getBatchReport);

module.exports = router;