// controllers/scholarshipController.js
const Scholarship = require("../models/Scholarship");

// Get all scholarships
exports.getScholarships = async (req, res) => {
  try {
    const scholarships = await Scholarship.find({ isActive: true });
    res.json({ success: true, data: scholarships });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get scholarships for a specific course
exports.getForCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    // You can add course-specific logic here
    const scholarships = await Scholarship.find({ isActive: true });
    res.json({ success: true, data: scholarships });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create scholarship
exports.createScholarship = async (req, res) => {
  try {
    const scholarship = await Scholarship.create(req.body);
    res.status(201).json({ success: true, data: scholarship });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};