const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Course = require("../models/Course");

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
      examNumber = "all", // 'first', 'second', 'all'
      sortBy = "daysLeft",
      sortOrder = "asc",
    } = req.query;

    const TestSubmission = require("../models/TestSubmission");

    // Build filter object
    const filter = { isActive: true, status: "active" };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
        { admissionNo: { $regex: search, $options: "i" } },
      ];
    }

    if (course && course !== "all") {
      filter.course = { $regex: course, $options: "i" };
    }
    if (faculty && faculty !== "all") {
      filter.facultyAllot = { $regex: faculty, $options: "i" };
    }
    if (batch && batch !== "all") {
      filter.batchTime = { $regex: batch, $options: "i" };
    }

    const students = await Student.find(filter)
      .populate("courseCode", "courseFullName duration examMonths numberOfExams")
      .lean();

    console.log(`📋 Found ${students.length} active students`);

    // ── Fetch each student's semester-exam submissions for their course,
    // sorted chronologically, so submission #1 maps to exam #1, etc. ──
    const studentIds = students.map(s => s._id);
    const submissions = await TestSubmission.find({
      studentId: { $in: studentIds }
    })
      .select("studentId courseId marksObtained maxMarks percentage submittedAt")
      .sort({ submittedAt: 1 })
      .lean();

    // studentId -> courseId -> [submissions in order]
    const submissionMap = {};
    submissions.forEach(sub => {
      const sid = sub.studentId.toString();
      const cid = sub.courseId ? sub.courseId.toString() : "unknown";
      if (!submissionMap[sid]) submissionMap[sid] = {};
      if (!submissionMap[sid][cid]) submissionMap[sid][cid] = [];
      submissionMap[sid][cid].push(sub);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reportData = [];

    students.forEach(student => {
      if (!student.admissionDate || !student.courseCode?.examMonths) return;

      const startDate = new Date(student.admissionDate);
      const examMonths = student.courseCode.examMonths
        .split(',')
        .map(m => parseInt(m.trim()))
        .filter(m => !isNaN(m));

      const sid = student._id.toString();
      const cid = student.courseCode._id ? student.courseCode._id.toString() : "unknown";
      const studentSubmissions = submissionMap[sid]?.[cid] || [];

      const dueKeys = new Set(student.manuallyDueExamKeys || []);

      examMonths.forEach((monthNum, index) => {
        const examDate = new Date(startDate);
        examDate.setMonth(startDate.getMonth() + monthNum - 1);
        examDate.setDate(15);

        const diffTime = examDate - today;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Submission for THIS exam number, matched by chronological position
        const matchedSubmission = studentSubmissions[index] || null;
        const isCompleted = !!matchedSubmission;
        const isOverdue = !isCompleted && daysLeft < 0;
        const isManuallyDue = !isCompleted && dueKeys.has(`${cid}_${index + 1}`);

        // Determine status — completion depends on an actual submission;
        // "Due" can also be set manually by an admin regardless of the date
        let status = "";
        if (isCompleted) {
          status = "Completed";
        } else if (isOverdue || isManuallyDue) {
          status = "Due";
        } else if (daysLeft <= 15) {
          status = "Critical";
        } else if (daysLeft <= 30) {
          status = "Very Soon";
        } else if (daysLeft <= 60) {
          status = "Soon";
        } else if (daysLeft <= 90) {
          status = "Approaching";
        } else {
          status = "Far";
        }
        if (examNumber === "all" ||
            (examNumber === "first" && index === 0) ||
            (examNumber === "second" && index === 1) ||
            (examNumber === "third" && index === 2)) {

          reportData.push({
            id: `${student._id}_exam_${index + 1}`,
            studentId: student._id,
            courseId: cid,
            rollNo: student.studentId || "N/A",
            studentName: student.fullName || "N/A",
            courseName: student.course || "N/A",
            facultyName: student.facultyAllot || "Not Allotted",
            batchTime: student.batchTime || "N/A",
            examNumber: index + 1,
            examMonth: monthNum,
            examDate: examDate.toISOString(),
            dateOfExam: examDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            daysLeft: isManuallyDue ? 0 : (daysLeft >= 0 ? daysLeft : 0),
            status,
            isCompleted,
            isOverdue,
            isManuallyDue,
            marksObtained: matchedSubmission?.marksObtained ?? null,
            maxMarks: matchedSubmission?.maxMarks ?? null,
            percentage: matchedSubmission?.percentage ?? null,
            submittedAt: matchedSubmission?.submittedAt ?? null,
            admissionDate: student.admissionDate,
            dateOfJoining: student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A",
          });
        }
      });
    });

    // Only show what actually needs attention: Due, ≤10 days left, or Completed
    // Filter out completed exams if a specific exam number was requested
let filteredData = reportData;
if (examNumber !== "all") {
  filteredData = reportData.filter(item => !item.isCompleted);
}

    // Sort data
    const sortedData = filteredData.sort((a, b) => {
      if (sortBy === "daysLeft") {
        return sortOrder === "asc" ? a.daysLeft - b.daysLeft : b.daysLeft - a.daysLeft;
      } else if (sortBy === "studentName") {
        return sortOrder === "asc"
          ? a.studentName.localeCompare(b.studentName)
          : b.studentName.localeCompare(a.studentName);
      } else if (sortBy === "examDate") {
        return sortOrder === "asc"
          ? new Date(a.examDate) - new Date(b.examDate)
          : new Date(b.examDate) - new Date(a.examDate);
      } else if (sortBy === "examNumber") {
        return sortOrder === "asc" ? a.examNumber - b.examNumber : b.examNumber - a.examNumber;
      }
      return 0;
    });

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;
    const paginatedData = sortedData.slice(startIndex, endIndex);

    const uniqueCourses = [...new Set(students.map(s => s.course).filter(Boolean))];
    const uniqueFaculties = [...new Set(students.map(s => s.facultyAllot).filter(Boolean))];
    const uniqueBatches = [...new Set(students.map(s => s.batchTime).filter(Boolean))];

    const stats = {
      totalExams: filteredData.length,
      critical: filteredData.filter(item => item.status === "Critical").length,
      verySoon: filteredData.filter(item => item.status === "Very Soon").length,
      soon: filteredData.filter(item => item.status === "Soon").length,
      approaching: filteredData.filter(item => item.status === "Approaching").length,
      far: filteredData.filter(item => item.status === "Far").length,
      due: filteredData.filter(item => item.status === "Due").length,
      completed: filteredData.filter(item => item.status === "Completed").length,
      averageDaysLeft: filteredData.filter(item => !item.isCompleted && !item.isOverdue).length > 0
        ? Math.round(filteredData.filter(item => !item.isCompleted && !item.isOverdue).reduce((sum, item) => sum + item.daysLeft, 0) / filteredData.filter(item => !item.isCompleted && !item.isOverdue).length)
        : 0,
    };

    res.json({
      success: true,
      count: paginatedData.length,
      total: filteredData.length,
      totalPages: Math.ceil(filteredData.length / limitNum),
      currentPage: pageNum,
      stats,
      filters: {
        courses: uniqueCourses,
        faculties: uniqueFaculties,
        batches: uniqueBatches,
      },
      data: paginatedData,
    });

  } catch (error) {
    console.error("❌ Upcoming exam report error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Manually mark/unmark a student's exam slot as "Due"
// @route   PUT /api/reports/exams/upcoming/mark-due
// @access  Private (Admin)
exports.toggleExamDueStatus = async (req, res) => {
  try {
    const { studentId, courseId, examNumber, markDue } = req.body;

    if (!studentId || !courseId || !examNumber) {
      return res.status(400).json({
        success: false,
        message: "studentId, courseId, and examNumber are required"
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const key = `${courseId}_${examNumber}`;
    const current = student.manuallyDueExamKeys || [];
    const alreadyMarked = current.includes(key);

    if (markDue && !alreadyMarked) {
      student.manuallyDueExamKeys = [...current, key];
    } else if (!markDue && alreadyMarked) {
      student.manuallyDueExamKeys = current.filter(k => k !== key);
    }

    await student.save();

    res.json({
      success: true,
      message: markDue ? "Marked as Due" : "Due status removed",
      data: { studentId, courseId, examNumber, dueStatus: markDue }
    });
  } catch (error) {
    console.error("❌ Toggle exam due status error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Export upcoming exam report
// @route   GET /api/reports/exams/upcoming/export
// @access  Private (Admin)
exports.exportUpcomingExamReport = async (req, res) => {
  try {
    const students = await Student.find({ isActive: true, status: "active" })
      .populate("courseCode", "courseFullName examMonths")
      .lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const csvData = [];
    
    // Add headers
    csvData.push([
      'D.O.A',
      'Faculty Name',
      'Batch Time',
      'Roll No',
      'Student Name',
      'Course Name',
      'Exam No.',
      'Exam Date',
      'Days Left',
      'Status'
    ].join(','));

    // Add data rows
    students.forEach(student => {
      if (!student.admissionDate || !student.courseCode?.examMonths) return;

      const startDate = new Date(student.admissionDate);
      const examMonths = student.courseCode.examMonths
        .split(',')
        .map(m => parseInt(m.trim()))
        .filter(m => !isNaN(m));

      examMonths.forEach((monthNum, index) => {
        const examDate = new Date(startDate);
        examDate.setMonth(startDate.getMonth() + monthNum - 1);
        examDate.setDate(15);
        
        const diffTime = examDate - today;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let status = "Upcoming";
        if (daysLeft < 0) status = "Completed";
        else if (daysLeft <= 15) status = "Critical";
        else if (daysLeft <= 30) status = "Very Soon";
        else if (daysLeft <= 60) status = "Soon";
        else if (daysLeft <= 90) status = "Approaching";

        const row = [
          `"${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}"`,
          `"${student.facultyAllot || 'Not Allotted'}"`,
          `"${student.batchTime || 'N/A'}"`,
          `"${student.studentId || 'N/A'}"`,
          `"${student.fullName || 'N/A'}"`,
          `"${student.course || 'N/A'}"`,
          index + 1,
          `"${examDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}"`,
          daysLeft >= 0 ? daysLeft : 0,
          `"${status}"`
        ].join(',');
        
        csvData.push(row);
      });
    });

    const csvString = csvData.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=upcoming-exams-report.csv');
    res.send(csvString);

  } catch (error) {
    console.error("❌ Export error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get exam statistics
// @route   GET /api/reports/exams/stats
// @access  Private (Admin)
exports.getExamStats = async (req, res) => {
  try {
    const students = await Student.find({ isActive: true, status: "active" })
      .populate("courseCode", "examMonths numberOfExams")
      .lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalExams = 0;
    let completedExams = 0;
    let upcomingExams = 0;
    let criticalExams = 0;
    let verySoonExams = 0;
    let soonExams = 0;
    let approachingExams = 0;

    students.forEach(student => {
      if (!student.admissionDate || !student.courseCode?.examMonths) return;

      const startDate = new Date(student.admissionDate);
      const examMonths = student.courseCode.examMonths
        .split(',')
        .map(m => parseInt(m.trim()))
        .filter(m => !isNaN(m));

      examMonths.forEach(monthNum => {
        totalExams++;
        
        const examDate = new Date(startDate);
        examDate.setMonth(startDate.getMonth() + monthNum - 1);
        examDate.setDate(15);
        
        const diffTime = examDate - today;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysLeft < 0) {
          completedExams++;
        } else {
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
        totalExams,
        completedExams,
        upcomingExams,
        criticalExams,
        verySoonExams,
        soonExams,
        approachingExams,
        completionRate: totalExams > 0 ? Math.round((completedExams / totalExams) * 100) : 0,
      }
    });

  } catch (error) {
    console.error("❌ Exam stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};