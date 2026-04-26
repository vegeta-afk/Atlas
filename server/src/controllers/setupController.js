// controllers/setupController.js
const {
  Qualification,
  Area,
  Holiday,
  Batch,
  EnquiryMethod,
  Fee,
  CallStatus,
  CallReason,
  NextAction,
} = require("../models/Setup");
// Get all setup data
exports.getAllSetupData = async (req, res) => {
  try {
    const [qualifications, areas, holidays, batches, enquiryMethods, fees, callStatuses, callReasons, nextActions] =
      await Promise.all([
        Qualification.find().sort({ order: 1, qualificationName: 1 }),
        Area.find().sort({ areaName: 1 }),
        Holiday.find().sort({ holidayDate: 1 }),
        Batch.find().sort({ order: 1, startTime: 1 }),
        EnquiryMethod.find().sort({ order: 1, methodName: 1 }),
        Fee.find().sort({ feeName: 1 }),
        CallStatus.find().sort({ order: 1 }),      // ✅ added
        CallReason.find().sort({ order: 1 }),      // ✅ added
        NextAction.find().sort({ order: 1 }),      // ✅ added
      ]);

    res.json({
      success: true,
      data: {
        qualifications,
        areas,
        holidays,
        batches,
        enquiryMethods,
        fees,
        callStatuses,    // ✅ added
        callReasons,     // ✅ added
        nextActions,     // ✅ added
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ========== NEW FUNCTION: Get Active Data (for forms) ==========
exports.getActiveData = async (req, res) => {
  try {
    console.log("Fetching active setup data...");

    // Add 'fees' variable here:
    const [qualifications, areas, batches, enquiryMethods, fees] = await Promise.all([ // ADD 'fees'
      Qualification.find({ isActive: true }).sort({ qualificationName: 1 }),
      Area.find({ isActive: true }).sort({ areaName: 1 }),
      Batch.find({ isActive: true }).sort({ order: 1, startTime: 1 }),
      EnquiryMethod.find({ isActive: true }).sort({ order: 1, methodName: 1 }),
      Fee.find({ isActive: true }).sort({ feeName: 1 }), // This returns fees
    ]);

    res.json({
      success: true,
      message: "Active setup data fetched successfully",
      data: {
        qualifications,
        areas,
        batches,
        enquiryMethods,
        fees, // This should work now
      },
    });
  } catch (error) {
    console.error("Get active data error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ========== FEE CRUD OPERATIONS ==========

exports.createFee = async (req, res) => {
  try {
    console.log("Creating fee:", req.body);

    const fee = await Fee.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Fee created successfully",
      data: fee,
    });
  } catch (error) {
    console.error("Create fee error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create fee",
    });
  }
};

// Update fee
exports.updateFee = async (req, res) => {
  try {
    const fee = await Fee.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: "Fee not found",
      });
    }

    res.json({
      success: true,
      message: "Fee updated successfully",
      data: fee,
    });
  } catch (error) {
    console.error("Update fee error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update fee",
    });
  }
};

// Delete fee
exports.deleteFee = async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: "Fee not found",
      });
    }

    await fee.deleteOne();
    res.json({
      success: true,
      message: "Fee deleted successfully",
    });
  } catch (error) {
    console.error("Delete fee error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete fee",
    });
  }
};

// ========== ENQUIRY METHOD CRUD OPERATIONS ==========

// Create enquiry method
exports.createEnquiryMethod = async (req, res) => {
  try {
    console.log("Creating enquiry method:", req.body);

    const enquiryMethod = await EnquiryMethod.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Enquiry method created successfully",
      data: enquiryMethod,
    });
  } catch (error) {
    console.error("Create enquiry method error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create enquiry method",
    });
  }
};

// Update enquiry method
exports.updateEnquiryMethod = async (req, res) => {
  try {
    const enquiryMethod = await EnquiryMethod.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!enquiryMethod) {
      return res.status(404).json({
        success: false,
        message: "Enquiry method not found",
      });
    }

    res.json({
      success: true,
      message: "Enquiry method updated successfully",
      data: enquiryMethod,
    });
  } catch (error) {
    console.error("Update enquiry method error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update enquiry method",
    });
  }
};

// Delete enquiry method
exports.deleteEnquiryMethod = async (req, res) => {
  try {
    const enquiryMethod = await EnquiryMethod.findById(req.params.id);

    if (!enquiryMethod) {
      return res.status(404).json({
        success: false,
        message: "Enquiry method not found",
      });
    }

    await enquiryMethod.deleteOne();
    res.json({
      success: true,
      message: "Enquiry method deleted successfully",
    });
  } catch (error) {
    console.error("Delete enquiry method error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete enquiry method",
    });
  }
};

// Update enquiry method order
exports.updateEnquiryMethodOrder = async (req, res) => {
  try {
    const { enquiryMethods } = req.body;

    const updatePromises = enquiryMethods.map((method) =>
      EnquiryMethod.findByIdAndUpdate(
        method.id,
        { order: method.order },
        { new: true }
      )
    );

    await Promise.all(updatePromises);
    res.json({
      success: true,
      message: "Enquiry method order updated successfully",
    });
  } catch (error) {
    console.error("Update enquiry method order error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update enquiry method order",
    });
  }
};

// ========== QUALIFICATION CRUD (EXISTING - UNCHANGED) ==========
exports.createQualification = async (req, res) => {
  try {
    console.log("Creating qualification:", req.body);

    const qualification = await Qualification.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Qualification created successfully",
      data: qualification,
    });
  } catch (error) {
    console.error("Create qualification error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create qualification",
    });
  }
};

exports.updateQualification = async (req, res) => {
  try {
    const qualification = await Qualification.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!qualification) {
      return res.status(404).json({
        success: false,
        message: "Qualification not found",
      });
    }

    res.json({
      success: true,
      message: "Qualification updated successfully",
      data: qualification,
    });
  } catch (error) {
    console.error("Update qualification error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update qualification",
    });
  }
};

exports.deleteQualification = async (req, res) => {
  try {
    const qualification = await Qualification.findById(req.params.id);

    if (!qualification) {
      return res.status(404).json({
        success: false,
        message: "Qualification not found",
      });
    }

    await qualification.deleteOne();
    res.json({
      success: true,
      message: "Qualification deleted successfully",
    });
  } catch (error) {
    console.error("Delete qualification error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete qualification",
    });
  }
};

// ========== AREA CRUD (EXISTING - UNCHANGED) ==========
exports.createArea = async (req, res) => {
  try {
    console.log("Creating area:", req.body);

    const area = await Area.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Area created successfully",
      data: area,
    });
  } catch (error) {
    console.error("Create area error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create area",
    });
  }
};

exports.updateArea = async (req, res) => {
  try {
    const area = await Area.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    res.json({
      success: true,
      message: "Area updated successfully",
      data: area,
    });
  } catch (error) {
    console.error("Update area error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update area",
    });
  }
};

exports.deleteArea = async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    await area.deleteOne();
    res.json({
      success: true,
      message: "Area deleted successfully",
    });
  } catch (error) {
    console.error("Delete area error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete area",
    });
  }
};

// ========== HOLIDAY CRUD (EXISTING - UNCHANGED) ==========
exports.createHoliday = async (req, res) => {
  try {
    console.log("Creating holiday:", req.body);

    const holiday = await Holiday.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Holiday created successfully",
      data: holiday,
    });
  } catch (error) {
    console.error("Create holiday error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create holiday",
    });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    res.json({
      success: true,
      message: "Holiday updated successfully",
      data: holiday,
    });
  } catch (error) {
    console.error("Update holiday error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update holiday",
    });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    await holiday.deleteOne();
    res.json({
      success: true,
      message: "Holiday deleted successfully",
    });
  } catch (error) {
    console.error("Delete holiday error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete holiday",
    });
  }
};

// ========== CALL STATUS CONTROLLERS ==========
exports.createCallStatus = async (req, res) => {
  try {
    const { name, value, description, order } = req.body;
    
    const existing = await CallStatus.findOne({ value });
    if (existing) {
      return res.status(400).json({ success: false, message: "Status with this value already exists" });
    }
    
    const callStatus = new CallStatus({ name, value, description, order, createdBy: req.user?.id });
    await callStatus.save();
    
    res.status(201).json({ success: true, data: callStatus });
  } catch (error) {
    console.error("Create call status error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCallStatuses = async (req, res) => {
  try {
    const callStatuses = await CallStatus.find().sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: callStatuses });
  } catch (error) {
    console.error("Get call statuses error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCallStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, value, description, order, isActive } = req.body;
    
    const callStatus = await CallStatus.findByIdAndUpdate(
      id,
      { name, value, description, order, isActive },
      { new: true }
    );
    
    if (!callStatus) {
      return res.status(404).json({ success: false, message: "Call status not found" });
    }
    
    res.json({ success: true, data: callStatus });
  } catch (error) {
    console.error("Update call status error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCallStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const callStatus = await CallStatus.findByIdAndDelete(id);
    
    if (!callStatus) {
      return res.status(404).json({ success: false, message: "Call status not found" });
    }
    
    res.json({ success: true, message: "Call status deleted successfully" });
  } catch (error) {
    console.error("Delete call status error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== CALL REASON CONTROLLERS ==========
exports.createCallReason = async (req, res) => {
  try {
    const { name, value, description, order } = req.body;
    
    const existing = await CallReason.findOne({ value });
    if (existing) {
      return res.status(400).json({ success: false, message: "Reason with this value already exists" });
    }
    
    const callReason = new CallReason({ name, value, description, order, createdBy: req.user?.id });
    await callReason.save();
    
    res.status(201).json({ success: true, data: callReason });
  } catch (error) {
    console.error("Create call reason error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCallReasons = async (req, res) => {
  try {
    const callReasons = await CallReason.find().sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: callReasons });
  } catch (error) {
    console.error("Get call reasons error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCallReason = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, value, description, order, isActive } = req.body;
    
    const callReason = await CallReason.findByIdAndUpdate(
      id,
      { name, value, description, order, isActive },
      { new: true }
    );
    
    if (!callReason) {
      return res.status(404).json({ success: false, message: "Call reason not found" });
    }
    
    res.json({ success: true, data: callReason });
  } catch (error) {
    console.error("Update call reason error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCallReason = async (req, res) => {
  try {
    const { id } = req.params;
    const callReason = await CallReason.findByIdAndDelete(id);
    
    if (!callReason) {
      return res.status(404).json({ success: false, message: "Call reason not found" });
    }
    
    res.json({ success: true, message: "Call reason deleted successfully" });
  } catch (error) {
    console.error("Delete call reason error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== NEXT ACTION CONTROLLERS ==========
exports.createNextAction = async (req, res) => {
  try {
    const { name, value, description, order } = req.body;
    
    const existing = await NextAction.findOne({ value });
    if (existing) {
      return res.status(400).json({ success: false, message: "Action with this value already exists" });
    }
    
    const nextAction = new NextAction({ name, value, description, order, createdBy: req.user?.id });
    await nextAction.save();
    
    res.status(201).json({ success: true, data: nextAction });
  } catch (error) {
    console.error("Create next action error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNextActions = async (req, res) => {
  try {
    const nextActions = await NextAction.find().sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: nextActions });
  } catch (error) {
    console.error("Get next actions error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateNextAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, value, description, order, isActive } = req.body;
    
    const nextAction = await NextAction.findByIdAndUpdate(
      id,
      { name, value, description, order, isActive },
      { new: true }
    );
    
    if (!nextAction) {
      return res.status(404).json({ success: false, message: "Next action not found" });
    }
    
    res.json({ success: true, data: nextAction });
  } catch (error) {
    console.error("Update next action error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteNextAction = async (req, res) => {
  try {
    const { id } = req.params;
    const nextAction = await NextAction.findByIdAndDelete(id);
    
    if (!nextAction) {
      return res.status(404).json({ success: false, message: "Next action not found" });
    }
    
    res.json({ success: true, message: "Next action deleted successfully" });
  } catch (error) {
    console.error("Delete next action error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== BATCH CRUD (EXISTING - UNCHANGED) ==========
exports.createBatch = async (req, res) => {
  try {
    console.log("Creating batch:", req.body);

    const batch = await Batch.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Batch created successfully",
      data: batch,
    });
  } catch (error) {
    console.error("Create batch error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create batch",
    });
  }
};

exports.updateBatch = async (req, res) => {
  try {
    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    res.json({
      success: true,
      message: "Batch updated successfully",
      data: batch,
    });
  } catch (error) {
    console.error("Update batch error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update batch",
    });
  }
};

exports.deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    await batch.deleteOne();
    res.json({
      success: true,
      message: "Batch deleted successfully",
    });
  } catch (error) {
    console.error("Delete batch error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete batch",
    });
  }
};

exports.updateBatchOrder = async (req, res) => {
  try {
    const { batches } = req.body;

    const updatePromises = batches.map((batch) =>
      Batch.findByIdAndUpdate(batch.id, { order: batch.order }, { new: true })
    );

    await Promise.all(updatePromises);
    res.json({
      success: true,
      message: "Batch order updated successfully",
    });
  } catch (error) {
    console.error("Update batch order error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update batch order",
    });
  }
};


exports.updateQualificationOrder = async (req, res) => {
  try {
    const { qualifications } = req.body;
    
    if (!qualifications || !Array.isArray(qualifications)) {
      return res.status(400).json({
        success: false,
        message: "Invalid data format. Expected { qualifications: [] }"
      });
    }
    
    // Update each qualification's order
    const updatePromises = qualifications.map(({ id, order }) => 
      Qualification.findByIdAndUpdate(id, { order }, { new: true })
    );
    
    await Promise.all(updatePromises);
    
    res.json({ 
      success: true, 
      message: "Qualification order updated successfully" 
    });
  } catch (error) {
    console.error("Error updating qualification order:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

const {
  Qualification, Area, Holiday, Batch, EnquiryMethod,
  Fee, CallStatus, CallReason, NextAction,
  Category, // ✅ add this
} = require("../models/Setup");

// Add Category to getAllSetupData
exports.getAllSetupData = async (req, res) => {
  try {
    const [qualifications, areas, holidays, batches, enquiryMethods, fees,
      callStatuses, callReasons, nextActions, categories] =  // ✅ add categories
      await Promise.all([
        Qualification.find().sort({ order: 1, qualificationName: 1 }),
        Area.find().sort({ areaName: 1 }),
        Holiday.find().sort({ holidayDate: 1 }),
        Batch.find().sort({ order: 1, startTime: 1 }),
        EnquiryMethod.find().sort({ order: 1, methodName: 1 }),
        Fee.find().sort({ feeName: 1 }),
        CallStatus.find().sort({ order: 1 }),
        CallReason.find().sort({ order: 1 }),
        NextAction.find().sort({ order: 1 }),
        Category.find().sort({ order: 1, categoryName: 1 }), // ✅ add this
      ]);

    res.json({
      success: true,
      data: {
        qualifications, areas, holidays, batches, enquiryMethods,
        fees, callStatuses, callReasons, nextActions,
        categories, // ✅ add this
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ========== CATEGORY CRUD ==========
exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json({ success: true, message: "Category created successfully", data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    res.json({ success: true, message: "Category updated successfully", data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    await category.deleteOne();
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCategoryOrder = async (req, res) => {
  try {
    const { categories } = req.body;
    const updatePromises = categories.map(({ id, order }) =>
      Category.findByIdAndUpdate(id, { order }, { new: true })
    );
    await Promise.all(updatePromises);
    res.json({ success: true, message: "Category order updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};