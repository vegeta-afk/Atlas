const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema(
  {
    facultyNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    facultyName: {
      type: String,
      required: [true, "Faculty name is required"],
      trim: true,
    },
    fathersName: {
      type: String,
      required: [true, "Father's name is required"],
      trim: true,
    },
    dateOfJoining: {
      type: Date,
      required: [true, "Date of joining is required"],
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    shift: {
      type: String,
      required: [true, "Shift is required"],
      enum: ["Morning", "Afternoon", "Evening", "Full-day"],
    },
    lunchTime: {
      type: String,
      required: [true, "Lunch time is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
    },
    mobileNo: {
      type: String,
      required: [true, "Mobile number is required"],
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: "Mobile number must be 10 digits",
      },
    },
    whatsappNo: {
      type: String,
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional
          return /^\d{10}$/.test(v);
        },
        message: "WhatsApp number must be 10 digits",
      },
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    fatherContactNo: {
      type: String,
      required: [true, "Father's contact number is required"],
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: "Father's contact number must be 10 digits",
      },
    },
    motherContactNo: {
      type: String,
      required: [true, "Mother's contact number is required"],
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: "Mother's contact number must be 10 digits",
      },
    },
    basicStipend: {
      type: Number,
      required: [true, "Basic stipend is required"],
      min: [0, "Stipend must be positive"],
    },
    courseAssigned: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "on-leave"],
      default: "active",
    },
    dateOfLeaving: {
      type: Date,
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
  {
    timestamps: true,
  }
);

// Auto-generate faculty number before saving
facultySchema.pre("save", async function (next) {
  if (!this.facultyNo) {
    try {
      const lastFaculty = await this.constructor.findOne(
        {},
        { facultyNo: 1 },
        { sort: { createdAt: -1 } }
      );

      let nextNumber = 1001;
      if (lastFaculty && lastFaculty.facultyNo) {
        const lastNumber = parseInt(lastFaculty.facultyNo.replace("FAC", ""));
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }

      this.facultyNo = `FAC${nextNumber}`;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Indexes for better query performance
facultySchema.index({ facultyNo: 1 });
facultySchema.index({ facultyName: 1 });
facultySchema.index({ email: 1 });
facultySchema.index({ mobileNo: 1 });
facultySchema.index({ status: 1 });
facultySchema.index({ shift: 1 });
facultySchema.index({ isActive: 1 });

const Faculty = mongoose.model("Faculty", facultySchema);
module.exports = Faculty;
