const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    // Basic Information
    enquiryNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    enquiryDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    enquiryBy: {
      type: String,
      required: true,
      trim: true,
    },
    enquiryMethod: {
      type: String,
      
      required: true,
    },

    // Personal Details
    applicantName: {
      type: String,
      required: true,
      trim: true,
    },
    contactNo: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"],
    },
    whatsappNo: {
      type: String,
      match: [/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    guardianName: {
      type: String,
      trim: true,
    },
    guardianContact: {
      type: String,
      match: [/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"],
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    dateOfBirth: Date,

    // Academic Details
    qualification: {
      type: String,
      trim: true,
      required: true,
    },
    schoolCollege: {
      type: String,
      trim: true,
    },
    yearOfPassing: {
      type: Number,
      min: 2000,
      max: new Date().getFullYear(),
    },
    percentage: String,

    // Course Details
    courseInterested: {
      type: String,
      required: true,
      trim: true,
    },
    batchTime: {
      type: String,
      trim: true,
      required: true,
    },

    // Reference Details
    reference: {
      type: String,
      trim: true,
    },
    place: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },

    state: {
      // ✅ ADD THIS FIELD
      type: String,
      trim: true,
      required: false, // Make it optional or required as needed
    },

    // Additional Details
    remark: {
      type: String,
      trim: true,
    },
    dateOfComing: Date,
    prospectusFees: {
      type: String,
      enum: ["yes", "no"],
      default: "no",
    },
    prospectusAmount: {
      type: Number,
      min: 0,
    },

    // Status Tracking
    status: {
      type: String,
      enum: ["new", "contacted", "follow_up", "converted", "rejected"],
      default: "new",
    },
    followUpDate: Date,
    convertedToAdmission: {
      type: Boolean,
      default: false,
    },
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admission",
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate enquiry number
enquirySchema.pre("save", async function (next) {
  if (this.isNew) {
    const year = new Date().getFullYear();
    const lastEnquiry = await this.constructor.findOne(
      { enquiryNo: new RegExp(`ENQ${year}`) },
      { enquiryNo: 1 },
      { sort: { enquiryNo: -1 } }
    );

    let nextNumber = 1;
    if (lastEnquiry && lastEnquiry.enquiryNo) {
      const lastNumber = parseInt(lastEnquiry.enquiryNo.slice(-4));
      nextNumber = lastNumber + 1;
    }

    this.enquiryNo = `ENQ${year}${nextNumber.toString().padStart(4, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Enquiry", enquirySchema);
