// controllers/birthdayController.js
const Admission = require("../models/Admission");
const Faculty = require("../models/Faculty");

// Build [{dobMonth, dobDay}, ...] for every day in a date range (max 31 days)
const buildDateConditions = (startDate, endDate) => {
  const conditions = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);
  let safety = 0;
  while (cur <= end && safety < 32) {
    conditions.push({
      dobMonth: cur.getMonth() + 1,
      dobDay: cur.getDate(),
    });
    cur.setDate(cur.getDate() + 1);
    safety++;
  }
  return conditions;
};

const getBirthdayReport = async (req, res) => {
  try {
    const { date, startDate, endDate, type = "all", search } = req.query;

    // ── Main date conditions ────────────────────────────────────────────
    let dateConditions;
    if (startDate && endDate) {
      dateConditions = buildDateConditions(startDate, endDate);
    } else if (date) {
      const d = new Date(date);
      dateConditions = [{ dobMonth: d.getMonth() + 1, dobDay: d.getDate() }];
    } else {
      // Default: today
      const now = new Date();
      dateConditions = [{ dobMonth: now.getMonth() + 1, dobDay: now.getDate() }];
    }

    // ── Next 7 days conditions (for "This Week" stat) ───────────────────
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 6);
    const weekConditions = buildDateConditions(now, weekEnd);

    // ── Search stages ───────────────────────────────────────────────────
    const studentSearchStage = search
      ? {
          $match: {
            $or: [
              { fullName: { $regex: search, $options: "i" } },
              { applicantName: { $regex: search, $options: "i" } },
              { mobileNumber: { $regex: search, $options: "i" } },
              { admissionNo: { $regex: search, $options: "i" } },
            ],
          },
        }
      : null;

    const facultySearchStage = search
      ? {
          $match: {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { mobileNumber: { $regex: search, $options: "i" } },
            ],
          },
        }
      : null;

    // ── Student pipeline ────────────────────────────────────────────────
    const studentPipeline = [
      { $match: { dateOfBirth: { $exists: true, $ne: null } } },
      {
        $addFields: {
          dobMonth: { $month: "$dateOfBirth" },
          dobDay: { $dayOfMonth: "$dateOfBirth" },
        },
      },
      { $match: { $or: dateConditions } },
      ...(studentSearchStage ? [studentSearchStage] : []),
      {
        $project: {
          _id: 1,
          admissionNo: 1,
          fullName: 1,
          applicantName: 1,
          dateOfBirth: 1,
          mobileNumber: 1,
          course: 1,
          batchTime: 1,
          status: 1,
          email: 1,
        },
      },
      { $sort: { fullName: 1 } },
    ];

    // ── Faculty pipeline ────────────────────────────────────────────────
    const facultyPipeline = [
      { $match: { dateOfBirth: { $exists: true, $ne: null } } },
      {
        $addFields: {
          dobMonth: { $month: "$dateOfBirth" },
          dobDay: { $dayOfMonth: "$dateOfBirth" },
        },
      },
      { $match: { $or: dateConditions } },
      ...(facultySearchStage ? [facultySearchStage] : []),
      {
        $project: {
          _id: 1,
          name: 1,
          dateOfBirth: 1,
          mobileNumber: 1,
          designation: 1,
          email: 1,
          photo: 1,
        },
      },
      { $sort: { name: 1 } },
    ];

    // ── Upcoming week count pipelines ───────────────────────────────────
    const weekCountPipeline = [
      { $match: { dateOfBirth: { $exists: true, $ne: null } } },
      {
        $addFields: {
          dobMonth: { $month: "$dateOfBirth" },
          dobDay: { $dayOfMonth: "$dateOfBirth" },
        },
      },
      { $match: { $or: weekConditions } },
      { $count: "count" },
    ];

    // ── Execute all queries in parallel ─────────────────────────────────
    const [students, faculty, studentWeekRes, facultyWeekRes] = await Promise.all([
      type === "faculty" ? Promise.resolve([]) : Admission.aggregate(studentPipeline),
      type === "student" ? Promise.resolve([]) : Faculty.aggregate(facultyPipeline),
      Admission.aggregate(weekCountPipeline),
      Faculty.aggregate(weekCountPipeline),
    ]);

    const upcomingWeekCount =
      (studentWeekRes[0]?.count || 0) + (facultyWeekRes[0]?.count || 0);

    return res.json({
      success: true,
      students,
      faculty,
      total: students.length + faculty.length,
      upcomingWeekCount,
    });
  } catch (err) {
    console.error("Birthday report error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getBirthdayReport };