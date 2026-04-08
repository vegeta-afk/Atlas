// models/Scholarship.js
const mongoose = require("mongoose");

const scholarshipSchema = new mongoose.Schema({
  scholarshipName: {
    type: String,
    required: true,
  },
  scholarshipCode: {
    type: String,
    required: true,
    unique: true,
  },
  description: String,
  type: {
    type: String,
    enum: ["percentage", "fixed_amount"],
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  applicableOn: {
    type: String,
    enum: ["total_fee", "monthly_fee", "both"],
    default: "total_fee",
  },
  minPercentage: Number,
  maxFamilyIncome: Number,
  category: [{
    type: String,
    enum: ["general", "sc", "st", "obc", "minority", "all"],
  }],
  validFrom: Date,
  validTo: Date,
  maxStudents: Number,
  currentStudents: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  requiredDocuments: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, { timestamps: true });

module.exports = mongoose.model("Scholarship", scholarshipSchema);