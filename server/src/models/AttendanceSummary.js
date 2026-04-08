// models/AttendanceSummary.js
const mongoose = require('mongoose');

const attendanceSummarySchema = new mongoose.Schema({
  // Student Information
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  
  // Teacher Reference
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Batch Reference
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    index: true
  },
  
  // Time Period
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
    index: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  monthYear: {
    type: String,
    index: true
  },
  
  // Attendance Counts
  totalWorkingDays: {
    type: Number,
    default: 0
  },
  present: {
    type: Number,
    default: 0
  },
  absent: {
    type: Number,
    default: 0
  },
  sickLeave: {
    type: Number,
    default: 0
  },
  casualLeave: {
    type: Number,
    default: 0
  },
  officialLeave: {
    type: Number,
    default: 0
  },
  late: {
    type: Number,
    default: 0
  },
  halfDay: {
    type: Number,
    default: 0
  },
  holidays: {
    type: Number,
    default: 0
  },
  
  // Calculated Fields
  attendancePercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  leavesTaken: {
    type: Number,
    default: 0
  },
  
  // Additional Info
  remarks: {
    type: String
  },
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound unique index
attendanceSummarySchema.index({ student: 1, teacher: 1, batch: 1, month: 1, year: 1 }, { unique: true });

// Indexes for reports
attendanceSummarySchema.index({ batch: 1, month: 1, year: 1 });
attendanceSummarySchema.index({ attendancePercentage: 1 });

// Pre-save to calculate percentages
attendanceSummarySchema.pre('save', function(next) {
  // Calculate total leaves
  this.leavesTaken = this.sickLeave + this.casualLeave + this.officialLeave;
  
  // Calculate attendance percentage (excluding holidays)
  const totalDays = this.totalWorkingDays - this.holidays;
  const attendedDays = this.present + (this.halfDay * 0.5) + (this.late * 0.75);
  
  if (totalDays > 0) {
    this.attendancePercentage = Math.round((attendedDays / totalDays) * 100);
  } else {
    this.attendancePercentage = 0;
  }
  
  // Format monthYear
  this.monthYear = `${this.year}-${this.month.toString().padStart(2, '0')}`;
  
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('AttendanceSummary', attendanceSummarySchema);