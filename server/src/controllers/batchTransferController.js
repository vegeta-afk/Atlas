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