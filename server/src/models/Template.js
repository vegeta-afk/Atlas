// server/models/Template.js
const mongoose = require("mongoose");

const fieldSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // client-generated uuid, stable across edits
    label: { type: String, default: "Field" }, // shown only in the designer UI

    // "static" = fixed text baked into every card (e.g. "Congratulations!")
    // "dynamic" = pulled from the data object passed at render time (e.g. fullName)
    source: { type: String, enum: ["static", "dynamic"], default: "dynamic" },
    staticText: { type: String, default: "" },
    dataKey: { type: String, default: "" }, // e.g. "fullName", "admissionNo", "course"

    // Position + size, all stored as ratios (0-1) of the template image's
    // width/height so the same field config works at any resolution.
    xRatio: { type: Number, required: true },
    yRatio: { type: Number, required: true },
    maxWidthRatio: { type: Number, default: 0.7 },

    fontSizeRatio: { type: Number, default: 0.045 }, // relative to image width
    fontFamily: { type: String, default: "Poppins" },
    fontWeight: { type: String, default: "600" },
    color: { type: String, default: "#16357e" },
    align: { type: String, enum: ["left", "center", "right"], default: "center" },
  },
  { _id: false }
);

const templateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["birthday", "idcard", "certificate", "marksheet", "custom"],
      default: "custom",
    },
    imageUrl: { type: String, required: true }, // Cloudinary URL
    imageWidth: { type: Number, required: true },
    imageHeight: { type: Number, required: true },
    fields: { type: [fieldSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Template", templateSchema);
