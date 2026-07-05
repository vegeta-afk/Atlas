const mongoose = require("mongoose");

const topicCompletionSchema = new mongoose.Schema(
  {
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    completedTopicKeys: [{ type: String }],
    completedSubtopicKeys: [{ type: String }],
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  },
  { timestamps: true }
);

topicCompletionSchema.index({ batchId: 1, courseId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("TopicCompletion", topicCompletionSchema);