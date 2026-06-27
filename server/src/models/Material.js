const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
totalQuantity: { type: Number, default: 0 },
unit: { type: String, default: "pcs" },
description: { type: String, default: "" },
isActive: { type: Boolean, default: true },
createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Material", materialSchema);