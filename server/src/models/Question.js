const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  // Question content
  questionText: {
    type: String,
    required: [true, "Question text is required"],
    trim: true
  },
  
  // Question type
  questionType: {
    type: String,
    enum: ['mcq', 'truefalse', 'shortanswer'],
    default: 'mcq',
    required: true
  },
  
  // Options for MCQ
  options: [{
    text: {
      type: String,
      required: function() { return this.questionType === 'mcq'; }
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  
  // Correct answer for non-MCQ or reference
  correctAnswer: {
    type: String,
    required: function() {
      return this.questionType !== 'mcq';
    }
  },
  
  // Marks and difficulty
  marks: {
    type: Number,
    required: [true, "Marks are required"],
    min: [1, "Minimum 1 mark required"]
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  
  // Link to course structure (EXACTLY LIKE YOUR COURSE MODEL)
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, "Course is required"]
  },
  semester: {
    type: String,
    required: [true, "Semester is required"]
  },
  topic: {
    type: String,
    required: [true, "Topic is required"]
  },
  subtopic: {
    type: String,
    default: ""
  },
  
  // Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // For analytics
  timesUsed: {
    type: Number,
    default: 0
  },
  averageTimeSpent: {
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

// Update updatedAt on save
questionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Question', questionSchema);