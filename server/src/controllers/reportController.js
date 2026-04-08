const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Course = require("../models/Course");

// ============================================================
// SHARED HELPER: resolves course data for both student types
// - Converted students: courseCode2 (ObjectId ref, populated)
// - Original students: courseCode (plain string ID, fetched manually)
// ============================================================
const getCourseDataMap = async (students) => {
  const stringCourseIds = students
    .filter(s => !s.courseCode2 && s.courseCode)
    .map(s => s.courseCode)
    .filter(Boolean);

  const courses = stringCourseIds.length > 0
    ? await Course.find({ _id: { $in: stringCourseIds } })
        .select("courseFullName duration examMonths numberOfExams examFee")
        .lean()
    : [];

  const courseMap = {};
  courses.forEach(c => { courseMap[c._id.toString()] = c; });
  return courseMap;
};

// ============================================================
// COUNTDOWN REPORT
// ============================================================
exports.getCountdownReport = async (req, res) => {
  try {
    console.log("📊 Generating countdown report...");

    const {
      page = 1,
      limit = 10,
      search = "",
      course,
      faculty,
      batch,
      courseType = "all",
      sortBy = "daysLeft",
      sortOrder = "asc",
    } = req.query;

    const studentFilter = { isActive: true, status: "active" };

    if (search) {
      studentFilter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
        { admissionNo: { $regex: search, $options: "i" } },
      ];
    }

    // Populate courseCode2 for converted students
    const students = await Student.find(studentFilter)
      .populate("courseCode2", "courseFullName duration examMonths")
      .lean();

    console.log(`📋 Found ${students.length} active students`);

    // Fetch courses for non-converted students
    const courseMap = await getCourseDataMap(students);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reportData = [];

    students.forEach(student => {
      // ── PRIMARY COURSE ──
      if (courseType === "all" || courseType === "primary") {
        // Use courseCode2 for converted, courseMap for original
        const courseData = student.courseCode2 || courseMap[student.courseCode];

        if (student.admissionDate && courseData?.duration) {
          const startDate = new Date(student.admissionDate);
          const durationMonths = parseInt(courseData.duration) || 12;

          const courseEndDate = new Date(startDate);
          courseEndDate.setMonth(startDate.getMonth() + durationMonths);

          const daysLeft = Math.ceil((courseEndDate - today) / (1000 * 60 * 60 * 24));

          let status = "Ongoing";
          if (daysLeft < 0) status = "Expired";
          else if (daysLeft <= 30) status = "Ending Soon";
          else if (daysLeft <= 90) status = "Near End";

          const entry = {
            id: `${student._id}_primary`,
            studentId: student._id,
            rollNo: student.studentId || "N/A",
            studentName: student.fullName || "N/A",
            courseName: student.course || courseData.courseFullName || "N/A",
            facultyName: student.facultyAllot || "Not Allotted",
            batchTime: student.batchTime || "N/A",
            admissionDate: student.admissionDate,
            dateOfJoining: new Date(student.admissionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            dateOfCompletion: courseEndDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            daysLeft: daysLeft >= 0 ? daysLeft : 0,
            status,
            courseType: "primary",
          };

          if (matchesFilters(entry, { course, faculty, batch })) {
            reportData.push(entry);
          }
        }
      }

      // ── ADDITIONAL COURSES ──
      if ((courseType === "all" || courseType === "additional") && student.additionalCourses?.length > 0) {
        student.additionalCourses.forEach((ac, index) => {
          const duration = ac.duration ||
            (ac.feeSchedule?.length > 0
              ? ac.feeSchedule.reduce((max, f) => f.monthNumber > max ? f.monthNumber : max, 0)
              : null);

          if (!duration || !student.admissionDate) return;

          const startDate = new Date(student.admissionDate);
          const courseEndDate = new Date(startDate);
          courseEndDate.setMonth(startDate.getMonth() + duration);

          const daysLeft = Math.ceil((courseEndDate - today) / (1000 * 60 * 60 * 24));

          let status = "Ongoing";
          if (daysLeft < 0) status = "Expired";
          else if (daysLeft <= 30) status = "Ending Soon";
          else if (daysLeft <= 90) status = "Near End";

          const entry = {
            id: `${student._id}_additional_${index}`,
            studentId: student._id,
            rollNo: student.studentId || "N/A",
            studentName: student.fullName || "N/A",
            courseName: ac.courseName || "Additional Course",
            facultyName: ac.facultyName || "Not Allotted",
            batchTime: ac.batchTime || "N/A",
            admissionDate: student.admissionDate,
            dateOfJoining: new Date(student.admissionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            dateOfCompletion: courseEndDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            daysLeft: daysLeft >= 0 ? daysLeft : 0,
            status,
            courseType: "additional",
          };

          if (matchesFilters(entry, { course, faculty, batch })) {
            reportData.push(entry);
          }
        });
      }
    });

    console.log(`📊 Generated ${reportData.length} entries (${reportData.filter(c => c.courseType === "primary").length} primary, ${reportData.filter(c => c.courseType === "additional").length} additional)`);

    // Sort
    const sortedData = [...reportData].sort((a, b) => {
      if (sortBy === "daysLeft") return sortOrder === "asc" ? a.daysLeft - b.daysLeft : b.daysLeft - a.daysLeft;
      if (sortBy === "studentName") return sortOrder === "asc" ? a.studentName.localeCompare(b.studentName) : b.studentName.localeCompare(a.studentName);
      if (sortBy === "facultyName") return sortOrder === "asc" ? a.facultyName.localeCompare(b.facultyName) : b.facultyName.localeCompare(a.facultyName);
      if (sortBy === "dateOfCompletion") return sortOrder === "asc" ? new Date(a.dateOfCompletion) - new Date(b.dateOfCompletion) : new Date(b.dateOfCompletion) - new Date(a.dateOfCompletion);
      if (sortBy === "courseName") return sortOrder === "asc" ? a.courseName.localeCompare(b.courseName) : b.courseName.localeCompare(a.courseName);
      return 0;
    });

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginatedData = sortedData.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    // Unique filter values
    const uniqueCourses = [...new Set(reportData.map(i => i.courseName).filter(Boolean))];
    const uniqueFaculties = [...new Set(reportData.map(i => i.facultyName).filter(Boolean))];
    const uniqueBatches = [...new Set(reportData.map(i => i.batchTime).filter(Boolean))];

    // Stats
    const stats = {
      totalCourses: reportData.length,
      endingSoon: reportData.filter(i => i.status === "Ending Soon").length,
      nearEnd: reportData.filter(i => i.status === "Near End").length,
      ongoing: reportData.filter(i => i.status === "Ongoing").length,
      expired: reportData.filter(i => i.status === "Expired").length,
      averageDaysLeft: reportData.length > 0
        ? Math.round(reportData.reduce((sum, i) => sum + i.daysLeft, 0) / reportData.length)
        : 0,
    };

    res.json({
      success: true,
      count: paginatedData.length,
      total: reportData.length,
      totalPages: Math.ceil(reportData.length / limitNum),
      currentPage: pageNum,
      stats,
      filters: { courses: uniqueCourses, faculties: uniqueFaculties, batches: uniqueBatches },
      data: paginatedData,
    });

  } catch (error) {
    console.error("❌ Countdown report error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ============================================================
// EXAM REPORT
// ============================================================
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
      examNumber,
      courseType = "all",
      sortBy = "daysLeft",
      sortOrder = "asc",
    } = req.query;

    const studentFilter = { isActive: true, status: "active" };

    if (search) {
      studentFilter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
        { admissionNo: { $regex: search, $options: "i" } },
      ];
    }

    const students = await Student.find(studentFilter)
      .populate("courseCode2", "courseFullName duration examMonths numberOfExams examFee")
      .lean();

    console.log(`📋 Found ${students.length} active students`);

    const courseMap = await getCourseDataMap(students);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reportData = [];

    students.forEach(student => {
      // ── PRIMARY COURSE EXAMS ──
      if (courseType === "all" || courseType === "primary") {
        const courseData = student.courseCode2 || courseMap[student.courseCode];

        if (student.admissionDate && courseData?.examMonths) {
          const startDate = new Date(student.admissionDate);
          const examMonths = courseData.examMonths
            .split(",")
            .map(m => parseInt(m.trim()))
            .filter(m => !isNaN(m));

          examMonths.forEach((monthNum, index) => {
            if (examNumber === "first" && index !== 0) return;
            if (examNumber === "second" && index !== 1) return;
            if (examNumber === "third" && index !== 2) return;

            const examDate = new Date(startDate);
            examDate.setMonth(startDate.getMonth() + monthNum - 1);
            examDate.setDate(15);

            const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

            let status;
            if (daysLeft < 0) status = "Completed";
            else if (daysLeft <= 15) status = "Critical";
            else if (daysLeft <= 30) status = "Very Soon";
            else if (daysLeft <= 60) status = "Soon";
            else if (daysLeft <= 90) status = "Approaching";
            else status = "Far";

            const entry = {
              id: `${student._id}_primary_exam_${index + 1}`,
              studentId: student._id,
              rollNo: student.studentId || "N/A",
              studentName: student.fullName || "N/A",
              courseName: student.course || courseData.courseFullName || "N/A",
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
              dateOfJoining: new Date(student.admissionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
              courseType: "primary",
            };

            if (matchesFilters(entry, { course, faculty, batch })) {
              reportData.push(entry);
            }
          });
        }
      }

      // ── ADDITIONAL COURSE EXAMS ──
      if ((courseType === "all" || courseType === "additional") && student.additionalCourses?.length > 0) {
        student.additionalCourses.forEach((ac, courseIndex) => {
          const examMonths = (ac.feeSchedule || [])
            .filter(f => f.isExamMonth)
            .map(f => f.monthNumber)
            .sort((a, b) => a - b);

          examMonths.forEach((monthNum, examIndex) => {
            if (examNumber === "first" && examIndex !== 0) return;
            if (examNumber === "second" && examIndex !== 1) return;
            if (examNumber === "third" && examIndex !== 2) return;

            const startDate = new Date(student.admissionDate);
            const examDate = new Date(startDate);
            examDate.setMonth(startDate.getMonth() + monthNum - 1);
            examDate.setDate(15);

            const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

            let status;
            if (daysLeft < 0) status = "Completed";
            else if (daysLeft <= 15) status = "Critical";
            else if (daysLeft <= 30) status = "Very Soon";
            else if (daysLeft <= 60) status = "Soon";
            else if (daysLeft <= 90) status = "Approaching";
            else status = "Far";

            const entry = {
              id: `${student._id}_additional_${courseIndex}_exam_${examIndex + 1}`,
              studentId: student._id,
              rollNo: student.studentId || "N/A",
              studentName: student.fullName || "N/A",
              courseName: ac.courseName || "Additional Course",
              facultyName: ac.facultyName || "Not Allotted",
              batchTime: ac.batchTime || "N/A",
              examNumber: examIndex + 1,
              examMonth: monthNum,
              examDate: examDate.toISOString(),
              dateOfExam: examDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
              daysLeft: daysLeft >= 0 ? daysLeft : 0,
              status,
              isCompleted: daysLeft < 0,
              admissionDate: student.admissionDate,
              dateOfJoining: new Date(student.admissionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
              courseType: "additional",
            };

            if (matchesFilters(entry, { course, faculty, batch })) {
              reportData.push(entry);
            }
          });
        });
      }
    });

    // If specific exam number selected, hide completed
    const filteredData = examNumber ? reportData.filter(i => !i.isCompleted) : reportData;

    // Sort
    const sortedData = [...filteredData].sort((a, b) => {
      if (sortBy === "daysLeft") return sortOrder === "asc" ? a.daysLeft - b.daysLeft : b.daysLeft - a.daysLeft;
      if (sortBy === "studentName") return sortOrder === "asc" ? a.studentName.localeCompare(b.studentName) : b.studentName.localeCompare(a.studentName);
      if (sortBy === "examDate") return sortOrder === "asc" ? new Date(a.examDate) - new Date(b.examDate) : new Date(b.examDate) - new Date(a.examDate);
      if (sortBy === "examNumber") return sortOrder === "asc" ? a.examNumber - b.examNumber : b.examNumber - a.examNumber;
      return 0;
    });

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginatedData = sortedData.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    const uniqueCourses = [...new Set(filteredData.map(i => i.courseName).filter(Boolean))];
    const uniqueFaculties = [...new Set(filteredData.map(i => i.facultyName).filter(Boolean))];
    const uniqueBatches = [...new Set(filteredData.map(i => i.batchTime).filter(Boolean))];

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

// ============================================================
// EXPORT COUNTDOWN CSV
// ============================================================
exports.exportCountdownReport = async (req, res) => {
  try {
    const students = await Student.find({ isActive: true, status: "active" })
      .populate("courseCode2", "courseFullName duration")
      .lean();

    const courseMap = await getCourseDataMap(students);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const csvData = [["Type", "D.O.A", "Faculty Name", "Batch Time", "Roll No", "Student Name", "Course Name", "D.O.C", "Days Left", "Status"].join(",")];

    students.forEach(student => {
      // Primary
      const courseData = student.courseCode2 || courseMap[student.courseCode];
      if (student.admissionDate && courseData?.duration) {
        const startDate = new Date(student.admissionDate);
        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + parseInt(courseData.duration));
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        let status = "Ongoing";
        if (daysLeft < 0) status = "Expired";
        else if (daysLeft <= 30) status = "Ending Soon";
        else if (daysLeft <= 90) status = "Near End";
        csvData.push([
          '"Primary"',
          `"${startDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}"`,
          `"${student.facultyAllot || "Not Allotted"}"`,
          `"${student.batchTime || "N/A"}"`,
          `"${student.studentId || "N/A"}"`,
          `"${student.fullName || "N/A"}"`,
          `"${student.course || "N/A"}"`,
          `"${endDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}"`,
          daysLeft >= 0 ? daysLeft : 0,
          `"${status}"`,
        ].join(","));
      }

      // Additional
      (student.additionalCourses || []).forEach(ac => {
        const lastMonth = (ac.feeSchedule || []).reduce((max, f) => f.monthNumber > max ? f.monthNumber : max, 0);
        const duration = ac.duration || lastMonth;
        if (!duration || !student.admissionDate) return;
        const startDate = new Date(student.admissionDate);
        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + duration);
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        let status = "Ongoing";
        if (daysLeft < 0) status = "Expired";
        else if (daysLeft <= 30) status = "Ending Soon";
        else if (daysLeft <= 90) status = "Near End";
        csvData.push([
          '"Additional"',
          `"${startDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}"`,
          `"${ac.facultyName || "Not Allotted"}"`,
          `"${ac.batchTime || "N/A"}"`,
          `"${student.studentId || "N/A"}"`,
          `"${student.fullName || "N/A"}"`,
          `"${ac.courseName || "Additional Course"}"`,
          `"${endDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}"`,
          daysLeft >= 0 ? daysLeft : 0,
          `"${status}"`,
        ].join(","));
      });
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=countdown-report.csv");
    res.send(csvData.join("\n"));

  } catch (error) {
    console.error("❌ Export error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ============================================================
// EXPORT EXAM REPORT CSV
// ============================================================
exports.exportUpcomingExamReport = async (req, res) => {
  try {
    const students = await Student.find({ isActive: true, status: "active" })
      .populate("courseCode2", "courseFullName examMonths")
      .lean();

    const courseMap = await getCourseDataMap(students);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const csvData = [["Type", "D.O.A", "Faculty Name", "Batch Time", "Roll No", "Student Name", "Course Name", "Exam No.", "Exam Date", "Days Left", "Status"].join(",")];

    students.forEach(student => {
      // Primary exams
      const courseData = student.courseCode2 || courseMap[student.courseCode];
      if (student.admissionDate && courseData?.examMonths) {
        const startDate = new Date(student.admissionDate);
        courseData.examMonths.split(",").map(m => parseInt(m.trim())).filter(m => !isNaN(m))
          .forEach((monthNum, index) => {
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
              '"Primary"',
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
      }

      // Additional exams
      (student.additionalCourses || []).forEach((ac, courseIndex) => {
        (ac.feeSchedule || []).filter(f => f.isExamMonth).map(f => f.monthNumber).sort((a, b) => a - b)
          .forEach((monthNum, examIndex) => {
            const startDate = new Date(student.admissionDate);
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
              '"Additional"',
              `"${startDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}"`,
              `"${ac.facultyName || "Not Allotted"}"`,
              `"${ac.batchTime || "N/A"}"`,
              `"${student.studentId || "N/A"}"`,
              `"${student.fullName || "N/A"}"`,
              `"${ac.courseName || "Additional Course"}"`,
              examIndex + 1,
              `"${examDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}"`,
              daysLeft >= 0 ? daysLeft : 0,
              `"${status}"`,
            ].join(","));
          });
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

// ============================================================
// COMPLETION STATS
// ============================================================
exports.getCompletionStats = async (req, res) => {
  try {
    const students = await Student.find({ isActive: true, status: "active" })
      .populate("courseCode2", "duration")
      .lean();

    const courseMap = await getCourseDataMap(students);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalCourses = 0, completedThisMonth = 0, completingNextMonth = 0, completingNext3Months = 0, activeLongTerm = 0;

    students.forEach(student => {
      const courseData = student.courseCode2 || courseMap[student.courseCode];
      if (student.admissionDate && courseData?.duration) {
        totalCourses++;
        const startDate = new Date(student.admissionDate);
        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + parseInt(courseData.duration));
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 0) completedThisMonth++;
        else if (daysLeft <= 30) completingNextMonth++;
        else if (daysLeft <= 90) completingNext3Months++;
        else activeLongTerm++;
      }

      (student.additionalCourses || []).forEach(ac => {
        const lastMonth = (ac.feeSchedule || []).reduce((max, f) => f.monthNumber > max ? f.monthNumber : max, 0);
        const duration = ac.duration || lastMonth;
        if (!duration || !student.admissionDate) return;
        totalCourses++;
        const startDate = new Date(student.admissionDate);
        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + duration);
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 0) completedThisMonth++;
        else if (daysLeft <= 30) completingNextMonth++;
        else if (daysLeft <= 90) completingNext3Months++;
        else activeLongTerm++;
      });
    });

    res.json({
      success: true,
      data: { totalCourses, completedThisMonth, completingNextMonth, completingNext3Months, activeLongTerm, completionRate: totalCourses > 0 ? Math.round((completedThisMonth / totalCourses) * 100) : 0 },
    });

  } catch (error) {
    console.error("❌ Completion stats error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ============================================================
// SHARED FILTER HELPER
// ============================================================
function matchesFilters(item, { course, faculty, batch }) {
  if (course && item.courseName !== course) return false;
  if (faculty && item.facultyName !== faculty) return false;
  if (batch && item.batchTime !== batch) return false;
  return true;
}