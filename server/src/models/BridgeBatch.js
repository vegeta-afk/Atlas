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
    selectedSubtopics: [
      {
        subtopicKey: { type: String, required: true },
        subtopicName: { type: String, required: true },
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

Then use the combined version — go with this:
javascript// Auto-flip status only when every selected topic AND every selected subtopic are done
bridgeBatchSchema.pre("save", function (next) {
  if (this.status === "active") {
    const topicsDone = this.selectedTopics.length === 0 || this.selectedTopics.every((t) => t.completed);
    const subtopicsDone = this.selectedSubtopics.length === 0 || this.selectedSubtopics.every((s) => s.completed);
    const hasAnySelection = this.selectedTopics.length > 0 || this.selectedSubtopics.length > 0;

    if (hasAnySelection && topicsDone && subtopicsDone) {
      this.status = "ready_to_merge";
    }
  }
  next();
});

module.exports = mongoose.model("BridgeBatch", bridgeBatchSchema);