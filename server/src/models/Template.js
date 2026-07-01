// server/models/Template.js
const mongoose = require("mongoose");

const containerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, default: "Container" },
    xRatio: { type: Number, required: true },
    yRatio: { type: Number, required: true },
    widthRatio: { type: Number, default: 0.35 },
    heightRatio: { type: Number, default: 0.15 },
    borderRadius: { type: Number, default: 0 },
  },
  { _id: false }
);

const fieldSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // client-generated uuid, stable across edits
    label: { type: String, default: "Field" }, // shown only in the designer UI

    // "text" = draws a string on the canvas. "image" = draws a photo on the canvas.
    fieldType: { type: String, enum: ["text", "image"], default: "text" },

    // "static" = fixed content baked into every card (e.g. "Congratulations!")
    // "dynamic" = pulled from the data object passed at render time (e.g. fullName)
    source: { type: String, enum: ["static", "dynamic"], default: "dynamic" },
    staticText: { type: String, default: "" },
    staticUrl: { type: String, default: "" }, // used when fieldType is "image" and source is "static"
    dataKey: { type: String, default: "" }, // e.g. "fullName", "admissionNo", "course", "photo"

    // Position, stored as ratios (0-1) of the template image's width/height
    // so the same field config works at any resolution.
    xRatio: { type: Number, required: true },
    yRatio: { type: Number, required: true },

    // ── Text-field-only properties ──
    maxWidthRatio: { type: Number, default: 0.7 },
    fontSizeRatio: { type: Number, default: 0.045 }, // relative to image width
    fontFamily: { type: String, default: "Poppins" },
    fontWeight: { type: String, default: "600" },
    color: { type: String, default: "#16357e" },
    align: { type: String, enum: ["left", "center", "right"], default: "center" },

    // Parent container (optional). When set, xRatio/yRatio are relative to
    // the container's own box (0-1 within it), not the full template image.
    containerId: { type: String, default: null },

    // ── Image-field-only properties ──

    // ── Boxed text (container-constrained) properties, text-field-only ──
    boxed: { type: Boolean, default: false },
    boxWidthRatio: { type: Number, default: 0.3 },
    boxHeightRatio: { type: Number, default: 0.08 },
    boxBorderRadius: { type: Number, default: 0 }, // ratio of image width, rounded box corners

    // ── Image-field-only properties ──
    widthRatio: { type: Number, default: 0.2 },
    heightRatio: { type: Number, default: 0.2 },
    shape: { type: String, enum: ["square", "circle"], default: "square" },
    borderRadius: { type: Number, default: 0 }, // ratio of image width, ignored when shape is "circle"
    borderWidth: { type: Number, default: 0 }, // ratio of image width
    borderColor: { type: String, default: "#16357e" },
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
    containers: { type: [containerSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Template", templateSchema);