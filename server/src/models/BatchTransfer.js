// models/BatchTransfer.js
const mongoose = require('mongoose');

const batchTransferSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  studentName: {
    type: String,
    required: true,
  },
  rollNo: {
    type: String,
    required: true,
  },
  previousBatch: {
    type: String,
    required: true,
  },
  previousBatchTime: {
    type: String,
  },
  previousTeacher: {
    type: String,
  },
  previousTeacherId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Faculty',
  default: null,  // Default to null if not provided
  required: false // Not required
},
  newBatch: {
    type: String,
    required: true,
  },
  newBatchTime: {
    type: String,
  },
  newTeacher: {
    type: String,
    required: true,
  },
  newTeacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true,
  },
  transferReason: {
    type: String,
    required: true,
  },
  remarks: {
    type: String,
  },
  requestDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedDate: {
    type: Date,
  },
  rejectionReason: {
    type: String,
  },
}, {
  timestamps: true,
});

// Generate requestId before saving
batchTransferSchema.pre('save', async function(next) {
  if (!this.requestId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = await this.constructor.countDocuments() + 1;
    this.requestId = `TRF${year}${month}${count.toString().padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('BatchTransfer', batchTransferSchema);