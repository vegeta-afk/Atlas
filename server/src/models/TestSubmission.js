// models/TestSubmission.js
const mongoose = require("mongoose");

const testSubmissionSchema = new mongoose.Schema(
  {
    // ── Links ──────────────────────────────────────────
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    // ── Denormalized for quick marksheet access ────────
    testName:    { type: String },
    courseName:  { type: String },
    courseId:    { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    studentName: { type: String },
    admissionNo: { type: String },

    // ── Exam type ──────────────────────────────────────
    // "monthly" = quiz/monthly test, "semester" = semester exam
    examType: {
      type: String,
      enum: ["monthly", "semester"],
      default: "monthly",
    },

    // ── Questions answered ─────────────────────────────
    answers: [
      {
        questionId:     { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
        questionText:   { type: String },
        selectedOption: { type: String },   // student's answer
        correctAnswer:  { type: String },   // correct answer
        isCorrect:      { type: Boolean, default: false },
        marksAwarded:   { type: Number, default: 0 },
        maxMarks:       { type: Number, default: 1 },
        timeTaken:      { type: Number, default: 0 }, // seconds
      },
    ],

    // ── Score summary ──────────────────────────────────
    totalQuestions:    { type: Number, default: 0 },
    attemptedQuestions:{ type: Number, default: 0 },
    correctAnswers:    { type: Number, default: 0 },
    wrongAnswers:      { type: Number, default: 0 },
    skippedQuestions:  { type: Number, default: 0 },

    marksObtained: { type: Number, default: 0 },
    maxMarks:      { type: Number, default: 0 },
    percentage:    { type: Number, default: 0 },

    // ── Grade (auto-calculated) ────────────────────────
    grade: {
      type: String,
      enum: ["A+", "A", "B+", "B", "C", "D", "F"],
      default: "F",
    },
    isPassed: { type: Boolean, default: false },
    passMarks: { type: Number, default: 40 }, // 40% to pass

    // ── Timing ────────────────────────────────────────
    startedAt:   { type: Date },
    submittedAt: { type: Date, default: Date.now },
    timeTaken:   { type: Number, default: 0 }, // total seconds

    // ── Status ────────────────────────────────────────
    status: {
      type: String,
      enum: ["completed", "timed_out", "abandoned"],
      default: "completed",
    },

    // ── Attempt number (if multiple attempts allowed) ──
    attemptNumber: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// ── Auto-calculate grade before save ──────────────────
testSubmissionSchema.pre("save", function (next) {
  const pct = this.percentage;
  if      (pct >= 90) this.grade = "A+";
  else if (pct >= 80) this.grade = "A";
  else if (pct >= 70) this.grade = "B+";
  else if (pct >= 60) this.grade = "B";
  else if (pct >= 50) this.grade = "C";
  else if (pct >= 40) this.grade = "D";
  else                this.grade = "F";

  this.isPassed = pct >= this.passMarks;
  next();
});

// ── Indexes ───────────────────────────────────────────
testSubmissionSchema.index({ studentId: 1, testId: 1 });
testSubmissionSchema.index({ studentId: 1, submittedAt: -1 });
testSubmissionSchema.index({ testId: 1 });

module.exports = mongoose.model("TestSubmission", testSubmissionSchema);