// controllers/callLogController.js
const CallLog = require("../models/CallLog");
const Faculty = require("../models/Faculty"); // adjust path if needed

// ── Create a call log ──────────────────────────────────────────
exports.createCallLog = async (req, res) => {
  try {
    const {
      studentId,
      studentType,
      studentName,
      studentContact,
      studentEmail,
      studentCourse,
      callStatus,
      callReason,
      callDuration,
      followUpDate,
      notes,
      nextAction,
      counselorId,
      calledBy,
    } = req.body;

    if (!studentId || !studentType || !callStatus) {
      return res.status(400).json({
        success: false,
        message: "studentId, studentType and callStatus are required",
      });
    }

    // Resolve counselor name from Faculty collection
    let counselorName = "";
    if (counselorId) {
      try {
        const faculty = await Faculty.findById(counselorId);
        if (faculty) {
          counselorName =
            faculty.name || faculty.facultyName || faculty.fullName || "";
        }
      } catch (_) {
        // non-fatal — name stays empty
      }
    }

    const callLog = await CallLog.create({
      studentId,
      studentModel: studentType === "admission" ? "Admission" : "Enquiry",
      studentType,
      studentName,
      studentContact,
      studentEmail,
      studentCourse,
      callStatus,
      callReason: callReason || "",
      callDuration: Number(callDuration) || 0,
      followUpDate: followUpDate || null,
      notes: notes || "",
      nextAction: nextAction || "",
      counselorId: counselorId || null,
      counselorName,
      calledBy: req.user?.id || calledBy || null,
    });

    res.status(201).json({
      success: true,
      message: "Call log created successfully",
      data: callLog,
    });
  } catch (error) {
    console.error("Create call log error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create call log",
    });
  }
};

// ── Get all call logs (with filters) ──────────────────────────
exports.getAllCallLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      studentType,
      callStatus,
      counselorId,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    if (studentType) filter.studentType = studentType;
    if (callStatus) filter.callStatus = callStatus;
    if (counselorId) filter.counselorId = counselorId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await CallLog.countDocuments(filter);

    const callLogs = await CallLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("counselorId", "name facultyName fullName")
      .populate("calledBy", "name email");

    res.json({
      success: true,
      data: callLogs,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("Get all call logs error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get call logs for a specific student ──────────────────────
exports.getCallLogsByStudent = async (req, res) => {
  try {
    const { studentId, studentType } = req.params;

    const filter = { studentId };
    if (studentType) filter.studentType = studentType;

    const callLogs = await CallLog.find(filter)
      .sort({ createdAt: -1 })
      .populate("counselorId", "name facultyName fullName");

    res.json({ success: true, data: callLogs });
  } catch (error) {
    console.error("Get call logs by student error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get a single call log ──────────────────────────────────────
exports.getCallLog = async (req, res) => {
  try {
    const callLog = await CallLog.findById(req.params.id)
      .populate("counselorId", "name facultyName fullName")
      .populate("calledBy", "name email");

    if (!callLog) {
      return res.status(404).json({ success: false, message: "Call log not found" });
    }

    res.json({ success: true, data: callLog });
  } catch (error) {
    console.error("Get call log error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Update a call log ──────────────────────────────────────────
exports.updateCallLog = async (req, res) => {
  try {
    const callLog = await CallLog.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!callLog) {
      return res.status(404).json({ success: false, message: "Call log not found" });
    }

    res.json({ success: true, message: "Call log updated", data: callLog });
  } catch (error) {
    console.error("Update call log error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Delete a call log ──────────────────────────────────────────
exports.deleteCallLog = async (req, res) => {
  try {
    const callLog = await CallLog.findByIdAndDelete(req.params.id);

    if (!callLog) {
      return res.status(404).json({ success: false, message: "Call log not found" });
    }

    res.json({ success: true, message: "Call log deleted successfully" });
  } catch (error) {
    console.error("Delete call log error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Statistics ─────────────────────────────────────────────────
exports.getStatistics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayCount, byStatus] = await Promise.all([
      CallLog.countDocuments(),
      CallLog.countDocuments({ createdAt: { $gte: today } }),
      CallLog.aggregate([
        { $group: { _id: "$callStatus", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: { total, todayCount, byStatus },
    });
  } catch (error) {
    console.error("Get statistics error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};