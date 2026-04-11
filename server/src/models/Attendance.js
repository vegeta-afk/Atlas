// models/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  // Core References
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
    index: true
  },
  
  // Date Information
  date: {
    type: Date,
    required: true,
    index: true
  },
  day: {
    type: Number,
    min: 1,
    max: 31
  },
  month: {
    type: Number,
    min: 1,
    max: 12
  },
  year: {
    type: Number
  },
  
  // Attendance Status
  status: {
    type: String,
    enum: ['present', 'absent', 'sick_leave', 'casual_leave', 'official_leave', 'late', 'half_day', 'not_marked'],
    default: 'absent',
    required: true
  },

  courseType: {
    type: String,
    enum: ['primary', 'additional'],
    default: 'primary'
  },
  
  // Time Tracking
  checkInTime: {
    type: String,
    validate: {
      validator: function(v) {
        return v === null || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Invalid time format (HH:MM)'
    }
  },
  checkOutTime: {
    type: String,
    validate: {
      validator: function(v) {
        return v === null || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Invalid time format (HH:MM)'
    }
  },

  
  
  // Additional Information
  reason: {
    type: String,
    trim: true
  },
  remarks: {
    type: String,
    trim: true
  },
  
  // Teacher who marked
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  markedByName: {
    type: String
  },
  
  // Regularization
  isRegularized: {
    type: Boolean,
    default: false
  },
  regularizationReason: {
    type: String,
    trim: true
  },
  regularizationApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
}, {
  timestamps: true
});

// Compound unique index - One attendance per student per teacher per batch per date
attendanceSchema.index({ student: 1, teacher: 1, batch: 1, date: 1 }, { unique: true });

// Indexes
attendanceSchema.index({ teacher: 1, date: 1 });
attendanceSchema.index({ batch: 1, date: 1 });
attendanceSchema.index({ student: 1, month: 1, year: 1 });

// Pre-save middleware
attendanceSchema.pre('save', function(next) {
  if (this.date) {
    const d = new Date(this.date);
    this.day = d.getDate();
    this.month = d.getMonth() + 1;
    this.year = d.getFullYear();
  }
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);