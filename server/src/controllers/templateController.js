// server/controllers/templateController.js
// NOTE: This assumes you already have `cloudinary` configured somewhere in your
// project (same setup you used for faculty/admission photo uploads). Adjust the
// require path below to match your actual config file.
const cloudinary = require("../config/cloudinary"); // <-- adjust path if different
const streamifier = require("streamifier"); // npm install streamifier --save
const Template = require("../models/Template");

// Helper: upload a buffer (from multer memoryStorage) to Cloudinary
const uploadBufferToCloudinary = (buffer, folder = "ims-templates") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// Helper: read image dimensions from a buffer without extra deps
const getImageSize = (buffer) => {
  // Cloudinary's upload result already includes width/height, so we just
  // read that back after upload instead of parsing the buffer ourselves.
  return null;
};

// POST /api/templates  (multipart/form-data: image, name, category, fields)
exports.createTemplate = async (req, res) => {
  try {
    const { name, category, fields } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Template image is required" });
    }

    const uploadResult = await uploadBufferToCloudinary(req.file.buffer);

    const parsedFields = typeof fields === "string" ? JSON.parse(fields) : fields || [];

    const template = await Template.create({
      name,
      category: category || "custom",
      imageUrl: uploadResult.secure_url,
      imageWidth: uploadResult.width,
      imageHeight: uploadResult.height,
      fields: parsedFields,
    });

    res.status(201).json({ success: true, template });
  } catch (err) {
    console.error("createTemplate error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to create template" });
  }
};

// PUT /api/templates/:id  (multipart/form-data, image optional on update)
exports.updateTemplate = async (req, res) => {
  try {
    const { name, category, fields } = req.body;
    const update = {};

    if (name !== undefined) update.name = name;
    if (category !== undefined) update.category = category;
    if (fields !== undefined) {
      update.fields = typeof fields === "string" ? JSON.parse(fields) : fields;
    }

    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      update.imageUrl = uploadResult.secure_url;
      update.imageWidth = uploadResult.width;
      update.imageHeight = uploadResult.height;
    }

    const template = await Template.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    res.json({ success: true, template });
  } catch (err) {
    console.error("updateTemplate error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to update template" });
  }
};

// GET /api/templates?category=birthday
exports.getTemplates = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.category) filter.category = req.query.category;

    const templates = await Template.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, templates });
  } catch (err) {
    console.error("getTemplates error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch templates" });
  }
};

// GET /api/templates/:id
exports.getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }
    res.json({ success: true, template });
  } catch (err) {
    console.error("getTemplateById error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch template" });
  }
};

// DELETE /api/templates/:id  (soft delete)
exports.deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }
    res.json({ success: true, message: "Template deleted" });
  } catch (err) {
    console.error("deleteTemplate error:", err);
    res.status(500).json({ success: false, message: "Failed to delete template" });
  }
};
