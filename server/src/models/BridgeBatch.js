const mongoose = require("mongoose");

const bridgeBatchSchema = new mongoose.Schema(
  {
    parentBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    courseName: String, // denormalized for quick display in lists/notifications

    studentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
      },
    ],

    status: {
      type: String,
      enum: ["pending", "active", "ready_to_merge", "merged", "cancelled", "rejected"],
      default: "pending", // was "active" — now starts as a request
    },

    // NEW: who requested it (the faculty, not admin)
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // NEW: approval trail
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedDate: Date,
    rejectedReason: String,

    // Temp faculty is a User (matches Attendance.teacher / TopicCompletion.teacherId, both ref 'User')
    tempFacultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tempFacultyName: String,

    // Admin manually picks these at creation time
    selectedTopics: [
      {
        topicKey: { type: String, required: true },
        topicName: { type: String, required: true },
        completed: { type: Boolean, default: false },
        completedDate: Date,
      },
    ],

    timeSlot: {
      startTime: String, // "HH:MM"
      endTime: String,
    },

    status: {
      type: String,
      enum: ["active", "ready_to_merge", "merged", "cancelled"],
      default: "active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    mergedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    mergedDate: Date,
  },
  { timestamps: true }
);

// Auto-flip status when every selected topic is marked done
bridgeBatchSchema.pre("save", function (next) {
  if (this.status === "active" && this.selectedTopics.length > 0) {
    const allDone = this.selectedTopics.every((t) => t.completed);
    if (allDone) {
      this.status = "ready_to_merge";
    }
  }
  next();
});

module.exports = mongoose.model("BridgeBatch", bridgeBatchSchema);