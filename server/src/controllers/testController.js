const Test = require('../models/Test');
const Question = require('../models/Question');
const Course = require('../models/Course');
const TestSession = require('../models/TestSession');
const Student = require('../models/Student');
const TestSubmission = require('../models/TestSubmission');

/// @desc    Create a new test (AUTO-GENERATES question pool immediately)
// @route   POST /api/exam/tests
// @access  Private (Admin/Faculty)
exports.createTest = async (req, res) => {
  try {
    const {
      examMode,          // 'semester' | 'regular'
      testName,
      description,
      courseId,          // semester mode
      selectedSemesters, // semester mode
      selectedTopics,    // both modes
      facultyId,         // regular mode
      batchId, 
      selectedCourseIds,          // both modes (required for regular, optional for semester)
      topicSelections,   // regular mode — [{ topic, subtopics: null | [names] }] for subtopic-level filtering
      totalQuestionsInPool,
      questionsPerStudent,
      duration,
      maxMarks,
      scheduledDate,
      startTime,
      endTime,
      shuffleQuestions,
      shuffleOptions,
      allowMultipleAttempts
    } = req.body;

    const mode = examMode === 'regular' ? 'regular' : 'semester';
    // batchId(s) can arrive as a single string (legacy) or an array (new multi-batch UI)
    const rawBatchIds = req.body.batchIds || (batchId ? [batchId] : []);
    const cleanBatchIds = Array.isArray(rawBatchIds)
      ? rawBatchIds.filter(b => b && b.trim() !== "")
      : [];

    // Base required fields for both modes
    const baseRequired = ['testName', 'selectedTopics', 'totalQuestionsInPool', 'questionsPerStudent', 'duration', 'scheduledDate'];
    const missingBase = baseRequired.filter(f => !req.body[f] || (Array.isArray(req.body[f]) && req.body[f].length === 0));
    if (missingBase.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingBase.join(', ')}`
      });
    }

    let matchingQuestions, courseIdForTest = null, courseNameForTest = "", relevantCourseIds = [], facultyIdForTest = null, teacherBatchIdForTest = null;

    if (mode === 'semester') {
      if (!courseId || !selectedSemesters || selectedSemesters.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Course and semesters are required for Semester exams"
        });
      }

      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: "Course not found" });
      }

      matchingQuestions = await Question.find({
        courseId,
        semester: { $in: selectedSemesters },
        topic: { $in: selectedTopics },
        isActive: true
      }).select('_id');

      courseIdForTest = courseId;
      courseNameForTest = course.courseFullName;
      relevantCourseIds = [courseId];

    } else {
      // REGULAR mode
      if (!facultyId || cleanBatchIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Faculty and at least one batch are required for Regular exams"
        });
      }
      if (!selectedCourseIds || selectedCourseIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please select at least one course for Regular exam"
        });
      }

      let context;
      try {
        context = await resolveRegularExamContextMulti(facultyId, cleanBatchIds, selectedCourseIds);
      } catch (e) {
        return res.status(e.status || 400).json({ success: false, message: e.message });
      }

      const orConditions = (topicSelections && topicSelections.length > 0)
        ? topicSelections.map(sel =>
            (!sel.subtopics || sel.subtopics.length === 0)
              ? { topic: sel.topic }
              : { topic: sel.topic, subtopic: { $in: sel.subtopics } }
          )
        : selectedTopics.map(t => ({ topic: t }));

      matchingQuestions = await Question.find({
        courseId: { $in: context.courseIds },
        $or: orConditions,
        isActive: true
      }).select('_id');

      courseNameForTest = context.courses.map(c => c.name).join(' + ');
      relevantCourseIds = context.courseIds;
      facultyIdForTest = facultyId;
      teacherBatchIdForTest = context.teacherBatches[0]?._id || null; // legacy single field
    }

    if (matchingQuestions.length < totalQuestionsInPool) {
      return res.status(400).json({
        success: false,
        message: `Only ${matchingQuestions.length} questions found for selected topics. Need ${totalQuestionsInPool}. Add more questions or lower the pool size.`,
        available: matchingQuestions.length,
        required: totalQuestionsInPool
      });
    }

    const shuffled = [...matchingQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const questionIds = shuffled.slice(0, totalQuestionsInPool).map(q => q._id);

    const test = await Test.create({
      examMode: mode,
      testName,
      description,
      courseId: courseIdForTest,
      courseName: courseNameForTest,
      facultyId: facultyIdForTest,
      teacherBatchId: teacherBatchIdForTest, // legacy — first batch only
      teacherBatchIds: mode === 'regular'
        ? (await (async () => {
            const TeacherBatch = require('../models/TeacherBatch');
            const tbs = await TeacherBatch.find({ batch: { $in: cleanBatchIds } }).select('_id').lean();
            return tbs.map(tb => tb._id);
          })())
        : [],
      relevantCourseIds,
      selectedSemesters: mode === 'semester' ? selectedSemesters : [],
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
      batchId: cleanBatchIds[0] || null, // legacy — first batch only
      batchIds: cleanBatchIds,
      createdBy: req.user.id,
      createdByName: req.user.name,
      questionPool: questionIds,
      questionPoolCount: questionIds.length,
      status: 'active'
    });

    await Question.updateMany(
      { _id: { $in: questionIds } },
      { $inc: { timesUsed: 1 } }
    );

    res.status(201).json({
      success: true,
      message: `Test created successfully with ${questionIds.length} questions in the pool.`,
      data: test
    });

  } catch (error) {
    console.error("Create test error:", error);

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
    // Build filter
    const filter = { isArchived: { $ne: true } };

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
  .populate('batchId', 'batchName displayName')
  .populate('facultyId', 'facultyName facultyNo')
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

    // Soft delete: hide from the admin Manage Tests grid only.
    // The Test document itself is preserved so results, eligibility reports,
    // and student-side history (marksheet/results) keep working normally.
    test.isArchived = true;
    test.archivedAt = new Date();
    await test.save();

    res.json({
      success: true,
      message: "Test removed from Manage Tests"
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

function stringToNumericSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

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

    // Strict check: regular-mode tests require explicit TeacherBatch assignment
    // Strict check: regular-mode tests require explicit TeacherBatch assignment + course match
    const testTeacherBatchIds = (test.teacherBatchIds && test.teacherBatchIds.length > 0
      ? test.teacherBatchIds
      : [test.teacherBatchId]
    ).filter(Boolean);

    if (test.examMode === 'regular' && testTeacherBatchIds.length > 0) {
      const TeacherBatch = require('../models/TeacherBatch');
      const tbs = await TeacherBatch.find({ _id: { $in: testTeacherBatchIds } }).select('assignedStudents batch').lean();

      const matchedTb = tbs.find(tb => (tb.assignedStudents || []).some(as =>
        as && as.student && as.student.toString() === student._id.toString() &&
        (as.isActive !== undefined ? as.isActive : true)
      ));

      if (!matchedTb) {
        return res.status(403).json({ success: false, message: "You are not assigned to this exam" });
      }

      if (test.relevantCourseIds && test.relevantCourseIds.length > 0) {
        const studentCourseId = exports.resolveStudentCourseIdForBatch(student, matchedTb.batch);
        const matches = studentCourseId && test.relevantCourseIds.some(cid => cid.toString() === studentCourseId);
        if (!matches) {
          return res.status(403).json({ success: false, message: "This exam is not for your course" });
        }
      }
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
    const seed = stringToNumericSeed(req.user.studentId + test._id.toString());

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
    const { courseId, courseIds, semesters, topics, topicSelections } = req.query;

    const query = { isActive: true };

    if (courseIds) {
      query.courseId = { $in: courseIds.split(',').filter(Boolean) };
    } else if (courseId) {
      query.courseId = courseId;
      if (semesters) {
        query.semester = { $in: semesters.split(',').filter(Boolean) };
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "courseId or courseIds is required"
      });
    }

    if (topicSelections) {
      // Regular mode with subtopic-level granularity:
      // topicSelections = JSON string: [{ topic, subtopics: null | [names] }]
      // subtopics: null  → match the whole topic (any/no subtopic tag)
      // subtopics: [...] → match only questions tagged with one of these subtopics
      let parsed;
      try {
        parsed = JSON.parse(topicSelections);
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid topicSelections format' });
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        return res.json({ success: true, data: { availableQuestions: 0 } });
      }

      query.$or = parsed.map(sel => {
        if (!sel.subtopics || sel.subtopics.length === 0) {
          return { topic: sel.topic };
        }
        return { topic: sel.topic, subtopic: { $in: sel.subtopics } };
      });
    } else if (topics) {
      // Semester mode: flat topic name list
      query.topic = { $in: topics.split(',').filter(Boolean) };
    } else {
      return res.status(400).json({
        success: false,
        message: "topics or topicSelections is required"
      });
    }

    const count = await Question.countDocuments(query);

    res.json({
      success: true,
      data: { availableQuestions: count }
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
    const User = require('../models/user');

    const userRecord = await User.findById(req.user.id).select('studentId');
    if (!userRecord?.studentId) {
      return res.status(404).json({
        success: false,
        message: "Student ID not found on user account"
      });
    }

    const student = await Student.findOne({ studentId: userRecord.studentId })
      .select('batchTime enrolledBatches studentId _id fullName courseCode additionalCourses');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Fetch all potentially-visible tests; fine-grained eligibility applied per mode below
    const tests = await Test.find({
      status: { $in: ['active', 'scheduled', 'completed'] },
      examMode: { $in: ['regular', 'semester'] }
    })
      .populate('courseId', 'courseFullName')
      .select('-questionPool')
      .sort({ scheduledDate: -1 });

    // ── Regular-mode gate: TeacherBatch assignment + course match ──
    const TeacherBatch = require('../models/TeacherBatch');
    const regularTests = tests.filter(t => t.examMode === 'regular');
    const allowedRegularTestIds = new Set();

    if (regularTests.length > 0) {
      const allTeacherBatchIds = new Set();
      regularTests.forEach(t => {
        (t.teacherBatchIds && t.teacherBatchIds.length > 0 ? t.teacherBatchIds : [t.teacherBatchId])
          .filter(Boolean)
          .forEach(id => allTeacherBatchIds.add(id.toString()));
      });
      const relevantTeacherBatches = await TeacherBatch.find({ _id: { $in: [...allTeacherBatchIds] } })
        .select('assignedStudents batch')
        .lean();

      const tbMap = {};
      relevantTeacherBatches.forEach(tb => { tbMap[tb._id.toString()] = tb; });

      regularTests.forEach(t => {
        const testTeacherBatchIds = (t.teacherBatchIds && t.teacherBatchIds.length > 0
          ? t.teacherBatchIds
          : [t.teacherBatchId]
        ).filter(Boolean).map(id => id.toString());

        const matchedTb = testTeacherBatchIds
          .map(id => tbMap[id])
          .find(tb => tb && (tb.assignedStudents || []).some(as =>
            as && as.student && as.student.toString() === student._id.toString() &&
            (as.isActive !== undefined ? as.isActive : true)
          ));

        if (!matchedTb) return;

        if (t.relevantCourseIds && t.relevantCourseIds.length > 0) {
          const studentCourseId = exports.resolveStudentCourseIdForBatch(student, matchedTb.batch);
          const matches = studentCourseId && t.relevantCourseIds.some(cid => cid.toString() === studentCourseId);
          if (!matches) return;
        }

        allowedRegularTestIds.add(t._id.toString());
      });
    }

    // ── Semester-mode gate: course match + manual activation ──
    const semesterTests = tests.filter(t => t.examMode === 'semester');
    const allowedSemesterTestIds = new Set();

    semesterTests.forEach(t => {
      const isActivated = (t.activatedStudentIds || []).some(id => id.toString() === student._id.toString());
      if (!isActivated) return;

      const targetCourseId = t.courseId?._id?.toString() || t.courseId?.toString();
      const studentCourseId = student.courseCode ? student.courseCode.toString() : null;
      const matchesBase = studentCourseId && studentCourseId === targetCourseId;
      const matchesAdditional = (student.additionalCourses || []).some(
        ac => ac.isActive && ac.courseId && ac.courseId.toString() === targetCourseId
      );

      if (matchesBase || matchesAdditional) {
        allowedSemesterTestIds.add(t._id.toString());
      }
    });

    const visibleTests = tests.filter(t =>
      (t.examMode === 'regular' && allowedRegularTestIds.has(t._id.toString())) ||
      (t.examMode === 'semester' && allowedSemesterTestIds.has(t._id.toString()))
    );

    // Check attempted sessions
    const attemptedSessions = await TestSession.find({
      studentId: student._id
    }).select('testId status marksObtained totalMarks percentage');

    const attemptedMap = {};
    attemptedSessions.forEach(session => {
      attemptedMap[session.testId.toString()] = session;
    });

    const formattedTests = visibleTests.map(test => ({
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

// @desc    Admin publishes a student's result
// @route   PUT /api/exam/submissions/:submissionId/publish
// @access  Private (Admin)
exports.publishResult = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { publish } = req.body; // true or false

    const submission = await TestSubmission.findByIdAndUpdate(
      submissionId,
      {
        isPublished: publish,
        publishedAt: publish ? new Date() : null,
        publishedBy: publish ? req.user.id : null
      },
      { new: true }
    ).populate('studentId', 'fullName studentId');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found"
      });
    }

    res.json({
      success: true,
      message: publish
        ? `Result published for ${submission.studentId?.fullName}`
        : `Result hidden for ${submission.studentId?.fullName}`,
      data: submission
    });

  } catch (error) {
    console.error("Publish result error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all submissions for a test (admin view)
// @route   GET /api/exam/tests/:id/submissions
// @access  Private (Admin)
exports.getTestSubmissions = async (req, res) => {
  try {
    const submissions = await TestSubmission.find({ testId: req.params.id })
      .populate('studentId', 'fullName studentId admissionNo course batchTime')
      .sort({ submittedAt: -1 })
      .select('-answers');

    const test = await Test.findById(req.params.id)
      .select('testName maxMarks status');

    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    res.json({
      success: true,
      count: submissions.length,
      data: {
        test,
        submissions: submissions.map(s => ({
          _id: s._id,
          student: s.studentId,
          studentName: s.studentName,
          marksObtained: s.marksObtained,
          maxMarks: s.maxMarks,
          percentage: s.percentage,
          grade: s.grade,
          isPassed: s.isPassed,
          submittedAt: s.submittedAt,
          isPublished: s.isPublished,
          publishedAt: s.publishedAt
        }))
      }
    });

  } catch (error) {
    console.error("Get submissions error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Student gets their published results
// @route   GET /api/exam/tests/student/my-results
// @access  Private (Student)
exports.getMyResults = async (req, res) => {
  try {
    const User = require('../models/user');
    const userRecord = await User.findById(req.user.id).select('studentId');
    const student = await Student.findOne({ studentId: userRecord.studentId });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Only return PUBLISHED results
    const results = await TestSubmission.find({
      studentId: student._id,
      isPublished: true        // ← key filter
    })
    .sort({ submittedAt: -1 })
    .select('-answers');

    res.json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error("Get my results error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Student marksheet (all published results)
// @route   GET /api/exam/tests/student/marksheet
// @access  Private (Student)
exports.getMyMarksheet = async (req, res) => {
  try {
    const User = require('../models/user');
    const userRecord = await User.findById(req.user.id).select('studentId');
    const student = await Student.findOne({ studentId: userRecord.studentId })
      .select('fullName studentId admissionNo course batchTime admissionDate fatherName');

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const results = await TestSubmission.find({
      studentId: student._id,
      isPublished: true
    }).sort({ submittedAt: 1 }).select('-answers');

    const monthlyExams  = results.filter(r => r.examType === 'monthly');
    const semesterExams = results.filter(r => r.examType === 'semester');

    const totalMarksObtained = results.reduce((s, r) => s + r.marksObtained, 0);
    const totalMaxMarks      = results.reduce((s, r) => s + r.maxMarks, 0);
    const overallPercentage  = totalMaxMarks
      ? Math.round((totalMarksObtained / totalMaxMarks) * 100)
      : 0;

    let overallGrade = 'F';
    if      (overallPercentage >= 90) overallGrade = 'A+';
    else if (overallPercentage >= 80) overallGrade = 'A';
    else if (overallPercentage >= 70) overallGrade = 'B+';
    else if (overallPercentage >= 60) overallGrade = 'B';
    else if (overallPercentage >= 50) overallGrade = 'C';
    else if (overallPercentage >= 40) overallGrade = 'D';

    res.json({
      success: true,
      data: {
        student,
        monthlyExams,
        semesterExams,
        summary: {
          totalExams: results.length,
          passed: results.filter(r => r.isPassed).length,
          failed: results.filter(r => !r.isPassed).length,
          totalMarksObtained,
          totalMaxMarks,
          overallPercentage,
          overallGrade
        }
      }
    });

  } catch (error) {
    console.error("Marksheet error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const SENTINEL_COMPLETION_DATE_REGULAR = new Date(0);

// ── Internal: resolve which students study which course, WITHIN this specific batch ──
async function getRegularBatchCourseGroups(facultyId, batchId) {
  const User = require('../models/user');
  const TeacherBatch = require('../models/TeacherBatch');
  const Student = require('../models/Student');
  const Course = require('../models/Course');
  const mongoose = require('mongoose');

  const facultyUser = await User.findOne({
    facultyId: new mongoose.Types.ObjectId(facultyId),
    role: 'instructor'
  }).select('_id').lean();

  if (!facultyUser) {
    throw { status: 404, message: 'Faculty user account not found' };
  }

  const teacherBatch = await TeacherBatch.findOne({
    teacher: facultyUser._id,
    batch: batchId,
    isActive: true
  }).lean();

  if (!teacherBatch) {
    throw { status: 404, message: 'This faculty is not assigned to that batch' };
  }

  const activeAssigned = (teacherBatch.assignedStudents || [])
    .filter(s => s && s.student && (s.isActive !== undefined ? s.isActive : true));
  const activeStudentIds = activeAssigned.map(s => s.student);

  if (activeStudentIds.length === 0) {
    throw { status: 400, message: 'No active students assigned to this faculty in this batch' };
  }

  const students = await Student.find({ _id: { $in: activeStudentIds } })
    .select('courseCode additionalCourses')
    .lean();

  const bIdStr = batchId.toString();
  const courseGroupMap = {}; // courseId -> Set(studentId)

  students.forEach(s => {
    let applicableCourseId = s.courseCode ? s.courseCode.toString() : null;
    if (s.additionalCourses?.length > 0) {
      const ac = s.additionalCourses.find(
        a => a.isActive && a.courseId && a.batchId && a.batchId.toString() === bIdStr
      );
      if (ac) applicableCourseId = ac.courseId.toString();
    }
    if (!applicableCourseId) return;
    if (!courseGroupMap[applicableCourseId]) courseGroupMap[applicableCourseId] = new Set();
    courseGroupMap[applicableCourseId].add(s._id.toString());
  });

  const courseIds = Object.keys(courseGroupMap);
  const courses = courseIds.length > 0
    ? await Course.find({ _id: { $in: courseIds } }).select('courseFullName syllabus').lean()
    : [];
  const courseMap = {};
  courses.forEach(c => { courseMap[c._id.toString()] = c; });

  return { teacherBatch, courseGroupMap, courseMap };
}

// ── Multi-batch version: resolve course groups across SEVERAL faculty+batch pairs ──
async function getRegularBatchCourseGroupsMulti(facultyId, batchIds) {
  const User = require('../models/user');
  const TeacherBatch = require('../models/TeacherBatch');
  const Student = require('../models/Student');
  const Course = require('../models/Course');
  const mongoose = require('mongoose');

  const facultyUser = await User.findOne({
    facultyId: new mongoose.Types.ObjectId(facultyId),
    role: 'instructor'
  }).select('_id').lean();

  if (!facultyUser) {
    throw { status: 404, message: 'Faculty user account not found' };
  }

  const teacherBatches = await TeacherBatch.find({
    teacher: facultyUser._id,
    batch: { $in: batchIds },
    isActive: true
  }).lean();

  if (teacherBatches.length === 0) {
    throw { status: 404, message: 'This faculty is not assigned to any of the selected batches' };
  }

  // courseGroupMap: courseId -> Set of "studentId|batchId" pairs
  // (kept per-batch since a student's course can differ per batch via additionalCourses)
  const courseGroupMap = {};

  for (const teacherBatch of teacherBatches) {
    const bIdStr = teacherBatch.batch.toString();
    const activeAssigned = (teacherBatch.assignedStudents || [])
      .filter(s => s && s.student && (s.isActive !== undefined ? s.isActive : true));
    const studentIds = activeAssigned.map(s => s.student);

    if (studentIds.length === 0) continue;

    const students = await Student.find({ _id: { $in: studentIds } })
      .select('courseCode additionalCourses')
      .lean();

    students.forEach(s => {
      let applicableCourseId = s.courseCode ? s.courseCode.toString() : null;
      if (s.additionalCourses?.length > 0) {
        const ac = s.additionalCourses.find(
          a => a.isActive && a.courseId && a.batchId && a.batchId.toString() === bIdStr
        );
        if (ac) applicableCourseId = ac.courseId.toString();
      }
      if (!applicableCourseId) return;
      if (!courseGroupMap[applicableCourseId]) courseGroupMap[applicableCourseId] = new Set();
      courseGroupMap[applicableCourseId].add(`${s._id.toString()}|${bIdStr}`);
    });
  }

  const courseIds = Object.keys(courseGroupMap);
  const courses = courseIds.length > 0
    ? await Course.find({ _id: { $in: courseIds } }).select('courseFullName syllabus').lean()
    : [];
  const courseMap = {};
  courses.forEach(c => { courseMap[c._id.toString()] = c; });

  return { teacherBatches, courseGroupMap, courseMap };
}

// ── Multi-batch version of resolveRegularExamContext ──
async function resolveRegularExamContextMulti(facultyId, batchIds, selectedCourseIds) {
  const Course = require('../models/Course');
  const TopicCompletion = require('../models/TopicCompletion');

  const { teacherBatches, courseGroupMap, courseMap } = await getRegularBatchCourseGroupsMulti(facultyId, batchIds);

  let entries = Object.entries(courseGroupMap);
  if (selectedCourseIds && selectedCourseIds.length > 0) {
    entries = entries.filter(([cid]) => selectedCourseIds.includes(cid));
  }

  if (entries.length === 0) {
    throw { status: 400, message: 'No matching courses found for this selection' };
  }

  const courseIds = entries.map(([cid]) => cid);
  const topicMap = new Map();

  for (const [cid, pairSet] of entries) {
    const course = courseMap[cid];
    if (!course) continue;
    const studentIds = [...new Set([...pairSet].map(p => p.split('|')[0]))];

    const completions = await TopicCompletion.find({
      courseId: cid,
      studentIds: { $in: studentIds },
    }).select('completedTopicKeys completedSubtopicKeys studentIds date').lean();

    const topicTaught = {}, topicCompleted = {}, subtopicTaught = {}, subtopicCompleted = {};
    studentIds.forEach(sid => {
      topicTaught[sid] = new Set(); topicCompleted[sid] = new Set();
      subtopicTaught[sid] = new Set(); subtopicCompleted[sid] = new Set();
    });

    completions.forEach(c => {
      const isSentinel = new Date(c.date).getTime() === SENTINEL_COMPLETION_DATE_REGULAR.getTime();
      (c.studentIds || []).forEach(sid => {
        const sidStr = sid.toString();
        if (!topicTaught[sidStr]) return;
        (c.completedTopicKeys || []).forEach(k => {
          if (isSentinel) topicCompleted[sidStr].add(k); else topicTaught[sidStr].add(k);
        });
        (c.completedSubtopicKeys || []).forEach(k => {
          if (isSentinel) subtopicCompleted[sidStr].add(k); else subtopicTaught[sidStr].add(k);
        });
      });
    });

    (course.syllabus || []).forEach((sem, sIdx) => {
      (sem.topics || []).forEach((topic, tIdx) => {
        const topicKey = `${sIdx}_${tIdx}`;
        const tCompleted = studentIds.some(sid => topicCompleted[sid]?.has(topicKey));
        const tTaught = studentIds.some(sid => topicTaught[sid]?.has(topicKey));

        const eligibleSubs = [];
        (topic.subtopics || []).forEach((sub, subIdx) => {
          const subKey = `${sIdx}_${tIdx}_${subIdx}`;
          const sCompleted = studentIds.some(sid => subtopicCompleted[sid]?.has(subKey));
          const sTaught = studentIds.some(sid => subtopicTaught[sid]?.has(subKey));
          if (sCompleted || sTaught) eligibleSubs.push(sub.name.trim());
        });

        if (tCompleted || tTaught || eligibleSubs.length > 0) {
          const key = topic.name.trim().toLowerCase();
          if (!topicMap.has(key)) topicMap.set(key, { name: topic.name.trim(), subtopics: new Set() });
          eligibleSubs.forEach(n => topicMap.get(key).subtopics.add(n));
        }
      });
    });
  }

  const topics = [...topicMap.values()].map(t => ({ name: t.name, subtopics: [...t.subtopics] }));

  return {
    teacherBatches,
    courseIds,
    courses: courseIds.map(cid => ({ _id: cid, name: courseMap[cid]?.courseFullName || 'Unknown Course' })),
    topics
  };
}

// ── Given a student doc + a batchId, resolve which course applies to them IN that batch ──
function resolveStudentCourseIdForBatch(student, batchId) {
  if (!student || !batchId) return null;
  let applicableCourseId = student.courseCode ? student.courseCode.toString() : null;
  if (student.additionalCourses?.length > 0) {
    const ac = student.additionalCourses.find(
      a => a.isActive && a.courseId && a.batchId && a.batchId.toString() === batchId.toString()
    );
    if (ac) applicableCourseId = ac.courseId.toString();
  }
  return applicableCourseId;
}

exports.getRegularExamCourses = async (req, res) => {
  try {
    const { facultyId, batchIds } = req.query;
    if (!facultyId || !batchIds) {
      return res.status(400).json({ success: false, message: 'facultyId and batchIds are required' });
    }

    const batchIdList = batchIds.split(',').filter(Boolean);
    const { courseGroupMap, courseMap } = await getRegularBatchCourseGroupsMulti(facultyId, batchIdList);

    const courses = Object.entries(courseGroupMap).map(([cid, pairSet]) => ({
      courseId: cid,
      courseName: courseMap[cid]?.courseFullName || 'Unknown Course',
      studentCount: new Set([...pairSet].map(p => p.split('|')[0])).size
    })).sort((a, b) => a.courseName.localeCompare(b.courseName));

    res.json({ success: true, data: { courses } });
  } catch (error) {
    console.error('Get regular exam courses error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Server error' });
  }
};

// ── Resolve topics (deduplicated, with subtopics) for SELECTED courses only ──
async function resolveRegularExamContext(facultyId, batchId, selectedCourseIds) {
  const Course = require('../models/Course');
  const TopicCompletion = require('../models/TopicCompletion');

  const { teacherBatch, courseGroupMap, courseMap } = await getRegularBatchCourseGroups(facultyId, batchId);

  let entries = Object.entries(courseGroupMap);
  if (selectedCourseIds && selectedCourseIds.length > 0) {
    entries = entries.filter(([cid]) => selectedCourseIds.includes(cid));
  }

  if (entries.length === 0) {
    throw { status: 400, message: 'No matching courses found for this selection' };
  }

  const courseIds = entries.map(([cid]) => cid);

  // Deduplicated topic map (by name), each with a merged, deduplicated subtopic name list
  const topicMap = new Map(); // key: lowercase topic name -> { name, subtopics: Set }

  for (const [cid, sidSet] of entries) {
    const course = courseMap[cid];
    if (!course) continue;
    const studentIds = [...sidSet];

    const completions = await TopicCompletion.find({
      courseId: cid,
      studentIds: { $in: studentIds },
    }).select('completedTopicKeys completedSubtopicKeys studentIds date').lean();

    const topicTaught = {}, topicCompleted = {}, subtopicTaught = {}, subtopicCompleted = {};
    studentIds.forEach(sid => {
      topicTaught[sid] = new Set(); topicCompleted[sid] = new Set();
      subtopicTaught[sid] = new Set(); subtopicCompleted[sid] = new Set();
    });

    completions.forEach(c => {
      const isSentinel = new Date(c.date).getTime() === SENTINEL_COMPLETION_DATE_REGULAR.getTime();
      (c.studentIds || []).forEach(sid => {
        const sidStr = sid.toString();
        if (!topicTaught[sidStr]) return;
        (c.completedTopicKeys || []).forEach(k => {
          if (isSentinel) topicCompleted[sidStr].add(k); else topicTaught[sidStr].add(k);
        });
        (c.completedSubtopicKeys || []).forEach(k => {
          if (isSentinel) subtopicCompleted[sidStr].add(k); else subtopicTaught[sidStr].add(k);
        });
      });
    });

    (course.syllabus || []).forEach((sem, sIdx) => {
      (sem.topics || []).forEach((topic, tIdx) => {
        const topicKey = `${sIdx}_${tIdx}`;
        const tCompleted = studentIds.some(sid => topicCompleted[sid]?.has(topicKey));
        const tTaught = studentIds.some(sid => topicTaught[sid]?.has(topicKey));

        const eligibleSubs = [];
        (topic.subtopics || []).forEach((sub, subIdx) => {
          const subKey = `${sIdx}_${tIdx}_${subIdx}`;
          const sCompleted = studentIds.some(sid => subtopicCompleted[sid]?.has(subKey));
          const sTaught = studentIds.some(sid => subtopicTaught[sid]?.has(subKey));
          if (sCompleted || sTaught) eligibleSubs.push(sub.name.trim());
        });

        if (tCompleted || tTaught || eligibleSubs.length > 0) {
          const key = topic.name.trim().toLowerCase();
          if (!topicMap.has(key)) {
            topicMap.set(key, { name: topic.name.trim(), subtopics: new Set() });
          }
          eligibleSubs.forEach(n => topicMap.get(key).subtopics.add(n));
        }
      });
    });
  }

  const topics = [...topicMap.values()].map(t => ({
    name: t.name,
    subtopics: [...t.subtopics]
  }));

  return {
    teacherBatch,
    courseIds,
    courses: courseIds.map(cid => ({ _id: cid, name: courseMap[cid]?.courseFullName || 'Unknown Course' })),
    topics
  };
}

// @desc    Get deduplicated topic+subtopic list for faculty+batch+selected courses — Regular exam step 2
// @route   GET /api/exam/tests/regular/topics?facultyId=X&batchId=Y&courseIds=A,B
exports.getRegularExamTopics = async (req, res) => {
  try {
    const { facultyId, batchIds, courseIds } = req.query;
    if (!facultyId || !batchIds) {
      return res.status(400).json({ success: false, message: 'facultyId and batchIds are required' });
    }
    if (!courseIds) {
      return res.status(400).json({ success: false, message: 'courseIds is required — select at least one course' });
    }

    const batchIdList = batchIds.split(',').filter(Boolean);
    const selectedCourseIds = courseIds.split(',').filter(Boolean);
    const context = await resolveRegularExamContextMulti(facultyId, batchIdList, selectedCourseIds);

    res.json({
      success: true,
      data: {
        courses: context.courses,
        courseIds: context.courseIds,
        topics: context.topics,
        totalTopics: context.topics.length
      }
    });
  } catch (error) {
    console.error('Get regular exam topics error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get eligibility vs attempted report for a specific test
// @route   GET /api/exam/tests/:id/eligibility-report
// @access  Private (Admin/Faculty)
exports.getTestEligibilityReport = async (req, res) => {
  try {
    const testId = req.params.id;
    const test = await Test.findById(testId)
      .populate('courseId', 'courseFullName')
      .lean();

    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    let eligibleStudents = [];

    const eligTeacherBatchIds = (test.teacherBatchIds && test.teacherBatchIds.length > 0
      ? test.teacherBatchIds
      : [test.teacherBatchId]
    ).filter(Boolean);

    if (test.examMode === 'regular' && eligTeacherBatchIds.length > 0) {
      // Regular mode: eligible = union of assignedStudents across all selected TeacherBatches,
      // each resolved against their own batch for the course-level check
      const TeacherBatch = require('../models/TeacherBatch');
      const tbs = await TeacherBatch.find({ _id: { $in: eligTeacherBatchIds } }).select('assignedStudents batch').lean();

      const studentToBatch = new Map();
      tbs.forEach(tb => {
        (tb.assignedStudents || []).forEach(as => {
          if (as && as.student && (as.isActive !== undefined ? as.isActive : true)) {
            const sid = as.student.toString();
            if (!studentToBatch.has(sid)) studentToBatch.set(sid, tb.batch);
          }
        });
      });

      const studentIds = [...studentToBatch.keys()];
      const students = await Student.find({ _id: { $in: studentIds } })
        .select('studentId fullName courseCode additionalCourses')
        .lean();

      if (test.relevantCourseIds && test.relevantCourseIds.length > 0) {
        eligibleStudents = students.filter(s => {
          const batchForStudent = studentToBatch.get(s._id.toString());
          const cid = exports.resolveStudentCourseIdForBatch(s, batchForStudent);
          return cid && test.relevantCourseIds.some(rc => rc.toString() === cid);
        });
      } else {
        eligibleStudents = students;
      }
    } else {
      // Semester mode: eligible = students enrolled in this course (any batch),
      // via courseCode or an active additionalCourses entry — batch-independent
      const targetCourseId = test.courseId?._id?.toString() || test.courseId?.toString();

      const candidateStudents = await Student.find({ isActive: true, status: 'active' })
        .select('studentId fullName courseCode additionalCourses admissionDate manuallyDueExamKeys')
        .populate('courseCode', 'examMonths')
        .lean();

      eligibleStudents = candidateStudents.filter(s => {
        if (s.courseCode && s.courseCode._id?.toString() === targetCourseId) return true;
        return (s.additionalCourses || []).some(
          ac => ac.isActive && ac.courseId && ac.courseId.toString() === targetCourseId
        );
      });

      // ── Only keep students whose exam for THIS semester is ≤10 days away,
      // overdue, or manually marked "Due" — same rule as Upcoming Exam Report ──
      const semesterNumber = parseInt(test.selectedSemesters?.[0]) || 1;
      const examIndex = semesterNumber - 1;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      eligibleStudents = eligibleStudents.filter(s => {
        if (!s.admissionDate || !s.courseCode?.examMonths) return false;

        const examMonths = s.courseCode.examMonths
          .split(',')
          .map(m => parseInt(m.trim()))
          .filter(m => !isNaN(m));

        const monthNum = examMonths[examIndex];
        if (!monthNum) return false;

        const examDate = new Date(s.admissionDate);
        examDate.setMonth(examDate.getMonth() + monthNum - 1);
        examDate.setDate(15);
        examDate.setHours(0, 0, 0, 0);

        const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
        const isOverdue = daysLeft < 0;
        const dueKey = `${targetCourseId}_${semesterNumber}`;
        const isManuallyDue = (s.manuallyDueExamKeys || []).includes(dueKey);

        return daysLeft <= 10 || isOverdue || isManuallyDue;
      });
    }

    // Days left until this test's scheduled date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(test.scheduledDate);
    examDate.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

    // Manually-marked "Due" students for this test
    // Only show eligible students if the exam is within 10 days
    if (daysLeft > 10) {
      eligibleStudents = [];
    }

    const eligibleIds = eligibleStudents.map(s => s._id.toString());

    const submissions = await TestSubmission.find({ testId: test._id })
      .select('studentId submittedAt marksObtained maxMarks percentage isPassed')
      .lean();

    const attemptedMap = {};
    submissions.forEach(s => { attemptedMap[s.studentId.toString()] = s; });

    const attemptedEligibleCount = eligibleIds.filter(id => attemptedMap[id]).length;
    const activatedSet = new Set((test.activatedStudentIds || []).map(id => id.toString()));

    res.json({
      success: true,
      data: {
        test: {
          _id: test._id,
          testName: test.testName,
          examMode: test.examMode,
          courseName: test.courseName || test.courseId?.courseFullName,
          scheduledDate: test.scheduledDate,
          status: test.status,
          maxMarks: test.maxMarks
        },
        summary: {
          totalEligible: eligibleStudents.length,
          totalAttempted: attemptedEligibleCount,
          notAttemptedCount: eligibleStudents.length - attemptedEligibleCount,
          attemptPercentage: eligibleStudents.length > 0
            ? Math.round((attemptedEligibleCount / eligibleStudents.length) * 100)
            : 0
        },
        students: eligibleStudents.map(s => {
          const sub = attemptedMap[s._id.toString()];
          return {
            _id: s._id,
            studentId: s.studentId,
            fullName: s.fullName,
            attempted: !!sub,
            activated: activatedSet.has(s._id.toString()),
            marksObtained: sub?.marksObtained ?? null,
            maxMarks: sub?.maxMarks ?? null,
            percentage: sub?.percentage ?? null,
            submittedAt: sub?.submittedAt ?? null
          };
        })
      }
    });

  } catch (error) {
    console.error('Get test eligibility report error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Toggle a student's manual activation for a semester-mode test
// @route   PUT /api/exam/tests/:id/activate-student/:studentId
// @access  Private (Admin/Faculty)
exports.toggleStudentActivation = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const { activate } = req.body; // true | false

    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }
    if (test.examMode !== 'semester') {
      return res.status(400).json({ success: false, message: 'Manual activation only applies to Semester-mode exams' });
    }

    const alreadyActive = (test.activatedStudentIds || []).some(sid => sid.toString() === studentId);

    if (activate && !alreadyActive) {
      test.activatedStudentIds.push(studentId);
    } else if (!activate && alreadyActive) {
      test.activatedStudentIds = test.activatedStudentIds.filter(sid => sid.toString() !== studentId);
    }

    await test.save();

    res.json({
      success: true,
      message: activate ? 'Student activated for this exam' : 'Student deactivated',
      data: { studentId, activated: activate }
    });
  } catch (error) {
    console.error('Toggle student activation error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Toggle a student's manual "Due" status for a test (controls eligibility visibility)
// @route   PUT /api/exam/tests/:id/mark-due/:studentId
// @access  Private (Admin/Faculty)
exports.toggleStudentDueStatus = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const { markDue } = req.body; // true | false

    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const alreadyDue = (test.manuallyDueStudentIds || []).some(sid => sid.toString() === studentId);

    if (markDue && !alreadyDue) {
      test.manuallyDueStudentIds.push(studentId);
    } else if (!markDue && alreadyDue) {
      test.manuallyDueStudentIds = test.manuallyDueStudentIds.filter(sid => sid.toString() !== studentId);
    }

    await test.save();

    res.json({
      success: true,
      message: markDue ? 'Student marked as Due for this exam' : 'Due status removed',
      data: { studentId, manuallyDue: markDue }
    });
  } catch (error) {
    console.error('Toggle student due status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── Auto-archive regular-mode tests 7+ days after creation ──
// Soft delete only — same as manual delete, results/history stay intact.
exports.autoArchiveOldRegularTests = async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await Test.updateMany(
      {
        examMode: 'regular',
        isArchived: { $ne: true },
        createdAt: { $lte: sevenDaysAgo }
      },
      {
        $set: { isArchived: true, archivedAt: new Date() }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`🗄️  Auto-archived ${result.modifiedCount} regular test(s) older than 7 days`);
    }
  } catch (error) {
    console.error('Auto-archive tests error:', error);
  }
};

exports.resolveRegularExamContext = resolveRegularExamContext;
exports.resolveStudentCourseIdForBatch = resolveStudentCourseIdForBatch;