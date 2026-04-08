const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Course = require("../models/Course");

// Helper: get effective course data for a student
// Converted students use courseCode2 (ObjectId ref), others use courseCode (String)
const getCourseDataMap = async (students) => {
  const stringCourseIds = students
    .filter(s => !s.courseCode2 && s.courseCode)
    .map(s => s.courseCode)
    .filter(Boolean);

  const courses = stringCourseIds.length > 0
    ? await Course.find({ _id: { $in: stringCourseIds } })
        .select("courseFullName duration examMonths numberOfExams")
        .lean()
    : [];

  const courseMap = {};
  courses.forEach(c => { courseMap[c._id.toString()] = c; });
  return courseMap;
};

// @desc    Get upcoming exam report
// @route   GET /api/reports/exams/upcoming
// @access  Private (Admin)
exports.getUpcomingExamReport = async (req, res) => {
  try {
    console.log("📊 Generating upcoming exam report...");

    const {
      page = 1,
      limit = 10,
      search = "",
      course,
      faculty,
      batch,
      examNumber, // 'first', 'second', 'third' or absent = all
      sortBy = "daysLeft",
      sortOrder = "asc",
    } = req.query;

    const filter = { isActive: true, status: "active" };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
        { admissionNo: { $regex: search, $options: "i" } },
      ];
    }

    if (course) filter.course = { $regex: course, $options: "i" };
    if (faculty) filter.facultyAllot = { $regex: faculty, $options: "i" };
    if (batch) filter.batchTime = { $regex: batch, $options: "i" };

    // Populate courseCode2 for converted students
    const students = await Student.find(filter)
      .populate("courseCode2", "courseFullName duration examMonths numberOfExams")
      .lean();

    console.log(`📋 Found ${students.length} active students`);

    // Build courseMap for non-converted students (courseCode is a plain string ID)
    const courseMap = await getCourseDataMap(students);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reportData = [];

    students.forEach(student => {
      // Converted students use courseCode2, original students use courseCode string
      const courseData = student.courseCode2 || courseMap[student.courseCode];

      if (!student.admissionDate || !courseData?.examMonths) return;

      const startDate = new Date(student.admissionDate);
      const examMonths = courseData.examMonths
        .split(",")
        .map(m => parseInt(m.trim()))
        .filter(m => !isNaN(m));

      examMonths.forEach((monthNum, index) => {
        // Skip if a specific exam number filter is applied
        if (examNumber === "first" && index !== 0) return;
        if (examNumber === "second" && index !== 1) return;
        if (examNumber === "third" && index !== 2) return;

        const examDate = new Date(startDate);
        examDate.setMonth(startDate.getMonth() + monthNum - 1);
        examDate.setDate(15);

        const diffTime = examDate - today;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status;
        if (daysLeft < 0) status = "Completed";
        else if (daysLeft <= 15) status = "Critical";
        else if (daysLeft <= 30) status = "Very Soon";
        else if (daysLeft <= 60) status = "Soon";
        else if (daysLeft <= 90) status = "Approaching";
        else status = "Far";

        reportData.push({
          id: `${student._id}_exam_${index + 1}`,
          studentId: student._id,
          rollNo: student.studentId || "N/A",
          studentName: student.fullName || "N/A",
          courseName: student.course || "N/A",
          facultyName: student.facultyAllot || "Not Allotted",
          batchTime: student.batchTime || "N/A",
          examNumber: index + 1,
          examMonth: monthNum,
          examDate: examDate.toISOString(),
          dateOfExam: examDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          daysLeft: daysLeft >= 0 ? daysLeft : 0,
          status,
          isCompleted: daysLeft < 0,
          admissionDate: student.admissionDate,
          dateOfJoining: student.admissionDate
            ? new Date(student.admissionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "N/A",
        });
      });
    });

    // If specific exam number selected, hide completed ones
    const filteredData = examNumber
      ? reportData.filter(item => !item.isCompleted)
      : reportData;

    // Sort
    const sortedData = [...filteredData].sort((a, b) => {
      if (sortBy === "daysLeft") return sortOrder === "asc" ? a.daysLeft - b.daysLeft : b.daysLeft - a.daysLeft;
      if (sortBy === "studentName") return sortOrder === "asc" ? a.studentName.localeCompare(b.studentName) : b.studentName.localeCompare(a.studentName);
      if (sortBy === "examDate") return sortOrder === "asc" ? new Date(a.examDate) - new Date(b.examDate) : new Date(b.examDate) - new Date(a.examDate);
      if (sortBy === "examNumber") return sortOrder === "asc" ? a.examNumber - b.examNumber : b.examNumber - a.examNumber;
      return 0;
    });

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginatedData = sortedData.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    // Unique filter values
    const uniqueCourses = [...new Set(students.map(s => s.course).filter(Boolean))];
    const uniqueFaculties = [...new Set(students.map(s => s.facultyAllot).filter(Boolean))];
    const uniqueBatches = [...new Set(students.map(s => s.batchTime).filter(Boolean))];

    // Stats
    const nonCompleted = filteredData.filter(i => !i.isCompleted);
    const stats = {
      totalExams: filteredData.length,
      critical: filteredData.filter(i => i.status === "Critical").length,
      verySoon: filteredData.filter(i => i.status === "Very Soon").length,
      soon: filteredData.filter(i => i.status === "Soon").length,
      approaching: filteredData.filter(i => i.status === "Approaching").length,
      far: filteredData.filter(i => i.status === "Far").length,
      completed: filteredData.filter(i => i.status === "Completed").length,
      averageDaysLeft: nonCompleted.length > 0
        ? Math.round(nonCompleted.reduce((sum, i) => sum + i.daysLeft, 0) / nonCompleted.length)
        : 0,
    };

    res.json({
      success: true,
      count: paginatedData.length,
      total: filteredData.length,
      totalPages: Math.ceil(filteredData.length / limitNum),
      currentPage: pageNum,
      stats,
      filters: { courses: uniqueCourses, faculties: uniqueFaculties, batches: uniqueBatches },
      data: paginatedData,
    });

  } catch (error) {
    console.error("❌ Upcoming exam report error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Export upcoming exam report
// @route   GET /api/reports/exams/upcoming/export
// @access  Private (Admin)
exports.exportUpcomingExamReport = async (req, res) => {
  try {
    const students = await Student.find({ isActive: true, status: "active" })
      .populate("courseCode2", "courseFullName examMonths")
      .lean();

    const courseMap = await getCourseDataMap(students);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const csvData = [[
      "D.O.A", "Faculty Name", "Batch Time", "Roll No",
      "Student Name", "Course Name", "Exam No.", "Exam Date", "Days Left", "Status",
    ].join(",")];

    students.forEach(student => {
      const courseData = student.courseCode2 || courseMap[student.courseCode];
      if (!student.admissionDate || !courseData?.examMonths) return;

      const startDate = new Date(student.admissionDate);
      const examMonths = courseData.examMonths
        .split(",")
        .map(m => parseInt(m.trim()))
        .filter(m => !isNaN(m));

      examMonths.forEach((monthNum, index) => {
        const examDate = new Date(startDate);
        examDate.setMonth(startDate.getMonth() + monthNum - 1);
        examDate.setDate(15);

        const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

        let status = "Upcoming";
        if (daysLeft < 0) status = "Completed";
        else if (daysLeft <= 15) status = "Critical";
        else if (daysLeft <= 30) status = "Very Soon";
        else if (daysLeft <= 60) status = "Soon";
        else if (daysLeft <= 90) status = "Approaching";

        csvData.push([
          `"${startDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}"`,
          `"${student.facultyAllot || "Not Allotted"}"`,
          `"${student.batchTime || "N/A"}"`,
          `"${student.studentId || "N/A"}"`,
          `"${student.fullName || "N/A"}"`,
          `"${student.course || "N/A"}"`,
          index + 1,
          `"${examDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}"`,
          daysLeft >= 0 ? daysLeft : 0,
          `"${status}"`,
        ].join(","));
      });
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=upcoming-exams-report.csv");
    res.send(csvData.join("\n"));

  } catch (error) {
    console.error("❌ Export error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Get exam statistics
// @route   GET /api/reports/exams/stats
// @access  Private (Admin)
exports.getExamStats = async (req, res) => {
  try {
    const students = await Student.find({ isActive: true, status: "active" })
      .populate("courseCode2", "examMonths numberOfExams")
      .lean();

    const courseMap = await getCourseDataMap(students);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalExams = 0, completedExams = 0, upcomingExams = 0;
    let criticalExams = 0, verySoonExams = 0, soonExams = 0, approachingExams = 0;

    students.forEach(student => {
      const courseData = student.courseCode2 || courseMap[student.courseCode];
      if (!student.admissionDate || !courseData?.examMonths) return;

      const startDate = new Date(student.admissionDate);
      const examMonths = courseData.examMonths
        .split(",")
        .map(m => parseInt(m.trim()))
        .filter(m => !isNaN(m));

      examMonths.forEach(monthNum => {
        totalExams++;
        const examDate = new Date(startDate);
        examDate.setMonth(startDate.getMonth() + monthNum - 1);
        examDate.setDate(15);

        const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) completedExams++;
        else {
          upcomingExams++;
          if (daysLeft <= 15) criticalExams++;
          else if (daysLeft <= 30) verySoonExams++;
          else if (daysLeft <= 60) soonExams++;
          else if (daysLeft <= 90) approachingExams++;
        }
      });
    });

    res.json({
      success: true,
      data: {
        totalExams, completedExams, upcomingExams,
        criticalExams, verySoonExams, soonExams, approachingExams,
        completionRate: totalExams > 0 ? Math.round((completedExams / totalExams) * 100) : 0,
      },
    });

  } catch (error) {
    console.error("❌ Exam stats error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};