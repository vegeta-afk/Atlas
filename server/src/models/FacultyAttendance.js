const mongoose = require('mongoose');

const facultyAttendanceSchema = new mongoose.Schema({
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, required: true, index: true },
  checkInTime: { type: String, default: null }, // "HH:MM", 24hr
  checkInLocation: {
    lat: Number,
    lng: Number,
    distanceMeters: Number,
  },
  checkOutTime: { type: String, default: null },
  checkOutLocation: {
    lat: Number,
    lng: Number,
    distanceMeters: Number,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    default: 'present',
  },
}, { timestamps: true });

facultyAttendanceSchema.index({ faculty: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('FacultyAttendance', facultyAttendanceSchema);