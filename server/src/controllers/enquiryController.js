const Enquiry = require("../models/Enquiry");
const Admission = require("../models/Admission");
const asyncHandler = require("express-async-handler");

// @desc    Get all enquiries
// @route   GET /api/enquiries
// @access  Private
const getEnquiries = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    method,
    startDate,
    endDate,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  // Build filter
  let filter = { isActive: true };

  if (search) {
    filter.$or = [
      { enquiryNo: { $regex: search, $options: "i" } },
      { applicantName: { $regex: search, $options: "i" } },
      { contactNo: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (status && status !== "all") {
    filter.status = status;
  }

  if (method && method !== "all") {
    filter.enquiryMethod = method;
  }

  if (startDate || endDate) {
    filter.enquiryDate = {};
    if (startDate) filter.enquiryDate.$gte = new Date(startDate);
    if (endDate) filter.enquiryDate.$lte = new Date(endDate);
  }

  // Sort
  const sort = {};
  sort[sortBy] = sortOrder === "desc" ? -1 : 1;

  // Pagination
  const skip = (page - 1) * parseInt(limit);

  const [enquiries, total] = await Promise.all([
  Enquiry.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .select("-__v")
    .lean(),
  Enquiry.countDocuments(filter),
]);

  res.status(200).json({
    success: true,
    count: enquiries.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: enquiries,
  });
});

// @desc    Get single enquiry
// @route   GET /api/enquiries/:id
// @access  Private
const getEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id).select("-__v").lean();

  if (!enquiry) {
    res.status(404);
    throw new Error("Enquiry not found");
  }

  res.status(200).json({
    success: true,
    data: enquiry,
  });
});

// @desc    Create new enquiry
// @route   POST /api/enquiries
// @access  Private
const createEnquiry = asyncHandler(async (req, res) => {
  const enquiryData = req.body;

  // Add createdBy
  enquiryData.createdBy = req.user.id;

  const enquiry = await Enquiry.create(enquiryData);

  res.status(201).json({
    success: true,
    message: "Enquiry created successfully",
    data: enquiry,
  });
});

// @desc    Update enquiry
// @route   PUT /api/enquiries/:id
// @access  Private
const updateEnquiry = asyncHandler(async (req, res) => {
  let enquiry = await Enquiry.findById(req.params.id);

  if (!enquiry) {
    res.status(404);
    throw new Error("Enquiry not found");
  }

  // Add updatedBy
  req.body.updatedBy = req.user.id;

  enquiry = await Enquiry.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).select("-__v");

  res.status(200).json({
    success: true,
    message: "Enquiry updated successfully",
    data: enquiry,
  });
});

// @desc    Delete enquiry
// @route   DELETE /api/enquiries/:id
// @access  Private/Admin
const deleteEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id);

  if (!enquiry) {
    res.status(404);
    throw new Error("Enquiry not found");
  }

  // Soft delete
  enquiry.isActive = false;
  await enquiry.save();

  res.status(200).json({
    success: true,
    message: "Enquiry deleted successfully",
  });
});

// @desc    Update enquiry status
// @route   PUT /api/enquiries/:id/status
// @access  Private
const updateStatus = asyncHandler(async (req, res) => {
  const { status, followUpDate } = req.body;

  const enquiry = await Enquiry.findById(req.params.id);

  if (!enquiry) {
    res.status(404);
    throw new Error("Enquiry not found");
  }

  enquiry.status = status;
  if (followUpDate) enquiry.followUpDate = followUpDate;
  enquiry.updatedBy = req.user.id;

  await enquiry.save();

  res.status(200).json({
    success: true,
    message: "Enquiry status updated successfully",
    data: enquiry,
  });
});

// @desc    Convert enquiry to admission
// @route   POST /api/enquiries/:id/convert-to-admission
// @access  Private
const convertToAdmission = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id);

  if (!enquiry) {
    res.status(404);
    throw new Error("Enquiry not found");
  }

  if (enquiry.convertedToAdmission) {
    res.status(400);
    throw new Error("Enquiry already converted to admission");
  }

  // Map enquiry data to admission
  const admissionData = {
    // Student Information
    fullName: enquiry.applicantName,
    dateOfBirth: enquiry.dateOfBirth,
    gender: enquiry.gender,

    // Contact Information
    email: enquiry.email,
    mobileNumber: enquiry.contactNo,
    alternateNumber: enquiry.whatsappNo,
    city: enquiry.city,
    state: enquiry.state,

    // Academic Information
    lastQualification: enquiry.qualification,
    percentage: enquiry.percentage,
    yearOfPassing: enquiry.yearOfPassing,
    schoolCollege: enquiry.schoolCollege,

    // Course Information
    course: enquiry.courseInterested,
    batchTime: enquiry.batchTime,

    // Source Information
    source: enquiry.enquiryMethod,
    referenceName: enquiry.reference,
    referenceContact: enquiry.guardianContact,

    // Enquiry Reference
    enquiryId: enquiry._id,
    enquiryNo: enquiry.enquiryNo,

    // Status
    status: "new",
    priority: "high",
    remarks: `Converted from enquiry: ${enquiry.enquiryNo}. ${
      enquiry.remark || ""
    }`,

    // Created by
    createdBy: req.user.id,
  };

  // Create admission
  const admission = await Admission.create(admissionData);

  // Update enquiry
  enquiry.convertedToAdmission = true;
  enquiry.status = "converted";
  enquiry.admissionId = admission._id;
  enquiry.updatedBy = req.user.id;
  await enquiry.save();

  res.status(201).json({
    success: true,
    message: "Enquiry converted to admission successfully",
    data: {
      enquiry,
      admission,
    },
  });
});

// @desc    Get dashboard stats
// @route   GET /api/enquiries/stats/dashboard
// @access  Private
const getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalEnquiries,
    todayEnquiries,
    newEnquiries,
    contactedEnquiries,
    followUpEnquiries,
    convertedEnquiries,
    rejectedEnquiries,
  ] = await Promise.all([
    Enquiry.countDocuments({ isActive: true }),
    Enquiry.countDocuments({
      enquiryDate: { $gte: today, $lt: tomorrow },
      isActive: true,
    }),
    Enquiry.countDocuments({ status: "new", isActive: true }),
    Enquiry.countDocuments({ status: "contacted", isActive: true }),
    Enquiry.countDocuments({ status: "follow_up", isActive: true }),
    Enquiry.countDocuments({ status: "converted", isActive: true }),
    Enquiry.countDocuments({ status: "rejected", isActive: true }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      total: totalEnquiries,
      today: todayEnquiries,
      byStatus: {
        new: newEnquiries,
        contacted: contactedEnquiries,
        follow_up: followUpEnquiries,
        converted: convertedEnquiries,
        rejected: rejectedEnquiries,
      },
    },
  });
});

module.exports = {
  getEnquiries,
  getEnquiry,
  createEnquiry,
  updateEnquiry,
  deleteEnquiry,
  updateStatus,
  convertToAdmission,
  getDashboardStats,
};
