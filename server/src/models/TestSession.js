const mongoose = require("mongoose");

const testSessionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: String,
  studentRollNo: String,
  
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  testName: String,
  
  // Questions assigned to this student (randomized)
  assignedQuestions: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    questionOrder: Number,
    selectedAnswer: String,
    isCorrect: Boolean,
    marksObtained: {
      type: Number,
      default: 0
    },
    timeSpent: {
      type: Number,
      default: 0
    },
    reviewed: {
      type: Boolean,
      default: false
    }
  }],
  
  // Test status
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'submitted', 'expired', 'disqualified'],
    default: 'not_started'
  },
  
  // Time tracking
  startTime: Date,
  endTime: Date,
  timeRemaining: Number, // in seconds
  
  // Score
  totalMarks: Number,
  marksObtained: {
    type: Number,
    default: 0
  },
  percentage: Number,
  grade: String,
  rank: Number,
  
  // Anti-cheating
  tabSwitchCount: {
    type: Number,
    default: 0
  },
  ipAddress: String,
  userAgent: String,
  warnings: [{
    type: String,
    timestamp: Date
  }],
  
  // Submission
  submittedAt: Date,
  autoSubmitted: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-calculate percentage
testSessionSchema.pre('save', function(next) {
  if (this.totalMarks > 0) {
    this.percentage = (this.marksObtained / this.totalMarks) * 100;
    
    // Simple grading
    if (this.percentage >= 90) this.grade = 'A+';
    else if (this.percentage >= 80) this.grade = 'A';
    else if (this.percentage >= 70) this.grade = 'B';
    else if (this.percentage >= 60) this.grade = 'C';
    else if (this.percentage >= 50) this.grade = 'D';
    else if (this.percentage >= 33) this.grade = 'E';
    else this.grade = 'F';
  }
  next();
});

module.exports = mongoose.model('TestSession', testSessionSchema);