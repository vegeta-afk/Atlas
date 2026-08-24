const mongoose = require("mongoose");

const bridgeBatchSchema = new mongoose.Schema(
  {
    parentBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    tempBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    courseName: String,

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
      default: "pending",
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedDate: Date,
    rejectedReason: String,
    reason: String, // ADDED BACK — why the request was raised

    tempFacultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tempFacultyName: String,

    // ADDED BACK — this was missing entirely
    selectedTopics: [
      {
        topicKey: { type: String, required: true },
        topicName: { type: String, required: true },
        completed: { type: Boolean, default: false },
        completedDate: Date,
      },
    ],

    selectedSubtopics: [
      {
        subtopicKey: { type: String, required: true },
        subtopicName: { type: String, required: true },
        completed: { type: Boolean, default: false },
        completedDate: Date,
        inProgress: { type: Boolean, default: false },
      },
    ],

    timeSlot: {
      startTime: String,
      endTime: String,
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

// Auto-flip status only when every selected topic AND every selected subtopic are done
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