// controllers/courseController.js
const Course = require("../models/Course");

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private (Admin)
exports.getCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "all" } = req.query;

    // Build filter
    const filter = {};

    if (search) {
      filter.$or = [
        { courseFullName: { $regex: search, $options: "i" } },
        { courseShortName: { $regex: search, $options: "i" } },
        { courseCode: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { courseType: { $regex: search, $options: "i" } },
      ];
    }

    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    // Execute query with projection to limit fields if needed
    const courses = await Course.find(filter)
      .select("-__v")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Course.countDocuments(filter);

    // Add formatted data for frontend
    const formattedCourses = courses.map((course) => {
      // Handle syllabus data safely
      let totalTopics = 0;
      let totalSubtopics = 0;

      try {
        // Check if syllabus exists and is valid
        if (course.syllabus && course.syllabus.length > 0) {
          // Ensure syllabus is an array
          let syllabusArray = course.syllabus;

          // If it's a string, try to parse it
          if (typeof syllabusArray === "string") {
            try {
              syllabusArray = JSON.parse(syllabusArray);
            } catch (parseError) {
              console.error(
                `Failed to parse syllabus for course ${course._id}:`,
                parseError
              );
              syllabusArray = [];
            }
          }

          // Calculate counts only if syllabusArray is valid array
          if (Array.isArray(syllabusArray)) {
            totalTopics = syllabusArray.reduce((total, semester) => {
              if (
                semester &&
                semester.topics &&
                Array.isArray(semester.topics)
              ) {
                return total + semester.topics.length;
              }
              return total;
            }, 0);

            totalSubtopics = syllabusArray.reduce((total, semester) => {
              if (
                !semester ||
                !semester.topics ||
                !Array.isArray(semester.topics)
              )
                return total;

              return semester.topics.reduce((subTotal, topic) => {
                if (
                  topic &&
                  topic.subtopics &&
                  Array.isArray(topic.subtopics)
                ) {
                  return subTotal + topic.subtopics.length;
                }
                return subTotal;
              }, total);
            }, 0);
          }
        }
      } catch (error) {
        console.error(
          `Error processing syllabus for course ${course._id}:`,
          error
        );
        // Continue with default values
      }

      return {
        ...course,
        seatPercentage:
          course.seatsAvailable > 0
            ? Math.round(
                ((course.seatsFilled || 0) / course.seatsAvailable) * 100
              )
            : 0,
        formattedExamMonths:
          course.examMonths && course.examMonths.trim() !== ""
            ? course.examMonths
                .split(",")
                .map((m) => `Month ${m.trim()}`)
                .join(", ")
            : "Not set",
        totalTopics,
        totalSubtopics,
      };
    });

    res.json({
      success: true,
      count: courses.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: formattedCourses,
    });
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Private (Admin)
exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).select("-__v");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // UPDATED: Syllabus is now stored as array in database, no need to parse
    const syllabusData = course.syllabus || [];

    const courseWithParsedData = {
      ...course.toObject(),
      syllabusData,
      formattedExamMonths: course.examMonths
        ? course.examMonths
            .split(",")
            .map((m) => `Month ${m.trim()}`)
            .join(", ")
        : "Not set",
    };

    res.json({
      success: true,
      data: courseWithParsedData,
    });
  } catch (error) {
    console.error("Get course error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Create new course
// @route   POST /api/courses
// @access  Private (Admin)
exports.createCourse = async (req, res) => {
  try {
    console.log("Received course data:", req.body);

    // Required fields
    const requiredFields = [
      "courseFullName",
      "courseShortName",
      "duration",
      "totalSemesters",
      "totalFee",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Parse syllabus - it comes as a JSON string from frontend
    let syllabusData = [];
    if (req.body.syllabus && req.body.syllabus.trim() !== "") {
      try {
        console.log("Raw syllabus data:", req.body.syllabus);

        // If syllabus is a string, parse it
        if (typeof req.body.syllabus === "string") {
          const parsed = JSON.parse(req.body.syllabus);
          console.log("Parsed syllabus:", parsed);

          // Convert to the format expected by the schema - REMOVE ID FIELDS
          syllabusData = parsed.map((semester, semIndex) => ({
            name: semester.name || `Semester ${semIndex + 1}`,
            topics: (semester.topics || []).map((topic, topicIndex) => ({
              name: topic.name || `Topic ${topicIndex + 1}`,
              subtopics: (topic.subtopics || []).map((subtopic, subIndex) => ({
                name: subtopic.name || `Subtopic ${subIndex + 1}`,
              })),
            })),
          }));
        }
        // If syllabus is already an array, clean it
        else if (Array.isArray(req.body.syllabus)) {
          syllabusData = req.body.syllabus.map((semester, semIndex) => ({
            name: semester.name || `Semester ${semIndex + 1}`,
            topics: (semester.topics || []).map((topic, topicIndex) => ({
              name: topic.name || `Topic ${topicIndex + 1}`,
              subtopics: (topic.subtopics || []).map((subtopic, subIndex) => ({
                name: subtopic.name || `Subtopic ${subIndex + 1}`,
              })),
            })),
          }));
        }

        console.log("Processed syllabus data:", syllabusData);
      } catch (error) {
        console.error("Error parsing syllabus:", error);
        // Don't fail on syllabus error - just log it
        syllabusData = [];
      }
    }
    // Clean and validate data
    const courseData = {
      courseFullName: req.body.courseFullName.trim(),
      courseShortName: req.body.courseShortName.trim(),
      duration: req.body.duration.trim(),
      totalSemesters: parseInt(req.body.totalSemesters) || 6,
      seatsAvailable: parseInt(req.body.seatsAvailable) || 60,
      seatsFilled: parseInt(req.body.seatsFilled) || 0,
      totalFee: parseFloat(req.body.totalFee) || 0,
      discount: parseFloat(req.body.discount) || 0,
      netFee: parseFloat(req.body.netFee) || 0,
      monthlyFee: parseFloat(req.body.monthlyFee) || 0,
      admissionFee: parseFloat(req.body.admissionFee) || 0,
      examFee: parseFloat(req.body.examFee) || 0,
      otherCharges: parseFloat(req.body.otherCharges) || 0,
      numberOfExams: parseInt(req.body.numberOfExams) || 0,
      description: req.body.description ? req.body.description.trim() : "",
      eligibilityCriteria: req.body.eligibilityCriteria
        ? req.body.eligibilityCriteria.trim()
        : "",
      syllabus: syllabusData, // This is now an array
      careerOpportunities: req.body.careerOpportunities
        ? req.body.careerOpportunities.trim()
        : "",
      availableBatches: Array.isArray(req.body.availableBatches)
        ? req.body.availableBatches.filter((batch) =>
            ["morning", "afternoon", "evening", "weekend"].includes(batch)
          )
        : ["morning"],
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      courseType: req.body.courseType || "",
      examMonths: req.body.examMonths ? req.body.examMonths.trim() : "",
      createdBy: req.user.id,
    };

    // Only add courseCode if provided
    if (req.body.courseCode && req.body.courseCode.trim() !== "") {
      courseData.courseCode = req.body.courseCode.toUpperCase().trim();
    }

    console.log("Creating course with data:", {
      ...courseData,
      syllabus: `Array with ${courseData.syllabus.length} semesters`,
    });

    const course = await Course.create(courseData);

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: course,
    });
  } catch (error) {
    console.error("Create course error:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      errors: error.errors,
    });

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Course code already exists",
        field: "courseCode",
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create course",
    });
  }
};
// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Admin)
exports.updateCourse = async (req, res) => {
  try {
    // Clean update data
    const updateData = { ...req.body };

    // Clean and validate specific fields
    if (updateData.courseCode) {
      updateData.courseCode = updateData.courseCode.toUpperCase().trim();
    }

    if (
      updateData.availableBatches &&
      Array.isArray(updateData.availableBatches)
    ) {
      updateData.availableBatches = updateData.availableBatches.filter(
        (batch) =>
          ["morning", "afternoon", "evening", "weekend"].includes(batch)
      );
    }

    // Parse syllabus if it's a string
    if (updateData.syllabus) {
      try {
        // If syllabus is a string, parse it
        if (typeof updateData.syllabus === "string") {
          updateData.syllabus = JSON.parse(updateData.syllabus);
        }
        // If syllabus is already an array, keep it as is
      } catch (error) {
        console.error("Error parsing syllabus:", error);
        return res.status(400).json({
          success: false,
          message: "Invalid syllabus format. Must be valid JSON array.",
          field: "syllabus",
        });
      }
    }

    // Numeric fields
    const numericFields = [
      "totalSemesters",
      "seatsAvailable",
      "seatsFilled",
      "totalFee",
      "discount",
      "netFee",
      "monthlyFee",
      "admissionFee",
      "examFee",
      "otherCharges",
      "numberOfExams",
    ];

    numericFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        if (
          field === "discount" ||
          field.includes("Fee") ||
          field === "otherCharges"
        ) {
          updateData[field] = parseFloat(updateData[field]) || 0;
        } else {
          updateData[field] = parseInt(updateData[field]) || 0;
        }
      }
    });

    updateData.updatedBy = req.user.id;

    const course = await Course.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-__v");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.json({
      success: true,
      message: "Course updated successfully",
      data: course,
    });
  } catch (error) {
    console.error("Update course error:", error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Course code already exists",
        field: "courseCode",
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Admin)
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    await course.deleteOne();

    res.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete course error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Toggle course status
// @route   PUT /api/courses/:id/toggle-status
// @access  Private (Admin)
exports.toggleStatus = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    course.isActive = !course.isActive;
    course.updatedBy = req.user.id;
    await course.save();

    res.json({
      success: true,
      message: `Course ${
        course.isActive ? "activated" : "deactivated"
      } successfully`,
      data: course,
    });
  } catch (error) {
    console.error("Toggle status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get course statistics
// @route   GET /api/courses/stats/summary
// @access  Private (Admin)
exports.getCourseStats = async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments();
    const activeCourses = await Course.countDocuments({ isActive: true });
    const totalSeats = await Course.aggregate([
      { $group: { _id: null, totalSeats: { $sum: "$seatsAvailable" } } },
    ]);
    const filledSeats = await Course.aggregate([
      { $group: { _id: null, totalFilled: { $sum: "$seatsFilled" } } },
    ]);

    // Courses by course type
    const coursesByType = await Course.aggregate([
      { $group: { _id: "$courseType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Average discount
    const averageDiscount = await Course.aggregate([
      { $group: { _id: null, avgDiscount: { $avg: "$discount" } } },
    ]);

    // Total revenue potential
    const totalRevenue = await Course.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $multiply: ["$netFee", "$seatsAvailable"] } },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        totalCourses,
        activeCourses,
        totalSeats: totalSeats[0]?.totalSeats || 0,
        filledSeats: filledSeats[0]?.totalFilled || 0,
        availableSeats:
          (totalSeats[0]?.totalSeats || 0) - (filledSeats[0]?.totalFilled || 0),
        coursesByType: coursesByType.filter((item) => item._id),
        averageDiscount: averageDiscount[0]?.avgDiscount || 0,
        totalRevenue: totalRevenue[0]?.totalRevenue || 0,
      },
    });
  } catch (error) {
    console.error("Course stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get active courses for dropdown (simplified data)
// @route   GET /api/courses/active
// @access  Private (Admin)
exports.getActiveCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true })
      .select(
        "_id courseCode courseFullName courseShortName duration totalSemesters totalFee discount netFee monthlyFee"
      )
      .sort({ courseFullName: 1 });

    res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error("Get active courses error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get courses for dropdown (simplified data)
// @route   GET /api/courses/dropdown
// @access  Private (Admin)
exports.getCoursesForDropdown = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true })
      .select(
        "_id courseCode courseFullName courseShortName duration totalSemesters"
      )
      .sort({ courseFullName: 1 });

    res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error("Get courses for dropdown error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get all courses for public (no auth required)
// @route   GET /api/courses/public
// @access  Public
exports.getPublicCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true })
      .select(
        "_id courseCode courseFullName courseShortName duration description totalSemesters totalFee discount netFee monthlyFee"
      )
      .sort({ courseFullName: 1 });

    res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error("Get public courses error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
