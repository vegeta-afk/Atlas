const mongoose = require("mongoose");

const testSchema = new mongoose.Schema({
  // Basic info
  testName: {
    type: String,
    required: [true, "Test name is required"],
    trim: true
  },
  description: {
    type: String,
    default: ""
  },
  
  // Link to course
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, "Course is required"]
  },
  courseName: String, // Denormalized for quick access
  
  // Topic selection (from your course syllabus structure)
  selectedSemesters: [{
    type: String,
    required: true
  }],
  selectedTopics: [{
    type: String,
    required: true
  }],
  
  // Test configuration
  totalQuestionsInPool: {
    type: Number,
    required: [true, "Total questions in pool is required"],
    min: [1, "Minimum 1 question required"]
  },
  questionsPerStudent: {
    type: Number,
    required: [true, "Questions per student is required"],
    min: [1, "Minimum 1 question per student"]
  },
  duration: {
    type: Number, // in minutes
    required: [true, "Duration is required"],
    min: [1, "Minimum 1 minute duration"]
  },
  maxMarks: {
    type: Number,
    required: [true, "Maximum marks are required"],
    min: [1, "Minimum 1 mark"]
  },
  
  // Question pool (auto-generated from selected topics)
  questionPool: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  questionPoolCount: {
    type: Number,
    default: 0
  },
  
  // Batch assignment (optional)
 batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: false, // ✅ Make it optional
    default: null // ✅ Default value
  },
  
  // Timing
  scheduledDate: {
    type: Date,
    required: [true, "Scheduled date is required"]
  },
  startTime: {
    type: String, // "14:30"
    default: "00:00"
  },
  endTime: {
    type: String,
    default: "23:59"
  },
  
  // Anti-cheating features
  shuffleQuestions: {
    type: Boolean,
    default: true
  },
  shuffleOptions: {
    type: Boolean,
    default: true
  },
  allowMultipleAttempts: {
    type: Boolean,
    default: false
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByName: String,
  
  // Statistics
  totalAttempts: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Validation: questionsPerStudent <= totalQuestionsInPool
testSchema.pre('save', function(next) {
  if (this.questionsPerStudent > this.totalQuestionsInPool) {
    return next(new Error('Questions per student cannot exceed total questions in pool'));
  }
  next();
});

// Auto-calculate maxMarks if not provided
testSchema.pre('save', async function(next) {
  if (!this.maxMarks && this.questionPool.length > 0) {
    const Question = mongoose.model('Question');
    const questions = await Question.find({ _id: { $in: this.questionPool } });
    this.maxMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  }
  next();
});

module.exports = mongoose.model('Test', testSchema);