// controllers/batchReportController.js
const Admission = require("../models/Admission");

const getBatchReport = async (req, res) => {
  try {
    const batchData = await Admission.aggregate([
      {
        $match: {
          isActive: true,
          status: { $nin: ["cancelled"] },
          batchTime: { $exists: true, $ne: null, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$batchTime",
          studentCount: { $sum: 1 },
          faculties: { $addToSet: "$facultyAllot" },
          courses:   { $addToSet: "$course" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalStudents = batchData.reduce((sum, b) => sum + b.studentCount, 0);
    const maxCount = Math.max(...batchData.map((b) => b.studentCount), 1);
    const maxBatch = batchData.find((b) => b.studentCount === maxCount);

    const batches = batchData.map((b) => ({
      batchTime:    b._id,
      studentCount: b.studentCount,
      faculties:    b.faculties.filter((f) => f && f !== "Not Allotted"),
      courses:      b.courses.filter(Boolean),
    }));

    res.json({
      success: true,
      batches,
      stats: {
        totalBatches:      batches.length,
        totalStudents,
        maxBatch:          maxBatch?._id || "N/A",
        maxBatchCount:     maxCount,
        avgStudentsPerBatch:
          batches.length > 0 ? Math.round(totalStudents / batches.length) : 0,
      },
    });
  } catch (err) {
    console.error("Batch report error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getBatchReport };