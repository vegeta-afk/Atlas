const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    // Student Identification
    studentId: {
      type: String,
      unique: true,
      trim: true,
    },
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admission",
      required: true,
    },
    admissionNo: {
      type: String,
      unique: true,
    },

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
    photo: {
      type: String,
      default: "/default-avatar.png",
    },

    // Contact Information
    email: String,
    mobileNumber: String,
    fatherName: String,
    fatherNumber: String,
    motherName: String,
    motherNumber: String,
    address: String,
    city: String,
    state: String,
    pincode: String,

    // Academic Information (Primary Course)
    course: {
      type: String,
      required: true,
    },
    courseCode: {
      type: String,
    },
    specialization: String,
    batchTime: String,
    facultyAllot: String,
    admissionDate: Date,
    admissionYear: Number,

    courseCode2: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Course",


  // In your Student model, add:
scholarship: {
  applied: { type: Boolean, default: false },
  scholarshipId: { type: mongoose.Schema.Types.ObjectId, ref: "Scholarship" },
  scholarshipName: String,
  scholarshipCode: String,
  originalTotalFee: Number,
  originalMonthlyFee: Number,
  scholarshipValue: Number,
  finalTotalFee: Number,
  finalMonthlyFee: Number,
  documents: [{
    name: String,
    fileName: String,
    uploadedAt: Date,
  }],
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedAt: Date,
}
},


    // Multiple batch enrollment (legacy)
    enrolledBatches: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        courseName: String,
        monthlyFee: Number,
        examFee: Number,
        startMonth: Number,
        duration: Number,
        isActive: { type: Boolean, default: true }
      }
    ],

    // ============================================
    // ✅ ADDITIONAL COURSES (with their own fees & attendance)
    // ============================================
    additionalCourses: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        
        // Course Details
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
        courseName: { type: String, required: true },
        monthlyFee: Number,
        examFee: Number,
        duration: Number,
        
        // Assignment
        facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
        facultyName: String,
        batchTime: String,
        batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
        
        // Timeline
        startMonth: Number, // Month number from original admission
        startDate: Date,
        endDate: Date,
        
        // ========================================
        // ✅ ADDITIONAL COURSE FEE SCHEDULE
        // ========================================
        feeSchedule: [
          {
            _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
            month: String,
            monthNumber: Number,
            baseFee: Number,
            examFee: { type: Number, default: 0 },
            totalFee: Number,
            paidAmount: { type: Number, default: 0 },
            balanceAmount: Number,
            status: {
              type: String,
              enum: ["pending", "paid", "partial", "overdue", "promised"],
              default: "pending"
            },
            dueDate: Date,
            paymentDate: Date,
            receiptNo: String,
            paymentMode: String,
            isExamMonth: { type: Boolean, default: false },
            remarks: String
          }
        ],
        
        // ========================================
        // ✅ ADDITIONAL COURSE ATTENDANCE
        // ========================================
        attendance: [
          {
            _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
            date: Date,
            status: {
              type: String,
              enum: ["present", "absent", "leave", "late"],
            },
            markedBy: String,
            remarks: String
          }
        ],
        
        // ========================================
        // ✅ ADDITIONAL COURSE PAYMENTS
        // ========================================
        payments: [
          {
            _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
            date: Date,
            amount: Number,
            monthNumbers: [Number],
            receiptNo: String,
            paymentMode: String,
            remarks: String
          }
        ],
        
        // Status
        isActive: { type: Boolean, default: true },
        enrolledAt: { type: Date, default: Date.now }
      }
    ],

    // Fee Information (Primary Course)
    totalCourseFee: Number,
    monthlyFee: Number,
    examFee: Number,
    admissionFee: Number,
    paidAmount: {
      type: Number,
      default: 0,
    },
    balanceAmount: {
      type: Number,
      default: 0,
    },
    otherCharges: {
      type: Number,
      default: 0,
    },

    // Attendance Tracking (Primary Course)
    attendance: [
      {
        date: Date,
        status: {
          type: String,
          enum: ["present", "absent", "leave", "late", "not_marked"],
        },
        markedBy: String,
        remarks: String,
      },
    ],

    // Enhanced Fee Schedule (Primary Course)
    feeSchedule: [
      {
        month: String,
        monthNumber: Number,
        baseFee: Number,
        additionalFees: [
          {
            batchId: mongoose.Schema.Types.ObjectId,
            batchName: String,
            amount: Number
          }
        ],
        totalFee: Number,
        paidAmount: { type: Number, default: 0 },
        balanceAmount: Number,
        status: {
          type: String,
          enum: ["pending", "paid", "partial", "overdue", "promised", "carry_forward"],
          default: "pending"
        },
        carryForwardAmount: { type: Number, default: 0 },
        dueDate: Date,
        promisedDate: Date,
        finesPaused: { type: Boolean, default: false },
        fines: {
          amount: { type: Number, default: 0 },
          reason: String,
          waived: { type: Boolean, default: false }
        },
        paymentDate: Date,
        receiptNo: String,
        isExamMonth: {
          type: Boolean,
          default: false,
        },
        examFee: {
          type: Number,
          default: 0,
        },
        paymentMode: String,
        remarks: String
      }
    ],

    // Payment History (Primary Course)
    paymentHistory: [
      {
        date: Date,
        amount: Number,
        months: [Number],
        receiptNo: String,
        collectedBy: String,
        remarks: String
      }
    ],

    // History
    conversionHistory: [
      {
        fromCourse: String,
        toCourse: String,
        conversionMonth: Number,
        conversionDate: Date,
        reason: String,
        convertedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        oldTotalFee: Number,
        newTotalFee: Number,
        oldPaidAmount: Number,
        newPaidAmount: Number
      }
    ],

    extensionHistory: [
      {
        fromCourse: String,
        toCourse: String,
        extensionMonth: Number,
        extensionDate: Date,
        reason: String,
        extendedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        additionalFees: Number,
        newTotalFee: Number,
      }
    ],

    // Status
    status: {
      type: String,
      enum: ["active", "inactive", "completed", "discontinued"],
      default: "active",
    },
    isActive: {
      type: Boolean,
      default: true,
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
  },
  {
    timestamps: true,
  }
);

// Auto-generate student ID
studentSchema.pre("save", async function (next) {
  if (this.isNew) {
    const year = new Date().getFullYear();
    const lastStudent = await this.constructor.findOne(
      { studentId: new RegExp(`STU${year}`) },
      { studentId: 1 },
      { sort: { studentId: -1 } }
    );

    let nextNumber = 1;
    if (lastStudent && lastStudent.studentId) {
      const lastNumber = parseInt(lastStudent.studentId.slice(-4));
      nextNumber = lastNumber + 1;
    }

    this.studentId = `STU${year}${nextNumber.toString().padStart(4, "0")}`;
  }
  next();
});

// Calculate balance amount for primary course
studentSchema.pre("save", function (next) {
  if (this.totalCourseFee && this.paidAmount) {
    this.balanceAmount = this.totalCourseFee - this.paidAmount;
  }
  
  // Auto-calculate feeSchedule balanceAmount for primary course
  if (this.feeSchedule && this.feeSchedule.length > 0) {
    this.feeSchedule.forEach(fee => {
      if (fee.totalFee !== undefined && fee.paidAmount !== undefined) {
        fee.balanceAmount = fee.totalFee - fee.paidAmount;
        
        if (fee.balanceAmount === 0 && fee.paidAmount > 0) {
          fee.status = "paid";
        } else if (fee.paidAmount > 0 && fee.balanceAmount > 0) {
          fee.status = "partial";
        }
      }
    });
  }
  
  // Auto-calculate for additional courses
  if (this.additionalCourses && this.additionalCourses.length > 0) {
    this.additionalCourses.forEach(course => {
      if (course.feeSchedule && course.feeSchedule.length > 0) {
        course.feeSchedule.forEach(fee => {
          if (fee.totalFee !== undefined && fee.paidAmount !== undefined) {
            fee.balanceAmount = fee.totalFee - fee.paidAmount;
            
            if (fee.balanceAmount === 0 && fee.paidAmount > 0) {
              fee.status = "paid";
            } else if (fee.paidAmount > 0 && fee.balanceAmount > 0) {
              fee.status = "partial";
            }
          }
        });
      }
    });
  }
  
  next();
});

// Virtual to get total fees across all courses
studentSchema.virtual('totalFeesAllCourses').get(function() {
  let total = this.totalCourseFee || 0;
  
  if (this.additionalCourses && this.additionalCourses.length > 0) {
    this.additionalCourses.forEach(course => {
      if (course.feeSchedule && course.feeSchedule.length > 0) {
        total += course.feeSchedule.reduce((sum, fee) => sum + (fee.totalFee || 0), 0);
      }
    });
  }
  
  return total;
});

// Virtual to get total paid across all courses
studentSchema.virtual('totalPaidAllCourses').get(function() {
  let total = this.paidAmount || 0;
  
  if (this.additionalCourses && this.additionalCourses.length > 0) {
    this.additionalCourses.forEach(course => {
      if (course.feeSchedule && course.feeSchedule.length > 0) {
        total += course.feeSchedule.reduce((sum, fee) => sum + (fee.paidAmount || 0), 0);
      }
    });
  }
  
  return total;
});

module.exports = mongoose.model("Student", studentSchema);