// pages/students/AddBatchTransfer.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Save,
  X,
  Search,
  ArrowLeftRight,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { studentAPI, setupAPI, facultyAPI, batchTransferAPI } from "../../services/api";
import useBasePath from "../../hooks/useBasePath";

const AddBatchTransfer = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Search Student, 2: Transfer Form, 3: Confirmation
  const basePath = useBasePath();
  
  // Student search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Dynamic data
  const [batches, setBatches] = useState([]);
  const [facultyMembers, setFacultyMembers] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    requestId: `TRF${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`,
    requestDate: new Date().toISOString().split("T")[0],
    studentId: "",
    rollNo: "",
    studentName: "",
    previousBatch: "",
    previousBatchTime: "",
    previousTeacher: "",
    previousTeacherId: "",
    newBatch: "",
    newBatchTime: "",
    newTeacher: "",
    newTeacherId: "",
    transferReason: "",
    remarks: "",
    status: "pending",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch batches and faculty on mount
  useEffect(() => {
    fetchBatches();
    fetchFaculty();
  }, []);

  // Replace the fetchBatches function with this:

// In AddBatchTransfer.jsx, update the fetchBatches function:

const fetchBatches = async () => {
  try {
    setLoadingData(true);
    const response = await setupAPI.getAll();
    console.log("Batches response:", response.data);
    
    if (response.data.success) {
      // Get batches from the response
      const batchesData = response.data.data.batches || [];
      console.log("Batches data:", batchesData);
      
      // Just set the batches array, don't try to create a map
      setBatches(batchesData.sort((a, b) => (a.order || 0) - (b.order || 0)));
    }
  } catch (err) {
    console.error("Error fetching batches:", err);
  } finally {
    setLoadingData(false);
  }
};

  const fetchFaculty = async () => {
    try {
      const response = await facultyAPI.getFaculty({ status: "active" });
      if (response.data.success) {
        setFacultyMembers(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching faculty:", err);
    }
  };

  const searchStudent = async () => {
  if (!searchQuery.trim()) {
    alert("Please enter a roll number or student name");
    return;
  }

  try {
    setSearching(true);

    // ✅ Use studentAPI instead of raw fetch("/api/students")
    const response = await studentAPI.getStudents({ 
      search: searchQuery, 
      limit: 20 
    });

    if (response.data.success && response.data.data) {
      setSearchResults(response.data.data);
    } else {
      setSearchResults([]);
    }
  } catch (err) {
    console.error("Error searching students:", err);
    alert("Failed to search students. Please try again.");
  } finally {
    setSearching(false);
  }
};

 // In AddBatchTransfer.jsx, update the selectStudent function:

const selectStudent = (student) => {
  console.log("Selected student data:", student); // Debug log
  
  // Check if student has facultyId
  const hasFacultyId = student.facultyId && student.facultyId !== '';
  
  setSelectedStudent(student);
  setFormData({
    ...formData,
    studentId: student._id,
    rollNo: student.studentId || student.admissionNo || student.rollNo || "",
    studentName: student.fullName || "",
    previousBatch: student.batchTime || student.batch || "",
    previousBatchTime: student.batchTime || student.batch || "",
    previousTeacher: student.facultyAllot || "",
    // If facultyId exists, use it; otherwise set to null (NOT empty string)
    previousTeacherId: hasFacultyId ? student.facultyId : null,
  });
  setStep(2);
};


  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }

    if (name === "newBatch") {
      const selectedBatch = batches.find(b => b._id === value || b.batchName === value);
      if (selectedBatch) {
        const displayName = selectedBatch.displayName || 
          `${selectedBatch.startTime} to ${selectedBatch.endTime}`;
        setFormData({
          ...formData,
          newBatch: value,
          newBatchTime: displayName,
        });
        return;
      }
    }

    if (name === "newTeacher") {
      const selectedTeacher = facultyMembers.find(f => f._id === value || f.facultyName === value);
      setFormData({
        ...formData,
        newTeacher: selectedTeacher ? selectedTeacher.facultyName : value,
        newTeacherId: selectedTeacher ? selectedTeacher._id : "",
      });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.newBatch) {
      newErrors.newBatch = "Please select a new batch";
    }

    if (!formData.newTeacher) {
      newErrors.newTeacher = "Please select a teacher";
    }

    if (!formData.transferReason) {
      newErrors.transferReason = "Please provide a reason for transfer";
    }

    if (formData.newBatch === formData.previousBatch) {
      newErrors.newBatch = "New batch must be different from current batch";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

 // In AddBatchTransfer.jsx, update the handleSubmit function:

const handleSubmit = async (e) => {
  e.preventDefault();

  if (step === 1) return;
  
  if (step === 2) {
    if (validateForm()) {
      setStep(3);
    }
    return;
  }

  if (step === 3) {
    setIsSubmitting(true);
    try {
      // Create a copy of formData and ensure previousTeacherId is null if empty
      const submissionData = {
        ...formData,
        // Ensure previousTeacherId is null if it's empty string or falsy
        previousTeacherId: formData.previousTeacherId || null,
      };
      
      console.log("📤 Submitting data:", submissionData);
      
      const response = await batchTransferAPI.createTransfer(submissionData);
      console.log("✅ Response:", response.data);

      if (response.data.success) {
        alert("✅ Batch transfer request submitted successfully!");
        navigate(`${basePath}/students/batch-transfer`);
      } else {
        throw new Error(response.data.message || "Failed to submit request");
      }
    } catch (err) {
      console.error("❌ Error submitting transfer:", err);
      alert(err.response?.data?.message || err.message || "Failed to submit transfer request");
    } finally {
      setIsSubmitting(false);
    }
  }
};

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatBatchDisplay = (batch) => {
    if (!batch) return "N/A";
    // Find batch in batches array for display name
    const found = batches.find(b => b.batchName === batch || b.displayName === batch);
    return found?.displayName || found?.batchName || batch;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            {step === 1 && "New Batch Transfer Request"}
            {step === 2 && "Transfer Details"}
            {step === 3 && "Confirm Transfer"}
          </h1>
          <p className="text-sm text-gray-500">
            {step === 1 && "Search and select a student to change their batch"}
            {step === 2 && "Select new batch and teacher"}
            {step === 3 && "Review and confirm the batch change"}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to={`${basePath}/students/batch-transfer`}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X size={18} />
            Cancel
          </Link>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (step === 1) || loadingData}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={18} />
            {isSubmitting ? "Processing..." : step === 3 ? "Confirm & Submit" : step === 2 ? "Next: Review" : "Continue"}
          </button>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
            step >= 1 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
          }`}>
            1
          </div>
          <div className={`w-20 h-1 ${step >= 2 ? "bg-indigo-600" : "bg-gray-200"}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
            step >= 2 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
          }`}>
            2
          </div>
          <div className={`w-20 h-1 ${step >= 3 ? "bg-indigo-600" : "bg-gray-200"}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
            step >= 3 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
          }`}>
            3
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Search Student */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Search Student</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter the student's roll number or name to find their current batch information
              </p>

              <div className="flex gap-3 mb-8">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Enter roll number or student name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && searchStudent()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={searchStudent}
                  disabled={searching}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {searching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      Search
                    </>
                  )}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Search Results ({searchResults.length})</h3>
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                    {searchResults.map((student) => (
                      <div
                        key={student._id}
                        onClick={() => selectStudent(student)}
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                            {getInitials(student.fullName)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{student.fullName}</p>
                            <p className="text-sm text-gray-500">
                              Roll No: {student.studentId || student.admissionNo || "N/A"}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {student.batchTime || student.batch || "No Batch"}
                              </span>
                              <span className="flex items-center gap-1">
                                <User size={12} />
                                {student.facultyAllot || "No Teacher"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm">
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.length === 0 && searchQuery && !searching && (
                <div className="text-center py-12 text-gray-400">
                  <User size={48} className="mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-600 mb-1">No students found</p>
                  <p className="text-xs">Try searching with a different roll number or name</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Transfer Form */}
        {step === 2 && selectedStudent && (
          <>
            {/* Student Info Card */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-indigo-600 font-medium">User Name</p>
                  <p className="font-semibold text-gray-800">
                    {formData.previousTeacher ? `ADMIN ${formData.previousTeacher.split(" ").pop()}` : "ADMIN"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-indigo-600 font-medium">Roll No</p>
                  <p className="font-semibold text-gray-800">{formData.rollNo}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-600 font-medium">Student Name</p>
                  <p className="font-semibold text-gray-800">{formData.studentName}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-600 font-medium">Previous Teacher Name</p>
                  <p className="font-semibold text-gray-800">{formData.previousTeacher || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-600 font-medium">Previous Batch Time</p>
                  <p className="font-semibold text-gray-800">{formData.previousBatchTime || formData.previousBatch || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Transfer Form */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              <div className="flex items-center gap-2 px-6 py-4 bg-gray-50 border-b border-gray-200">
                <ArrowLeftRight size={20} className="text-indigo-600" />
                <h3 className="font-semibold text-gray-700">New Batch Details</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Teacher Name *
                    </label>
                    <input
                      type="text"
                      value={formData.previousTeacher || "N/A"}
                      readOnly
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Batch Time *
                    </label>
                    <input
                      type="text"
                      value={formData.previousBatchTime || formData.previousBatch || "N/A"}
                      readOnly
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Teacher Name *
                    </label>
                    <select
                      name="newTeacher"
                      value={formData.newTeacherId || formData.newTeacher}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.newTeacher ? "border-red-500" : "border-gray-200"
                      }`}
                      disabled={loadingData}
                    >
                      <option value="">Select New Teacher</option>
                      {facultyMembers.map((faculty) => (
                        <option key={faculty._id} value={faculty._id}>
                          {faculty.facultyName} {faculty.facultyNo ? `(${faculty.facultyNo})` : ""}
                        </option>
                      ))}
                    </select>
                    {errors.newTeacher && (
                      <p className="mt-1 text-xs text-red-500">{errors.newTeacher}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Batch Time *
                    </label>
                    <select
                      name="newBatch"
                      value={formData.newBatch}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.newBatch ? "border-red-500" : "border-gray-200"
                      }`}
                      disabled={loadingData}
                    >
                      <option value="">Select New Batch</option>
                      {batches.map((batch) => {
                        const displayName = batch.displayName || 
                          `${batch.startTime || ''} to ${batch.endTime || ''}`.trim();
                        return (
                          <option key={batch._id} value={batch._id}>
                            {batch.batchName} {displayName ? `(${displayName})` : ""}
                          </option>
                        );
                      })}
                    </select>
                    {errors.newBatch && (
                      <p className="mt-1 text-xs text-red-500">{errors.newBatch}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Transfer *
                    </label>
                    <textarea
                      name="transferReason"
                      value={formData.transferReason}
                      onChange={handleChange}
                      rows="3"
                      placeholder="Please provide a detailed reason for the batch change..."
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.transferReason ? "border-red-500" : "border-gray-200"
                      }`}
                    />
                    {errors.transferReason && (
                      <p className="mt-1 text-xs text-red-500">{errors.transferReason}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && selectedStudent && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6 text-green-600">
                <CheckCircle size={24} />
                <h2 className="text-lg font-semibold">Confirm Batch Transfer</h2>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Current Batch</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-500">Teacher:</span> <span className="font-medium">{formData.previousTeacher}</span></p>
                      <p><span className="text-gray-500">Batch:</span> <span className="font-medium">{formData.previousBatchTime || formData.previousBatch}</span></p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">New Batch</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-500">Teacher:</span> <span className="font-medium text-green-600">
                        {facultyMembers.find(f => f._id === formData.newTeacherId)?.facultyName || formData.newTeacher}
                      </span></p>
                      <p><span className="text-gray-500">Batch:</span> <span className="font-medium text-green-600">
                        {batches.find(b => b._id === formData.newBatch)?.displayName || 
                         batches.find(b => b._id === formData.newBatch)?.batchName ||
                         formData.newBatchTime}
                      </span></p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 my-4"></div>

                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Reason for Transfer</h3>
                  <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
                    {formData.transferReason}
                  </p>
                </div>

                {formData.remarks && (
                  <>
                    <div className="border-t border-gray-200 my-4"></div>
                    <div>
                      <h3 className="font-medium text-gray-700 mb-3">Additional Remarks</h3>
                      <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
                        {formData.remarks}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 flex items-start gap-2">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                  <span>
                    By confirming, a batch transfer request will be created for admin approval.
                    The student's batch will only be changed after approval.
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default AddBatchTransfer;