const mongoose = require("mongoose");

const materialIssueSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: "Material", required: true },
    issued: { type: Boolean, default: false },
    issuedDate: Date,
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    remarks: String,
  },
  { timestamps: true }
);

materialIssueSchema.index({ studentId: 1, materialId: 1 }, { unique: true });

module.exports = mongoose.model("MaterialIssue", materialIssueSchema);