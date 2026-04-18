// pages/frontoffice/setup/SetupList.jsx
import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  GraduationCap,
  MapPin,
  Calendar,
  Clock,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  DollarSign,
  Phone,
} from "lucide-react";
import toast from "react-hot-toast";
import { setupAPI } from "../../../services/api";

const SetupList = () => {
  const [activeTab, setActiveTab] = useState("qualifications");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Data states
  const [qualifications, setQualifications] = useState([]);
  const [areas, setAreas] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [batches, setBatches] = useState([]);
  const [enquiryMethods, setEnquiryMethods] = useState([]);
  const [fees, setFees] = useState([]);

  // Call Log Settings states
  const [callStatuses, setCallStatuses] = useState([]);
  const [callReasons, setCallReasons] = useState([]);
  const [nextActions, setNextActions] = useState([]);
  const [callLogSubTab, setCallLogSubTab] = useState("call-status");

  // Separate form states for each tab
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Qualification form
  const [qualificationForm, setQualificationForm] = useState({
    qualificationName: "",
    description: "",
    order: 0,
  });

  // Area form
  const [areaForm, setAreaForm] = useState({
    areaName: "",
    pincode: "",
    city: "",
  });

  // Holiday form
  const [holidayForm, setHolidayForm] = useState({
    holidayDate: "",
    holidayName: "",
    description: "",
    isRecurring: false,
  });

  // Batch form
  const [batchForm, setBatchForm] = useState({
    batchName: "",
    startTime: "",
    endTime: "",
    order: 0,
  });

  // Enquiry Method form
  const [enquiryMethodForm, setEnquiryMethodForm] = useState({
    methodName: "",
    description: "",
    order: 0,
  });

  const capitalizeFirst = (value) => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};




  // Fee form - REMOVED feeType field
  const [feeForm, setFeeForm] = useState({
    feeName: "",
    amount: "",
    description: "",
    isActive: true,
  });

  // Call Status form
  const [callStatusForm, setCallStatusForm] = useState({
    name: "",
    value: "",
    description: "",
    order: 0,
  });

  // Call Reason form
  const [callReasonForm, setCallReasonForm] = useState({
    name: "",
    value: "",
    description: "",
    order: 0,
  });

  // Next Action form
  const [nextActionForm, setNextActionForm] = useState({
    name: "",
    value: "",
    description: "",
    order: 0,
  });

  // Validation state for fee name
  const [feeNameError, setFeeNameError] = useState("");

  useEffect(() => {
    fetchSetupData();
  }, []);

  const fetchSetupData = async () => {
    try {
      setLoading(true);
      const response = await setupAPI.getAll();
      if (response.data.success) {
        const {
          qualifications,
          areas,
          holidays,
          batches,
          enquiryMethods,
          fees,
          callStatuses,
          callReasons,
          nextActions,
        } = response.data.data;
        setQualifications(qualifications.sort((a, b) => a.order - b.order));
        setAreas(areas);
        setHolidays(holidays);
        setBatches(batches.sort((a, b) => a.order - b.order));
        setEnquiryMethods(enquiryMethods.sort((a, b) => a.order - b.order));
        setFees(fees || []);
        setCallStatuses(callStatuses || []);
        setCallReasons(callReasons || []);
        setNextActions(nextActions || []);
      }
    } catch (error) {
      console.error("Fetch setup data error:", error);
      toast.error("Failed to load setup data");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm("");
    setShowForm(false);
    setEditingId(null);
    resetForm();
    if (tab === "call-log") {
      setCallLogSubTab("call-status");
    }
  };

  const resetForm = () => {
    if (activeTab === "qualifications") {
      setQualificationForm({
        qualificationName: "",
        description: "",
        order: 0,
      });
    } else if (activeTab === "areas") {
      setAreaForm({
        areaName: "",
        pincode: "",
        city: "",
      });
    } else if (activeTab === "holidays") {
      setHolidayForm({
        holidayDate: "",
        holidayName: "",
        description: "",
        isRecurring: false,
      });
    } else if (activeTab === "batches") {
      setBatchForm({
        batchName: "",
        startTime: "",
        endTime: "",
        order: 0,
      });
    } else if (activeTab === "enquiry-methods") {
      setEnquiryMethodForm({
        methodName: "",
        description: "",
        order: 0,
      });
    } else if (activeTab === "fees") {
      setFeeForm({
        feeName: "",
        amount: "",
        description: "",
        isActive: true,
      });
      setFeeNameError("");
    } else if (activeTab === "call-log") {
      if (callLogSubTab === "call-status") {
        setCallStatusForm({
          name: "",
          value: "",
          description: "",
          order: 0,
        });
      } else if (callLogSubTab === "call-reasons") {
        setCallReasonForm({
          name: "",
          value: "",
          description: "",
          order: 0,
        });
      } else if (callLogSubTab === "next-actions") {
        setNextActionForm({
          name: "",
          value: "",
          description: "",
          order: 0,
        });
      }
    }
  };

  // Fee name validation function
  const validateFeeName = (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) return "Fee name is required";
    const validCharsRegex = /^[a-zA-Z0-9\s\-_&,.'()]+$/;
    if (!validCharsRegex.test(trimmedName)) return "Fee name contains invalid characters";
    const consecutiveSpecialChars = /[\s\-_&,.'()]{2,}/;
    if (consecutiveSpecialChars.test(trimmedName)) return "Fee name contains consecutive special characters or spaces";
    if (name !== trimmedName) return "Fee name should not have leading or trailing spaces";
    if (/\s{2,}/.test(trimmedName)) return "Fee name contains multiple consecutive spaces";
    const words = trimmedName.split(/\s+/);
    for (let word of words) {
      if (word.length > 0) {
        const isAcronym = /^[A-Z]{2,}$/.test(word);
        if (!isAcronym) {
          const firstChar = word.charAt(0);
          if (firstChar !== firstChar.toUpperCase()) return "Each word in fee name should start with a capital letter";
        }
      }
    }
    const commonMisspellings = [
      { pattern: /reciept/i, correct: "receipt" },
      { pattern: /seperate/i, correct: "separate" },
      { pattern: /occured/i, correct: "occurred" },
      { pattern: /definately/i, correct: "definitely" },
      { pattern: /embarass/i, correct: "embarrass" },
      { pattern: /accomodate/i, correct: "accommodate" },
      { pattern: /apparant/i, correct: "apparent" },
      { pattern: /committment/i, correct: "commitment" },
      { pattern: /conveniance/i, correct: "convenience" },
    ];
    for (const misspelling of commonMisspellings) {
      if (misspelling.pattern.test(trimmedName)) return `Did you mean "${misspelling.correct}"?`;
    }
    const repeatedLetters = /([a-zA-Z])\1{2,}/;
    if (repeatedLetters.test(trimmedName)) return "Fee name contains repeated letters";
    return "";
  };

  // Separate change handlers for each form
 const handleQualificationChange = (e) => {
  const { name, value } = e.target;
  setQualificationForm((prev) => ({ 
    ...prev, 
    [name]: name === "qualificationName" || name === "description" ? capitalizeFirst(value) : value 
  }));
};

  const handleAreaChange = (e) => {
  const { name, value } = e.target;
  setAreaForm((prev) => ({ 
    ...prev, 
    [name]: name === "areaName" || name === "city" ? capitalizeFirst(value) : value 
  }));
};

  const handleHolidayChange = (e) => {
  const { name, value, type, checked } = e.target;
  setHolidayForm((prev) => ({
    ...prev,
    [name]: type === "checkbox" ? checked : name === "holidayName" || name === "description" ? capitalizeFirst(value) : value,
  }));
};

  const handleBatchChange = (e) => {
  const { name, value } = e.target;
  setBatchForm((prev) => ({ 
    ...prev, 
    [name]: name === "batchName" ? capitalizeFirst(value) : value 
  }));
};
  
const handleEnquiryMethodChange = (e) => {
  const { name, value } = e.target;
  setEnquiryMethodForm((prev) => ({ 
    ...prev, 
    [name]: name === "methodName" || name === "description" ? capitalizeFirst(value) : value 
  }));
};

  const handleFeeChange = (e) => {
  const { name, value, type, checked } = e.target;
  if (name === "feeName") {
    const error = validateFeeName(value);
    setFeeNameError(error);
  }
  setFeeForm((prev) => ({
    ...prev,
    [name]: type === "checkbox" ? checked : name === "feeName" || name === "description" ? capitalizeFirst(value) : value,
  }));
};

  const handleCallStatusChange = (e) => {
  const { name, value } = e.target;
  setCallStatusForm((prev) => ({ 
    ...prev, 
    [name]: name === "name" || name === "description" ? capitalizeFirst(value) : value 
  }));
};

  const handleCallReasonChange = (e) => {
  const { name, value } = e.target;
  setCallReasonForm((prev) => ({ 
    ...prev, 
    [name]: name === "name" || name === "description" ? capitalizeFirst(value) : value 
  }));
};

  const handleNextActionChange = (e) => {
  const { name, value } = e.target;
  setNextActionForm((prev) => ({ 
    ...prev, 
    [name]: name === "name" || name === "description" ? capitalizeFirst(value) : value 
  }));
};

  const handleEdit = (item) => {
    setEditingId(item._id);
    setShowForm(true);

    if (activeTab === "qualifications") {
      setQualificationForm({
        qualificationName: item.qualificationName,
        description: item.description || "",
        order: item.order || 0,
      });
    } else if (activeTab === "areas") {
      setAreaForm({
        areaName: item.areaName,
        pincode: item.pincode || "",
        city: item.city || "",
      });
    } else if (activeTab === "holidays") {
      setHolidayForm({
        holidayDate: new Date(item.holidayDate).toISOString().split("T")[0],
        holidayName: item.holidayName,
        description: item.description || "",
        isRecurring: item.isRecurring || false,
      });
    } else if (activeTab === "batches") {
      setBatchForm({
        batchName: item.batchName,
        startTime: item.startTime,
        endTime: item.endTime,
        order: item.order || 0,
      });
    } else if (activeTab === "enquiry-methods") {
      setEnquiryMethodForm({
        methodName: item.methodName,
        description: item.description || "",
        order: item.order || 0,
      });
    } else if (activeTab === "fees") {
      const feeName = item.feeName || "";
      setFeeForm({
        feeName: feeName,
        amount: item.amount,
        description: item.description || "",
        isActive: item.isActive !== undefined ? item.isActive : true,
      });
      const error = validateFeeName(feeName);
      setFeeNameError(error);
    } else if (activeTab === "call-log") {
      if (callLogSubTab === "call-status") {
        setCallStatusForm({
          name: item.name,
          value: item.value,
          description: item.description || "",
          order: item.order || 0,
        });
      } else if (callLogSubTab === "call-reasons") {
        setCallReasonForm({
          name: item.name,
          value: item.value,
          description: item.description || "",
          order: item.order || 0,
        });
      } else if (callLogSubTab === "next-actions") {
        setNextActionForm({
          name: item.name,
          value: item.value,
          description: item.description || "",
          order: item.order || 0,
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (activeTab === "qualifications") {
        if (!qualificationForm.qualificationName.trim()) {
          toast.error("Qualification name is required");
          return;
        }
        const submitData = {
          qualificationName: qualificationForm.qualificationName.trim(),
          description: qualificationForm.description.trim() || "",
          order: parseInt(qualificationForm.order) || 0,
        };
        if (editingId) {
          await setupAPI.updateQualification(editingId, submitData);
          toast.success("Qualification updated");
        } else {
          await setupAPI.createQualification(submitData);
          toast.success("Qualification added");
        }
      } else if (activeTab === "areas") {
        if (!areaForm.areaName.trim()) {
          toast.error("Area name is required");
          return;
        }
        const submitData = {
          areaName: areaForm.areaName.trim(),
          pincode: areaForm.pincode.trim() || "",
          city: areaForm.city.trim() || "",
        };
        if (editingId) {
          await setupAPI.updateArea(editingId, submitData);
          toast.success("Area updated");
        } else {
          await setupAPI.createArea(submitData);
          toast.success("Area added");
        }
      } else if (activeTab === "holidays") {
        if (!holidayForm.holidayDate || !holidayForm.holidayName.trim()) {
          toast.error("Holiday date and name are required");
          return;
        }
        const submitData = {
          holidayDate: holidayForm.holidayDate,
          holidayName: holidayForm.holidayName.trim(),
          description: holidayForm.description.trim() || "",
          isRecurring: holidayForm.isRecurring || false,
        };
        if (editingId) {
          await setupAPI.updateHoliday(editingId, submitData);
          toast.success("Holiday updated");
        } else {
          await setupAPI.createHoliday(submitData);
          toast.success("Holiday added");
        }
      } else if (activeTab === "batches") {
        if (!batchForm.batchName.trim() || !batchForm.startTime || !batchForm.endTime) {
          toast.error("Batch name, start time and end time are required");
          return;
        }
        const submitData = {
          batchName: batchForm.batchName.trim(),
          startTime: batchForm.startTime,
          endTime: batchForm.endTime,
          order: parseInt(batchForm.order) || 0,
        };
        if (editingId) {
          await setupAPI.updateBatch(editingId, submitData);
          toast.success("Batch updated");
        } else {
          await setupAPI.createBatch(submitData);
          toast.success("Batch added");
        }
      } else if (activeTab === "enquiry-methods") {
        if (!enquiryMethodForm.methodName.trim()) {
          toast.error("Method name is required");
          return;
        }
        const submitData = {
          methodName: enquiryMethodForm.methodName.trim(),
          description: enquiryMethodForm.description.trim() || "",
          order: parseInt(enquiryMethodForm.order) || 0,
        };
        if (editingId) {
          await setupAPI.updateEnquiryMethod(editingId, submitData);
          toast.success("Enquiry method updated");
        } else {
          await setupAPI.createEnquiryMethod(submitData);
          toast.success("Enquiry method added");
        }
      } else if (activeTab === "fees") {
        const trimmedFeeName = feeForm.feeName.trim();
        if (!trimmedFeeName) {
          toast.error("Fee name is required");
          return;
        }
        if (feeNameError) {
          toast.error(`Fee name error: ${feeNameError}`);
          return;
        }
        if (!feeForm.amount) {
          toast.error("Amount is required");
          return;
        }
        let feeType = "other";
        const feeNameLower = trimmedFeeName.toLowerCase();
        if (feeNameLower.includes("double") && feeNameLower.includes("batch")) {
          feeType = "double-batch";
        } else if (feeNameLower.includes("course") && feeNameLower.includes("extend")) {
          feeType = "course-extend";
        } else if (feeNameLower.includes("form")) {
          feeType = "form-fee";
        } else if (feeNameLower.includes("course") && feeNameLower.includes("convert")) {
          feeType = "course-convert";
        } else if (feeNameLower.includes("registration")) {
          feeType = "registration";
        } else if (feeNameLower.includes("library")) {
          feeType = "library";
        } else if (feeNameLower.includes("convenience")) {
          feeType = "convenience";
        }
        const submitData = {
          feeName: trimmedFeeName,
          feeType: feeType,
          amount: parseFloat(feeForm.amount) || 0,
          description: feeForm.description.trim() || "",
          isActive: feeForm.isActive,
        };
        if (editingId) {
          await setupAPI.updateFee(editingId, submitData);
          toast.success("Fee updated");
        } else {
          await setupAPI.createFee(submitData);
          toast.success("Fee added");
        }
      } else if (activeTab === "call-log") {
        if (callLogSubTab === "call-status") {
          if (!callStatusForm.name || !callStatusForm.value) {
            toast.error("Name and value are required");
            return;
          }
          const submitData = {
            name: callStatusForm.name.trim(),
            value: callStatusForm.value.trim(),
            description: callStatusForm.description.trim(),
            order: parseInt(callStatusForm.order) || 0,
          };
          if (editingId) {
            await setupAPI.updateCallStatus(editingId, submitData);
            toast.success("Call status updated");
          } else {
            await setupAPI.createCallStatus(submitData);
            toast.success("Call status added");
          }
        } else if (callLogSubTab === "call-reasons") {
          if (!callReasonForm.name || !callReasonForm.value) {
            toast.error("Name and value are required");
            return;
          }
          const submitData = {
            name: callReasonForm.name.trim(),
            value: callReasonForm.value.trim(),
            description: callReasonForm.description.trim(),
            order: parseInt(callReasonForm.order) || 0,
          };
          if (editingId) {
            await setupAPI.updateCallReason(editingId, submitData);
            toast.success("Call reason updated");
          } else {
            await setupAPI.createCallReason(submitData);
            toast.success("Call reason added");
          }
        } else if (callLogSubTab === "next-actions") {
          if (!nextActionForm.name || !nextActionForm.value) {
            toast.error("Name and value are required");
            return;
          }
          const submitData = {
            name: nextActionForm.name.trim(),
            value: nextActionForm.value.trim(),
            description: nextActionForm.description.trim(),
            order: parseInt(nextActionForm.order) || 0,
          };
          if (editingId) {
            await setupAPI.updateNextAction(editingId, submitData);
            toast.success("Next action updated");
          } else {
            await setupAPI.createNextAction(submitData);
            toast.success("Next action added");
          }
        }
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchSetupData();
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error.response?.data?.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete?")) return;

    try {
      if (activeTab === "qualifications") {
        await setupAPI.deleteQualification(id);
        toast.success("Qualification deleted");
      } else if (activeTab === "areas") {
        await setupAPI.deleteArea(id);
        toast.success("Area deleted");
      } else if (activeTab === "holidays") {
        await setupAPI.deleteHoliday(id);
        toast.success("Holiday deleted");
      } else if (activeTab === "batches") {
        await setupAPI.deleteBatch(id);
        toast.success("Batch deleted");
      } else if (activeTab === "enquiry-methods") {
        await setupAPI.deleteEnquiryMethod(id);
        toast.success("Enquiry method deleted");
      } else if (activeTab === "fees") {
        await setupAPI.deleteFee(id);
        toast.success("Fee deleted");
      } else if (activeTab === "call-log") {
        if (callLogSubTab === "call-status") {
          await setupAPI.deleteCallStatus(id);
          toast.success("Call status deleted");
        } else if (callLogSubTab === "call-reasons") {
          await setupAPI.deleteCallReason(id);
          toast.success("Call reason deleted");
        } else if (callLogSubTab === "next-actions") {
          await setupAPI.deleteNextAction(id);
          toast.success("Next action deleted");
        }
      }
      fetchSetupData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleBatchOrder = async (id, direction) => {
    const batchIndex = batches.findIndex((b) => b._id === id);
    if ((direction === "up" && batchIndex === 0) || (direction === "down" && batchIndex === batches.length - 1)) return;
    const newBatches = [...batches];
    const newOrder = direction === "up" ? batchIndex - 1 : batchIndex + 1;
    [newBatches[batchIndex], newBatches[newOrder]] = [newBatches[newOrder], newBatches[batchIndex]];
    const updatedBatches = newBatches.map((batch, index) => ({
      id: batch._id,
      order: index,
    }));
    try {
      await setupAPI.updateBatchOrder({ batches: updatedBatches });
      setBatches(newBatches);
      toast.success("Batch order updated");
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  const handleEnquiryMethodOrder = async (id, direction) => {
    const methodIndex = enquiryMethods.findIndex((m) => m._id === id);
    if ((direction === "up" && methodIndex === 0) || (direction === "down" && methodIndex === enquiryMethods.length - 1)) return;
    const newMethods = [...enquiryMethods];
    const newOrder = direction === "up" ? methodIndex - 1 : methodIndex + 1;
    [newMethods[methodIndex], newMethods[newOrder]] = [newMethods[newOrder], newMethods[methodIndex]];
    const updatedMethods = newMethods.map((method, index) => ({
      id: method._id,
      order: index,
    }));
    try {
      await setupAPI.updateEnquiryMethodOrder({ enquiryMethods: updatedMethods });
      setEnquiryMethods(newMethods);
      toast.success("Enquiry method order updated");
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  const handleQualificationOrder = async (id, direction) => {
    const qualIndex = qualifications.findIndex((q) => q._id === id);
    if ((direction === "up" && qualIndex === 0) || (direction === "down" && qualIndex === qualifications.length - 1)) return;
    const newQualifications = [...qualifications];
    const newOrder = direction === "up" ? qualIndex - 1 : qualIndex + 1;
    [newQualifications[qualIndex], newQualifications[newOrder]] = [newQualifications[newOrder], newQualifications[qualIndex]];
    const updatedQualifications = newQualifications.map((qual, index) => ({
      id: qual._id,
      order: index,
    }));
    try {
      await setupAPI.updateQualificationOrder({ qualifications: updatedQualifications });
      setQualifications(newQualifications);
      toast.success("Qualification order updated");
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  const getFilteredData = () => {
    let data = [];
    if (activeTab === "qualifications") data = qualifications;
    else if (activeTab === "areas") data = areas;
    else if (activeTab === "holidays") data = holidays;
    else if (activeTab === "batches") data = batches;
    else if (activeTab === "enquiry-methods") data = enquiryMethods;
    else if (activeTab === "fees") data = fees;
    else if (activeTab === "call-log") {
      if (callLogSubTab === "call-status") data = callStatuses;
      else if (callLogSubTab === "call-reasons") data = callReasons;
      else if (callLogSubTab === "next-actions") data = nextActions;
    }

    if (searchTerm) {
      return data.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    return data;
  };

  const renderCallLogTable = () => {
    let data = [];
    let columns = [];

    if (callLogSubTab === "call-status") {
      data = callStatuses;
      columns = [
        { key: "name", label: "Status Name" },
        { key: "value", label: "Status Value" },
        // { key: "description", label: "Description" }, // Commented out
        { key: "order", label: "Order" },
      ];
    } else if (callLogSubTab === "call-reasons") {
      data = callReasons;
      columns = [
        { key: "name", label: "Reason Name" },
        { key: "value", label: "Reason Value" },
        // { key: "description", label: "Description" }, // Commented out
        { key: "order", label: "Order" },
      ];
    } else if (callLogSubTab === "next-actions") {
      data = nextActions;
      columns = [
        { key: "name", label: "Action Name" },
        { key: "value", label: "Action Value" },
        // { key: "description", label: "Description" }, // Commented out
        { key: "order", label: "Order" },
      ];
    }

    return (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {col.label}
              </th>
            ))}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => (
            <tr key={item._id} className="hover:bg-gray-50">
              <td className="px-6 py-4">{item.name}</td>
              <td className="px-6 py-4">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm">{item.value}</code>
              </td>
              {/* <td className="px-6 py-4">{item.description || "-"}</td> */}
              <td className="px-6 py-4">{item.order}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs rounded-full ${item.isActive !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {item.isActive !== false ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-6 py-4">
                <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(item._id)} className="text-red-600 hover:text-red-800">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderCallLogForm = () => {
    let formData, handleChange, title;

    if (callLogSubTab === "call-status") {
      formData = callStatusForm;
      handleChange = handleCallStatusChange;
      title = "Call Status";
    } else if (callLogSubTab === "call-reasons") {
      formData = callReasonForm;
      handleChange = handleCallReasonChange;
      title = "Call Reason";
    } else {
      formData = nextActionForm;
      handleChange = handleNextActionChange;
      title = "Next Action";
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`e.g., ${title} name`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
          <input
            type="text"
            name="value"
            value={formData.value}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`e.g., ${title.toLowerCase().replace(" ", "_")}`}
          />
          <p className="mt-1 text-xs text-gray-500">Unique identifier (e.g., interested, not_interested)</p>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="2"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional description..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
          <input
            type="number"
            name="order"
            value={formData.order}
            onChange={handleChange}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Display order"
          />
        </div>
      </div>
    );
  };

  const renderForm = () => {
    if (!showForm) return null;

    let formContent = null;
    let title = "";

    if (activeTab === "qualifications") {
      formContent = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qualification Name *</label>
            <input
              type="text"
              name="qualificationName"
              autoCapitalize="sentences"
              value={qualificationForm.qualificationName}
              onChange={handleQualificationChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Bachelor's Degree"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
            <input
              type="number"
              name="order"
              value={qualificationForm.order}
              onChange={handleQualificationChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Display order"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={qualificationForm.description}
              onChange={handleQualificationChange}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description..."
            />
          </div>
        </div>
      );
      title = editingId ? "Edit" : "Add New";
      title += " Qualification";
    } else if (activeTab === "areas") {
      formContent = (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Area Name *</label>
            <input
              type="text"
              name="areaName"
              autoCapitalize="sentences"
              value={areaForm.areaName}
              onChange={handleAreaChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Downtown"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              name="city"
              value={areaForm.city}
              onChange={handleAreaChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., New York"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
            <input
              type="text"
              name="pincode"
              value={areaForm.pincode}
              onChange={handleAreaChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 110001"
            />
          </div>
        </div>
      );
      title = editingId ? "Edit" : "Add New";
      title += " Area";
    } else if (activeTab === "holidays") {
      formContent = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Date *</label>
            <input
              type="date"
              name="holidayDate"
              value={holidayForm.holidayDate}
              onChange={handleHolidayChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name *</label>
            <input
              type="text"
              name="holidayName"
              autoCapitalize="sentences"
              value={holidayForm.holidayName}
              onChange={handleHolidayChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Diwali"
            />
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isRecurring"
                checked={holidayForm.isRecurring}
                onChange={handleHolidayChange}
                className="mr-2 h-4 w-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Recurring Holiday (yearly)</span>
            </label>
          </div>
        </div>
      );
      title = editingId ? "Edit" : "Add New";
      title += " Holiday";
    } else if (activeTab === "batches") {
      formContent = (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name *</label>
            <input
              type="text"
              name="batchName"
              autoCapitalize="sentences"
              value={batchForm.batchName}
              onChange={handleBatchChange}
              required
              placeholder="e.g., Morning Batch"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
            <input
              type="time"
              name="startTime"
              value={batchForm.startTime}
              onChange={handleBatchChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
            <input
              type="time"
              name="endTime"
              value={batchForm.endTime}
              onChange={handleBatchChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      );
      title = editingId ? "Edit" : "Add New";
      title += " Batch";
    } else if (activeTab === "enquiry-methods") {
      formContent = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Method Name *</label>
            <input
              type="text"
              name="methodName"
              autoCapitalize="sentences"
              value={enquiryMethodForm.methodName}
              onChange={handleEnquiryMethodChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Walk-in, Phone Call, Website"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
            <input
              type="number"
              name="order"
              value={enquiryMethodForm.order}
              onChange={handleEnquiryMethodChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Display order"
            />
          </div>
        </div>
      );
      title = editingId ? "Edit" : "Add New";
      title += " Enquiry Method";
    } else if (activeTab === "fees") {
      formContent = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fee Name *</label>
            <input
              type="text"
              name="feeName"
              autoCapitalize="sentences"
              value={feeForm.feeName}
              onChange={handleFeeChange}
              required
              className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                feeNameError ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
              }`}
              placeholder="e.g., Double Batch Fee"
            />
            {feeNameError && <p className="mt-1 text-sm text-red-600">{feeNameError}</p>}
            <p className="mt-1 text-xs text-gray-500">Examples: Double Batch Fee, Course Extend Fee, Form Fee, Library Fee</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input
              type="number"
              name="amount"
              value={feeForm.amount}
              onChange={handleFeeChange}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 1000"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={feeForm.description}
              onChange={handleFeeChange}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description..."
            />
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={feeForm.isActive}
                onChange={handleFeeChange}
                className="mr-2 h-4 w-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>
      );
      title = editingId ? "Edit" : "Add New";
      title += " Fee";
    } else if (activeTab === "call-log") {
      formContent = renderCallLogForm();
      if (callLogSubTab === "call-status") {
        title = editingId ? "Edit" : "Add New";
        title += " Call Status";
      } else if (callLogSubTab === "call-reasons") {
        title = editingId ? "Edit" : "Add New";
        title += " Call Reason";
      } else {
        title = editingId ? "Edit" : "Add New";
        title += " Next Action";
      }
    }

    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <form onSubmit={handleSubmit}>
          {formContent}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                resetForm();
              }}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {editingId ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderTable = () => {
    const data = getFilteredData();

    if (activeTab === "qualifications") {
      return (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th> */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{item.order}</td>
                <td className="px-6 py-4">{item.qualificationName}</td>
                {/* <td className="px-6 py-4">{item.description || "-"}</td> */}
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${item.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleQualificationOrder(item._id, "up")} 
                      className="text-gray-600 hover:text-gray-800" 
                      disabled={qualifications.findIndex((q) => q._id === item._id) === 0}
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button 
                      onClick={() => handleQualificationOrder(item._id, "down")} 
                      className="text-gray-600 hover:text-gray-800" 
                      disabled={qualifications.findIndex((q) => q._id === item._id) === qualifications.length - 1}
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(item._id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === "areas") {
      return (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pincode</th>
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th> */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{item.areaName}</td>
                <td className="px-6 py-4">{item.city || "-"}</td>
                <td className="px-6 py-4">{item.pincode || "-"}</td>
                {/* <td className="px-6 py-4">{item.description || "-"}</td> */}
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${item.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(item._id)} className="text-red-600 hover:text-red-800">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === "holidays") {
      return (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holiday Name</th>
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th> */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recurring</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{new Date(item.holidayDate).toLocaleDateString()}</td>
                <td className="px-6 py-4">{item.holidayName}</td>
                {/* <td className="px-6 py-4">{item.description || "-"}</td> */}
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${item.isRecurring ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                    {item.isRecurring ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(item._id)} className="text-red-600 hover:text-red-800">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === "batches") {
      return (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Slot</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th> */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{item.batchName}</td>
                <td className="px-6 py-4">{`${item.startTime} to ${item.endTime}`}</td>
                <td className="px-6 py-4">{item.order}</td>
                {/* <td className="px-6 py-4">{item.description || "-"}</td> */}
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${item.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleBatchOrder(item._id, "up")} className="text-gray-600 hover:text-gray-800" disabled={batches.findIndex((b) => b._id === item._id) === 0}>
                      <ChevronUp size={16} />
                    </button>
                    <button onClick={() => handleBatchOrder(item._id, "down")} className="text-gray-600 hover:text-gray-800" disabled={batches.findIndex((b) => b._id === item._id) === batches.length - 1}>
                      <ChevronDown size={16} />
                    </button>
                    <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(item._id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === "enquiry-methods") {
      return (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method Name</th>
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th> */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{item.order}</td>
                <td className="px-6 py-4">{item.methodName}</td>
                {/* <td className="px-6 py-4">{item.description || "-"}</td> */}
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${item.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEnquiryMethodOrder(item._id, "up")} className="text-gray-600 hover:text-gray-800" disabled={enquiryMethods.findIndex((m) => m._id === item._id) === 0}>
                      <ChevronUp size={16} />
                    </button>
                    <button onClick={() => handleEnquiryMethodOrder(item._id, "down")} className="text-gray-600 hover:text-gray-800" disabled={enquiryMethods.findIndex((m) => m._id === item._id) === enquiryMethods.length - 1}>
                      <ChevronDown size={16} />
                    </button>
                    <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(item._id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === "fees") {
      return (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th> */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{item.feeName}</td>
                <td className="px-6 py-4">₹{item.amount}</td>
                {/* <td className="px-6 py-4">{item.description || "-"}</td> */}
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${item.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(item._id)} className="text-red-600 hover:text-red-800">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === "call-log") {
      return renderCallLogTable();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Setup Management</h1>
        <p className="text-gray-600">Manage qualifications, areas, holidays, batches, enquiry methods, fees, and call log settings</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 border-b flex-wrap">
          {[
            { key: "qualifications", label: "Qualifications", icon: GraduationCap },
            { key: "areas", label: "Areas", icon: MapPin },
            { key: "holidays", label: "Holidays", icon: Calendar },
            { key: "batches", label: "Batch Master", icon: Clock },
            { key: "enquiry-methods", label: "Enquiry Methods", icon: MessageSquare },
            { key: "fees", label: "Fees", icon: DollarSign },
            { key: "call-log", label: "Call Log Settings", icon: Phone },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 font-medium ${
                activeTab === tab.key
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Call Log Sub Tabs */}
        {activeTab === "call-log" && (
          <div className="flex space-x-2 mt-4">
            <button
              onClick={() => {
                setCallLogSubTab("call-status");
                setShowForm(false);
                setEditingId(null);
                setSearchTerm("");
              }}
              className={`px-3 py-1 text-sm rounded ${
                callLogSubTab === "call-status"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Call Status
            </button>
            <button
              onClick={() => {
                setCallLogSubTab("call-reasons");
                setShowForm(false);
                setEditingId(null);
                setSearchTerm("");
              }}
              className={`px-3 py-1 text-sm rounded ${
                callLogSubTab === "call-reasons"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Call Reasons
            </button>
            <button
              onClick={() => {
                setCallLogSubTab("next-actions");
                setShowForm(false);
                setEditingId(null);
                setSearchTerm("");
              }}
              className={`px-3 py-1 text-sm rounded ${
                callLogSubTab === "next-actions"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Next Actions
            </button>
          </div>
        )}
      </div>

      {/* Search and Add Button */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={`Search ${activeTab === "call-log" ? callLogSubTab.replace("-", " ") : activeTab.replace("-", " ")}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add{" "}
{activeTab === "call-log"
  ? callLogSubTab === "call-status"
    ? "Call Status"
    : callLogSubTab === "call-reasons"
    ? "Call Reason"
    : "Next Action"
  : activeTab === "enquiry-methods"
  ? "Enquiry Method"
  : activeTab === "fees"
  ? "Fee"
  : activeTab === "batches"
  ? "Batch"
  : activeTab === "areas"
  ? "Area"
  : activeTab === "holidays"
  ? "Holiday"
  : activeTab === "qualifications"
  ? "Qualification"
  : activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1)}
        </button>
      </div>

      {/* Form */}
      {renderForm()}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : getFilteredData().length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No {activeTab === "call-log" ? callLogSubTab.replace("-", " ") : activeTab.replace("-", " ")} found.{" "}
            {/* {!showForm && (
              <button onClick={() => setShowForm(true)} className="text-blue-600 hover:underline">
                Add your first{" "}
                {activeTab === "call-log"
                  ? callLogSubTab === "call-status"
                    ? "call status"
                    : callLogSubTab === "call-reasons"
                    ? "call reason"
                    : "next action"
                  : activeTab === "enquiry-methods"
                  ? "enquiry method"
                  : activeTab === "fees"
                  ? "fee"
                  : activeTab.slice(0, -1)}
              </button>
            )} */}
          </div>
        ) : (
          renderTable()
        )}
      </div>
    </div>
  );
};

export default SetupList;