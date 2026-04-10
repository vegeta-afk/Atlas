const Question = require('../models/Question');
const Course = require('../models/Course');

// @desc    Add a new question
// @route   POST /api/exam/questions
// @access  Private (Admin/Faculty)
exports.addQuestion = async (req, res) => {
  try {
    const {
      questionText,
      questionType,
      options,
      correctAnswer,
      marks,
      difficulty,
      courseId,
      semester,
      topic,
      subtopic
    } = req.body;

    // Validate required fields
    if (!questionText || !questionType || !marks || !courseId || !semester || !topic) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Validate MCQ options
    if (questionType === 'mcq') {
      if (!options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({
          success: false,
          message: "MCQ questions must have at least 2 options"
        });
      }
      
      // Check if at least one option is correct
      const hasCorrectOption = options.some(opt => opt.isCorrect);
      if (!hasCorrectOption) {
        return res.status(400).json({
          success: false,
          message: "At least one option must be marked as correct"
        });
      }
    }

    // Validate non-MCQ
    if (questionType !== 'mcq' && !correctAnswer) {
      return res.status(400).json({
        success: false,
        message: "Correct answer is required for non-MCQ questions"
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Create question
    const question = await Question.create({
      questionText,
      questionType,
      options: questionType === 'mcq' ? options : undefined,
      correctAnswer: questionType !== 'mcq' ? correctAnswer : undefined,
      marks,
      difficulty: difficulty || 'medium',
      courseId,
      semester,
      topic,
      subtopic: subtopic || "",
      createdBy: req.user.id,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: "Question added successfully",
      data: question
    });

  } catch (error) {
    console.error("Add question error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Get questions with filters
// @route   GET /api/exam/questions
// @access  Private (Admin/Faculty)
exports.getQuestions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      courseId,
      semester,
      topic,
      questionType,
      difficulty,
      isActive = "true" 
    } = req.query;

    // Build filter
    const filter = { isActive: isActive === "true" };

    if (search) {
      filter.questionText = { $regex: search, $options: 'i' };
    }

    if (courseId) filter.courseId = courseId;
    if (semester) filter.semester = semester;
    if (topic) filter.topic = topic;
    if (questionType) filter.questionType = questionType;
    if (difficulty) filter.difficulty = difficulty;

    // Execute query
    const questions = await Question.find(filter)
      .populate('courseId', 'courseFullName courseShortName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Question.countDocuments(filter);

    // Get available filters
    const courses = await Course.find({ isActive: true })
      .select('_id courseFullName')
      .sort('courseFullName');

    const semesters = await Question.distinct('semester', { 
  ...(courseId && { courseId }), 
  isActive: true 
});
    const topics = await Question.distinct('topic', { 
  ...(courseId && { courseId }), 
  ...(semester && { semester }), 
  isActive: true 
});

    res.json({
      success: true,
      count: questions.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: questions,
      filters: {
        courses,
        semesters,
        topics
      }
    });

  } catch (error) {
    console.error("Get questions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Get question by ID
// @route   GET /api/exam/questions/:id
// @access  Private (Admin/Faculty)
exports.getQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('courseId', 'courseFullName courseShortName');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    res.json({
      success: true,
      data: question
    });

  } catch (error) {
    console.error("Get question error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Update question
// @route   PUT /api/exam/questions/:id
// @access  Private (Admin/Faculty)
exports.updateQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    res.json({
      success: true,
      message: "Question updated successfully",
      data: question
    });

  } catch (error) {
    console.error("Update question error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Delete question
// @route   DELETE /api/exam/questions/:id
// @access  Private (Admin/Faculty)
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    // Soft delete by setting inactive
    question.isActive = false;
    await question.save();

    res.json({
      success: true,
      message: "Question deleted successfully"
    });

  } catch (error) {
    console.error("Delete question error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Get available topics from a course
// @route   GET /api/exam/questions/courses/:courseId/topics
// @access  Private (Admin/Faculty)
exports.getCourseTopics = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    console.log('📚 Course syllabus data:', course.syllabus);

    // 1. Topics from course syllabus
    const syllabusTopics = [];
    const semesters = [];
    const topicsBySemester = {};

    if (course.syllabus && Array.isArray(course.syllabus)) {
      course.syllabus.forEach(semester => {
        if (semester && semester.name) {
          semesters.push(semester.name);
          topicsBySemester[semester.name] = [];

          if (semester.topics && Array.isArray(semester.topics)) {
            semester.topics.forEach(topic => {
              if (topic && topic.name) {
                // Add to syllabus topics
                syllabusTopics.push({
                  semester: semester.name,
                  topic: topic.name,
                  subtopics: topic.subtopics ? topic.subtopics.map(st => st.name) : []
                });

                // Add to topicsBySemester for dropdown
                topicsBySemester[semester.name].push(topic.name);
              }
            });
          }
        }
      });
    }

    // 2. Topics that already have questions (for filtering)
    const existingTopics = await Question.distinct('topic', { 
      courseId: course._id, 
      isActive: true 
    });

    res.json({
      success: true,
      data: {
        course: {
          _id: course._id,
          name: course.courseFullName,
          code: course.courseCode
        },
        semesters,
        topics: syllabusTopics,
        topicsBySemester,
        existingTopics
      }
    });

  } catch (error) {
    console.error("Get course topics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Bulk add questions
// @route   POST /api/exam/questions/bulk
// @access  Private (Admin/Faculty)
exports.bulkAddQuestions = async (req, res) => {
  try {
    console.log('📦 BULK ADD QUESTIONS CALLED');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      console.log('❌ Invalid questions array:', questions);
      return res.status(400).json({
        success: false,
        message: "Questions array is required and must be non-empty"
      });
    }

    console.log(`📊 Processing ${questions.length} questions`);

    // Validate each question
    const validQuestions = [];
    const errors = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      // Check required fields
      if (!q.questionText || !q.questionType || !q.marks || !q.courseId || !q.semester || !q.topic) {
        errors.push(`Question ${i + 1}: Missing required fields`);
        console.log(`❌ Question ${i + 1} missing fields:`, {
          questionText: !!q.questionText,
          questionType: !!q.questionType,
          marks: !!q.marks,
          courseId: !!q.courseId,
          semester: !!q.semester,
          topic: !!q.topic
        });
        continue;
      }

      // Validate MCQ options
      if (q.questionType === 'mcq') {
        if (!q.options || q.options.length < 2) {
          errors.push(`Question ${i + 1}: MCQ must have at least 2 options`);
          console.log(`❌ Question ${i + 1} invalid MCQ options`);
          continue;
        }
        
        const hasCorrect = q.options.some(opt => opt.isCorrect);
        if (!hasCorrect) {
          errors.push(`Question ${i + 1}: At least one option must be correct`);
          console.log(`❌ Question ${i + 1} no correct option`);
          continue;
        }
      }

      validQuestions.push({
        ...q,
        createdBy: req.user.id,
        isActive: true
      });
    }

    console.log(`✅ Valid questions: ${validQuestions.length}/${questions.length}`);
    
    if (validQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid questions found",
        errors
      });
    }

    // Insert valid questions
    const inserted = await Question.insertMany(validQuestions);

    console.log(`🎯 Successfully inserted ${inserted.length} questions`);

    res.status(201).json({
      success: true,
      message: `Added ${inserted.length} questions successfully`,
      data: inserted,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("Bulk add questions error:", error);
    console.error("Error stack:", error.stack);
    
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