// pages/students/AddBridgeBatchRequest.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  User,
  Save,
  X,
  Search,
  GitBranch,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { studentAPI, facultyAPI, bridgeBatchAPI, setupAPI } from "../../services/api";
import useBasePath from "../../hooks/useBasePath";

const AddBridgeBatchRequest = () => {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [step, setStep] = useState(1); // 1: Search Student, 2: Bridge Details, 3: Confirmation

  // Student search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Dynamic data
  const [facultyMembers, setFacultyMembers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [pendingTopics, setPendingTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const [searchParams] = useSearchParams();
  const admissionIdParam = searchParams.get("admissionId");

  const [formData, setFormData] = useState({
    studentId: "",
    rollNo: "",
    studentName: "",
    parentBatchId: "",
    courseId: "",
    currentBatchTime: "",
    currentTeacher: "",
    tempFacultyId: "",
    tempFacultyName: "",
    selectedTopicKeys: [],
    tempBatchId: "",
    startTime: "",
    endTime: "",
    reason: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFaculty();
    fetchBatches();
  }, []);

  useEffect(() => {
    if (admissionIdParam) {
      loadStudentFromAdmission(admissionIdParam);
    }
  }, [admissionIdParam]);

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

  const fetchBatches = async () => {
    try {
      const response = await setupAPI.getAll();
      if (response.data.success) {
        const batchesData = response.data.data.batches || [];
        setBatches(batchesData.sort((a, b) => (a.order || 0) - (b.order || 0)));
      }
    } catch (err) {
      console.error("Error fetching batches:", err);
    }
  };

  const loadStudentFromAdmission = async (admissionId) => {
    try {
      setSearching(true);
      const token = localStorage.getItem("token");
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_BASE}/api/students/${admissionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.data) {
        selectStudent(data.data);
      } else {
        alert("Could not find a student record linked to this admission.");
      }
    } catch (err) {
      console.error("Error loading student from admission:", err);
      alert("Failed to load student details.");
    } finally {
      setSearching(false);
    }
  };

  const fetchSearchResults = async (query) => {
    try {
      setSearching(true);
      const response = await studentAPI.getStudents({ search: query, limit: 20 });
      if (response.data.success && response.data.data) {
        setSearchResults(response.data.data);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Error searching students:", err);
    } finally {
      setSearching(false);
    }
  };

  const searchStudent = () => {
    if (!searchQuery.trim()) {
      alert("Please enter a roll number or student name");
      return;
    }
    fetchSearchResults(searchQuery);
  };

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => fetchSearchResults(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setFormData((prev) => ({
      ...prev,
      studentId: student._id,
      rollNo: student.studentId || student.admissionNo || student.rollNo || "",
      studentName: student.fullName || "",
      parentBatchId: student.batchId || "",
      courseId: student.courseId || "",
      currentBatchTime: student.batchTime || student.batch || "",
      currentTeacher: student.facultyAllot || "",
      selectedTopicKeys: [],
    }));
    setStep(2);

    if (student.courseId) {
      fetchPendingTopics(student._id, student.courseId);
    } else {
      console.warn("Student is missing courseId — cannot fetch topic list automatically.");
    }
    if (!student.batchId) {
      console.warn("Student is missing batchId — parentBatchId will be blank on submit, fix before saving.");
    }
  };

  const fetchPendingTopics = async (studentId, courseId) => {
    try {
      setLoadingTopics(true);
      const response = await bridgeBatchAPI.getPendingTopics({ studentId, courseId });
      if (response.data.success) {
        const topics = response.data.data?.topics || [];
        setPendingTopics(topics);
        // Pre-check topics the student hasn't covered yet
        setFormData((prev) => ({
          ...prev,
          selectedTopicKeys: topics.filter((t) => !t.completed).map((t) => t.topicKey),
        }));
      }
    } catch (err) {
      console.error("Error fetching pending topics:", err);
      setPendingTopics([]);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (errors[name]) setErrors({ ...errors, [name]: "" });

    if (name === "tempFacultyId") {
      const selected = facultyMembers.find((f) => f._id === value);
      setFormData((prev) => ({
        ...prev,
        tempFacultyId: value,
        tempFacultyName: selected ? selected.facultyName : "",
      }));
      return;
    }

    if (name === "tempBatchId") {
      const selected = batches.find((b) => b._id === value);
      setFormData((prev) => ({
        ...prev,
        tempBatchId: value,
        startTime: selected?.startTime || "",
        endTime: selected?.endTime || "",
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleTopic = (topicKey) => {
    setFormData((prev) => {
      const exists = prev.selectedTopicKeys.includes(topicKey);
      return {
        ...prev,
        selectedTopicKeys: exists
          ? prev.selectedTopicKeys.filter((k) => k !== topicKey)
          : [...prev.selectedTopicKeys, topicKey],
      };
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.tempFacultyId) newErrors.tempFacultyId = "Please select a temp faculty";
    if (formData.selectedTopicKeys.length === 0) newErrors.selectedTopicKeys = "Select at least one pending topic";
    if (!formData.tempBatchId) newErrors.tempBatchId = "Please select a batch slot for the bridge sessions";
    if (!formData.reason) newErrors.reason = "Please provide a reason for this bridge request";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) return;

    if (step === 2) {
      if (validateForm()) setStep(3);
      return;
    }

    if (step === 3) {
      setIsSubmitting(true);
      try {
        const selectedTopics = pendingTopics
          .filter((t) => formData.selectedTopicKeys.includes(t.topicKey))
          .map((t) => ({ topicKey: t.topicKey, topicName: t.topicName }));

        const payload = {
          parentBatchId: formData.parentBatchId,
          courseId: formData.courseId,
          studentIds: [formData.studentId],
          tempFacultyId: formData.tempFacultyId,
          tempBatchId: formData.tempBatchId,
          selectedTopics,
          timeSlot: { startTime: formData.startTime, endTime: formData.endTime },
          reason: formData.reason,
        };

        const response = await bridgeBatchAPI.requestBridge(payload);
        if (response.data.success) {
          alert("✅ Bridge batch request submitted for admin approval!");
          navigate(`${basePath}/students/bridge-batch`);
        } else {
          throw new Error(response.data.message || "Failed to submit request");
        }
      } catch (err) {
        console.error("Error submitting bridge request:", err);
        alert(err.response?.data?.message || err.message || "Failed to submit bridge request");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            {step === 1 && "New Bridge Batch Request"}
            {step === 2 && "Bridge Session Details"}
            {step === 3 && "Confirm Bridge Request"}
          </h1>
          <p className="text-sm text-gray-500">
            {step === 1 && "Search and select a student who is behind on topics"}
            {step === 2 && "Pick pending topics, temp faculty, and time slot"}
            {step === 3 && "Review and submit for admin approval"}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to={`${basePath}/students/bridge-batch`}
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
            disabled={isSubmitting || step === 1}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={18} />
            {isSubmitting ? "Submitting..." : step === 3 ? "Confirm & Submit" : step === 2 ? "Next: Review" : "Continue"}
          </button>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${step >= 1 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"}`}>1</div>
          <div className={`w-20 h-1 ${step >= 2 ? "bg-indigo-600" : "bg-gray-200"}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${step >= 2 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"}`}>2</div>
          <div className={`w-20 h-1 ${step >= 3 ? "bg-indigo-600" : "bg-gray-200"}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${step >= 3 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"}`}>3</div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Search Student */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Search Student</h2>
              <p className="text-sm text-gray-500 mb-6">
                Find the student who joined late and is behind on topics
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

        {/* Step 2: Bridge Details */}
        {step === 2 && selectedStudent && (
          <>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-indigo-600 font-medium">Roll No</p>
                  <p className="font-semibold text-gray-800">{formData.rollNo}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-600 font-medium">Student Name</p>
                  <p className="font-semibold text-gray-800">{formData.studentName}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-600 font-medium">Current Teacher</p>
                  <p className="font-semibold text-gray-800">{formData.currentTeacher || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-600 font-medium">Current Batch Time</p>
                  <p className="font-semibold text-gray-800">{formData.currentBatchTime || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              <div className="flex items-center gap-2 px-6 py-4 bg-gray-50 border-b border-gray-200">
                <GitBranch size={20} className="text-indigo-600" />
                <h3 className="font-semibold text-gray-700">Bridge Session Setup</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Temp Faculty *</label>
                    <select
                      name="tempFacultyId"
                      value={formData.tempFacultyId}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.tempFacultyId ? "border-red-500" : "border-gray-200"}`}
                    >
                      <option value="">Select Temp Faculty</option>
                      {facultyMembers.map((f) => (
                        <option key={f._id} value={f._id}>
                          {f.facultyName} {f.facultyNo ? `(${f.facultyNo})` : ""}
                        </option>
                      ))}
                    </select>
                    {errors.tempFacultyId && <p className="mt-1 text-xs text-red-500">{errors.tempFacultyId}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Temp Batch Slot *</label>
                    <select
                      name="tempBatchId"
                      value={formData.tempBatchId}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.tempBatchId ? "border-red-500" : "border-gray-200"}`}
                    >
                      <option value="">Select Batch Slot</option>
                      {batches.map((batch) => {
                        const displayName = batch.displayName ||
                          `${batch.startTime || ""} to ${batch.endTime || ""}`.trim();
                        return (
                          <option key={batch._id} value={batch._id}>
                            {batch.batchName} {displayName ? `(${displayName})` : ""}
                          </option>
                        );
                      })}
                    </select>
                    {errors.tempBatchId && <p className="mt-1 text-xs text-red-500">{errors.tempBatchId}</p>}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topics to Cover * {loadingTopics && <span className="text-xs text-gray-400">(loading...)</span>}
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Pending topics are pre-checked. You can also tick a few extra topics the main batch is
                    already ahead on, to help this student catch up to the same pace.
                  </p>
                  {pendingTopics.length === 0 && !loadingTopics && (
                    <p className="text-sm text-gray-400 italic">
                      No topics found. Make sure the student's course is linked correctly.
                    </p>
                  )}
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
                    {Object.entries(
                      pendingTopics.reduce((groups, topic) => {
                        const sem = topic.semesterName || "Other";
                        if (!groups[sem]) groups[sem] = [];
                        groups[sem].push(topic);
                        return groups;
                      }, {})
                    ).map(([semesterName, topics]) => (
                      <div key={semesterName}>
                        <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {semesterName}
                        </div>
                        {topics.map((topic) => (
                          <label
                            key={topic.topicKey}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.selectedTopicKeys.includes(topic.topicKey)}
                              onChange={() => toggleTopic(topic.topicKey)}
                              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700 flex-1">{topic.topicName}</span>
                            {topic.completed && (
                              <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full">
                                already covered
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                  {errors.selectedTopicKeys && <p className="mt-1 text-xs text-red-500">{errors.selectedTopicKeys}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Bridge Request *</label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    rows="3"
                    placeholder="e.g. Student joined 1 month late and is behind on the above topics..."
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.reason ? "border-red-500" : "border-gray-200"}`}
                  />
                  {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason}</p>}
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
                <h2 className="text-lg font-semibold">Confirm Bridge Batch Request</h2>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Student</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-500">Name:</span> <span className="font-medium">{formData.studentName}</span></p>
                      <p><span className="text-gray-500">Roll No:</span> <span className="font-medium">{formData.rollNo}</span></p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Bridge Session</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-500">Temp Faculty:</span> <span className="font-medium text-green-600">{formData.tempFacultyName}</span></p>
                      <p><span className="text-gray-500">Time:</span> <span className="font-medium text-green-600">
                        {batches.find((b) => b._id === formData.tempBatchId)?.displayName ||
                          batches.find((b) => b._id === formData.tempBatchId)?.batchName ||
                          `${formData.startTime} - ${formData.endTime}`}
                      </span></p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 my-4"></div>

                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Topics to Cover ({formData.selectedTopicKeys.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {pendingTopics
                      .filter((t) => formData.selectedTopicKeys.includes(t.topicKey))
                      .map((t) => (
                        <span key={t.topicKey} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                          {t.topicName}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 my-4"></div>

                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Reason</h3>
                  <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">{formData.reason}</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 flex items-start gap-2">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                  <span>
                    By confirming, a bridge batch request will be sent for admin approval.
                    Sessions won't start until it's approved.
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

export default AddBridgeBatchRequest;