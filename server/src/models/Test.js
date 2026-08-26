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
  // ── Exam mode ──
  examMode: {
    type: String,
    enum: ['semester', 'regular'],
    default: 'semester'
  },

  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false   // ← only required for 'semester' mode, validated in controller
  },
  courseName: String, // Denormalized for quick access

  // ── Regular mode only ──
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    default: null
  },
  teacherBatchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeacherBatch',
    default: null
  },
  relevantCourseIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],

  // Topic selection (semester mode uses selectedSemesters + selectedTopics grouped;
  // regular mode uses only selectedTopics — flat, deduplicated topic names)
  selectedSemesters: [{
    type: String
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
  
  topicQuestionCounts: {
    type: Object,
    default: {}
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
    required: false,
    default: null
  },
  // Multi-batch support (semester + regular mode). batchId above is kept
  // for older tests created before this change; new tests use batchIds.
  batchIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch'
  }],
  // Semester mode: students explicitly given portal access to this exam,
  // toggled from the Upcoming Exam Report. Empty until an admin activates them.
  activatedStudentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],

  eligibleStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],

  manuallyDueStudentIds: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Student'
}],
  // Regular mode only — one TeacherBatch per selected batch
  teacherBatchIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeacherBatch'
  }],
  
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

  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
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