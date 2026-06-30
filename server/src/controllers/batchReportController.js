// controllers/batchReportController.js
const Admission = require("../models/Admission");
const { Batch } = require("../models/Setup");

// Converts "HH:MM" -> minutes since midnight, for reliable chronological sorting
const toMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const getBatchReport = async (req, res) => {
  try {
    // 1. Master list of all batch slots (so 0-student batches still show)
    const allBatches = await Batch.find({ isActive: true }).lean();

    // 2. Pull students per batchTime from Admission (with ID card fields)
    const studentDocs = await Admission.find({
      isActive: true,
      status: { $nin: ["cancelled"] },
      batchTime: { $exists: true, $ne: null, $ne: "" },
    })
      .select(
        "fullName admissionNo course batchTime mobileNumber admissionDate photo"
      )
      .lean();

    // Group students by batchTime
    const studentsByBatch = {};
    studentDocs.forEach((s) => {
      if (!studentsByBatch[s.batchTime]) studentsByBatch[s.batchTime] = [];
      studentsByBatch[s.batchTime].push({
        id: s._id,
        name: s.fullName,
        studentId: s.admissionNo,
        course: s.course,
        batch: s.batchTime,
        mobileNumber: s.mobileNumber,
        admissionDate: s.admissionDate,
        photo: s.photo || null,
      });
    });

    // 3. Merge: every setup batch shown, empty list if no students, sorted by start time
    const batches = allBatches
      .map((b) => {
        const candidates = [
          b.displayName,
          `${b.startTime}-${b.endTime}`,
          `${b.startTime} to ${b.endTime}`,
          b.batchName,
        ].filter(Boolean);

        let students = [];
        for (const key of candidates) {
          if (studentsByBatch[key]) {
            students = studentsByBatch[key];
            break;
          }
        }

        return {
          batchTime: b.displayName || `${b.startTime}-${b.endTime}`,
          studentCount: students.length,
          students,
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