const Material = require("../models/Material");
const MaterialIssue = require("../models/MaterialIssue");

exports.getMaterials = async (req, res) => {
  try {
    const materials = await Material.find({ isActive: true }).sort({ createdAt: 1 });
    res.json({ success: true, data: materials });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createMaterial = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Material name is required" });
    }
    const existing = await Material.findOne({ name: name.trim(), isActive: true });
    if (existing) {
      return res.status(400).json({ success: false, message: "Material already exists" });
    }
    const { totalQuantity, unit, description } = req.body;
    const material = await Material.create({ name: name.trim(), totalQuantity, unit, description, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: material });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMaterial = async (req, res) => {
  try {
    await Material.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: "Material removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMaterial = async (req, res) => {
  try {
    const { name, totalQuantity, unit, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Material name is required" });
    }
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { $set: { name: name.trim(), totalQuantity, unit, description } },
      { new: true }
    );
    res.json({ success: true, data: material });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getIssues = async (req, res) => {
  try {
    const filter = {};
    if (req.query.studentId) filter.studentId = req.query.studentId;
    const issues = await MaterialIssue.find(filter);
    res.json({ success: true, data: issues });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleIssue = async (req, res) => {
  try {
    const { studentId, materialId, issued } = req.body;
    if (!studentId || !materialId) {
      return res.status(400).json({ success: false, message: "studentId and materialId are required" });
    }
    const record = await MaterialIssue.findOneAndUpdate(
      { studentId, materialId },
      { $set: { issued: !!issued, issuedDate: issued ? new Date() : null, issuedBy: req.user?._id } },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};