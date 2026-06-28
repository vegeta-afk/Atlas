// routes/birthdayRoutes.js
const express = require("express");
const router = express.Router();
const { getBirthdayReport } = require("../controllers/birthdayController");
const { protect, authorize } = require("../middlewares/authMiddleware");

const READ_ROLES = ["admin", "front_office", "accountant", "instructor", "faculty"];

router.use(protect);

router.get("/", authorize(...READ_ROLES), getBirthdayReport);

module.exports = router;