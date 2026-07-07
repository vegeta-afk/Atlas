const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["bridge_ready_to_merge"], // extend with more types later
      required: true,
    },
    recipientRole: { type: String, default: "admin" },
    bridgeBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BridgeBatch",
    },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
    message: String,
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);