// models/CallLog.js
const mongoose = require("mongoose");

const callLogSchema = new mongoose.Schema(
  {
    // Who was called
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "studentModel",
    },
    studentModel: {
      type: String,
      required: true,
      enum: ["Admission", "Enquiry"],
    },
    studentType: {
      type: String,
      required: true,
      enum: ["admission", "enquiry"],
    },

    // Snapshot fields (so log is readable even if student record changes)
    studentName: { type: String, trim: true },
    studentContact: { type: String, trim: true },
    studentEmail: { type: String, trim: true },
    studentCourse: { type: String, trim: true },

    // Call details
    callStatus: {
      type: String,
      required: true,
      trim: true,
    },
    callReason: {
      type: String,
      trim: true,
      default: "",
    },
    callDuration: {
      type: Number, // seconds
      default: 0,
    },
    followUpDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    nextAction: {
      type: String,
      trim: true,
      default: "",
    },

    // Who made the call
    counselorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      default: null,
    },
    counselorName: {
      type: String,
      trim: true,
      default: "",
    },
    calledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for fast lookup
callLogSchema.index({ studentId: 1, createdAt: -1 });
callLogSchema.index({ counselorId: 1 });
callLogSchema.index({ callStatus: 1 });
callLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("CallLog", callLogSchema);