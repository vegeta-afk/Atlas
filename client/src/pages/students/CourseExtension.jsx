import React, { useState, useEffect } from "react";
import {
  Search,
  User,
  Calendar,
  BookOpen,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  DollarSign,
  Clock,
  FileText,
  ArrowLeft,
  RefreshCw,
  Users,
  GraduationCap,
  Award,
  ArrowRight,
  Info,
  Check,
  Plus,
  Layers,
  Briefcase,
  Clock as ClockIcon,
} from "lucide-react";
import { courseExtensionAPI } from "../../services/api";
import { courseAPI } from "../../services/api";
import { facultyAPI } from "../../services/api";
import { setupAPI } from "../../services/api";
import useBasePath from "../../hooks/useBasePath";

const CourseExtension = () => {
  const basePath = useBasePath();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Student selection
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);

  // Course selection
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseLoading, setCourseLoading] = useState(false);

  // Faculty & Batch selection
  const [facultyList, setFacultyList] = useState([]);
  const [batchList, setBatchList] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // Extension reason
  const [extensionReason, setExtensionReason] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchFaculty();
    fetchBatches();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        searchStudents();
      } else {
        setStudents([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCourses = async () => {
    try {
      setCourseLoading(true);
      const response = await courseAPI.getCourses({ isActive: true });
      if (response.data.success) {
        setCourses(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setCourseLoading(false);
    }
  };

  const fetchFaculty = async () => {
    try {
      setFacultyLoading(true);
      const response = await facultyAPI.getFaculty({ isActive: true, status: "active" });
      if (response.data.success) {
        setFacultyList(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching faculty:", err);
    } finally {
      setFacultyLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      setBatchLoading(true);
      const response = await setupAPI.getAll();
      if (response.data.success) {
        setBatchList(response.data.data.batches || []);
      }
    } catch (err) {
      console.error("Error fetching batches:", err);
    } finally {
      setBatchLoading(false);
    }
  };

  const searchStudents = async () => {
    try {
      setStudentLoading(true);
      const response = await courseExtensionAPI.getEligibleStudents({
        search: searchTerm
      });
      
      if (response.data.success) {
        setStudents(response.data.data || []);
      }
    } catch (err) {
      console.error("Error searching students:", err);
      setError("Failed to search students");
    } finally {
      setStudentLoading(false);
    }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setStep(2);
    setError(null);
  };

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    setStep(3);
    setError(null);
  };

  const getExtensionPreview = async () => {
    if (!selectedStudent || !selectedCourse || !selectedFaculty || !selectedBatch) {
      setError("Please select student, course, faculty, and batch");
      return;
    }

    try {
      setPreviewLoading(true);
      setError(null);

      // Get faculty name for display
      const faculty = facultyList.find(f => f._id === selectedFaculty);
      
      // Calculate course total
      const monthlyFee = parseFloat(selectedCourse.monthlyFee) || 0;
      const examFee = parseFloat(selectedCourse.examFee) || 0;
      const duration = parseInt(selectedCourse.duration) || 0;
      const examMonths = selectedCourse.examMonths
        ? selectedCourse.examMonths.split(',').map(m => parseInt(m.trim()))
        : [];
      
      const examCount = examMonths.length;
      const totalFee = (monthlyFee * duration) + (examFee * examCount);

      setPreviewData({
        student: selectedStudent,
        course: selectedCourse,
        faculty: faculty,
        batch: selectedBatch,
        totalFee,
        monthlyFee,
        examFee,
        duration,
        examMonths,
        examCount
      });
      
      setStep(4);
    } catch (err) {
      console.error("Preview error:", err);
      setError(err.message || "Failed to generate preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExtend = async () => {
    if (!selectedStudent || !selectedCourse || !selectedFaculty || !selectedBatch) {
      setError("Missing required information");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await courseExtensionAPI.extendStudentCourse({
        studentId: selectedStudent.id,
        newCourseId: selectedCourse._id,
        extensionReason: extensionReason || "Course extension requested",
        facultyId: selectedFaculty,
        batchTime: selectedBatch
      });

      if (response.data.success) {
        setSuccess({
          message: "Course Extended Successfully!",
          data: response.data.data
        });
        setStep(5);
      } else {
        throw new Error(response.data.message || "Extension failed");
      }
    } catch (err) {
      console.error("Extension error:", err);
      setError(err.response?.data?.message || err.message || "Extension failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedStudent(null);
    setSelectedCourse(null);
    setSelectedFaculty("");
    setSelectedBatch("");
    setExtensionReason("");
    setPreviewData(null);
    setError(null);
    setSuccess(null);
    setSearchTerm("");
    setStudents([]);
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="w-full">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {step > 1 && step < 5 && (
                <button
                  onClick={goBack}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all group"
                >
                  <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  <span>Back</span>
                </button>
              )}
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                  Course Extension
                </h1>
                <p className="text-gray-600 mt-1">Add an additional course to a student's existing enrollment</p>
              </div>
            </div>
            {step === 5 && (
              <button
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
              >
                <RefreshCw size={18} />
                New Extension
              </button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 shadow-sm">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded-lg transition-colors"
            >
              <XCircle size={18} />
            </button>
          </div>
        )}

        {/* Success State */}
        {success && (
          <div className="bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-green-500 to-teal-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <CheckCircle size={24} className="text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white">{success.message}</h2>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <User className="text-blue-600" size={20} />
                    <div>
                      <p className="text-sm text-blue-600">Student</p>
                      <p className="font-semibold text-gray-900">{success.data.studentName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <Layers className="text-purple-600" size={20} />
                    <div>
                      <p className="text-sm text-purple-600">Courses</p>
                      <p className="font-semibold text-gray-900">
                        {success.data.oldCourse} + {success.data.newCourse}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-sm text-gray-500">Course Duration</p>
                      <p className="text-xl font-bold text-gray-900">{success.data.monthsAdded} months</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <p className="text-sm text-green-600">Additional Fees</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(success.data.additionalFees)}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <p className="text-sm text-orange-600">New Total</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(success.data.newTotalFee)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step Progress */}
        {!success && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-gray-100">
            <div className="relative">
              <div className="absolute top-5 left-0 w-full h-1 bg-gray-200 rounded-full">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${((step - 1) / 3) * 100}%` }}
                />
              </div>
              
              <div className="relative flex justify-between">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                      step >= s
                        ? "bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg scale-110"
                        : "bg-gray-200 text-gray-600"
                    }`}>
                      {step > s ? <Check size={16} /> : s}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${
                      step >= s ? "text-gray-900" : "text-gray-400"
                    }`}>
                      {s === 1 && "Select Student"}
                      {s === 2 && "Select Course"}
                      {s === 3 && "Faculty & Batch"}
                      {s === 4 && "Confirm"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Select Student */}
        {step === 1 && !success && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Users size={20} />
                Select Student
              </h2>
            </div>
            
            <div className="p-6">
              <div className="relative mb-6">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, roll no, or admission no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>

              {studentLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin"></div>
                </div>
              ) : students.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => handleSelectStudent(student)}
                      className="w-full p-5 border border-gray-200 rounded-xl hover:border-green-400 hover:shadow-lg transition-all text-left group bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-100 to-teal-100 text-green-600 flex items-center justify-center font-bold text-xl shadow-sm">
                            {student.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                              {student.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Roll No: {student.rollNo}</p>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">Current Course</p>
                          <p className="font-semibold text-gray-900 truncate">{student.courseName}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">Admission Date</p>
                          <p className="font-semibold text-gray-900">{formatDate(student.admissionDate)}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">Paid Amount</p>
                          <p className="font-semibold text-green-600">{formatCurrency(student.paidAmount)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchTerm ? (
                <div className="text-center py-16 text-gray-500">
                  <User size={64} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-lg">No students found matching your search</p>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <Search size={64} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-lg">Search for a student by name or roll number</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Course */}
        {step === 2 && selectedStudent && !success && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <GraduationCap size={20} />
                Select Additional Course
              </h2>
            </div>
            
            <div className="p-6">
              <div className="mb-6 p-5 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border border-green-100">
                <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <User size={16} />
                  Selected Student
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-green-600">Name</p>
                    <p className="font-semibold text-gray-900">{selectedStudent.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Current Course</p>
                    <p className="font-semibold text-gray-900">{selectedStudent.courseName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Paid Amount</p>
                    <p className="font-semibold text-green-600">{formatCurrency(selectedStudent.paidAmount)}</p>
                  </div>
                </div>
              </div>

              {courseLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.map((course) => (
                    <button
                      key={course._id}
                      onClick={() => handleSelectCourse(course)}
                      className="p-5 border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all text-left group bg-white"
                    >
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 mb-3">
                        {course.courseFullName}
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">Duration</p>
                          <p className="font-semibold">{course.duration} months</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">Monthly Fee</p>
                          <p className="font-semibold text-blue-600">{formatCurrency(course.monthlyFee)}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">Exam Fee</p>
                          <p className="font-semibold text-orange-600">{formatCurrency(course.examFee || 0)}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">Exam Months</p>
                          <p className="font-semibold">{course.examMonths || "N/A"}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Select Faculty & Batch */}
        {step === 3 && selectedStudent && selectedCourse && !success && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Briefcase size={20} />
                Select Faculty & Batch
              </h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Faculty Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Faculty <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedFaculty}
                    onChange={(e) => setSelectedFaculty(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={facultyLoading}
                  >
                    <option value="">Choose a faculty</option>
                    {facultyList.map((faculty) => (
                      <option key={faculty._id} value={faculty._id}>
                        {faculty.facultyName} - {faculty.courseAssigned || "General"}
                      </option>
                    ))}
                  </select>
                  {facultyLoading && (
                    <p className="text-sm text-gray-500 mt-2">Loading faculty...</p>
                  )}
                </div>

                {/* Batch Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Batch Time <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={batchLoading}
                  >
                    <option value="">Choose a batch time</option>
                    {batchList.map((batch) => (
                      <option key={batch._id} value={batch.displayName}>
                        {batch.batchName} ({batch.displayName})
                      </option>
                    ))}
                  </select>
                  {batchLoading && (
                    <p className="text-sm text-gray-500 mt-2">Loading batches...</p>
                  )}
                </div>
              </div>

              {/* Reason (Optional) */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Extension (Optional)
                </label>
                <textarea
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="Enter reason for course extension..."
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Preview Button */}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={getExtensionPreview}
                  disabled={!selectedFaculty || !selectedBatch || previewLoading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  {previewLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating Preview...
                    </>
                  ) : (
                    <>
                      <TrendingUp size={20} />
                      Generate Preview
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Preview & Confirm */}
        {step === 4 && previewData && !success && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Award size={20} />
                  Extension Preview
                </h2>
              </div>
              
              <div className="p-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-5 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-sm text-blue-600 mb-1">Course Duration</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {previewData.duration} months
                    </p>
                  </div>
                  
                  <div className="p-5 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-sm text-green-600 mb-1">Monthly Fee</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(previewData.monthlyFee)}
                    </p>
                  </div>
                  
                  <div className="p-5 bg-orange-50 rounded-xl border border-orange-200">
                    <p className="text-sm text-orange-600 mb-1">Total Course Fee</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(previewData.totalFee)}
                    </p>
                  </div>
                </div>

                {/* Faculty & Batch Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <p className="text-sm text-purple-600 mb-1">Assigned Faculty</p>
                    <p className="font-semibold text-gray-900">{previewData.faculty?.facultyName}</p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                    <p className="text-sm text-indigo-600 mb-1">Batch Time</p>
                    <p className="font-semibold text-gray-900">{previewData.batch}</p>
                  </div>
                </div>

                {/* Exam Info */}
                {previewData.examCount > 0 && (
                  <div className="mb-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                    <p className="font-semibold text-yellow-800 mb-2">Exam Schedule</p>
                    <p className="text-yellow-700">
                      {previewData.examCount} exam(s) at months: {previewData.examMonths.join(", ")} 
                      (₹{formatCurrency(previewData.examFee)} each)
                    </p>
                  </div>
                )}

                {/* Important Notes */}
                <div className="p-5 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
                  <p className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                    <Info size={18} />
                    Important Notes
                  </p>
                  <ul className="list-disc list-inside text-yellow-700 space-y-1 text-sm">
                    <li>
                      Student will be enrolled in TWO courses simultaneously
                    </li>
                    <li>
                      New course "{previewData.course.courseFullName}" will be added
                    </li>
                    <li>
                      Faculty: {previewData.faculty?.facultyName}
                    </li>
                    <li>
                      Batch Time: {previewData.batch}
                    </li>
                    <li className="font-semibold text-red-600">This action cannot be undone</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={goBack}
                className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all font-medium"
              >
                Back
              </button>
              <button
                onClick={handleExtend}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Extending...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Confirm Extension
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseExtension;