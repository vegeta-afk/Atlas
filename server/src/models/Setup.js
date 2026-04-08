// models/Setup.js
const mongoose = require("mongoose");

const qualificationSchema = new mongoose.Schema(
  {
    qualificationName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const areaSchema = new mongoose.Schema(
  {
    areaName: {
      type: String,
      required: true,
      trim: true,
    },
    State: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const holidaySchema = new mongoose.Schema(
  {
    holidayDate: {
      type: Date,
      required: true,
    },
    holidayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const batchSchema = new mongoose.Schema(
  {
    batchName: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid time format (HH:MM)!`,
      },
    },
    endTime: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid time format (HH:MM)!`,
      },
    },
    displayName: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const enquiryMethodSchema = new mongoose.Schema(
  {
    methodName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const feeSchema = new mongoose.Schema(
  {
    feeName: {
      type: String,
      required: true,
      trim: true,
    },
    feeType: {
      type: String,
      required: true,
      enum: [
        "double-batch",
        "course-extend",
        "form-fee",
        "course-convert",
        "registration",
        "library",
        "convenience",
        "other",
      ],
      default: "other",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// ========== NEW CALL LOG SETTING SCHEMAS ==========

// Call Status Schema
const callStatusSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Call Reason Schema
const callReasonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Next Action Schema
const nextActionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Fee = mongoose.model("Fee", feeSchema);

// Pre-save hook to generate displayName
batchSchema.pre("save", function (next) {
  if (this.startTime && this.endTime) {
    this.displayName = `${this.startTime} to ${this.endTime}`;
  }
  next();
});

module.exports.Qualification = mongoose.model(
  "Qualification",
  qualificationSchema
);
module.exports.Area = mongoose.model("Area", areaSchema);
module.exports.Holiday = mongoose.model("Holiday", holidaySchema);
module.exports.Batch = mongoose.model("Batch", batchSchema);
module.exports.EnquiryMethod = mongoose.model(
  "EnquiryMethod",
  enquiryMethodSchema
);
module.exports.Fee = Fee;

// ========== EXPORT NEW MODELS ==========
module.exports.CallStatus = mongoose.model("CallStatus", callStatusSchema);
module.exports.CallReason = mongoose.model("CallReason", callReasonSchema);
module.exports.NextAction = mongoose.model("NextAction", nextActionSchema);