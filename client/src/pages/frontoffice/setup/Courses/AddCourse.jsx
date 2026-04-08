// pages/admin/courses/AddCourse.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  Award, // Added Award icon
} from "lucide-react";
import { courseAPI } from "../../../../services/api";
import toast from "react-hot-toast";

// FIXED: Create a separate NumberInput component OUTSIDE the main component
const NumberInput = ({
  name,
  value,
  onChange,
  placeholder,
  required = false,
}) => (
  <input
    type="text"
    inputMode="decimal"
    name={name}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    required={required}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
);

const AddCourse = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [courseCodeSuggestions, setCourseCodeSuggestions] = useState([]);

  // NEW STATE FOR SEMESTER-BASED SYLLABUS WITH SUBTOPICS
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
    syllabus: "", // This will now store the structured syllabus data
    careerOpportunities: "",
    seatsAvailable: "60",
    availableBatches: ["morning"],
    isActive: true,
    // NEW FIELDS ADDED HERE
    totalFee: "",
    discount: "",
    netFee: "",
    monthlyFee: "",
    numberOfExams: "",
    examMonths: "",
    courseType: "",
  });

  // Calculate net fee and monthly fee whenever totalFee or discount changes
  useEffect(() => {
    const calculateFees = () => {
      const totalFee = parseFloat(formData.totalFee) || 0;
      const discount = parseFloat(formData.discount) || 0; // Default to 0 if no discount
      const duration = parseFloat(formData.duration) || 1; // Default to 1 if no duration

      let netFee = 0;
      let monthlyFee = 0;

      // Calculate Net Fee: totalFee ÷ discount
      if (totalFee > 0 && discount > 0) {
        const discountAmount = (totalFee * discount) / 100;
        netFee = totalFee - discountAmount;
      } else if (totalFee > 0) {
        netFee = totalFee; // If no discount, net fee equals total fee
      }

      // Calculate Monthly Fee: netFee ÷ duration
      if (netFee > 0 && duration > 0) {
        monthlyFee = netFee / duration;
      }

      // Update form data only if calculations are valid
      if (!isNaN(netFee) && netFee > 0) {
        setFormData((prev) => ({
          ...prev,
          netFee: netFee.toFixed(2),
          monthlyFee: monthlyFee.toFixed(2),
        }));
      } else {
        // Reset if invalid
        setFormData((prev) => ({
          ...prev,
          netFee: "",
          monthlyFee: "",
        }));
      }
    };

    calculateFees();
  }, [formData.totalFee, formData.discount, formData.duration]);

  // Convert semesters array to JSON string for form submission
  useEffect(() => {
    if (semesters.length > 0) {
      const syllabusJSON = JSON.stringify(semesters);
      setFormData((prev) => ({ ...prev, syllabus: syllabusJSON }));
    } else {
      setFormData((prev) => ({ ...prev, syllabus: "" }));
    }
  }, [semesters]);

  // Generate course code suggestions based on course name
  useEffect(() => {
    if (formData.courseFullName.trim() && !formData.courseCode) {
      const words = formData.courseFullName.split(" ");
      let suggestions = [];

      if (words.length > 1) {
        const code1 = words
          .map((word) => word.charAt(0).toUpperCase())
          .join("");
        suggestions.push(code1);
      }

      if (words[0].length >= 3) {
        const code2 = words[0].substring(0, 3).toUpperCase() + "101";
        suggestions.push(code2);
      }

      const currentYear = new Date().getFullYear().toString().slice(-2);
      if (formData.courseShortName) {
        const code3 = formData.courseShortName.toUpperCase() + currentYear;
        suggestions.push(code3);
      }

      setCourseCodeSuggestions(suggestions);
    } else {
      setCourseCodeSuggestions([]);
    }
  }, [formData.courseFullName, formData.courseShortName, formData.courseCode]);

  // FIXED: Use useCallback to prevent unnecessary re-renders
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    const numberFields = [
      "semesterFee",
      "admissionFee",
      "examFee",
      "otherCharges",
      "totalSemesters",
      "seatsAvailable",
      // NEW NUMBER FIELDS
      "totalFee",
      "discount",
      "numberOfExams",
    ];

    // Handle number fields
    if (numberFields.includes(name)) {
      // Allow empty OR valid number pattern
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
      return;
    }

    // Handle course code
    if (name === "courseCode") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.toUpperCase().replace(/\s/g, ""),
      }));
      return;
    }

    // Handle exam months field (allow numbers, commas, spaces)
    if (name === "examMonths") {
      // Allow only numbers, commas, spaces
      if (value === "" || /^[\d\s,]*$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
      return;
    }

    // Handle all other fields
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // NEW FUNCTIONS FOR SEMESTER MANAGEMENT WITH SUBTOPICS

  // Add semester
  const addSemester = () => {
    const semesterNumber = semesters.length + 1;
    const newSemester = {
      id: Date.now(),
      name: `Semester ${semesterNumber}`,
      isExpanded: true,
      topics: [],
    };
    setSemesters([...semesters, newSemester]);
  };

  // Remove semester
  const removeSemester = (semesterId) => {
    setSemesters(semesters.filter((sem) => sem.id !== semesterId));
  };

  // Add topic to semester
  const addTopicToSemester = (semesterId) => {
    setSemesters(
      semesters.map((sem) => {
        if (sem.id === semesterId) {
          const newTopic = {
            id: Date.now(),
            name: "",
            isExpanded: true,
            subtopics: [],
          };
          return {
            ...sem,
            topics: [...sem.topics, newTopic],
          };
        }
        return sem;
      })
    );
  };

  // Remove topic from semester
  const removeTopicFromSemester = (semesterId, topicId) => {
    setSemesters(
      semesters.map((sem) => {
        if (sem.id === semesterId) {
          return {
            ...sem,
            topics: sem.topics.filter((topic) => topic.id !== topicId),
          };
        }
        return sem;
      })
    );
  };

  // Update topic name
  const updateTopicName = (semesterId, topicId, value) => {
    setSemesters(
      semesters.map((sem) => {
        if (sem.id === semesterId) {
          return {
            ...sem,
            topics: sem.topics.map((topic) =>
              topic.id === topicId ? { ...topic, name: value } : topic
            ),
          };
        }
        return sem;
      })
    );
  };

  // Toggle semester expansion
  const toggleSemesterExpand = (semesterId) => {
    setSemesters(
      semesters.map((sem) => {
        if (sem.id === semesterId) {
          return {
            ...sem,
            isExpanded: !sem.isExpanded,
          };
        }
        return sem;
      })
    );
  };

  // Toggle topic expansion
  const toggleTopicExpand = (semesterId, topicId) => {
    setSemesters(
      semesters.map((sem) => {
        if (sem.id === semesterId) {
          return {
            ...sem,
            topics: sem.topics.map((topic) =>
              topic.id === topicId
                ? { ...topic, isExpanded: !topic.isExpanded }
                : topic
            ),
          };
        }
        return sem;
      })
    );
  };

  // Add subtopic to a topic
  const addSubtopicToTopic = (semesterId, topicId) => {
    setSemesters(
      semesters.map((sem) => {
        if (sem.id === semesterId) {
          return {
            ...sem,
            topics: sem.topics.map((topic) => {
              if (topic.id === topicId) {
                const newSubtopicId = Date.now();
                return {
                  ...topic,
                  subtopics: [
                    ...topic.subtopics,
                    { id: newSubtopicId, name: "" },
                  ],
                  isExpanded: true, // Auto-expand when adding subtopic
                };
              }
              return topic;
            }),
          };
        }
        return sem;
      })
    );
  };

  // Update subtopic name
  const updateSubtopicName = (semesterId, topicId, subtopicId, value) => {
    setSemesters(
      semesters.map((sem) => {
        if (sem.id === semesterId) {
          return {
            ...sem,
            topics: sem.topics.map((topic) => {
              if (topic.id === topicId) {
                return {
                  ...topic,
                  subtopics: topic.subtopics.map((subtopic) =>
                    subtopic.id === subtopicId
                      ? { ...subtopic, name: value }
                      : subtopic
                  ),
                };
              }
              return topic;
            }),
          };
        }
        return sem;
      })
    );
  };

  // Remove subtopic
  const removeSubtopicFromTopic = (semesterId, topicId, subtopicId) => {
    setSemesters(
      semesters.map((sem) => {
        if (sem.id === semesterId) {
          return {
            ...sem,
            topics: sem.topics.map((topic) => {
              if (topic.id === topicId) {
                return {
                  ...topic,
                  subtopics: topic.subtopics.filter(
                    (subtopic) => subtopic.id !== subtopicId
                  ),
                };
              }
              return topic;
            }),
          };
        }
        return sem;
      })
    );
  };

  // Update semester name
  const updateSemesterName = (semesterId, value) => {
    setSemesters(
      semesters.map((sem) =>
        sem.id === semesterId ? { ...sem, name: value } : sem
      )
    );
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData((prev) => ({ ...prev, courseCode: suggestion }));
  };

  const handleBatchToggle = (batch) => {
    setFormData((prev) => ({
      ...prev,
      availableBatches: prev.availableBatches.includes(batch)
        ? prev.availableBatches.filter((b) => b !== batch)
        : [...prev.availableBatches, batch],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = [
      { name: "courseFullName", label: "Course Full Name" },
      { name: "courseShortName", label: "Course Short Name" },
      { name: "duration", label: "Duration" },
      { name: "totalFee", label: "Total Fee" },
    ];

    const missingFields = requiredFields.filter(
      (field) =>
        !formData[field.name] || formData[field.name].toString().trim() === ""
    );

    if (missingFields.length > 0) {
      toast.error(
        `Please fill: ${missingFields.map((f) => f.label).join(", ")}`
      );
      return;
    }

    setLoading(true);

    try {
      // Clean the syllabus data before sending
      let cleanedSyllabus = "[]"; // Default to empty array

      if (semesters.length > 0) {
        // Remove temporary fields (id, isExpanded) and keep only necessary structure
        const structuredSyllabus = semesters.map((semester) => ({
          name: semester.name || `Semester ${semesters.indexOf(semester) + 1}`,
          topics: (semester.topics || []).map((topic) => ({
            name: topic.name || "",
            subtopics: (topic.subtopics || []).map((subtopic) => ({
              name: subtopic.name || "",
            })),
          })),
        }));

        cleanedSyllabus = JSON.stringify(structuredSyllabus);
        console.log("📝 Cleaned syllabus structure:", structuredSyllabus);
      }

      const submitData = {
        courseFullName: formData.courseFullName.trim(),
        courseShortName: formData.courseShortName.trim(),
        duration: formData.duration.trim(),
        totalSemesters: parseFloat(formData.totalSemesters) || 6,
        admissionFee: formData.admissionFee
          ? parseFloat(formData.admissionFee)
          : 0,
        examFee: formData.examFee ? parseFloat(formData.examFee) : 0,
        otherCharges: formData.otherCharges
          ? parseFloat(formData.otherCharges)
          : 0,
        description: formData.description.trim(),
        eligibilityCriteria: formData.eligibilityCriteria.trim(),
        syllabus: cleanedSyllabus, // Use the cleaned syllabus
        careerOpportunities: formData.careerOpportunities.trim(),
        seatsAvailable: parseInt(formData.seatsAvailable) || 60,
        availableBatches: formData.availableBatches,
        isActive: formData.isActive,
        totalFee: formData.totalFee ? parseFloat(formData.totalFee) : 0,
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        netFee: formData.netFee ? parseFloat(formData.netFee) : 0,
        monthlyFee: formData.monthlyFee ? parseFloat(formData.monthlyFee) : 0,
        numberOfExams: formData.numberOfExams
          ? parseInt(formData.numberOfExams)
          : 0,
        examMonths: formData.examMonths.trim(),
        courseType: formData.courseType || "",
      };

      console.log(
        "📤 Sending data to backend:",
        JSON.stringify(submitData, null, 2)
      );

      const response = await courseAPI.createCourse(submitData);

      if (response.data.success) {
        toast.success("Course created successfully!");
        navigate("/admin/setup/courses");
      } else {
        toast.error(response.data.message || "Failed to create course");
      }
    } catch (error) {
      console.error("❌ Create course error:", error);
      console.error("🔍 Error response data:", error.response?.data);
      console.error("🔍 Error status:", error.response?.status);
      console.error("🔍 Error headers:", error.response?.headers);

      if (error.response) {
        const errorMsg =
          error.response.data?.message ||
          error.response.data?.error ||
          "Failed to create course";
        toast.error(errorMsg);

        if (error.response.data?.errors) {
          error.response.data.errors.forEach((err) => {
            toast.error(`${err.msg} (${err.param})`);
          });
        }
      } else if (error.request) {
        console.error("🔍 No response received:", error.request);
        toast.error("No response from server. Check your connection.");
      } else {
        console.error("🔍 Request setup error:", error.message);
        toast.error("Error: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/admin/setup/courses")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Courses
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BookOpen className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Add New Course</h1>
            <p className="text-gray-600">Create a new course offering</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Two Cards Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Card 1: Basic Information - FIXED LAYOUT */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="p-2 bg-blue-50 rounded-lg">
                <BookOpen className="text-blue-600" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                Basic Information
              </h2>
            </div>

            <div>
              {/* <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Code
                </label>
                <input
                  type="text"
                  name="courseCode"
                  value={formData.courseCode}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., BCA2024"
                /> */}

              {/* Course Code Suggestions */}
              {courseCodeSuggestions.length > 0 && !formData.courseCode && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {courseCodeSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

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

              {/* ADDED COURSE CODE FIELD HERE TO BALANCE THE LAYOUT */}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration *
                  </label>
                  <NumberInput
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    placeholder="e.g., 3 "
                  />
                  {/* <p className="text-xs text-gray-500 mt-1">
                  Enter discount percentage or amount
                </p> */}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Semesters *
                  </label>
                  <NumberInput
                    name="totalSemesters"
                    value={formData.totalSemesters}
                    onChange={handleChange}
                    placeholder="e.g. 6"
                    required
                  />
                </div>
              </div>

              {/* UPDATED: Course Type with Scholarship Option */}
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

    {/* DISCOUNT FIELD - CONDITIONALLY DISABLED */}
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
            : "bg-white"
        }`}
      />
      {formData.courseType === "scholarship_based" ? (
        <p className="text-xs text-blue-600 mt-1">
          ✨ Discounts are applied via scholarships, not direct discount
        </p>
      ) : (
        <p className="text-xs text-gray-500 mt-1">
          Enter discount percentage
        </p>
      )}
    </div>


               {/* NET FEE (AUTO CALCULATED) */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Net Fee (Auto Calculated)
      </label>
      <div className="relative">
        <input
          type="text"
          value={formData.netFee ? `₹${formData.netFee}` : ""}
          readOnly
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Will calculate automatically"
        />
        <Calculator
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={18}
        />
      </div>
    </div>


              {/* MONTHLY FEE (AUTO CALCULATED) */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Monthly Fee (Auto Calculated)
      </label>
      <div className="relative">
        <input
          type="text"
          value={formData.monthlyFee ? `₹${formData.monthlyFee}` : ""}
          readOnly
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Will calculate automatically"
        />
        <Calculator
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={18}
        />
      </div>
    </div>

             {/* EXISTING FEE FIELDS */}
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

        {/* Card 3: Course Details (Full width) - UPDATED WITH EXAM FIELDS */}
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
            {/* NEW EXAM FIELDS ADDED HERE */}
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
                  Example: For a 15-month course where exams are at month 6 and
                  9, enter "6, 9"
                </p>
              </div>
            </div>

            {/* EXISTING COURSE DETAILS FIELDS */}
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

            {/* UPDATED: SEMESTER-BASED SYLLABUS BUILDER WITH SUBTOPICS */}
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
                  <BookOpen className="mx-auto text-gray-400 mb-2" size={32} />
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

                      {/* Semester Content (Topics with Subtopics) */}
                      {semester.isExpanded && (
                        <div className="p-4 space-y-4">
                          {semester.topics.map((topic) => (
                            <div
                              key={topic.id}
                              className="border border-gray-200 rounded-lg"
                            >
                              {/* Topic Header */}
                              <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
                                <div className="flex items-center gap-3">
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
                                  <div className="flex-1">
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
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addSubtopicToTopic(semester.id, topic.id)
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

                              {/* Subtopic List */}
                              {topic.isExpanded && (
                                <div className="p-4 space-y-2">
                                  {topic.subtopics.length === 0 ? (
                                    <div className="text-center py-3 text-gray-500 text-sm">
                                      No subtopics yet. Click "Add Subtopic" to
                                      add one.
                                    </div>
                                  ) : (
                                    topic.subtopics.map(
                                      (subtopic, subIndex) => (
                                        <div
                                          key={subtopic.id}
                                          className="flex items-center gap-3 pl-6"
                                        >
                                          <span className="text-gray-500 text-sm min-w-6">
                                            {subIndex + 1}.
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
                                              subIndex + 1
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
                                      )
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

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

        {/* Card 4: Settings */}
        {/* <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="p-2 bg-orange-50 rounded-lg">
              <BookOpen className="text-orange-600" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seats Available *
                </label>
                <NumberInput
                  name="seatsAvailable"
                  value={formData.seatsAvailable}
                  onChange={handleChange}
                  placeholder="e.g., 60"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Available Batches
                </label>
                <div className="flex flex-wrap gap-2">
                  {["morning", "afternoon", "evening", "weekend"].map(
                    (batch) => (
                      <button
                        key={batch}
                        type="button"
                        onClick={() => handleBatchToggle(batch)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${
                          formData.availableBatches.includes(batch)
                            ? "bg-blue-100 text-blue-800 border border-blue-300"
                            : "bg-gray-100 text-gray-800 border border-gray-300"
                        }`}
                      >
                        {batch}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="isActive"
                  className="ml-3 text-sm text-gray-700"
                >
                  <span className="font-medium">Active Course</span>
                  <p className="text-gray-500 text-xs mt-1">
                    Inactive courses won't be available for new admissions
                  </p>
                </label>
              </div>
            </div>
          </div>
        </div> */}

        {/* Form Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate("/admin/setup/courses")}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={20} />
              {loading ? "Creating..." : "Create Course"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddCourse;