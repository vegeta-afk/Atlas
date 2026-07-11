const Faculty = require("../models/Faculty");
const User = require("../models/user");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// @desc    Get all faculty
// @route   GET /api/faculty
// @access  Private (Admin, HR)
exports.getFaculty = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      shift,
      startDate,
      endDate,
      sortBy = "dateOfJoining",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};

    // Search filter
    if (search) {
      filter.$or = [
        { facultyName: { $regex: search, $options: "i" } },
        { facultyNo: { $regex: search, $options: "i" } },
        { mobileNo: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { courseAssigned: { $regex: search, $options: "i" } },
      ];
    }

    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // Shift filter
    if (shift && shift !== "all") {
      filter.shift = shift;
    }

    // Date range filter (for date of joining)
    if (startDate && endDate) {
      filter.dateOfJoining = {
        $gte: new Date(startDate + "T00:00:00.000Z"),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }

    // Build sort object
    const sortObject = {};
    sortObject[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query with pagination
    const faculty = await Faculty.find(filter)
      .sort(sortObject)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select("-__v");

    // Get total count for pagination
    const total = await Faculty.countDocuments(filter);

    // Calculate stats
    const activeCount = await Faculty.countDocuments({
      ...filter,
      status: "active",
    });
    const inactiveCount = await Faculty.countDocuments({
      ...filter,
      status: "inactive",
    });
    const onLeaveCount = await Faculty.countDocuments({
      ...filter,
      status: "on-leave",
    });

    // Count new faculty this month
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const newThisMonth = await Faculty.countDocuments({
      ...filter,
      dateOfJoining: { $gte: startOfMonth },
    });

    const stats = {
      total,
      active: activeCount,
      inactive: inactiveCount,
      onLeave: onLeaveCount,
      newThisMonth,
    };

    res.json({
      success: true,
      count: faculty.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      stats,
      data: faculty,
    });
  } catch (error) {
    console.error("Get faculty error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get single faculty by ID
// @route   GET /api/faculty/:id
// @access  Private (Admin, HR)
exports.getFacultyById = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id).select("-__v");

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }

    res.json({
      success: true,
      data: faculty,
    });
  } catch (error) {
    console.error("Get faculty by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Create new faculty
// @route   POST /api/faculty
// @access  Private (Admin, HR)
exports.createFaculty = async (req, res) => {

  try {
    console.log("📦 Create Faculty - Request Body:", req.body);
 
    // ── NEW: Cloudinary photo upload (same pattern as admission) ──────────
    let photoUrl = null;
    if (req.file) {
      const { uploadToCloudinary } = require("../config/cloudinary");
      const result = await uploadToCloudinary(req.file.buffer);
      photoUrl = result.secure_url;
      console.log("📸 Faculty photo uploaded to Cloudinary:", photoUrl);
    }
    // ─────────────────────────────────────────────────────────────────────
 
    // Check if mobile number already exists in ACTIVE records only
    if (req.body.mobileNo) {
      const existingMobile = await Faculty.findOne({
        mobileNo: req.body.mobileNo,
        isActive: true,
      });
      if (existingMobile) {
        return res.status(400).json({
          success: false,
          message: "Mobile number already registered",
        });
      }
    }
 
    // Check if email already exists in Faculty records
    if (req.body.email) {
      const existingFacultyEmail = await Faculty.findOne({
        email: req.body.email,
      });
      if (existingFacultyEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already registered in faculty records",
        });
      }
 
      // Check if email already exists in User records
      const existingUserEmail = await User.findOne({
        email: req.body.email.toLowerCase(),
      });
      if (existingUserEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already registered in user accounts",
        });
      }
    }
 
    // Build faculty data
    const facultyData = {
      facultyName:    req.body.facultyName,
      fathersName:    req.body.fathersName,
      dateOfJoining:  req.body.dateOfJoining,
      dateOfBirth:    req.body.dateOfBirth,
      shift:          req.body.shift,
      lunchTime:      req.body.lunchTime,
      email:          req.body.email || "",
      mobileNo:       req.body.mobileNo,
      whatsappNo:     req.body.whatsappNo || req.body.mobileNo,
      address:        req.body.address,
      fatherContactNo: req.body.fatherContactNo,
      motherContactNo: req.body.motherContactNo,
      basicStipend:   req.body.basicStipend,
      courseAssigned: req.body.courseAssigned || "",
      status:         req.body.status || "active",
      dateOfLeaving:  req.body.dateOfLeaving || null,
      createdBy:      req.user ? req.user.id : null,
      photo:          photoUrl || "",   // ← NEW
    };
 
    if (req.body.facultyNo) {
      facultyData.facultyNo = req.body.facultyNo;
    }
 
    // ✅ Step 1: Create Faculty record
    const faculty = await Faculty.create(facultyData);
    console.log("✅ Faculty created:", faculty._id.toString());
 
    // ✅ Step 2: Build user email
    const userEmail = req.body.email
      ? req.body.email.toLowerCase().trim()
      : `${req.body.facultyName.replace(/\s+/g, ".").toLowerCase()}@faculty.com`;
 
    console.log(`📧 User email will be: ${userEmail}`);
    console.log(`🔗 facultyId to link: ${faculty._id.toString()}`);
 
    // ✅ Step 3: Check if user already exists with this email
    const existingUser = await User.findOne({ email: userEmail });
 
    if (existingUser) {
      console.log(`⚠️ User already exists: ${existingUser._id}`);
      console.log(`   facultyId before update: ${existingUser.facultyId || "MISSING"}`);
 
      existingUser.facultyId  = faculty._id;
      existingUser.role       = "instructor";
      existingUser.name       = req.body.facultyName;
      existingUser.mobileNumber = req.body.mobileNo;
 
      await existingUser.save();
 
      const verifiedUser = await User.findById(existingUser._id).lean();
      console.log(`✅ Verified facultyId after update: ${verifiedUser.facultyId ? verifiedUser.facultyId.toString() : "STILL MISSING"}`);
 
      return res.status(201).json({
        success: true,
        message: "Faculty created and linked to existing user account",
        data: {
          faculty: faculty,
          user: {
            id: existingUser._id,
            email: existingUser.email,
            role: existingUser.role,
            defaultPassword: "Already set (existing account)",
          },
        },
      });
    }
 
    // ✅ Step 4: Create brand new user
    const defaultPassword = "Faculty@123";
    const salt            = await bcrypt.genSalt(10);
    const hashedPassword  = await bcrypt.hash(defaultPassword, salt);
 
    console.log("📝 Creating new User with data:");
    console.log({
      name:      req.body.facultyName,
      email:     userEmail,
      role:      "instructor",
      facultyId: faculty._id.toString(),
    });
 
    const newUser = new User({
      name:         req.body.facultyName,
      email:        userEmail,
      password:     hashedPassword,
      mobileNumber: req.body.mobileNo,
      role:         "instructor",
      facultyId:    new mongoose.Types.ObjectId(faculty._id),
      isVerified:   true,
    });
 
    // ✅ Step 5: Save and verify facultyId was written
    await newUser.save();
    console.log("✅ New user saved:", newUser._id.toString());
 
    // ✅ Step 6: Read back from DB to confirm facultyId is actually stored
    const savedUser = await User.findById(newUser._id).lean();
 
    if (!savedUser.facultyId) {
      console.error("🚨 CRITICAL: facultyId NOT saved, running force repair...");
 
      const updateResult = await User.findByIdAndUpdate(
        newUser._id,
        { $set: { facultyId: new mongoose.Types.ObjectId(faculty._id) } },
        { new: true }
      );
 
      if (updateResult && updateResult.facultyId) {
        console.log(`🔧 Force repair successful: ${updateResult.facultyId.toString()}`);
      } else {
        console.error("🔧 Force repair FAILED!");
        const db = mongoose.connection.db;
        const collection = db.collection("users");
        await collection.updateOne(
          { _id: newUser._id },
          { $set: { facultyId: faculty._id } }
        );
        console.log("🔧 Direct MongoDB update done");
      }
    } else {
      console.log("✅ Verified facultyId:", savedUser.facultyId.toString());
    }
 
    // ✅ Step 7: Final verification
    const finalUser = await User.findById(newUser._id).lean();
    console.log("🔍 FINAL VERIFICATION:", {
      id:          finalUser._id,
      email:       finalUser.email,
      facultyId:   finalUser.facultyId ? finalUser.facultyId.toString() : "❌ MISSING",
      hasFacultyId: !!finalUser.facultyId,
    });
 
    return res.status(201).json({
      success: true,
      message: "Faculty created successfully with login account",
      data: {
        faculty: faculty,
        user: {
          id:              newUser._id,
          email:           newUser.email,
          role:            newUser.role,
          defaultPassword: defaultPassword,
        },
      },
    });
 
  } catch (error) {
    console.error("❌ Create faculty error:", error);
 
    if (error.name === "ValidationError") {
      console.error("Validation errors:", error.errors);
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: error.errors,
      });
    }
 
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate entry. Faculty number or email already exists.",
      });
    }
 
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create faculty",
      error: error.message,
    });
  }
};

// @desc    Update faculty
// @route   PUT /api/faculty/:id
// @access  Private (Admin, HR)
exports.updateFaculty = async (req, res) => {
  try {
    // ── NEW: Cloudinary photo upload (same pattern as admission) ──────────
    if (req.file) {
      const { uploadToCloudinary } = require("../config/cloudinary");
      const result = await uploadToCloudinary(req.file.buffer);
      req.body.photo = result.secure_url;
      console.log("📸 Faculty photo updated on Cloudinary:", req.body.photo);
    }
    // ─────────────────────────────────────────────────────────────────────
 
    const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select("-__v");
 
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }
 
    // Also update User account if email or name changed
    if (req.body.email || req.body.facultyName) {
      const updateData = {};
      if (req.body.email) {
        updateData.email = req.body.email.toLowerCase();
      }
      if (req.body.facultyName) {
        updateData.name = req.body.facultyName;
      }
 
      await User.findOneAndUpdate(
        { facultyId: faculty._id },
        updateData,
        { new: true, runValidators: true }
      );
    }
 
    res.json({
      success: true,
      message: "Faculty updated successfully",
      data: faculty,
    });
  } catch (error) {
    console.error("Update faculty error:", error);
 
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: error.errors,
      });
    }
 
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update faculty status
// @route   PUT /api/faculty/:id/status
// @access  Private (Admin, HR)
exports.updateFacultyStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // ── Block deactivation if faculty has students currently assigned ──
    if (status === "inactive") {
      const facultyUser = await User.findOne({
        facultyId: new mongoose.Types.ObjectId(req.params.id),
        role: "instructor"
      }).select("_id").lean();

      if (facultyUser) {
        const TeacherBatch = require("../models/TeacherBatch");
        const teacherBatches = await TeacherBatch.find({
          teacher: facultyUser._id,
          isActive: true
        })
          .populate("assignedStudents.student", "_id")
          .lean();

        let totalActiveStudents = 0;
        let batchesWithStudents = 0;

        teacherBatches.forEach(tb => {
          const activeCount = (tb.assignedStudents || []).filter(s =>
            s && s.student && (s.isActive !== undefined ? s.isActive : true)
          ).length;
          if (activeCount > 0) {
            totalActiveStudents += activeCount;
            batchesWithStudents += 1;
          }
        });

        if (totalActiveStudents > 0) {
          return res.status(400).json({
            success: false,
            message: `Cannot deactivate this faculty. ${totalActiveStudents} student(s) are currently assigned across ${batchesWithStudents} batch(es). Please transfer these students to another faculty first.`
          });
        }
      }
    }

    const faculty = await Faculty.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).select("-__v");

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }

    res.json({
      success: true,
      message: "Faculty status updated successfully",
      data: faculty,
    });
  } catch (error) {
    console.error("Update faculty status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Delete faculty (HARD DELETE - permanent)
// @route   DELETE /api/faculty/:id
// @access  Private (Admin)
exports.deleteFaculty = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find faculty first
    const faculty = await Faculty.findById(req.params.id).session(session);

    if (!faculty) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }

    // Delete associated User account
    await User.findOneAndDelete({ facultyId: faculty._id }).session(session);

    // Delete faculty
    await Faculty.findByIdAndDelete(req.params.id).session(session);

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: "Faculty and associated login account permanently deleted successfully",
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();

    console.error("Delete faculty error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get all faculty with their batch assignments (for admin)
// @route   GET /api/faculty/admin/with-batches
// @access  Private (Admin)
exports.getFacultyWithBatches = async (req, res) => {
  try {
    const { search = "", status } = req.query;
    
    // Build filter object
    const filter = { isActive: true };
    
    // Search filter
    if (search) {
      filter.$or = [
        { facultyName: { $regex: search, $options: "i" } },
        { facultyNo: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    
    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }
    
    // Get all faculty
    const facultyList = await Faculty.find(filter)
      .select("_id facultyNo facultyName email mobileNo status shift courseAssigned dateOfJoining")
      .lean();
    
    // Get User IDs for each faculty
    const facultyIds = facultyList.map(f => f._id);
    const users = await User.find({ facultyId: { $in: facultyIds }, role: "instructor" })
      .select("_id facultyId")
      .lean();
    
    // Create map of facultyId -> userId
    const facultyToUserMap = {};
    users.forEach(user => {
      if (user.facultyId) {
        facultyToUserMap[user.facultyId.toString()] = user._id;
      }
    });
    
    // Get TeacherBatch data for each user
    const userIds = users.map(u => u._id);
    const TeacherBatch = require("../models/TeacherBatch");
    const Batch = require("../models/Setup").Batch;
    
    const teacherBatches = await TeacherBatch.find({
      teacher: { $in: userIds },
      isActive: true
    })
    .populate("batch", "batchName startTime endTime displayName")
    .populate("assignedStudents.student", "_id")
    .lean();
    
    // Create map of userId -> batches
    const userBatchesMap = {};
    teacherBatches.forEach(tb => {


      if (!tb.batch) {
    console.warn(`⚠️ Skipping TeacherBatch ${tb._id} — batch reference is null`);
    return;
  }

      const userId = tb.teacher.toString();
      if (!userBatchesMap[userId]) {
        userBatchesMap[userId] = [];
      }
      
      // Count active students
      const activeStudents = (tb.assignedStudents || []).filter(s => 
  s && s.student && (s.isActive !== undefined ? s.isActive : true)
).length;
      
      userBatchesMap[userId].push({
        _id: tb.batch._id,
        batchId: tb.batch._id,
        name: tb.batch.batchName || tb.batch.displayName,
        displayName: tb.batch.displayName,
        startTime: tb.batch.startTime,
        endTime: tb.batch.endTime,
        timing: `${tb.batch.startTime} - ${tb.batch.endTime}`,
        totalStudents: activeStudents,
        roomNumber: tb.roomNumber || "N/A",
        subject: tb.subject || "General",
        teacherBatchId: tb._id
      });
    });
    
    // Combine faculty data with batches
    const facultyWithBatches = facultyList.map(faculty => {
      const userId = facultyToUserMap[faculty._id.toString()];
      const batches = (userId ? userBatchesMap[userId.toString()] || [] : [])
  .filter(b => b.totalStudents > 0);
      
      return {
        _id: faculty._id,
        facultyId: faculty.facultyNo,
        name: faculty.facultyName,
        email: faculty.email,
        mobileNo: faculty.mobileNo,
        status: faculty.status,
        shift: faculty.shift,
        courseAssigned: faculty.courseAssigned,
        dateOfJoining: faculty.dateOfJoining,
        totalBatches: batches.length,
        totalStudents: batches.reduce((sum, batch) => sum + batch.totalStudents, 0),
        batches: batches
      };
    });
    
    // Calculate overall stats
    const stats = {
      totalFaculty: facultyWithBatches.length,
      activeFaculty: facultyWithBatches.filter(f => f.status === "active").length,
      onLeaveFaculty: facultyWithBatches.filter(f => f.status === "on-leave").length,
      totalBatches: facultyWithBatches.reduce((sum, f) => sum + f.totalBatches, 0),
      totalStudents: facultyWithBatches.reduce((sum, f) => sum + f.totalStudents, 0)
    };
    
    res.json({
      success: true,
      count: facultyWithBatches.length,
      stats,
      data: facultyWithBatches
    });
    
  } catch (error) {
    console.error("Get faculty with batches error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Get specific faculty's batches
// @route   GET /api/faculty/:id/batches
// @access  Private (Admin/Faculty - for their own)
exports.getFacultyBatches = async (req, res) => {
  try {
    const facultyId = req.params.id;
    const user = req.user;
    
    console.log(`🔍 API Called: getFacultyBatches for facultyId: ${facultyId}`);
    console.log(`   User role: ${user.role}`);
    console.log(`   User facultyId: ${user.facultyId}`);
    
    // Permission check
    if (user.role !== 'admin') {
      // Faculty can only view their own batches
      if (!user.facultyId || user.facultyId.toString() !== facultyId) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own batches"
        });
      }
    }
    
    // Get faculty
    const faculty = await Faculty.findById(facultyId)
      .select("_id facultyNo facultyName email status shift courseAssigned")
      .lean();
    
    if (!faculty) {
      console.log(`❌ Faculty not found: ${facultyId}`);
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }
    
    console.log(`✅ Faculty found: ${faculty.facultyName} (${faculty.email})`);
    
    // ✅ BULLETPROOF: Try multiple ways to find user
    let facultyUser = null;
    
    // Method 1: Search by facultyId with ObjectId casting
    try {
      facultyUser = await User.findOne({ 
        facultyId: new mongoose.Types.ObjectId(facultyId), 
        role: "instructor" 
      })
      .select("_id")
      .lean();
      
      console.log(`🔍 User lookup by facultyId: ${facultyUser ? 'FOUND' : 'NOT FOUND'}`);
    } catch (err) {
      console.log(`⚠️ Error in facultyId lookup: ${err.message}`);
    }
    
    // Method 2: If not found, try by email
    if (!facultyUser) {
      console.log(`⚠️ Trying email fallback for: ${faculty.email}`);
      facultyUser = await User.findOne({ 
        email: faculty.email.toLowerCase(), 
        role: "instructor" 
      })
      .select("_id")
      .lean();
      
      if (facultyUser) {
        console.log(`✅ Found user by email: ${facultyUser._id}`);
        
        // AUTO-REPAIR: Update the user with correct facultyId
        console.log(`🔧 Auto-repair: linking user ${facultyUser._id} to faculty ${facultyId}`);
        await User.findByIdAndUpdate(
          facultyUser._id,
          { $set: { facultyId: new mongoose.Types.ObjectId(facultyId) } }
        );
        console.log(`✅ Auto-repair complete`);
      } else {
        console.log(`❌ No user found by email either`);
      }
    }
    
    // Final check - if still no user, return error
    if (!facultyUser) {
      console.log(`❌ No user account found for faculty: ${faculty.facultyName}`);
      
      // Check if any user exists with this email (case insensitive)
      const anyUser = await User.findOne({ 
        email: { $regex: new RegExp(`^${faculty.email}$`, 'i') } 
      }).lean();
      
      if (anyUser) {
        console.log(`⚠️ Found user with different case: ${anyUser.email}`);
        console.log(`   Role: ${anyUser.role}, facultyId: ${anyUser.facultyId}`);
      }
      
      return res.status(404).json({
        success: false,
        message: "Faculty user account not found"
      });
    }
    
    console.log(`✅ User resolved: ${facultyUser._id}`);
    
    // Get teacher's batches
    const TeacherBatch = require("../models/TeacherBatch");
    
    const teacherBatches = await TeacherBatch.find({
      teacher: facultyUser._id,
      isActive: true
    })
    .populate("batch", "batchName startTime endTime displayName")
    .populate("assignedStudents.student", "_id")
    .lean();
    
    console.log(`✅ Teacher batches found: ${teacherBatches.length}`);
    
    // Transform batches with today's stats
    const currentDate = new Date();
    const todayStart = new Date(currentDate);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(currentDate);
    todayEnd.setHours(23, 59, 59, 999);
    
    const Attendance = require("../models/Attendance");
    
    const batchesWithStats = await Promise.all(teacherBatches
  .filter(tb => {
    if (!tb.batch) {
      console.warn(`⚠️ Skipping TeacherBatch ${tb._id} — batch is null`);
      return false;
    }
    return true;
  })
  .map(async (tb) => {
    const batch = tb.batch;
    const assignedStudents = tb.assignedStudents || [];
    const activeStudents = assignedStudents.filter(s => {
  if (!s || !s.student) return false;  // ← THIS WAS MISSING
  const isActive = s.isActive !== undefined ? s.isActive : true;
  return isActive;
}).length;
    
    const todayAttendance = await Attendance.find({
  teacher: facultyUser._id,  // ✅ FIXED: was user._id
  batch: batch._id,
  date: { $gte: todayStart, $lte: todayEnd }
}).lean();
      
      const todayPresent = todayAttendance.filter(a => a.status === "present").length;
      const todayAbsent = todayAttendance.filter(a => a.status === "absent").length;
      
      // Calculate monthly attendance rate
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthAttendance = await Attendance.find({
  teacher: facultyUser._id,  // ✅ FIXED: was user._id
  batch: batch._id,
  date: { $gte: firstDay }
}).lean();
      
      const totalDays = currentDate.getDate();
      const presentDays = monthAttendance.filter(a => a.status === "present").length;
      const attendanceRate = activeStudents > 0 && totalDays > 0
        ? Math.round((presentDays / (activeStudents * totalDays)) * 100)
        : 0;
      
      return {
        _id: batch._id,
        batchId: batch._id,
        name: batch.batchName || batch.displayName,
        displayName: batch.displayName,
        startTime: batch.startTime,
        endTime: batch.endTime,
        timing: `${batch.startTime} - ${batch.endTime}`,
        totalStudents: activeStudents,
        attendanceRate: attendanceRate,
        todayPresent: todayPresent,
        todayAbsent: todayAbsent,
        teacherBatchId: tb._id,
        roomNumber: tb.roomNumber || "N/A",
        subject: tb.subject || "General"
      };
    }));

    // ── Merge in bridge (temporary) batch assignments for this faculty ──
    const BridgeBatch = require("../models/BridgeBatch");
    const bridgeBatches = await BridgeBatch.find({
      tempFacultyId: facultyUser._id,
      status: { $in: ["active", "ready_to_merge"] },
    })
      .populate('tempBatchId', 'batchName displayName')
      .lean();

    const bridgeAttendanceCounts = await Promise.all(
      bridgeBatches.map((bb) =>
        Attendance.find({
          teacher: facultyUser._id,
          bridgeBatchId: bb._id,
          date: { $gte: todayStart, $lte: todayEnd },
        }).lean()
      )
    );

    const bridgeCards = bridgeBatches.map((bb, idx) => {
      const todayAtt = bridgeAttendanceCounts[idx];
      return {
        _id: bb._id,
        batchId: bb._id,
        name: bb.tempBatchId?.batchName || bb.tempBatchId?.displayName || "Bridge Batch",
        displayName: bb.tempBatchId?.displayName || bb.tempBatchId?.batchName || "Bridge Batch",
        startTime: bb.timeSlot?.startTime || "",
        endTime: bb.timeSlot?.endTime || "",
        timing: bb.timeSlot?.startTime && bb.timeSlot?.endTime
          ? `${bb.timeSlot.startTime} - ${bb.timeSlot.endTime}`
          : "N/A",
        totalStudents: (bb.studentIds || []).length,
        attendanceRate: 0,
        todayPresent: todayAtt.filter((a) => a.status === "present").length,
        todayAbsent: todayAtt.filter((a) => a.status === "absent").length,
        teacherBatchId: bb._id,
        roomNumber: "Bridge Batch",
        subject: bb.courseName || "General",
        isTemporary: true, // NEW — flags this card as a bridge batch on the frontend
      };
    });
    
    // Sort by start time
    const { includeEmpty } = req.query;
    const regularBatches = includeEmpty === 'true'
      ? batchesWithStats
      : batchesWithStats.filter(b => b.totalStudents > 0);
    regularBatches.sort((a, b) => a.startTime.localeCompare(b.startTime));

    const filteredBatches = [...regularBatches, ...bridgeCards]; // regular batches first, bridge ones appended
    
    console.log(`✅ Returning ${filteredBatches.length} batches`);
    
    res.json({
  success: true,
  data: {
    faculty: {
      _id: faculty._id,
      facultyId: faculty.facultyNo,
      name: faculty.facultyName,
      email: faculty.email,
      status: faculty.status,
      shift: faculty.shift,
      courseAssigned: faculty.courseAssigned,
      totalBatches: filteredBatches.length,           // ← fixes header "0"
      totalStudents: filteredBatches.reduce((sum, b) => sum + b.totalStudents, 0)  // ← fixes header "0"
    },
    batches: filteredBatches,
    totalBatches: filteredBatches.length,
    totalStudents: filteredBatches.reduce((sum, b) => sum + b.totalStudents, 0)
  }
});
    
  } catch (error) {
    console.error("❌ Get faculty batches error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Get students in faculty's batch
// @route   GET /api/faculty/:facultyId/batches/:batchId/students
// @access  Private (Admin/Faculty - for their own)
exports.getFacultyBatchStudents = async (req, res) => {
  try {
    const { facultyId, batchId } = req.params;
    const { date } = req.query;
    const user = req.user;
    
    console.log(`🔍 API Called: getFacultyBatchStudents`);
    console.log(`   User role: ${user.role}`);
    console.log(`   User facultyId: ${user.facultyId}`);
    console.log(`   Requested facultyId: ${facultyId}`);
    console.log(`   batchId: ${batchId}`);
    console.log(`   date: ${date || 'not provided'}`);
    
    // Permission check
    if (user.role !== 'admin') {
      // Faculty can only view their own batch students
      if (!user.facultyId || user.facultyId.toString() !== facultyId) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own batch students"
        });
      }
    }
    
    // Validate facultyId
    if (!mongoose.Types.ObjectId.isValid(facultyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid faculty ID format"
      });
    }
    
    // Validate batchId
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID format"
      });
    }
    
    // Get faculty
    const faculty = await Faculty.findById(facultyId)
      .select("_id facultyNo facultyName")
      .lean();
    
    if (!faculty) {
      console.log(`❌ Faculty not found: ${facultyId}`);
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }
    
    console.log(`✅ Faculty found: ${faculty.facultyName}`);
    
    // Get user account for this faculty
    const facultyUser = await User.findOne({ 
      facultyId: new mongoose.Types.ObjectId(facultyId), 
      role: "instructor" 
    })
    .select("_id")
    .lean();
    
    console.log(`🔍 User lookup: ${facultyUser ? 'FOUND' : 'NOT FOUND'}`);
    
    if (!facultyUser) {
      return res.status(404).json({
        success: false,
        message: "Faculty user account not found"
      });
    }
    
    console.log(`✅ User found: ${facultyUser._id}`);
    
    // Get TeacherBatch
    const TeacherBatch = require("../models/TeacherBatch");
    
    const teacherBatch = await TeacherBatch.findOne({
      teacher: facultyUser._id,
      batch: batchId,
      isActive: true
    })
    .populate("assignedStudents.student", "studentId fullName fatherName photo mobileNumber email enrolledBatches course") // ✅ Added fatherName here
    .populate("batch", "batchName startTime endTime displayName")
    .lean();
    
    console.log(`🔍 TeacherBatch lookup: ${teacherBatch ? 'FOUND' : 'NOT FOUND'}`);
    
    if (!teacherBatch) {
      console.log(`❌ TeacherBatch not found`);
      return res.status(404).json({
        success: false,
        message: "Faculty is not assigned to this batch"
      });
    }
    
    console.log(`✅ TeacherBatch found: ${teacherBatch._id}`);
    console.log(`   Batch: ${teacherBatch.batch?.displayName}`);
    console.log(`   Total assignedStudents: ${teacherBatch.assignedStudents?.length || 0}`);
    
    // Get active students
    const assignedStudents = teacherBatch.assignedStudents || [];
    console.log(`   assignedStudents array length: ${assignedStudents.length}`);
    
    const activeStudents = assignedStudents.filter(s => {
      if (!s || !s.student) return false;
      const isActive = s.isActive !== undefined ? s.isActive : true;
      return isActive;
    });
    
    console.log(`✅ Active students: ${activeStudents.length}`);
    
    if (activeStudents.length === 0) {
      console.log(`ℹ️ No active students found`);
      return res.json({
        success: true,
        data: {
          faculty: {
            _id: faculty._id,
            facultyId: faculty.facultyNo,
            name: faculty.facultyName
          },
          batch: {
            _id: batchId,
            name: teacherBatch.batch?.batchName || '',
            displayName: teacherBatch.batch?.displayName || '',
            timing: teacherBatch.batch ? 
              `${teacherBatch.batch.startTime || ''} - ${teacherBatch.batch.endTime || ''}` : '',
            roomNumber: teacherBatch.roomNumber || "N/A",
            subject: teacherBatch.subject || "General"
          },
          students: [],
          totalStudents: 0
        }
      });
    }
    
    // Get student IDs
    const studentIds = activeStudents
      .map(s => s.student?._id)
      .filter(id => id);
    
    console.log(`🔍 Valid student IDs: ${studentIds.length}`);
    
    // Get student details
    const Student = require("../models/Student");
    const students = await Student.find({ _id: { $in: studentIds } })
      .select("studentId fullName fatherName photo mobileNumber email enrolledBatches course") // ✅ Added fatherName here
      .lean();
    
    console.log(`✅ Students fetched from DB: ${students.length}`);
    
    // Get attendance if date provided
    let attendanceData = {};
    if (date) {
      const Attendance = require("../models/Attendance");
      try {
        const attendanceDate = new Date(date);
        const startOfDay = new Date(attendanceDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(attendanceDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const attendance = await Attendance.find({
          teacher: facultyUser._id,
          batch: batchId,
          student: { $in: studentIds },
          date: { $gte: startOfDay, $lte: endOfDay }
        }).lean();
        
        console.log(`📅 Attendance records: ${attendance.length}`);
        
        attendance.forEach(att => {
          if (att && att.student) {
            attendanceData[att.student.toString()] = att.status;
          }
        });
      } catch (attendanceError) {
        console.error("❌ Error fetching attendance:", attendanceError);
      }
    }
    
    // Prepare response
    const studentsWithInfo = students.map(student => {
      if (!student) return null;
      
      // Get student's courses from enrolledBatches
      let studentCourses = [];
      
      if (student.enrolledBatches && student.enrolledBatches.length > 0) {
        studentCourses = student.enrolledBatches
          .filter(eb => eb && eb.isActive && eb.courseName)
          .map(eb => eb.courseName);
      }
      
      // Fallback to main course field
      if (studentCourses.length === 0 && student.course) {
        studentCourses = [student.course];
      }
      
      return {
        _id: student._id,
        studentId: student.studentId || '',
        fullName: student.fullName || '',
        fatherName: student.fatherName || 'N/A', // ✅ Added fatherName here
        photo: student.photo || null,
        contact: student.mobileNumber || '',
        email: student.email || '',
        courses: studentCourses, // ✅ Fixed courses
        batchTiming: teacherBatch.batch?.displayName || 
                    (teacherBatch.batch ? 
                      `${teacherBatch.batch.startTime || ''} - ${teacherBatch.batch.endTime || ''}` : ''),
        todayStatus: attendanceData[student._id.toString()] || "not_marked"
      };
    }).filter(student => student !== null);
    
    console.log(`✅ Final students prepared: ${studentsWithInfo.length}`);
    
    res.json({
      success: true,
      data: {
        faculty: {
          _id: faculty._id,
          facultyId: faculty.facultyNo,
          name: faculty.facultyName
        },
        batch: {
          _id: batchId,
          name: teacherBatch.batch?.batchName || '',
          displayName: teacherBatch.batch?.displayName || '',
          timing: teacherBatch.batch ? 
            `${teacherBatch.batch.startTime || ''} - ${teacherBatch.batch.endTime || ''}` : '',
          roomNumber: teacherBatch.roomNumber || "N/A",
          subject: teacherBatch.subject || "General"
        },
        students: studentsWithInfo,
        totalStudents: studentsWithInfo.length
      }
    });
    
  } catch (error) {
    console.error("❌ Get faculty batch students error:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Get current faculty's batches (for logged-in faculty)
// @route   GET /api/faculty/me/batches
// @access  Private (Faculty only)
exports.getMyBatches = async (req, res) => {
  try {
    const user = req.user;
    
    console.log(`🔍 Faculty accessing their own batches: ${user._id}`);
    
    if (!user.facultyId) {
      return res.status(400).json({
        success: false,
        message: "User is not associated with any faculty"
      });
    }
    
    // Get faculty details
    const faculty = await Faculty.findById(user.facultyId)
      .select("_id facultyNo facultyName email status shift courseAssigned")
      .lean();
    
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }
    
    console.log(`✅ Faculty found: ${faculty.facultyName}`);
    
    // Get teacher's batches
    const TeacherBatch = require("../models/TeacherBatch");
    
    const teacherBatches = await TeacherBatch.find({
      teacher: user._id,
      isActive: true
    })
    .populate("batch", "batchName startTime endTime displayName")
    .populate("assignedStudents.student", "_id")
    .lean();
    
    console.log(`✅ Found ${teacherBatches.length} batches for faculty`);
    
    // Transform batches with today's stats
    const currentDate = new Date();
    const todayStart = new Date(currentDate);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(currentDate);
    todayEnd.setHours(23, 59, 59, 999);
    
    const Attendance = require("../models/Attendance");
    
    const batchesWithStats = await Promise.all(teacherBatches
  .filter(tb => {
    if (!tb.batch) {
      console.warn(`⚠️ Skipping TeacherBatch ${tb._id} — batch is null`);
      return false;
    }
    return true;
  })
  .map(async (tb) => {
    const batch = tb.batch;
    const assignedStudents = tb.assignedStudents || [];
    const activeStudents = assignedStudents.filter(s => {
  if (!s || !s.student) return false;  // ← THIS WAS MISSING
  const isActive = s.isActive !== undefined ? s.isActive : true;
  return isActive;
}).length;
    
    const todayAttendance = await Attendance.find({
  teacher: user._id,   // ← use req.user directly
  batch: batch._id,
  date: { $gte: todayStart, $lte: todayEnd }
}).lean();
      
      const todayPresent = todayAttendance.filter(a => a.status === "present").length;
      const todayAbsent = todayAttendance.filter(a => a.status === "absent").length;
      
      // Calculate monthly attendance rate
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthAttendance = await Attendance.find({
        teacher: user._id,
        batch: batch._id,
        date: { $gte: firstDay }
      }).lean();
      
      const totalDays = currentDate.getDate();
      const presentDays = monthAttendance.filter(a => a.status === "present").length;
      const attendanceRate = activeStudents > 0 && totalDays > 0
        ? Math.round((presentDays / (activeStudents * totalDays)) * 100)
        : 0;
      
      return {
        _id: batch._id,
        batchId: batch._id,
        name: batch.batchName || batch.displayName,
        displayName: batch.displayName,
        startTime: batch.startTime,
        endTime: batch.endTime,
        timing: `${batch.startTime} - ${batch.endTime}`,
        totalStudents: activeStudents,
        attendanceRate: attendanceRate,
        todayPresent: todayPresent,
        todayAbsent: todayAbsent,
        teacherBatchId: tb._id,
        roomNumber: tb.roomNumber || "N/A",
        subject: tb.subject || "General"
      };
    }));
    
    // Sort by start time
    // ── Merge in bridge (temporary) batch assignments for this faculty ──
    const BridgeBatch = require("../models/BridgeBatch");
    const bridgeBatches = await BridgeBatch.find({
      tempFacultyId: user._id,
      status: { $in: ["active", "ready_to_merge"] },
    })
      .populate('tempBatchId', 'batchName displayName')
      .lean();

    const bridgeAttendanceCounts = await Promise.all(
      bridgeBatches.map((bb) =>
        Attendance.find({
          teacher: user._id,
          bridgeBatchId: bb._id,
          date: { $gte: todayStart, $lte: todayEnd },
        }).lean()
      )
    );

    const bridgeCards = bridgeBatches.map((bb, idx) => {
      const todayAtt = bridgeAttendanceCounts[idx];
      return {
        _id: bb._id,
        batchId: bb._id,
        name: bb.tempBatchId?.batchName || bb.tempBatchId?.displayName || "Bridge Batch",
        displayName: bb.tempBatchId?.displayName || bb.tempBatchId?.batchName || "Bridge Batch",
        startTime: bb.timeSlot?.startTime || "",
        endTime: bb.timeSlot?.endTime || "",
        timing: bb.timeSlot?.startTime && bb.timeSlot?.endTime
          ? `${bb.timeSlot.startTime} - ${bb.timeSlot.endTime}`
          : "N/A",
        totalStudents: (bb.studentIds || []).length,
        attendanceRate: 0,
        todayPresent: todayAtt.filter((a) => a.status === "present").length,
        todayAbsent: todayAtt.filter((a) => a.status === "absent").length,
        teacherBatchId: bb._id,
        roomNumber: "Bridge Batch",
        subject: bb.courseName || "General",
        isTemporary: true,
      };
    });

    // Sort by start time
    const regularBatches = batchesWithStats.filter(b => b.totalStudents > 0);
    regularBatches.sort((a, b) => a.startTime.localeCompare(b.startTime));

    const filteredBatches = [...regularBatches, ...bridgeCards];
    
    res.json({
  success: true,
  data: {
    faculty: {
      _id: faculty._id,
      facultyId: faculty.facultyNo,
      name: faculty.facultyName,
      email: faculty.email,
      status: faculty.status,
      shift: faculty.shift,
      courseAssigned: faculty.courseAssigned,
      totalBatches: filteredBatches.length,
      totalStudents: filteredBatches.reduce((sum, b) => sum + b.totalStudents, 0)
    },
    batches: filteredBatches,
    totalBatches: filteredBatches.length,
    totalStudents: filteredBatches.reduce((sum, b) => sum + b.totalStudents, 0)
  }
});
    
  } catch (error) {
    console.error("Get my batches error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Get current faculty's batch students
// @route   GET /api/faculty/me/batches/:batchId/students
// @access  Private (Faculty only)
exports.getMyBatchStudents = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { date } = req.query;
    const user = req.user;
    
    console.log(`🔍 Faculty accessing batch students: ${user._id}, batch: ${batchId}`);
    
    if (!user.facultyId) {
      return res.status(400).json({
        success: false,
        message: "User is not associated with any faculty"
      });
    }
    
    // Get faculty
    const faculty = await Faculty.findById(user.facultyId)
      .select("_id facultyNo facultyName")
      .lean();
    
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }
    
    // Get TeacherBatch to verify faculty has this batch
    const TeacherBatch = require("../models/TeacherBatch");
    
    const teacherBatch = await TeacherBatch.findOne({
      teacher: user._id,
      batch: batchId,
      isActive: true
    })
    .populate("assignedStudents.student", "studentId fullName photo mobileNumber email")
    .populate("batch", "batchName startTime endTime displayName")
    .lean();
    
    if (!teacherBatch) {
      return res.status(404).json({
        success: false,
        message: "You are not assigned to this batch"
      });
    }
    
    console.log(`✅ TeacherBatch found with ${teacherBatch.assignedStudents?.length || 0} students`);
    
    // Get active students
    const assignedStudents = teacherBatch.assignedStudents || [];
    const activeStudents = assignedStudents.filter(s => {
      const isActive = s.isActive !== undefined ? s.isActive : true;
      return isActive && s.student;
    });
    
    const studentIds = activeStudents.map(s => s.student._id);
    
    // Get student details
    const Student = require("../models/Student");
    const students = await Student.find({ _id: { $in: studentIds } })
      .select("studentId fullName photo mobileNumber email enrolledBatches")
      .lean();
    
    console.log(`✅ Found ${students.length} student details`);
    
    // Get attendance for the date if provided
    let attendanceData = {};
    if (date) {
      const Attendance = require("../models/Attendance");
      const attendanceDate = new Date(date);
      const startOfDay = new Date(attendanceDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(attendanceDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const attendance = await Attendance.find({
        teacher: user._id,
        batch: batchId,
        student: { $in: studentIds },
        date: { $gte: startOfDay, $lte: endOfDay }
      }).lean();
      
      attendance.forEach(att => {
        attendanceData[att.student.toString()] = att.status;
      });
    }
    
    // Prepare response
    const studentsWithInfo = students.map(student => {
      const enrolledBatches = student.enrolledBatches || [];
      const studentCourses = enrolledBatches
        .filter(eb => {
          const isActive = eb.isActive !== undefined ? eb.isActive : true;
          return isActive && eb.courseName;
        })
        .map(eb => eb.courseName)
        .filter((name, index, array) => name && array.indexOf(name) === index);
      
      return {
        _id: student._id,
        studentId: student.studentId,
        name: student.fullName,
        fullName: student.fullName,
        photo: student.photo,
        contact: student.mobileNumber,
        email: student.email,
        courses: studentCourses,
        batchTiming: teacherBatch.batch?.displayName || 
                    `${teacherBatch.batch?.startTime || ''} - ${teacherBatch.batch?.endTime || ''}`,
        todayStatus: attendanceData[student._id.toString()] || "not_marked"
      };
    });
    
    res.json({
      success: true,
      data: {
        faculty: {
          _id: faculty._id,
          facultyId: faculty.facultyNo,
          name: faculty.facultyName
        },
        batch: {
          _id: batchId,
          name: teacherBatch.batch?.batchName,
          displayName: teacherBatch.batch?.displayName,
          timing: `${teacherBatch.batch?.startTime || ''} - ${teacherBatch.batch?.endTime || ''}`,
          roomNumber: teacherBatch.roomNumber || "N/A",
          subject: teacherBatch.subject || "General"
        },
        students: studentsWithInfo,
        totalStudents: studentsWithInfo.length
      }
    });
    
  } catch (error) {
    console.error("Get my batch students error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// @desc    Get faculty statistics
// @route   GET /api/faculty/stats/dashboard
// @access  Private (Admin, HR)
exports.getFacultyStats = async (req, res) => {
  try {
    const total = await Faculty.countDocuments({ isActive: true });
    const active = await Faculty.countDocuments({
      isActive: true,
      status: "active",
    });
    const inactive = await Faculty.countDocuments({
      isActive: true,
      status: "inactive",
    });
    const onLeave = await Faculty.countDocuments({
      isActive: true,
      status: "on-leave",
    });

    // Count by shift
    const shiftStats = await Faculty.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$shift",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // New faculty this month
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const newThisMonth = await Faculty.countDocuments({
      isActive: true,
      dateOfJoining: { $gte: startOfMonth },
    });

    res.json({
      success: true,
      data: {
        total,
        active,
        inactive,
        onLeave,
        newThisMonth,
        shiftStats,
      },
    });
  } catch (error) {
    console.error("Faculty stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get faculty's free batch slots (based on shift timing)
// @route   GET /api/faculty/:id/free-batches
// @access  Private (Admin)
exports.getFacultyFreeBatches = async (req, res) => {
  try {
    const facultyId = req.params.id;

    // Get faculty with shift and lunch time
    const faculty = await Faculty.findById(facultyId)
      .select("_id facultyNo facultyName email status shift lunchTime courseAssigned photo")
      .lean();

    if (!faculty) {
      return res.status(404).json({ success: false, message: "Faculty not found" });
    }

    // ── Parse shift time range e.g. "08:00-12:00" ──
    const parseTimeRange = (str) => {
      if (!str) return null;
      const match = str.match(/(\d{2}):(\d{2})[^\d]*(\d{2}):(\d{2})/);
      if (!match) return null;
      return {
        start: parseInt(match[1]) * 60 + parseInt(match[2]), // minutes from midnight
        end:   parseInt(match[3]) * 60 + parseInt(match[4]),
      };
    };

    const toMinutes = (timeStr) => {
      if (!timeStr) return null;
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    const shiftRange  = parseTimeRange(faculty.shift);
    const lunchRange  = parseTimeRange(faculty.lunchTime);

    if (!shiftRange) {
      return res.status(400).json({
        success: false,
        message: "Faculty shift time format is invalid"
      });
    }

    // ── Get all setup batches ──
    const { Batch } = require("../models/Setup");
    const allBatches = await Batch.find({}).lean();

    // ── Filter: batches within shift, excluding lunch ──
    const batchesInShift = allBatches.filter(batch => {
      const bStart = toMinutes(batch.startTime);
      const bEnd   = toMinutes(batch.endTime);
      if (bStart === null || bEnd === null) return false;

      // Must fall within shift
      const inShift = bStart >= shiftRange.start && bEnd <= shiftRange.end;
      if (!inShift) return false;

      // Must NOT overlap with lunch
      if (lunchRange) {
        const overlapsLunch = bStart < lunchRange.end && bEnd > lunchRange.start;
        if (overlapsLunch) return false;
      }

      return true;
    });

    // ── Get faculty's user account ──
    const facultyUser = await User.findOne({
      facultyId: new mongoose.Types.ObjectId(facultyId),
      role: "instructor"
    }).select("_id").lean();

    // ── Get TeacherBatch records for this faculty ──
    const TeacherBatch = require("../models/TeacherBatch");
    let occupiedBatchIds = new Set();

    if (facultyUser) {
      const teacherBatches = await TeacherBatch.find({
        teacher: facultyUser._id,
        isActive: true
      })
      .populate("assignedStudents.student", "_id")
      .lean();

      teacherBatches.forEach(tb => {
        // Count real active students
        const activeCount = (tb.assignedStudents || []).filter(s =>
          s && s.student && (s.isActive !== undefined ? s.isActive : true)
        ).length;

        // Mark as occupied only if has real students
        if (activeCount > 0) {
          occupiedBatchIds.add(tb.batch.toString());
        }
      });
    }

    // ── Free = in shift + not occupied ──
    const freeBatches = batchesInShift
      .filter(b => !occupiedBatchIds.has(b._id.toString()))
      .sort((a, b) => {
        const aMin = toMinutes(a.startTime);
        const bMin = toMinutes(b.startTime);
        return aMin - bMin;
      })
      .map(b => ({
        _id: b._id,
        batchId: b._id,
        name: b.batchName || b.displayName,
        displayName: b.displayName,
        startTime: b.startTime,
        endTime: b.endTime,
        timing: `${b.startTime} - ${b.endTime}`,
        totalStudents: 0,
      }));

    res.json({
      success: true,
      data: {
        faculty: {
          _id: faculty._id,
          facultyId: faculty.facultyNo,
          name: faculty.facultyName,
          email: faculty.email,
          status: faculty.status,
          shift: faculty.shift,
          lunchTime: faculty.lunchTime,
          courseAssigned: faculty.courseAssigned,
          photo: faculty.photo,
        },
        freeBatches,
        totalFreeBatches: freeBatches.length,
        shiftRange: faculty.shift,
        lunchRange: faculty.lunchTime,
      }
    });

  } catch (error) {
    console.error("❌ Get faculty free batches error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};