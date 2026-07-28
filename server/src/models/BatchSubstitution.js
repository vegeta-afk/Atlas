const mongoose = require('mongoose');

const batchSubstitutionSchema = new mongoose.Schema({
  leave: { type: mongoose.Schema.Types.ObjectId, ref: 'FacultyLeave', required: true, index: true },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
  onLeaveFacultyUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  substituteFacultyUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  substituteFacultyName: { type: String },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('BatchSubstitution', batchSubstitutionSchema);