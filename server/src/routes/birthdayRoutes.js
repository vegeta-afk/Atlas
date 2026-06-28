// routes/birthdayRoutes.js
const express = require("express");
const router = express.Router();
const { getBirthdayReport } = require("../controllers/birthdayController");
const { protect } = require("../middleware/authMiddleware"); // adjust path if yours differs

router.get("/", protect, getBirthdayReport);

module.exports = router;