// models/TeacherBatch.js
const mongoose = require('mongoose');

const teacherBatchSchema = new mongoose.Schema({
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
  // Students assigned to this teacher in this batch
  assignedStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    assignedDate: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  // Additional info
  roomNumber: String,
  subject: String, // If teaching specific subject
  isPrimaryTeacher: {
    type: Boolean,
    default: false
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  // Metadata
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
}, {
  timestamps: true
});

// Compound unique index - One teacher per batch (but teachers can have multiple batches)
teacherBatchSchema.index({ teacher: 1, batch: 1 }, { unique: true });

// Method to get teacher's active students count
teacherBatchSchema.methods.getActiveStudentCount = function() {
  return this.assignedStudents.filter(s => s.isActive).length;
};


// Add this after the schema definition, before the model export

// Pre-save middleware to prevent duplicate student entries
teacherBatchSchema.pre('save', function(next) {
  // Remove duplicate students in the same batch
  if (this.assignedStudents && this.assignedStudents.length > 0) {
    const uniqueStudents = [];
    const studentIds = new Set();
    
    this.assignedStudents.forEach(s => {
      if (!studentIds.has(s.student.toString())) {
        studentIds.add(s.student.toString());
        uniqueStudents.push(s);
      }
    });
    
    if (uniqueStudents.length !== this.assignedStudents.length) {
      console.log(`🔧 Removed ${this.assignedStudents.length - uniqueStudents.length} duplicate students from TeacherBatch`);
      this.assignedStudents = uniqueStudents;
    }
  }
  next();
});
module.exports = mongoose.model('TeacherBatch', teacherBatchSchema);