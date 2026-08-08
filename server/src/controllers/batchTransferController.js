// controllers/batchTransferController.js
const mongoose = require('mongoose');
const BatchTransfer = require('../models/BatchTransfer');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const User = require('../models/user');
const { Batch } = require('../models/Setup');
const TeacherBatch = require('../models/TeacherBatch');
const Attendance = require('../models/Attendance');

// @desc    Get all batch transfers
// @route   GET /api/batch-transfers
// @access  Private
// In controllers/batchTransferController.js - Update the getTransfers function

// controllers/batchTransferController.js - Update getTransfers

exports.getTransfers = async (req, res) => {
  try {
    console.log("🔍 getTransfers called with query:", req.query);
    
    const { page = 1, limit = 10, status, search, fromDate, toDate } = req.query;
    
    // Build filter object
    const filter = {};
    if (status && status !== 'undefined') filter.status = status;
    
    console.log("🔍 Filter:", filter);

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // First, get ALL transfers without filter to see what's in the database
    const allTransfers = await BatchTransfer.find({});
    console.log(`📊 Total transfers in database: ${allTransfers.length}`);
    
    if (allTransfers.length > 0) {
      console.log("📋 First transfer in DB:", JSON.stringify(allTransfers[0], null, 2));
    } else {
      console.log("❌ No transfers found in database!");
    }

    // Get total count for pagination with filter
    const total = await BatchTransfer.countDocuments(filter);
    console.log(`📊 Filtered count: ${total}`);

    // Get transfers with filter
    const transfers = await BatchTransfer.find(filter)
      .populate('studentId', 'fullName studentId admissionNo photo')
      .populate('previousTeacherId', 'facultyName facultyNo')
      .populate('newTeacherId', 'facultyName facultyNo')
      .populate('approvedBy', 'username name')
      .populate('requestedBy', 'username name fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    console.log(`📋 Returning ${transfers.length} transfers`);

    // Get stats
    const stats = {
      total: await BatchTransfer.countDocuments(),
      pending: await BatchTransfer.countDocuments({ status: 'pending' }),
      approved: await BatchTransfer.countDocuments({ status: 'approved' }),
      rejected: await BatchTransfer.countDocuments({ status: 'rejected' }),
    };
    
    console.log("📊 Stats:", stats);

    res.json({
      success: true,
      data: transfers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      stats,
    });
  } catch (error) {
    console.error('❌ Get transfers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single batch transfer
// @route   GET /api/batch-transfers/:id
// @access  Private
exports.getTransferById = async (req, res) => {
  try {
    const transfer = await BatchTransfer.findById(req.params.id)
      .populate('studentId')
      .populate('previousTeacherId')
      .populate('newTeacherId')
      .populate('approvedBy', 'username name');
      .populate('requestedBy', 'username name fullName');

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer request not found',
      });
    }

    res.json({
      success: true,
      data: transfer,
    });
  } catch (error) {
    console.error('Get transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create new batch transfer request
// @route   POST /api/batch-transfers
// @access  Private
// In controllers/batchTransferController.js, update the createTransfer function:

// controllers/batchTransferController.js - Update createTransfer

// In controllers/batchTransferController.js, make sure your createTransfer function handles null:

exports.createTransfer = async (req, res) => {
  try {
    console.log("📥 Received transfer request body:", JSON.stringify(req.body, null, 2));
    
    const {
      studentId,
      studentName,
      rollNo,
      previousBatch,
      previousBatchTime,
      previousTeacher,
      previousTeacherId,
      newBatch,
      newBatchTime,
      newTeacher,
      newTeacherId,
      transferReason,
      remarks,
      requestId,
      requestDate,
    } = req.body;

    // Validate required fields
    if (!studentId || !studentName || !rollNo || !newBatch || !newTeacher || !newTeacherId || !transferReason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check if faculty exists
    const faculty = await Faculty.findById(newTeacherId);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found',
      });
    }

    // Prepare transfer data - handle empty previousTeacherId
    const transferData = {
      studentId,
      studentName,
      rollNo,
      previousBatch: previousBatch || '',
      previousBatchTime: previousBatchTime || '',
      previousTeacher: previousTeacher || '',
      // CRITICAL: If previousTeacherId is empty string or falsy, set to null
      previousTeacherId: previousTeacherId && previousTeacherId !== '' ? previousTeacherId : null,
      newBatch,
      newBatchTime: newBatchTime || '',
      newTeacher,
      newTeacherId,
      transferReason,
      remarks: remarks || '',
      requestDate: requestDate ? new Date(requestDate) : new Date(),
      status: 'pending',
      requestedBy: req.user?.id || null,
      requestedByName: req.user?.name || req.user?.fullName || req.user?.username || 'Unknown',
    };

    // Only set requestId if provided, otherwise let pre-save hook generate it
    if (requestId) {
      transferData.requestId = requestId;
    }

    console.log("📝 Creating transfer with data:", JSON.stringify(transferData, null, 2));

    const transfer = await BatchTransfer.create(transferData);
    console.log("✅ Transfer created successfully:", transfer._id);

    res.status(201).json({
      success: true,
      message: 'Batch transfer request created successfully',
      data: transfer,
    });
  } catch (error) {
    console.error('❌ Create transfer error:', error);
    console.error('Error stack:', error.stack);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate request ID',
        field: Object.keys(error.keyPattern)[0]
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update batch transfer request
// @route   PUT /api/batch-transfers/:id
// @access  Private
exports.updateTransfer = async (req, res) => {
  try {
    const transfer = await BatchTransfer.findById(req.params.id);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer request not found',
      });
    }

    // Only allow updates if status is pending
    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update request that is already processed',
      });
    }

    const updatedTransfer = await BatchTransfer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Transfer request updated successfully',
      data: updatedTransfer,
    });
  } catch (error) {
    console.error('Update transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Approve batch transfer
// @route   PUT /api/batch-transfers/:id/approve
// @access  Private (Admin only)
exports.approveTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("📝 Approve transfer request for ID:", req.params.id);
    console.log("📝 Request body:", req.body);
    
    const { approvedBy } = req.body;
    
    // Find the transfer request
    const transfer = await BatchTransfer.findById(req.params.id).session(session);
    if (!transfer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Transfer request not found',
      });
    }

    // Check if already processed
    if (transfer.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Request is already ${transfer.status}`,
      });
    }

    console.log("📋 Transfer details:", {
      studentId: transfer.studentId,
      fromBatch: transfer.previousBatchTime,
      toBatch: transfer.newBatchTime,
      fromTeacher: transfer.previousTeacher,
      toTeacher: transfer.newTeacher
    });

    // Find the student
    const student = await Student.findById(transfer.studentId).session(session);
    if (!student) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Find the new faculty
    const newFaculty = await Faculty.findById(transfer.newTeacherId).session(session);
    if (!newFaculty) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'New faculty not found',
      });
    }

    // Find the new faculty's user account
    const User = require("../models/user");
    const newFacultyUser = await User.findOne({ 
      facultyId: newFaculty._id,
      role: "instructor" 
    }).session(session);

    if (!newFacultyUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'New faculty user account not found',
      });
    }

    // Find the new batch
    const { Batch } = require("../models/Setup");
    const newBatch = await Batch.findOne({
      $or: [
        { displayName: transfer.newBatchTime },
        { displayName: { $regex: transfer.newBatchTime, $options: "i" } }
      ]
    }).session(session);

    if (!newBatch) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'New batch not found',
      });
    }

    // ============================================
    // STEP 1: REMOVE student from ALL TeacherBatches
    // ============================================
    const TeacherBatch = require("../models/TeacherBatch");
    
    // Find ALL TeacherBatches containing this student
    const allStudentBatches = await TeacherBatch.find({
      "assignedStudents.student": student._id
    }).session(session);

    console.log(`📊 Found student in ${allStudentBatches.length} TeacherBatches`);

    for (const tb of allStudentBatches) {
      const tbUser = await User.findById(tb.teacher).session(session);
      const tbFaculty = tbUser ? await Faculty.findById(tbUser.facultyId).session(session) : null;
      
      console.log(`   Removing from: ${tbFaculty ? tbFaculty.facultyName : 'unknown'}`);
      
      tb.assignedStudents = tb.assignedStudents.filter(
        s => s.student.toString() !== student._id.toString()
      );
      await tb.save({ session });
    }

    // ============================================
    // STEP 2: Add student to NEW TeacherBatch
    // ============================================
    let newTeacherBatch = await TeacherBatch.findOne({
      teacher: newFacultyUser._id,
      batch: newBatch._id,
      isActive: true
    }).session(session);

    if (!newTeacherBatch) {
      // Create new TeacherBatch
      newTeacherBatch = new TeacherBatch({
        teacher: newFacultyUser._id,
        batch: newBatch._id,
        assignedStudents: [{
          student: student._id,
          assignedDate: new Date(),
          isActive: true
        }],
        isActive: true,
        roomNumber: "Default",
        subject: newFaculty.courseAssigned || "General",
        assignedBy: approvedBy || req.user?.id
      });
      await newTeacherBatch.save({ session });
      console.log(`✅ Created new TeacherBatch: ${newTeacherBatch._id}`);
    } else {
      // Check if student already in batch (shouldn't be, but check anyway)
      const alreadyAssigned = newTeacherBatch.assignedStudents.some(
        s => s.student.toString() === student._id.toString()
      );
      
      if (!alreadyAssigned) {
        newTeacherBatch.assignedStudents.push({
          student: student._id,
          assignedDate: new Date(),
          isActive: true
        });
        await newTeacherBatch.save({ session });
        console.log(`✅ Added student to existing TeacherBatch: ${newTeacherBatch._id}`);
      }
    }

    // ============================================
    // STEP 3: VERIFY student is ONLY in ONE TeacherBatch
    // ============================================
    const finalCheck = await TeacherBatch.find({
      "assignedStudents.student": student._id
    }).session(session);

    if (finalCheck.length !== 1) {
      console.error(`❌ CRITICAL: Student is in ${finalCheck.length} TeacherBatches after transfer!`);
      
      // Force cleanup - keep only the new one
      for (const tb of finalCheck) {
        if (tb._id.toString() !== newTeacherBatch._id.toString()) {
          tb.assignedStudents = tb.assignedStudents.filter(
            s => s.student.toString() !== student._id.toString()
          );
          await tb.save({ session });
          console.log(`🔧 Cleaned up duplicate entry: ${tb._id}`);
        }
      }
    } else {
      console.log(`✅ Verification passed: Student in exactly 1 TeacherBatch`);
    }

    // ============================================
    // STEP 4: Update attendance records
    // ============================================
    const Attendance = require("../models/Attendance");
    
    // Update FUTURE attendance to new teacher/batch
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureUpdate = await Attendance.updateMany(
      {
        student: student._id,
        date: { $gte: today }
      },
      {
        $set: {
          teacher: newFacultyUser._id,
          batch: newBatch._id
        }
      }
    ).session(session);
    
    console.log(`✅ Updated ${futureUpdate.modifiedCount} future attendance records`);

    // ============================================
    // STEP 5: Update student document
    // ============================================
    student.batchTime = transfer.newBatchTime;
    student.facultyAllot = transfer.newTeacher;
    
    await student.save({ session });
    console.log(`✅ Student updated successfully`);

    // ============================================
    // STEP 6: Update transfer status
    // ============================================
    transfer.status = 'approved';
    transfer.approvedBy = approvedBy || req.user?.id;
    transfer.approvedDate = new Date();
    
    await transfer.save({ session });

    // ============================================
    // STEP 7: Commit transaction
    // ============================================
    await session.commitTransaction();
    session.endSession();
    
    console.log("✅ Transfer approved successfully with all safeguards");

    res.json({
      success: true,
      message: 'Batch transfer approved successfully. Student moved to new batch.',
      data: transfer
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Approve transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during transfer approval',
      error: error.message,
    });
  }
};

// @desc    Reject batch transfer
// @route   PUT /api/batch-transfers/:id/reject
// @access  Private (Admin only)
exports.rejectTransfer = async (req, res) => {
  try {
    const { rejectionReason, approvedBy } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide rejection reason',
      });
    }

    const transfer = await BatchTransfer.findById(req.params.id);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer request not found',
      });
    }

    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${transfer.status}`,
      });
    }

    transfer.status = 'rejected';
    transfer.rejectionReason = rejectionReason;
    transfer.approvedBy = approvedBy || req.user?.id;
    transfer.approvedDate = new Date();
    await transfer.save();

    res.json({
      success: true,
      message: 'Batch transfer rejected',
      data: transfer,
    });
  } catch (error) {
    console.error('Reject transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete batch transfer
// @route   DELETE /api/batch-transfers/:id
// @access  Private (Admin only)
exports.deleteTransfer = async (req, res) => {
  try {
    const transfer = await BatchTransfer.findById(req.params.id);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer request not found',
      });
    }

    await transfer.deleteOne();

    res.json({
      success: true,
      message: 'Transfer request deleted successfully',
    });
  } catch (error) {
    console.error('Delete transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get transfer statistics
// @route   GET /api/batch-transfers/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const stats = {
      total: await BatchTransfer.countDocuments(),
      pending: await BatchTransfer.countDocuments({ status: 'pending' }),
      approved: await BatchTransfer.countDocuments({ status: 'approved' }),
      rejected: await BatchTransfer.countDocuments({ status: 'rejected' }),
      thisMonth: await BatchTransfer.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          $lte: new Date(),
        },
      }),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Revert batch transfer back to pending (undo approve/reject)
// @route   PUT /api/batch-transfers/:id/revert
// @access  Private (Admin only)
exports.revertTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await BatchTransfer.findById(req.params.id).session(session);
    if (!transfer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Transfer request not found',
      });
    }

    if (transfer.status === 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Request is already pending',
      });
    }

    // ── If it was APPROVED, undo the student/batch changes ──────────
    if (transfer.status === 'approved') {
      const student = await Student.findById(transfer.studentId).session(session);
      if (!student) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'Student not found, cannot revert',
        });
      }

      // Find the PREVIOUS faculty (the one before approval)
      let prevFaculty = null;
      if (transfer.previousTeacherId) {
        prevFaculty = await Faculty.findById(transfer.previousTeacherId).session(session);
      }
      if (!prevFaculty && transfer.previousTeacher) {
        prevFaculty = await Faculty.findOne({ facultyName: transfer.previousTeacher }).session(session);
      }

      // Find the PREVIOUS batch
      let prevBatch = null;
      if (transfer.previousBatchTime) {
        prevBatch = await Batch.findOne({
          $or: [
            { displayName: transfer.previousBatchTime },
            { displayName: { $regex: transfer.previousBatchTime, $options: "i" } }
          ]
        }).session(session);
      }

      // Remove student from ALL current TeacherBatches
      const currentBatches = await TeacherBatch.find({
        "assignedStudents.student": student._id
      }).session(session);

      for (const tb of currentBatches) {
        tb.assignedStudents = tb.assignedStudents.filter(
          s => s.student.toString() !== student._id.toString()
        );
        await tb.save({ session });
      }

      // Re-assign to previous faculty/batch, if we can find both
      if (prevFaculty && prevBatch) {
        const prevFacultyUser = await User.findOne({
          facultyId: prevFaculty._id,
          role: "instructor"
        }).session(session);

        if (prevFacultyUser) {
          let prevTeacherBatch = await TeacherBatch.findOne({
            teacher: prevFacultyUser._id,
            batch: prevBatch._id,
            isActive: true
          }).session(session);

          if (!prevTeacherBatch) {
            prevTeacherBatch = new TeacherBatch({
              teacher: prevFacultyUser._id,
              batch: prevBatch._id,
              assignedStudents: [{
                student: student._id,
                assignedDate: new Date(),
                isActive: true
              }],
              isActive: true,
              roomNumber: "Default",
              subject: prevFaculty.courseAssigned || "General",
            });
            await prevTeacherBatch.save({ session });
          } else {
            const alreadyAssigned = prevTeacherBatch.assignedStudents.some(
              s => s.student.toString() === student._id.toString()
            );
            if (!alreadyAssigned) {
              prevTeacherBatch.assignedStudents.push({
                student: student._id,
                assignedDate: new Date(),
                isActive: true
              });
              await prevTeacherBatch.save({ session });
            }
          }

          // Revert future attendance back to previous teacher/batch
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          await Attendance.updateMany(
            {
              student: student._id,
              date: { $gte: today }
            },
            {
              $set: {
                teacher: prevFacultyUser._id,
                batch: prevBatch._id
              }
            }
          ).session(session);
        } else {
          console.warn(`⚠️ Previous faculty user account not found — student removed from current batch but not reassigned`);
        }
      } else {
        console.warn(`⚠️ Could not find previous faculty/batch — student removed from current batch but not reassigned`);
      }

      // Revert student fields back to what they were before approval
      student.batchTime = transfer.previousBatchTime || transfer.previousBatch || student.batchTime;
      student.facultyAllot = transfer.previousTeacher || student.facultyAllot;
      await student.save({ session });
    }

    // ── Reset transfer back to pending ───────────────────────────────
    transfer.status = 'pending';
    transfer.approvedBy = undefined;
    transfer.approvedDate = undefined;
    transfer.rejectionReason = undefined;
    await transfer.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Transfer reverted to pending successfully',
      data: transfer,
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('❌ Revert transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during transfer revert',
      error: error.message,
    });
  }
};

// @desc    Bulk transfer multiple students to a new batch/faculty immediately
// @route   POST /api/batch-transfers/bulk
// @access  Private (Admin only)
exports.bulkTransferStudents = async (req, res) => {
  const { studentIds, newTeacherId, newBatch, transferReason } = req.body;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Please select at least one student' });
  }
  if (!newTeacherId || !newBatch) {
    return res.status(400).json({ success: false, message: 'New teacher and new batch are required' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  const results = { success: [], failed: [] };

  try {
    const newFaculty = await Faculty.findById(newTeacherId).session(session);
    if (!newFaculty) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'New faculty not found' });
    }

    const newFacultyUser = await User.findOne({
      facultyId: newFaculty._id,
      role: 'instructor',
    }).session(session);

    if (!newFacultyUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'New faculty user account not found' });
    }

    // Resolve new batch (by _id or displayName, same fallback as approveTransfer)
    let newBatchDoc = mongoose.Types.ObjectId.isValid(newBatch)
      ? await Batch.findById(newBatch).session(session)
      : null;

    if (!newBatchDoc) {
      newBatchDoc = await Batch.findOne({
        $or: [
          { displayName: newBatch },
          { displayName: { $regex: newBatch, $options: 'i' } },
        ],
      }).session(session);
    }

    if (!newBatchDoc) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'New batch not found' });
    }

    const newBatchDisplay = newBatchDoc.displayName || `${newBatchDoc.startTime} to ${newBatchDoc.endTime}`;

    // Find or create the target TeacherBatch once, reuse for all students
    let targetTeacherBatch = await TeacherBatch.findOne({
      teacher: newFacultyUser._id,
      batch: newBatchDoc._id,
      isActive: true,
    }).session(session);

    if (!targetTeacherBatch) {
      targetTeacherBatch = new TeacherBatch({
        teacher: newFacultyUser._id,
        batch: newBatchDoc._id,
        assignedStudents: [],
        isActive: true,
        roomNumber: 'Default',
        subject: newFaculty.courseAssigned || 'General',
        assignedBy: req.user?.id,
      });
      await targetTeacherBatch.save({ session });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let idx = 0;
    for (const studentId of studentIds) {
      idx++;
      try {
        const student = await Student.findById(studentId).session(session);
        if (!student) {
          results.failed.push({ studentId, reason: 'Student not found' });
          continue;
        }

        const previousBatch = student.batchTime || student.batch || '';
        const previousTeacher = student.facultyAllot || '';

        let previousTeacherId = null;
        if (previousTeacher) {
          const prevFac = await Faculty.findOne({ facultyName: previousTeacher }).session(session);
          if (prevFac) previousTeacherId = prevFac._id;
        }

        // Remove student from ALL existing TeacherBatches
        const existingBatches = await TeacherBatch.find({
          'assignedStudents.student': student._id,
        }).session(session);

        for (const tb of existingBatches) {
          tb.assignedStudents = tb.assignedStudents.filter(
            (s) => s.student.toString() !== student._id.toString()
          );
          await tb.save({ session });
        }

        // Add to target TeacherBatch if not already there
        const alreadyIn = targetTeacherBatch.assignedStudents.some(
          (s) => s.student.toString() === student._id.toString()
        );
        if (!alreadyIn) {
          targetTeacherBatch.assignedStudents.push({
            student: student._id,
            assignedDate: new Date(),
            isActive: true,
          });
        }

        // Update future attendance
        await Attendance.updateMany(
          { student: student._id, date: { $gte: today } },
          { $set: { teacher: newFacultyUser._id, batch: newBatchDoc._id } }
        ).session(session);

        // Update student record
        student.batchTime = newBatchDisplay;
        student.facultyAllot = newFaculty.facultyName;
        await student.save({ session });

        // Audit trail record — status 'approved' so it shows in history and can be reverted
        await BatchTransfer.create([{
          requestId: `BLK${Date.now()}${idx}${Math.floor(100 + Math.random() * 900)}`,
          studentId: student._id,
          studentName: student.fullName,
          rollNo: student.studentId || student.admissionNo || '',
          previousBatch: previousBatch,
          previousBatchTime: previousBatch,
          previousTeacher: previousTeacher,
          previousTeacherId: previousTeacherId,
          newBatch: newBatchDoc._id.toString(),
          newBatchTime: newBatchDisplay,
          newTeacher: newFaculty.facultyName,
          newTeacherId: newFaculty._id,
          transferReason: transferReason || 'Bulk faculty/batch reassignment',
          status: 'approved',
          approvedBy: req.user?.id,
          approvedDate: new Date(),
        }], { session });

        results.success.push(studentId);
      } catch (innerErr) {
        console.error(`❌ Bulk transfer failed for student ${studentId}:`, innerErr);
        results.failed.push({ studentId, reason: innerErr.message });
      }
    }

    await targetTeacherBatch.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `Bulk transfer complete: ${results.success.length} moved, ${results.failed.length} failed.`,
      data: results,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Bulk transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during bulk transfer',
      error: error.message,
    });
  }
};