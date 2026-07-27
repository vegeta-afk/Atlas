const mongoose = require('mongoose');

const facultyLeaveSchema = new mongoose.Schema({
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  facultyName: { type: String },
  leaveType: { type: String, enum: ['sick', 'casual', 'personal', 'other'], default: 'casual' },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  reason: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedDate: { type: Date },
  rejectionReason: { type: String },

  // Issued only on approval — lets a substitute log in as this teacher during the leave window
  tempCredentials: {
    username: { type: String },
    passwordPlain: { type: String },
    isActive: { type: Boolean, default: false },
    originalPasswordHash: { type: String, select: false }, // stored so the real teacher's password can be restored
},
}, { timestamps: true });

module.exports = mongoose.model('FacultyLeave', facultyLeaveSchema);