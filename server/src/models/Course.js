// models/Course.js
const mongoose = require("mongoose");

// ====================== DEFINE SUB-SCHEMAS ======================

// Subtopic Schema
const subtopicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false } // Changed from true to false
);

// Topic Schema
const topicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subtopics: [subtopicSchema],
  },
  { _id: false } // Changed from true to false
);

// Semester Schema
const semesterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    topics: [topicSchema],
  },
  { _id: false } // Changed from true to false
);

// ====================== MAIN COURSE SCHEMA ======================

const courseSchema = new mongoose.Schema(
  {
    // Course Identification
    courseCode: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
    },
    courseFullName: {
      type: String,
      required: true,
      trim: true,
    },
    courseShortName: {
      type: String,
      required: true,
      trim: true,
    },

    // Course Details
    duration: {
      type: String,
      required: true,
      trim: true,
    },
    totalSemesters: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    courseType: {
      type: String,
      enum: ["diploma", "certificate", "scholarship_based"],
      default: "",
    },

    // NEW FEE STRUCTURE FIELDS
    totalFee: {
      type: Number,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    netFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    admissionFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    examFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    otherCharges: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Course Content
    description: {
      type: String,
      trim: true,
    },
    eligibilityCriteria: {
      type: String,
      trim: true,
    },
    syllabus: {
      type: [semesterSchema], // Now using the defined semesterSchema
      default: [],
    },
    careerOpportunities: {
      type: String,
      trim: true,
    },

    // NEW EXAM DETAILS FIELDS
    numberOfExams: {
      type: Number,
      default: 0,
      min: 0,
      max: 20,
    },
    examMonths: {
      type: String,
      trim: true,
      default: "",
    },

    // Batch Information
    availableBatches: {
      type: [String],
      enum: ["morning", "afternoon", "evening", "weekend"],
      default: ["morning"],
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    seatsAvailable: {
      type: Number,
      default: 60,
      min: 0,
    },
    seatsFilled: {
      type: Number,
      default: 0,
      min: 0,
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

// ====================== INDEXES ======================
courseSchema.index({
  courseCode: 1,
  courseFullName: 1,
  courseShortName: 1,
});

// ====================== MIDDLEWARE ======================

// Calculate total fee before saving
courseSchema.pre("validate", function (next) {
  // Ensure numbers
  const totalFee = Number(this.totalFee) || 0;
  const discount = Number(this.discount) || 0;

  // Check if duration is a number or string
  let duration = 1;
  if (typeof this.duration === "number") {
    duration = this.duration;
  } else if (typeof this.duration === "string") {
    // Try to extract number from duration string (e.g., "3 years", "6 months")
    const match = this.duration.match(/\d+/);
    duration = match ? parseInt(match[0]) : 1;
  }

  // Net Fee = Total Fee - Discount %
  if (totalFee > 0) {
    const discountDecimal = discount / 100;
    this.netFee = totalFee * (1 - discountDecimal);
  } else {
    this.netFee = 0;
  }

  // Monthly Fee = Net Fee / Duration (months)
  // Assuming duration is in months. If it's in years, multiply by 12
  let durationInMonths = duration;
  if (this.duration && this.duration.toLowerCase().includes("year")) {
    durationInMonths = duration * 12;
  }

  if (this.netFee > 0 && durationInMonths > 0) {
    this.monthlyFee = this.netFee / durationInMonths;
  } else {
    this.monthlyFee = 0;
  }

  next();
});

// Auto-generate course code
courseSchema.pre("validate", async function (next) {
  if (this.isNew && !this.courseCode) {
    const prefix = "CRS";
    const year = new Date().getFullYear().toString().slice(-2);

    const lastCourse = await this.constructor.findOne(
      { courseCode: new RegExp(`^${prefix}${year}`) },
      { courseCode: 1 },
      { sort: { courseCode: -1 } }
    );

    let nextNumber = 1;
    if (lastCourse?.courseCode) {
      nextNumber = parseInt(lastCourse.courseCode.slice(-4)) + 1;
    }

    this.courseCode = `${prefix}${year}${nextNumber
      .toString()
      .padStart(4, "0")}`;
  }
  next();
});

// ====================== INSTANCE METHODS ======================

// REMOVE THIS METHOD: syllabus is already structured data
// courseSchema.methods.getSyllabusAsJSON = function () {
//   try {
//     return this.syllabus ? JSON.parse(this.syllabus) : [];
//   } catch (error) {
//     console.error("Error parsing syllabus JSON:", error);
//     return [];
//   }
// };

// NEW: Method to count total topics
courseSchema.methods.getTotalTopics = function () {
  if (!this.syllabus || !Array.isArray(this.syllabus)) {
    return 0;
  }
  return this.syllabus.reduce((total, semester) => {
    return (
      total +
      (semester.topics && Array.isArray(semester.topics)
        ? semester.topics.length
        : 0)
    );
  }, 0);
};

// NEW: Method to count total subtopics
courseSchema.methods.getTotalSubtopics = function () {
  if (!this.syllabus || !Array.isArray(this.syllabus)) {
    return 0;
  }
  return this.syllabus.reduce((total, semester) => {
    if (!semester.topics || !Array.isArray(semester.topics)) return total;
    return (
      total +
      semester.topics.reduce((subTotal, topic) => {
        return (
          subTotal +
          (topic.subtopics && Array.isArray(topic.subtopics)
            ? topic.subtopics.length
            : 0)
        );
      }, 0)
    );
  }, 0);
};

// Method to get formatted exam months
courseSchema.methods.getFormattedExamMonths = function () {
  if (!this.examMonths || this.examMonths.trim() === "") {
    return "Not set";
  }
  return this.examMonths
    .split(",")
    .map((m) => `Month ${m.trim()}`)
    .join(", ");
};

// NEW: Method to get formatted syllabus for display
courseSchema.methods.getFormattedSyllabus = function () {
  if (!this.syllabus || !Array.isArray(this.syllabus)) {
    return "";
  }

  let formatted = "";
  this.syllabus.forEach((semester, index) => {
    formatted += `\n${semester.name}:\n`;
    if (semester.topics && Array.isArray(semester.topics)) {
      semester.topics.forEach((topic, topicIndex) => {
        formatted += `  ${topicIndex + 1}. ${topic.name}\n`;
        if (topic.subtopics && Array.isArray(topic.subtopics)) {
          topic.subtopics.forEach((subtopic, subtopicIndex) => {
            formatted += `     ${subtopicIndex + 1}. ${subtopic.name}\n`;
          });
        }
      });
    }
  });
  return formatted;
};

module.exports = mongoose.model("Course", courseSchema);
