const mongoose = require("mongoose");

const admissionSchema = new mongoose.Schema(
  {
    // Admission Information
    admissionNo: {
      type: String,
      unique: true,
      trim: true,
    },
    admissionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    admissionBy: {
      // ADD THIS FIELD
      type: String,
      trim: true,
      default: "Admin",
    },

    isAutoConvertedToStudent: {
      // ← This is the field name in your model
      type: Boolean,
      default: false,
    },
    studentId: {
      type: String,
      ref: "Student",
    },
    convertedAt: Date,

    // Student Information
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    fatherName: {
      type: String,
      trim: true,
    },
    motherName: {
      type: String,
      trim: true,
    },

    // Contact Information
    email: {
      // CHANGE TO OPTIONAL
      type: String,
      required: false, // CHANGE FROM true TO false
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    mobileNumber: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"],
    },
    fatherNumber: {
      // ADD THIS FIELD
      type: String,
      required: true, // Make it required
      match: [/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"],
    },
    motherNumber: {
      // ADD THIS FIELD
      type: String,
      required: true, // Make it required
      match: [/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"],
    },
    alternateNumber: {
      type: String,
      match: [/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"],
    },
    aadharNumber: {
      // ADD THIS FIELD
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      match: [/^\d{6}$/, "Please enter a valid 6-digit pincode"],
    },

    place: {                    // ← ADD THIS
  type: String,
  trim: true,
  default: "",
},

    courseType: {
  type: String,
  enum: ['primary', 'additional'],
  default: 'primary'
},

photo: {
  type: String,
  default: null,
},

    // Academic Information
    lastQualification: {
      type: String,
      trim: true,
      required: true,
    },
    percentage: String,
    yearOfPassing: Number,
    schoolCollege: {
      type: String,
      trim: true,
    },

    // Course Information
    course: {
      type: String,
      required: true,
      trim: true,
    },
    specialization: {
      type: String,
      trim: true,
    },

    courseId: {                 // ← ADD THIS
  type: mongoose.Schema.Types.ObjectId,
  ref: "Course",
  default: null,
},
    batchTime: {
      type: String,
      trim: true,
      required: true,
    },
    facultyAllot: {
      // ADD THIS FIELD
      type: String,
      trim: true,
      default: "Not Allotted",
    },
    admissionYear: {
      type: Number,
      required: true,
      default: new Date().getFullYear(),
    },

    // Other Information
    cast: {
      // ADD THIS FIELD
      type: String,
      trim: true,
    },
   category: {           // ✅ ADD THIS
  type: String,
  trim: true,
  default: "",
},

    // Source Information
    source: {
      type: String,
      enum: [
        "website",
        "walkin",
        "reference",
        "social_media",
        "newspaper",
        "seminar",
        "other",
      ],
      default: "website",
    },
    referenceName: {
      type: String,
      trim: true,
    },
    referenceContact: {
      type: String,
      match: [/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"],
    },
    referenceRelation: {
      // ADD THIS FIELD
      type: String,
      trim: true,
    },

    // Fees Information
    totalFees: {
      type: Number,
      min: 0,
    },
    paidFees: {
      type: Number,
      min: 0,
      default: 0,
    },
    balanceFees: {
      type: Number,
      min: 0,
      default: 0,
    },
    nextInstallmentDate: Date,

    hasScholarship: {
  type: Boolean,
  default: false,
},
scholarship: {
  applied:           Boolean,
  scholarshipId:     { type: mongoose.Schema.Types.ObjectId, ref: "Scholarship" },
  scholarshipName:   String,
  scholarshipCode:   String,
  percent:           Number,
  type:              { type: String, default: "percentage" },
  originalTotalFee:  Number,
  originalMonthlyFee: Number,
  scholarshipValue:  Number,
  finalTotalFee:     Number,
  finalMonthlyFee:   Number,
  documents:         [{ name: String, fileName: String }],
},

    // Status Tracking
    status: {
      type: String,
      enum: [
        "new",
        "under_process",
        "approved",
        "rejected",
        "admitted",
        "completed",
        "cancelled",
        "on_hold",    // ✅ add this
    "pending",    // ✅ add this
    "provisional", // ✅ add this
    "confirmed",  
      ],
      default: "admitted", // Change default to "admitted"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    remarks: {
      type: String,
      trim: true,
    },

    // Enquiry Reference
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
    },
    enquiryNo: {
      type: String,
    },

    // Documents
    documents: [
      {
        name: String,
        url: String,
        uploadedAt: Date,
      },
    ],

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

// Auto-generate admission number
admissionSchema.pre("save", async function (next) {
  if (this.isNew) {
    const year = new Date().getFullYear();
    const lastAdmission = await this.constructor.findOne(
      { admissionNo: new RegExp(`ADM${year}`) },
      { admissionNo: 1 },
      { sort: { admissionNo: -1 } }
    );

    let nextNumber = 1;
    if (lastAdmission && lastAdmission.admissionNo) {
      const lastNumber = parseInt(lastAdmission.admissionNo.slice(-4));
      nextNumber = lastNumber + 1;
    }

    this.admissionNo = `ADM${year}${nextNumber.toString().padStart(4, "0")}`;
  }
  next();
});

// Calculate balance fees
admissionSchema.pre("save", function (next) {
  if (this.totalFees && this.paidFees) {
    this.balanceFees = this.totalFees - this.paidFees;
  }
  next();
});

module.exports = mongoose.model("Admission", admissionSchema);
