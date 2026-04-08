const Test = require('../models/Test');
const Question = require('../models/Question');
const Course = require('../models/Course');
const TestSession = require('../models/TestSession');
const Student = require('../models/Student');
const TestSubmission = require('../models/TestSubmission');

// @desc    Create a new test
// @route   POST /api/exam/tests
// @access  Private (Admin/Faculty)
exports.createTest = async (req, res) => {
  try {
    const {
      testName,
      description,
      courseId,
      selectedSemesters,
      selectedTopics,
      totalQuestionsInPool,
      questionsPerStudent,
      duration,
      maxMarks,
      scheduledDate,
      startTime,
      endTime,
      shuffleQuestions,
      shuffleOptions,
      allowMultipleAttempts,
      batchId
    } = req.body;

    // ✅ FIX: Handle empty batchId
    const cleanBatchId = batchId && batchId.trim() !== "" ? batchId : null;

    // Validate required fields
    const requiredFields = [
      'testName', 'courseId', 'selectedSemesters', 'selectedTopics',
      'totalQuestionsInPool', 'questionsPerStudent', 'duration', 'scheduledDate'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Create test (without question pool initially)
    const test = await Test.create({
      testName,
      description,
      courseId,
      courseName: course.courseFullName,
      selectedSemesters,
      selectedTopics,
      totalQuestionsInPool,
      questionsPerStudent,
      duration,
      maxMarks: maxMarks || 100,
      scheduledDate,
      startTime: startTime || "00:00",
      endTime: endTime || "23:59",
      shuffleQuestions: shuffleQuestions !== false,
      shuffleOptions: shuffleOptions !== false,
      allowMultipleAttempts: allowMultipleAttempts || false,
      batchId: cleanBatchId, // ✅ Use the cleaned batchId
      createdBy: req.user.id,
      createdByName: req.user.name,
      status: 'draft'
    });

    res.status(201).json({
      success: true,
      message: "Test created successfully. Use generateQuestionPool to add questions.",
      data: test
    });

  } catch (error) {
    console.error("Create test error:", error);
    
    // Better error handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
// @desc    Generate question pool for a test
// @route   POST /api/exam/tests/:id/generate-pool
// @access  Private (Admin/Faculty)
exports.generateQuestionPool = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    
    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found"
      });
    }

    // Find questions matching selected criteria
    const query = {
      courseId: test.courseId,
      semester: { $in: test.selectedSemesters },
      topic: { $in: test.selectedTopics },
      isActive: true
    };

    // Get all matching questions
    const matchingQuestions = await Question.find(query).select('_id');
    
    if (matchingQuestions.length < test.totalQuestionsInPool) {
      return res.status(400).json({
        success: false,
        message: `Only ${matchingQuestions.length} questions found for selected criteria. Need ${test.totalQuestionsInPool}.`,
        available: matchingQuestions.length,
        required: test.totalQuestionsInPool
      });
    }

    // Randomly select questions for the pool
    const shuffled = [...matchingQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectedQuestions = shuffled.slice(0, test.totalQuestionsInPool);
    const questionIds = selectedQuestions.map(q => q._id);

    // Update test with question pool
    test.questionPool = questionIds;
    test.questionPoolCount = questionIds.length;
    test.status = 'scheduled'; // Ready for scheduling
    await test.save();

    // Update usage count for questions
    await Question.updateMany(
      { _id: { $in: questionIds } },
      { $inc: { timesUsed: 1 } }
    );

    res.json({
      success: true,
      message: `Question pool generated with ${questionIds.length} questions`,
      data: {
        testId: test._id,
        poolSize: questionIds.length,
        questionsPerStudent: test.questionsPerStudent
      }
    });

  } catch (error) {
    console.error("Generate question pool error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Get all tests
// @route   GET /api/exam/tests
// @access  Private (Admin/Faculty)
exports.getTests = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = "", 
      status, 
      courseId 
    } = req.query;

    // Build filter
    const filter = {};

    if (search) {
      filter.testName = { $regex: search, $options: 'i' };
    }

    if (status) filter.status = status;
    if (courseId) filter.courseId = courseId;

    // Execute query
    const tests = await Test.find(filter)
      .populate('courseId', 'courseFullName courseCode')
      .populate('batchId', 'batchName')
      .sort({ scheduledDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Test.countDocuments(filter);

    res.json({
      success: true,
      count: tests.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: tests
    });

  } catch (error) {
    console.error("Get tests error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Get test by ID
// @route   GET /api/exam/tests/:id
// @access  Private (Admin/Faculty)
exports.getTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
  .populate('courseId', 'courseFullName courseCode')
  .populate('batchId', 'batchName')
  .populate('questionPool', 'questionText questionType options correctAnswer marks difficulty');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found"
      });
    }

    // Get available questions count for the selected criteria
    const availableQuestions = await Question.countDocuments({
      courseId: test.courseId,
      semester: { $in: test.selectedSemesters },
      topic: { $in: test.selectedTopics },
      isActive: true
    });

    res.json({
      success: true,
      data: {
        ...test.toObject(),
        availableQuestions,
        canGeneratePool: availableQuestions >= test.totalQuestionsInPool
      }
    });

  } catch (error) {
    console.error("Get test error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Update test
// @route   PUT /api/exam/tests/:id
// @access  Private (Admin/Faculty)
exports.updateTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found"
      });
    }

    res.json({
      success: true,
      message: "Test updated successfully",
      data: test
    });

  } catch (error) {
    console.error("Update test error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Delete test
// @route   DELETE /api/exam/tests/:id
// @access  Private (Admin/Faculty)
exports.deleteTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found"
      });
    }

    // Check if test has any sessions
    const sessionsCount = await TestSession.countDocuments({ testId: test._id });
    if (sessionsCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete test that has been taken by students"
      });
    }

    await test.deleteOne();

    res.json({
      success: true,
      message: "Test deleted successfully"
    });

  } catch (error) {
    console.error("Delete test error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Start a test for student
// @route   POST /api/exam/tests/:id/start
// @access  Private (Student)
exports.startTest = async (req, res) => {
  try {
    const Student = require('../models/Student');

    // ✅ Get student from DB first
    const student = await Student.findOne({ studentId: req.user.studentId });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    if (test.status !== 'active') {
      return res.status(400).json({ success: false, message: "Test is not active" });
    }

    // ✅ Use student._id (ObjectId) not studentId string
    if (!test.allowMultipleAttempts) {
      const existingSession = await TestSession.findOne({
        testId: test._id,
        studentId: student._id
      });
      if (existingSession && existingSession.status !== 'not_started') {
        return res.status(400).json({
          success: false,
          message: "You have already attempted this test"
        });
      }
    }

    const questionPool = await Question.find({ _id: { $in: test.questionPool } });

    const shuffledQuestions = [...questionPool];
    const seed = req.user.studentId + test._id.toString();

    for (let i = shuffledQuestions.length - 1; i > 0; i--) {
      const j = Math.floor((seed % (i + 1)) + i) % shuffledQuestions.length;
      [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
    }

    const studentQuestions = shuffledQuestions.slice(0, test.questionsPerStudent);

    if (test.shuffleOptions) {
      studentQuestions.forEach(question => {
        if (question.options && question.options.length > 0) {
          const options = [...question.options];
          for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor((seed % (i + 1)) + i) % options.length;
            [options[i], options[j]] = [options[j], options[i]];
          }
          question.options = options;
        }
      });
    }

    // ✅ Use student._id and student fields
    const session = await TestSession.create({
      studentId: student._id,
      studentName: student.fullName,
      studentRollNo: student.studentId,
      testId: test._id,
      testName: test.testName,
      assignedQuestions: studentQuestions.map((q, index) => ({
        questionId: q._id,
        questionOrder: index + 1
      })),
      status: 'in_progress',
      startTime: new Date(),
      timeRemaining: test.duration * 60,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    test.totalAttempts += 1;
    await test.save();

    res.json({
      success: true,
      message: "Test started successfully",
      data: {
        sessionId: session._id,
        testName: test.testName,
        duration: test.duration,
        questions: studentQuestions.map(q => ({
          _id: q._id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.questionType === 'mcq' ? q.options : undefined,
          marks: q.marks
        })),
        timeRemaining: session.timeRemaining,
        shuffleQuestions: test.shuffleQuestions
      }
    });

  } catch (error) {
    console.error("Start test error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Submit a test and save result
// @route   POST /api/tests/:id/submit
// @access  Private (Student)
exports.submitTest = async (req, res) => {
  try {
    const { answers, startedAt, timeTaken } = req.body;
    // answers = [{ questionId, selectedOption }]
 
    const test = await Test.findById(req.params.id).populate("courseId");
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }
 
    // Get student record
    const student = await Student.findOne({ studentId: req.user.studentId });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
 
    // Check if already submitted (if multiple attempts not allowed)
    if (!test.allowMultipleAttempts) {
      const existing = await TestSubmission.findOne({
        testId: test._id,
        studentId: student._id,
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "You have already submitted this test",
        });
      }
    }
 
    // Get attempt number
    const attemptCount = await TestSubmission.countDocuments({
      testId: test._id,
      studentId: student._id,
    });
 
    // ── Evaluate answers ──────────────────────────────
    const questionIds = answers.map((a) => a.questionId);
    const questions   = await Question.find({ _id: { $in: questionIds } });
    const questionMap = {};
    questions.forEach((q) => { questionMap[q._id.toString()] = q; });
 
    let marksObtained   = 0;
    let correctAnswers  = 0;
    let wrongAnswers    = 0;
    let skippedQuestions = 0;
 
    const evaluatedAnswers = answers.map((answer) => {
      const question = questionMap[answer.questionId?.toString()];
      if (!question) return null;
 
      let isCorrect     = false;
      let marksAwarded  = 0;
      let correctAnswer = "";
 
      if (question.questionType === "mcq") {
        // Find correct option
        const correctOption = question.options.find((o) => o.isCorrect);
        correctAnswer = correctOption?.text || "";
 
        if (!answer.selectedOption) {
          skippedQuestions++;
        } else if (answer.selectedOption === correctAnswer) {
          isCorrect    = true;
          marksAwarded = question.marks;
          correctAnswers++;
        } else {
          wrongAnswers++;
        }
      } else if (question.questionType === "truefalse") {
        correctAnswer = question.correctAnswer;
        if (!answer.selectedOption) {
          skippedQuestions++;
        } else if (
          answer.selectedOption?.toLowerCase() === correctAnswer?.toLowerCase()
        ) {
          isCorrect    = true;
          marksAwarded = question.marks;
          correctAnswers++;
        } else {
          wrongAnswers++;
        }
      } else {
        // Short answer — manual grading, mark as pending
        correctAnswer = question.correctAnswer;
        skippedQuestions++;
      }
 
      marksObtained += marksAwarded;
 
      return {
        questionId:     question._id,
        questionText:   question.questionText,
        selectedOption: answer.selectedOption || "",
        correctAnswer,
        isCorrect,
        marksAwarded,
        maxMarks:       question.marks,
        timeTaken:      answer.timeTaken || 0,
      };
    }).filter(Boolean);
 
    const totalQuestions     = evaluatedAnswers.length;
    const attemptedQuestions = totalQuestions - skippedQuestions;
    const percentage         = test.maxMarks > 0
      ? Math.round((marksObtained / test.maxMarks) * 100)
      : 0;
 
    // ── Determine exam type from test name ────────────
    const testNameLower = (test.testName || "").toLowerCase();
    const examType =
      testNameLower.includes("semester") || testNameLower.includes("final")
        ? "semester"
        : "monthly";
 
    // ── Create submission ─────────────────────────────
    const submission = await TestSubmission.create({
      testId:      test._id,
      studentId:   student._id,
      testName:    test.testName,
      courseName:  test.courseId?.courseFullName || test.courseName,
      courseId:    test.courseId?._id,
      studentName: student.fullName,
      admissionNo: student.admissionNo,
      examType,
      answers:     evaluatedAnswers,
      totalQuestions,
      attemptedQuestions,
      correctAnswers,
      wrongAnswers,
      skippedQuestions,
      marksObtained,
      maxMarks:    test.maxMarks,
      percentage,
      passMarks:   40,
      startedAt:   startedAt ? new Date(startedAt) : new Date(),
      submittedAt: new Date(),
      timeTaken:   timeTaken || 0,
      status:      "completed",
      attemptNumber: attemptCount + 1,
    });
 
    // ── Update test stats ─────────────────────────────
    await Test.findByIdAndUpdate(test._id, {
      $inc: { totalAttempts: 1 },
    });
 
    res.status(201).json({
      success: true,
      message: "Test submitted successfully",
      data: {
        submissionId:    submission._id,
        marksObtained,
        maxMarks:        test.maxMarks,
        percentage,
        grade:           submission.grade,
        isPassed:        submission.isPassed,
        correctAnswers,
        wrongAnswers,
        totalQuestions,
        attemptedQuestions,
      },
    });
  } catch (error) {
    console.error("Submit test error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/// @desc    Get test results for admin (all students for a test)
// @route   GET /api/tests/:id/results
// @access  Private (Admin/Faculty)
exports.getTestResults = async (req, res) => {
  try {
    const submissions = await TestSubmission.find({ testId: req.params.id })
      .populate("studentId", "fullName admissionNo studentId")
      .sort({ marksObtained: -1 });
 
    const test = await Test.findById(req.params.id).select(
      "testName maxMarks totalAttempts"
    );
 
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }
 
    // Summary stats
    const totalAttempts = submissions.length;
    const passed        = submissions.filter((s) => s.isPassed).length;
    const avgScore      = totalAttempts
      ? Math.round(
          submissions.reduce((sum, s) => sum + s.percentage, 0) / totalAttempts
        )
      : 0;
    const highest = totalAttempts
      ? Math.max(...submissions.map((s) => s.marksObtained))
      : 0;
 
    res.json({
      success: true,
      data: {
        test,
        summary: { totalAttempts, passed, failed: totalAttempts - passed, avgScore, highest },
        submissions,
      },
    });
  } catch (error) {
    console.error("Get test results error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Get all results for a specific student (for marksheet)
// @route   GET /api/tests/student/:studentId/results
// @access  Private (Admin)
exports.getStudentResults = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const { studentId } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(studentId);
    const query = isObjectId ? { _id: studentId } : { studentId };
    const selectFields = "fullName admissionNo studentId course fatherName admissionDate city";

    // ✅ Search Student first, then fallback to other collections
    let student = await Student.findOne(query).select(selectFields);

    // ✅ Fallback — try Admission/Completed model if not in Student collection
    if (!student) {
      try {
        const Admission = require('../models/Admission'); // adjust model name
        student = await Admission.findOne(query).select(selectFields);
        console.log("📌 Found in Admission collection:", student?.fullName);
      } catch (e) {
        console.log("📌 No Admission model or not found there either");
      }
    }

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found in any collection" 
      });
    }

    // ✅ Even if found, submissions may be empty (student never took exam)
    const submissions = await TestSubmission.find({ studentId: student._id })
      .sort({ submittedAt: 1 })
      .select("-answers");

    const monthlyExams  = submissions.filter((s) => s.examType === "monthly");
    const semesterExams = submissions.filter((s) => s.examType === "semester");

    const totalMarksObtained = submissions.reduce((s, r) => s + r.marksObtained, 0);
    const totalMaxMarks      = submissions.reduce((s, r) => s + r.maxMarks, 0);
    const overallPercentage  = totalMaxMarks
      ? Math.round((totalMarksObtained / totalMaxMarks) * 100)
      : 0;

    let overallGrade = "F";
    if      (overallPercentage >= 90) overallGrade = "A+";
    else if (overallPercentage >= 80) overallGrade = "A";
    else if (overallPercentage >= 70) overallGrade = "B+";
    else if (overallPercentage >= 60) overallGrade = "B";
    else if (overallPercentage >= 50) overallGrade = "C";
    else if (overallPercentage >= 40) overallGrade = "D";

    res.json({
      success: true,
      data: {
        student,
        monthlyExams,
        semesterExams,
        summary: {
          totalExams:          submissions.length,
          totalMonthly:        monthlyExams.length,
          totalSemester:       semesterExams.length,
          passed:              submissions.filter((s) => s.isPassed).length,
          totalMarksObtained,
          totalMaxMarks,
          overallPercentage,
          overallGrade,
        },
      },
    });
  } catch (error) {
    console.error("Get student results error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
 

// @desc    Get available questions for test creation
// @route   GET /api/exam/questions/available
// @access  Private (Admin/Faculty)
exports.getAvailableQuestions = async (req, res) => {
  try {
    const { courseId, semesters, topics } = req.query;

    if (!courseId || !semesters || !topics) {
      return res.status(400).json({
        success: false,
        message: "Course ID, semesters, and topics are required"
      });
    }

    const semesterArray = semesters.split(',');
    const topicArray = topics.split(',');

    const count = await Question.countDocuments({
      courseId,
      semester: { $in: semesterArray },
      topic: { $in: topicArray },
      isActive: true
    });

    res.json({
      success: true,
      data: {
        availableQuestions: count,
        courseId,
        semesters: semesterArray,
        topics: topicArray
      }
    });

  } catch (error) {
    console.error("Get available questions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

exports.getStudentTests = async (req, res) => {
  try {
    const Student = require('../models/Student');
    const { Batch } = require('../models/Setup');
    console.log('👤 req.user:', JSON.stringify(req.user));


    // ✅ FIX — find student by studentId field, not _id
    const student = await Student.findOne({ studentId: req.user.studentId })
      .select('batchTime enrolledBatches studentId _id');

      console.log('📚 Student found:', JSON.stringify(student));
 
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Find student's batch
    const studentBatch = await Batch.findOne({
      displayName: student.batchTime
    });

    console.log('🏫 Batch found:', JSON.stringify(studentBatch));

    console.log(`📚 Student batch: ${student.batchTime} → found: ${studentBatch?._id}`);

    // Build query
    const query = {
      status: { $in: ['active', 'scheduled', 'completed'] },
      $or: [
        { batchId: null },
        { batchId: { $exists: false } },
      ]
    };

    if (studentBatch) {
      query.$or.push({ batchId: studentBatch._id });
    }

    console.log('🔍 Query:', JSON.stringify(query));

    const tests = await Test.find(query)
      .populate('courseId', 'courseFullName')
      .select('-questionPool')
      .sort({ scheduledDate: -1 });

    console.log(`✅ Found ${tests.length} tests`);

    console.log(`📝 Tests found: ${tests.length}`);
tests.forEach(t => console.log(`  - ${t.testName} | status: ${t.status} | batchId: ${t.batchId}`));


    // Check attempted sessions
    const attemptedSessions = await TestSession.find({
      studentId: student._id
    }).select('testId status marksObtained totalMarks percentage');

    const attemptedMap = {};
    attemptedSessions.forEach(session => {
      attemptedMap[session.testId.toString()] = session;
    });

    const formattedTests = tests.map(test => ({
      _id: test._id,
      testName: test.testName,
      description: test.description,
      courseName: test.courseId?.courseFullName || test.courseName,
      duration: test.duration,
      maxMarks: test.maxMarks,
      questionsPerStudent: test.questionsPerStudent,
      scheduledDate: test.scheduledDate,
      startTime: test.startTime,
      endTime: test.endTime,
      status: test.status,
      allowMultipleAttempts: test.allowMultipleAttempts,
      attempted: !!attemptedMap[test._id.toString()],
      attemptDetails: attemptedMap[test._id.toString()] || null
    }));

    res.json({
      success: true,
      count: formattedTests.length,
      data: formattedTests
    });

  } catch (error) {
    console.error("Get student tests error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message

      
    });
  }
};