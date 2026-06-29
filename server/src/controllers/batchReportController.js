// controllers/batchReportController.js
const Admission = require("../models/Admission");
const Setup = require("../models/Setup");

// Converts "HH:MM" -> minutes since midnight, for reliable chronological sorting
const toMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const getBatchReport = async (req, res) => {
  try {
    // 1. Master list of all batch slots (so 0-student batches still show)
    const setupDoc = await Setup.findOne();
    const allBatches = setupDoc?.batches || [];

    // 2. Count enrolled students per batchTime from Admission
    const counts = await Admission.aggregate([
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
        },
      },
    ]);

    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id] = c.studentCount;
    });

    // 3. Merge: every setup batch shown, 0 if no students, sorted by actual start time
    const batches = allBatches
      .map((b) => {
        const batchTime = `${b.startTime}-${b.endTime}`;
        return {
          batchTime,
          studentCount: countMap[batchTime] || 0,
          _sortKey: toMinutes(b.startTime),
        };
      })
      .sort((a, b) => a._sortKey - b._sortKey)
      .map(({ _sortKey, ...rest }) => rest);

    const totalStudents = batches.reduce((sum, b) => sum + b.studentCount, 0);
    const maxBatch = batches.reduce(
      (max, b) => (b.studentCount > (max?.studentCount || 0) ? b : max),
      null
    );

    res.json({
      success: true,
      batches,
      stats: {
        totalBatches: batches.length,
        totalStudents,
        maxBatch: maxBatch?.batchTime || "N/A",
        maxBatchCount: maxBatch?.studentCount || 0,
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