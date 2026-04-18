// pages/admin/courses/EditCourse.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  BookOpen,
  DollarSign,
  Calculator,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Award,
  Loader2,
} from "lucide-react";
import { courseAPI } from "../../../../services/api";
import toast from "react-hot-toast";

// Separate NumberInput component to prevent re-render issues
const NumberInput = ({
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
}) => (
  <input
    type="text"
    inputMode="decimal"
    name={name}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    required={required}
    disabled={disabled}
    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      disabled ? "bg-gray-100 cursor-not-allowed" : ""
    }`}
  />
);

const EditCourse = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [fetchingCourse, setFetchingCourse] = useState(true);
  const [courseCodeSuggestions, setCourseCodeSuggestions] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const [formData, setFormData] = useState({
    courseCode: "",
    courseFullName: "",
    courseShortName: "",
    duration: "",
    totalSemesters: "",
    admissionFee: "",
    examFee: "",
    otherCharges: "",
    description: "",
    eligibilityCriteria: "",
    syllabus: "",
    careerOpportunities: "",
    seatsAvailable: "60",
    availableBatches: ["morning"],
    isActive: true,
    totalFee: "",
    discount: "",
    netFee: "",
    monthlyFee: "",
    numberOfExams: "",
    examMonths: "",
    courseType: "",
  });

  // ─── Fetch existing course data ───────────────────────────────────────────
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setFetchingCourse(true);
        const response = await courseAPI.getCourseById(id);

        if (response.data.success) {
          const course = response.data.data;

          // Populate form fields
          setFormData({
            courseCode: course.courseCode || "",
            courseFullName: course.courseFullName || "",
            courseShortName: course.courseShortName || "",
            duration: course.duration?.toString() || "",
            totalSemesters: course.totalSemesters?.toString() || "",
            admissionFee: course.admissionFee?.toString() || "",
            examFee: course.examFee?.toString() || "",
            otherCharges: course.otherCharges?.toString() || "",
            description: course.description || "",
            eligibilityCriteria: course.eligibilityCriteria || "",
            syllabus: course.syllabus || "",
            careerOpportunities: course.careerOpportunities || "",
            seatsAvailable: course.seatsAvailable?.toString() || "60",
            availableBatches: course.availableBatches || ["morning"],
            isActive: course.isActive ?? true,
            totalFee: course.totalFee?.toString() || "",
            discount: course.discount?.toString() || "",
            netFee: course.netFee?.toString() || "",
            monthlyFee: course.monthlyFee?.toString() || "",
            numberOfExams: course.numberOfExams?.toString() || "",
            examMonths: course.examMonths || "",
            courseType: course.courseType || "",
          });

          // Parse syllabus JSON into semesters state
          if (course.syllabus) {
            try {
              const parsed = JSON.parse(course.syllabus);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const hydrated = parsed.map((sem, sIndex) => ({
                  id: Date.now() + sIndex,
                  name: sem.name || `Semester ${sIndex + 1}`,
                  isExpanded: true,
                  topics: (sem.topics || []).map((topic, tIndex) => ({
                    id: Date.now() + sIndex * 1000 + tIndex,
                    name: topic.name || "",
                    isExpanded: true,
                    subtopics: (topic.subtopics || []).map(
                      (subtopic, subIndex) => ({
                        id:
                          Date.now() +
                          sIndex * 100000 +
                          tIndex * 1000 +
                          subIndex,
                        name: subtopic.name || "",
                      })
                    ),
                  })),
                }));
                setSemesters(hydrated);
              }
            } catch (e) {
              console.warn("Could not parse syllabus JSON:", e);
            }
          }
        } else {
          toast.error("Failed to load course");
          navigate(-1);
        }
      } catch (error) {
        console.error("Fetch course error:", error);
        toast.error("Failed to load course details");
        navigate(-1);
      } finally {
        setFetchingCourse(false);
      }
    };

    if (id) fetchCourse();
  }, [id]);

  // ─── Auto-calculate net fee & monthly fee ─────────────────────────────────
  useEffect(() => {
    const totalFee = parseFloat(formData.totalFee) || 0;
    const discount = parseFloat(formData.discount) || 0;
    const duration = parseFloat(formData.duration) || 1;

    let netFee = 0;
    let monthlyFee = 0;

    if (totalFee > 0 && discount > 0) {
      const discountAmount = (totalFee * discount) / 100;
      netFee = totalFee - discountAmount;
    } else if (totalFee > 0) {
      netFee = totalFee;
    }

    if (netFee > 0 && duration > 0) {
      monthlyFee = netFee / duration;
    }

    if (!isNaN(netFee) && netFee > 0) {
      setFormData((prev) => ({
        ...prev,
        netFee: netFee.toFixed(2),
        monthlyFee: monthlyFee.toFixed(2),
      }));
    } else {
      setFormData((prev) => ({ ...prev, netFee: "", monthlyFee: "" }));
    }
  }, [formData.totalFee, formData.discount, formData.duration]);

  // ─── Sync semesters → formData.syllabus ───────────────────────────────────
  useEffect(() => {
    if (semesters.length > 0) {
      setFormData((prev) => ({
        ...prev,
        syllabus: JSON.stringify(semesters),
      }));
    } else {
      setFormData((prev) => ({ ...prev, syllabus: "" }));
    }
  }, [semesters]);

  // ─── Course code suggestions ───────────────────────────────────────────────
  useEffect(() => {
    if (formData.courseFullName.trim() && !formData.courseCode) {
      const words = formData.courseFullName.split(" ");
      const suggestions = [];
      if (words.length > 1)
        suggestions.push(words.map((w) => w.charAt(0).toUpperCase()).join(""));
      if (words[0].length >= 3)
        suggestions.push(words[0].substring(0, 3).toUpperCase() + "101");
      const yr = new Date().getFullYear().toString().slice(-2);
      if (formData.courseShortName)
        suggestions.push(formData.courseShortName.toUpperCase() + yr);
      setCourseCodeSuggestions(suggestions);
    } else {
      setCourseCodeSuggestions([]);
    }
  }, [formData.courseFullName, formData.courseShortName, formData.courseCode]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    const numberFields = [
      "semesterFee",
      "admissionFee",
      "examFee",
      "otherCharges",
      "totalSemesters",
      "seatsAvailable",
      "totalFee",
      "discount",
      "numberOfExams",
    ];

    if (numberFields.includes(name)) {
      if (value === "" || /^\d*\.?\d*$/.test(value))
        setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }
    if (name === "courseCode") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.toUpperCase().replace(/\s/g, ""),
      }));
      return;
    }
    if (name === "examMonths") {
      if (value === "" || /^[\d\s,]*$/.test(value))
        setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // ─── Semester helpers (identical to AddCourse) ────────────────────────────
  const addSemester = () => {
    setSemesters((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: `Semester ${prev.length + 1}`,
        isExpanded: true,
        topics: [],
      },
    ]);
  };

  const removeSemester = (semId) =>
    setSemesters((prev) => prev.filter((s) => s.id !== semId));

  const updateSemesterName = (semId, value) =>
    setSemesters((prev) =>
      prev.map((s) => (s.id === semId ? { ...s, name: value } : s))
    );

  const toggleSemesterExpand = (semId) =>
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId ? { ...s, isExpanded: !s.isExpanded } : s
      )
    );

  const addTopicToSemester = (semId) =>
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId
          ? {
              ...s,
              topics: [
                ...s.topics,
                { id: Date.now(), name: "", isExpanded: true, subtopics: [] },
              ],
            }
          : s
      )
    );

  const removeTopicFromSemester = (semId, topicId) =>
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId
          ? { ...s, topics: s.topics.filter((t) => t.id !== topicId) }
          : s
      )
    );

  const updateTopicName = (semId, topicId, value) =>
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId
          ? {
              ...s,
              topics: s.topics.map((t) =>
                t.id === topicId ? { ...t, name: value } : t
              ),
            }
          : s
      )
    );

  const toggleTopicExpand = (semId, topicId) =>
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId
          ? {
              ...s,
              topics: s.topics.map((t) =>
                t.id === topicId ? { ...t, isExpanded: !t.isExpanded } : t
              ),
            }
          : s
      )
    );

  const addSubtopicToTopic = (semId, topicId) =>
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId
          ? {
              ...s,
              topics: s.topics.map((t) =>
                t.id === topicId
                  ? {
                      ...t,
                      isExpanded: true,
                      subtopics: [
                        ...t.subtopics,
                        { id: Date.now(), name: "" },
                      ],
                    }
                  : t
              ),
            }
          : s
      )
    );

  const updateSubtopicName = (semId, topicId, subId, value) =>
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId
          ? {
              ...s,
              topics: s.topics.map((t) =>
                t.id === topicId
                  ? {
                      ...t,
                      subtopics: t.subtopics.map((sub) =>
                        sub.id === subId ? { ...sub, name: value } : sub
                      ),
                    }
                  : t
              ),
            }
          : s
      )
    );

  const removeSubtopicFromTopic = (semId, topicId, subId) =>
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId
          ? {
              ...s,
              topics: s.topics.map((t) =>
                t.id === topicId
                  ? {
                      ...t,
                      subtopics: t.subtopics.filter((sub) => sub.id !== subId),
                    }
                  : t
              ),
            }
          : s
      )
    );

  const handleSuggestionClick = (suggestion) =>
    setFormData((prev) => ({ ...prev, courseCode: suggestion }));

  const handleBatchToggle = (batch) =>
    setFormData((prev) => ({
      ...prev,
      availableBatches: prev.availableBatches.includes(batch)
        ? prev.availableBatches.filter((b) => b !== batch)
        : [...prev.availableBatches, batch],
    }));

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredFields = [
      { name: "courseFullName", label: "Course Full Name" },
      { name: "courseShortName", label: "Course Short Name" },
      { name: "duration", label: "Duration" },
      { name: "totalFee", label: "Total Fee" },
    ];

    const missing = requiredFields.filter(
      (f) => !formData[f.name] || formData[f.name].toString().trim() === ""
    );
    if (missing.length > 0) {
      toast.error(`Please fill: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      let cleanedSyllabus = "[]";
      if (semesters.length > 0) {
        const structured = semesters.map((sem) => ({
          name: sem.name,
          topics: (sem.topics || []).map((topic) => ({
            name: topic.name || "",
            subtopics: (topic.subtopics || []).map((sub) => ({
              name: sub.name || "",
            })),
          })),
        }));
        cleanedSyllabus = JSON.stringify(structured);
      }

      const submitData = {
        courseFullName: formData.courseFullName.trim(),
        courseShortName: formData.courseShortName.trim(),
        duration: formData.duration.trim(),
        totalSemesters: parseFloat(formData.totalSemesters) || 6,
        admissionFee: parseFloat(formData.admissionFee) || 0,
        examFee: parseFloat(formData.examFee) || 0,
        otherCharges: parseFloat(formData.otherCharges) || 0,
        description: formData.description.trim(),
        eligibilityCriteria: formData.eligibilityCriteria.trim(),
        syllabus: cleanedSyllabus,
        careerOpportunities: formData.careerOpportunities.trim(),
        seatsAvailable: parseInt(formData.seatsAvailable) || 60,
        availableBatches: formData.availableBatches,
        isActive: formData.isActive,
        totalFee: parseFloat(formData.totalFee) || 0,
        discount: parseFloat(formData.discount) || 0,
        netFee: parseFloat(formData.netFee) || 0,
        monthlyFee: parseFloat(formData.monthlyFee) || 0,
        numberOfExams: parseInt(formData.numberOfExams) || 0,
        examMonths: formData.examMonths.trim(),
        courseType: formData.courseType || "",
      };

      const response = await courseAPI.updateCourse(id, submitData);

      if (response.data.success) {
        toast.success("Course updated successfully!");
        navigate(`${basePath}/setup/courses`);
      } else {
        toast.error(response.data.message || "Failed to update course");
      }
    } catch (error) {
      console.error("Update course error:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to update course";
      toast.error(errorMsg);

      if (error.response?.data?.errors) {
        error.response.data.errors.forEach((err) =>
          toast.error(`${err.msg} (${err.param})`)
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (fetchingCourse) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-gray-600 font-medium">Loading course details...</p>
        </div>
      </div>
    );
  }

  // ─── Render (identical layout to AddCourse) ────────────────────────────────
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`${basePath}/setup/courses`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Courses
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <BookOpen className="text-green-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Edit Course</h1>
            <p className="text-gray-600">
              Update details for{" "}
              <span className="font-medium text-gray-800">
                {formData.courseFullName || "this course"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Row 1: Basic Info + Fee Structure */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Card 1: Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="p-2 bg-blue-50 rounded-lg">
                <BookOpen className="text-blue-600" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                Basic Information
              </h2>
            </div>

            {/* Course code suggestions */}
            {courseCodeSuggestions.length > 0 && !formData.courseCode && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {courseCodeSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSuggestionClick(s)}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Full Name *
                </label>
                <input
                  type="text"
                  name="courseFullName"
                  value={formData.courseFullName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Course Full Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Short Name *
                </label>
                <input
                  type="text"
                  name="courseShortName"
                  value={formData.courseShortName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Course Short Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (months) *
                  </label>
                  <NumberInput
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    placeholder="e.g., 3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Semesters *
                  </label>
                  <NumberInput
                    name="totalSemesters"
                    value={formData.totalSemesters}
                    onChange={handleChange}
                    placeholder="e.g., 6"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Type
                </label>
                <select
                  name="courseType"
                  value={formData.courseType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Course Type</option>
                  <option value="diploma">Diploma</option>
                  <option value="certificate">Certificate</option>
                  <option value="scholarship_based">Scholarship Based</option>
                </select>
                {formData.courseType === "scholarship_based" && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <Award size={12} />
                    Students can apply scholarships to this course
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Fee Structure */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="p-2 bg-green-50 rounded-lg">
                <DollarSign className="text-green-600" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                Fee Structure
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Fee *
                </label>
                <NumberInput
                  name="totalFee"
                  value={formData.totalFee}
                  onChange={handleChange}
                  placeholder="e.g., 25000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount (in %)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                  placeholder="e.g., 10 (for 10% discount)"
                  disabled={formData.courseType === "scholarship_based"}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formData.courseType === "scholarship_based"
                      ? "bg-gray-100 cursor-not-allowed"
                      : "bg-white border-gray-300"
                  }`}
                />
                {formData.courseType === "scholarship_based" ? (
                  <p className="text-xs text-blue-600 mt-1">
                    ✨ Discounts are applied via scholarships, not direct
                    discount
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    Enter discount percentage
                  </p>
                )}
              </div>

              {/* Net Fee (auto calculated) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Net Fee (Auto Calculated)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.netFee ? `₹${formData.netFee}` : ""}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none"
                    placeholder="Will calculate automatically"
                  />
                  <Calculator
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                </div>
              </div>

              {/* Monthly Fee (auto calculated) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Fee (Auto Calculated)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={
                      formData.monthlyFee ? `₹${formData.monthlyFee}` : ""
                    }
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none"
                    placeholder="Will calculate automatically"
                  />
                  <Calculator
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admission Fee
                  </label>
                  <NumberInput
                    name="admissionFee"
                    value={formData.admissionFee}
                    onChange={handleChange}
                    placeholder="e.g., 5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Fee
                  </label>
                  <NumberInput
                    name="examFee"
                    value={formData.examFee}
                    onChange={handleChange}
                    placeholder="e.g., 2000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Other Charges
                </label>
                <NumberInput
                  name="otherCharges"
                  value={formData.otherCharges}
                  onChange={handleChange}
                  placeholder="e.g., 1000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Course Details (full width) */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="p-2 bg-purple-50 rounded-lg">
              <BookOpen className="text-purple-600" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">
              Course Details
            </h2>
          </div>

          <div className="space-y-4">
            {/* Exam fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Exams in Full Course
                </label>
                <NumberInput
                  name="numberOfExams"
                  value={formData.numberOfExams}
                  onChange={handleChange}
                  placeholder="e.g., 2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Total number of exams throughout the course
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Months
                </label>
                <input
                  type="text"
                  name="examMonths"
                  value={formData.examMonths}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 6, 9, 12"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter months when exams occur (comma separated)
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Example: For a 15-month course with exams at month 6 and 9,
                  enter "6, 9"
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Course overview and objectives..."
              />
            </div>

            {/* Eligibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Eligibility Criteria
              </label>
              <textarea
                name="eligibilityCriteria"
                value={formData.eligibilityCriteria}
                onChange={handleChange}
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Minimum educational qualifications required..."
              />
            </div>

            {/* Semester-based Syllabus */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Course Syllabus (Semester-wise)
                </label>
                <button
                  type="button"
                  onClick={addSemester}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus size={16} />
                  Add Semester
                </button>
              </div>

              {semesters.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <BookOpen
                    className="mx-auto text-gray-400 mb-2"
                    size={32}
                  />
                  <p className="text-gray-500 mb-2">No semesters added yet</p>
                  <p className="text-gray-400 text-sm">
                    Click "Add Semester" to start building your course syllabus
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {semesters.map((semester) => (
                    <div
                      key={semester.id}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      {/* Semester Header */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleSemesterExpand(semester.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            {semester.isExpanded ? (
                              <ChevronUp size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </button>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={semester.name}
                              onChange={(e) =>
                                updateSemesterName(semester.id, e.target.value)
                              }
                              className="font-medium text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:outline-none focus:border-blue-500 px-1"
                            />
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {semester.topics.length} topics
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => addTopicToSemester(semester.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                          >
                            <Plus size={12} />
                            Add Topic
                          </button>
                          {semesters.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSemester(semester.id)}
                              className="p-1 text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Topics */}
                      {semester.isExpanded && (
                        <div className="p-4 space-y-4">
                          {semester.topics.length === 0 ? (
                            <p className="text-center py-3 text-gray-400 text-sm">
                              No topics yet. Click "Add Topic" to add one.
                            </p>
                          ) : (
                            semester.topics.map((topic) => (
                              <div
                                key={topic.id}
                                className="border border-gray-200 rounded-lg"
                              >
                                {/* Topic Header */}
                                <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
                                  <div className="flex items-center gap-3 flex-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleTopicExpand(semester.id, topic.id)
                                      }
                                      className="text-gray-500 hover:text-gray-700"
                                    >
                                      {topic.isExpanded ? (
                                        <ChevronUp size={16} />
                                      ) : (
                                        <ChevronDown size={16} />
                                      )}
                                    </button>
                                    <input
                                      type="text"
                                      value={topic.name}
                                      onChange={(e) =>
                                        updateTopicName(
                                          semester.id,
                                          topic.id,
                                          e.target.value
                                        )
                                      }
                                      className="font-medium text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:outline-none focus:border-blue-500 w-full px-1"
                                      placeholder="Enter topic name"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        addSubtopicToTopic(
                                          semester.id,
                                          topic.id
                                        )
                                      }
                                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                                    >
                                      <Plus size={12} />
                                      Add Subtopic
                                    </button>
                                    {semester.topics.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeTopicFromSemester(
                                            semester.id,
                                            topic.id
                                          )
                                        }
                                        className="p-1 text-red-600 hover:text-red-800"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Subtopics */}
                                {topic.isExpanded && (
                                  <div className="p-4 space-y-2">
                                    {topic.subtopics.length === 0 ? (
                                      <p className="text-center py-3 text-gray-400 text-sm">
                                        No subtopics yet. Click "Add Subtopic"
                                        to add one.
                                      </p>
                                    ) : (
                                      topic.subtopics.map((subtopic, sIdx) => (
                                        <div
                                          key={subtopic.id}
                                          className="flex items-center gap-3 pl-6"
                                        >
                                          <span className="text-gray-500 text-sm min-w-6">
                                            {sIdx + 1}.
                                          </span>
                                          <input
                                            type="text"
                                            value={subtopic.name}
                                            onChange={(e) =>
                                              updateSubtopicName(
                                                semester.id,
                                                topic.id,
                                                subtopic.id,
                                                e.target.value
                                              )
                                            }
                                            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder={`Enter subtopic ${
                                              sIdx + 1
                                            }`}
                                          />
                                          {topic.subtopics.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                removeSubtopicFromTopic(
                                                  semester.id,
                                                  topic.id,
                                                  subtopic.id
                                                )
                                              }
                                              className="p-1 text-red-600 hover:text-red-800"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Career Opportunities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Career Opportunities
              </label>
              <textarea
                name="careerOpportunities"
                value={formData.careerOpportunities}
                onChange={handleChange}
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Job roles and career prospects..."
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(`${basePath}/setup/courses`)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={20} />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditCourse;