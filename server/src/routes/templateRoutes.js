// server/routes/templateRoutes.js
const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
  createTemplate,
  updateTemplate,
  getTemplates,
  getTemplateById,
  deleteTemplate,
} = require("../controllers/templateController");

const { protect, authorize } = require("../middlewares/authMiddleware"); // matches your existing pattern

// memory storage since we stream straight to Cloudinary, no local file needed
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", protect, getTemplates);
router.get("/:id", protect, getTemplateById);

router.post("/", protect, authorize("admin"), upload.single("image"), createTemplate);
router.put("/:id", protect, authorize("admin"), upload.single("image"), updateTemplate);
router.delete("/:id", protect, authorize("admin"), deleteTemplate);

module.exports = router;

// In your main app.js / server.js add:
// const templateRoutes = require("./routes/templateRoutes");
// app.use("/api/templates", templateRoutes);
