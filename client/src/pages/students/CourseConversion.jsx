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
} from "lucide-react";
import { courseConversionAPI } from "../../services/api";
import { courseAPI } from "../../services/api";
import useBasePath from "../../hooks/useBasePath";

const CourseConversion = () => {
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

  // Conversion details
  const [conversionMonth, setConversionMonth] = useState("");
  const [conversionReason, setConversionReason] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
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

  const searchStudents = async () => {
    try {
      setStudentLoading(true);
      const response = await courseConversionAPI.getEligibleStudents({
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

  const getConversionPreview = async () => {
    if (!selectedStudent || !selectedCourse || !conversionMonth) {
      setError("Please select student, course, and conversion month");
      return;
    }

    try {
      setPreviewLoading(true);
      setError(null);

      const response = await courseConversionAPI.getConversionPreview({
        studentId: selectedStudent.id,
        newCourseId: selectedCourse._id,
        conversionMonth: parseInt(conversionMonth)
      });

      if (response.data.success) {
        setPreviewData(response.data.data);
        setStep(4);
      } else {
        throw new Error(response.data.message || "Failed to generate preview");
      }
    } catch (err) {
      console.error("Preview error:", err);
      setError(err.response?.data?.message || err.message || "Failed to generate preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!selectedStudent || !selectedCourse || !conversionMonth) {
      setError("Missing required information");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await courseConversionAPI.convertStudentCourse({
        studentId: selectedStudent.id,
        newCourseId: selectedCourse._id,
        conversionMonth: parseInt(conversionMonth),
        conversionReason: conversionReason || "Course conversion requested"
      });

      if (response.data.success) {
        setSuccess({
          message: "Course Converted Successfully!",
          data: response.data.data
        });
        setStep(5);
      } else {
        throw new Error(response.data.message || "Conversion failed");
      }
    } catch (err) {
      console.error("Conversion error:", err);
      setError(err.response?.data?.message || err.message || "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedStudent(null);
    setSelectedCourse(null);
    setConversionMonth("");
    setConversionReason("");
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
        {/* Header with Glassmorphism */}
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
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Course Conversion
                </h1>
                <p className="text-gray-600 mt-1">Convert students to different courses with automatic fee adjustment</p>
              </div>
            </div>
            {step === 5 && (
              <button
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                <RefreshCw size={18} />
                New Conversion
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

        {/* Success State - Beautiful Card */}
        {success && (
          <div className="bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
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
                    <ArrowRight className="text-purple-600" size={20} />
                    <div>
                      <p className="text-sm text-purple-600">From → To</p>
                      <p className="font-semibold text-gray-900">
                        {success.data.oldCourse} → {success.data.newCourse}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-sm text-gray-500">Old Total</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(success.data.oldTotalFee)}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <p className="text-sm text-green-600">New Total</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(success.data.newTotalFee)}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <p className="text-sm text-orange-600">New Balance</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(success.data.newBalanceAmount)}</p>
                    <p className="text-xs text-orange-500 mt-1">Conversion Month: {success.data.conversionMonth}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step Progress - Modern Design */}
        {!success && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-gray-100">
            <div className="relative">
              <div className="absolute top-5 left-0 w-full h-1 bg-gray-200 rounded-full">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${((step - 1) / 3) * 100}%` }}
                />
              </div>
              
              <div className="relative flex justify-between">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                      step >= s
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-110"
                        : "bg-gray-200 text-gray-600"
                    }`}>
                      {step > s ? <Check size={16} /> : s}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${
                      step >= s ? "text-gray-900" : "text-gray-400"
                    }`}>
                      {s === 1 && "Select Student"}
                      {s === 2 && "Select Course"}
                      {s === 3 && "Preview"}
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
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Users size={20} />
                Select Student
              </h2>
            </div>
            
            <div className="p-6">
              {/* Search */}
              <div className="relative mb-6">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, roll no, or admission no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Student List */}
              {studentLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : students.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => handleSelectStudent(student)}
                      className="w-full p-5 border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all text-left group bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600 flex items-center justify-center font-bold text-xl shadow-sm">
                            {student.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {student.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Roll No: {student.rollNo}</p>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
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
                          <p className="text-gray-500">Current Month</p>
                          <p className="font-semibold text-blue-600">{student.currentMonth}</p>
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
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <GraduationCap size={20} />
                Select New Course
              </h2>
            </div>
            
            <div className="p-6">
              {/* Selected Student Summary */}
              <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <User size={16} />
                  Selected Student
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-blue-600">Name</p>
                    <p className="font-semibold text-gray-900">{selectedStudent.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">Current Course</p>
                    <p className="font-semibold text-gray-900">{selectedStudent.courseName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">Current Month</p>
                    <p className="font-semibold text-blue-600">{selectedStudent.currentMonth}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">Paid Amount</p>
                    <p className="font-semibold text-green-600">{formatCurrency(selectedStudent.paidAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Course List */}
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
                      className="p-5 border border-gray-200 rounded-xl hover:border-green-400 hover:shadow-lg transition-all text-left group bg-white"
                    >
                      <h3 className="font-semibold text-gray-900 group-hover:text-green-600 mb-3">
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

        {/* Step 3: Conversion Details */}
        {step === 3 && selectedStudent && selectedCourse && !success && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <TrendingUp size={20} />
                Conversion Details
              </h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <User size={18} className="text-blue-600" />
                      Student Information
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-500">Name:</span>
                        <span className="font-semibold text-gray-900">{selectedStudent.name}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-500">Roll No:</span>
                        <span className="font-semibold text-gray-900">{selectedStudent.rollNo}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-500">Current Course:</span>
                        <span className="font-semibold text-gray-900">{selectedStudent.courseName}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-500">Current Month:</span>
                        <span className="font-semibold text-blue-600">{selectedStudent.currentMonth}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-500">Paid Amount:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(selectedStudent.paidAmount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <BookOpen size={18} className="text-purple-600" />
                      New Course Information
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-500">Course:</span>
                        <span className="font-semibold text-gray-900">{selectedCourse.courseFullName}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-semibold text-gray-900">{selectedCourse.duration} months</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-500">Monthly Fee:</span>
                        <span className="font-semibold text-blue-600">{formatCurrency(selectedCourse.monthlyFee)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-500">Exam Fee:</span>
                        <span className="font-semibold text-orange-600">{formatCurrency(selectedCourse.examFee || 0)}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-500">Exam Months:</span>
                        <span className="font-semibold text-gray-900">{selectedCourse.examMonths || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                      <TrendingUp size={18} />
                      Conversion Settings
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Conversion Month <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={selectedStudent.currentMonth}
                          max={selectedStudent.currentMonth + 12}
                          value={conversionMonth}
                          onChange={(e) => setConversionMonth(e.target.value)}
                          placeholder={`Enter month (current: ${selectedStudent.currentMonth})`}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                          <Info size={12} />
                          Conversion will apply from this month onwards
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reason for Conversion (Optional)
                        </label>
                        <textarea
                          value={conversionReason}
                          onChange={(e) => setConversionReason(e.target.value)}
                          placeholder="Enter reason for course conversion..."
                          rows="4"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={getConversionPreview}
                    disabled={!conversionMonth || previewLoading}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
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
          </div>
        )}

        {/* Step 4: Preview & Confirm */}
        {step === 4 && previewData && !success && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Award size={20} />
                  Conversion Preview
                </h2>
              </div>
              
              <div className="p-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-5 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-sm text-blue-600 mb-1">Old Total Fee</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(previewData.conversion.oldTotalFee)}
                    </p>
                    <p className="text-xs text-blue-500 mt-2">
                      {previewData.oldCourse.duration} months @ {formatCurrency(previewData.oldCourse.monthlyFee)}/mo
                    </p>
                  </div>
                  
                  <div className="p-5 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-sm text-green-600 mb-1">New Total Fee</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(previewData.conversion.newTotalFee)}
                    </p>
                    <p className="text-xs text-green-500 mt-2">
                      {previewData.newCourse.duration} months @ {formatCurrency(previewData.newCourse.monthlyFee)}/mo
                    </p>
                  </div>
                  
                  <div className={`p-5 rounded-xl border ${
                    previewData.conversion.feeDifference > 0 
                      ? "bg-orange-50 border-orange-200" 
                      : "bg-teal-50 border-teal-200"
                  }`}>
                    <p className={`text-sm mb-1 ${
                      previewData.conversion.feeDifference > 0 ? "text-orange-600" : "text-teal-600"
                    }`}>
                      Fee Difference
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {previewData.conversion.feeDifference > 0 ? "+" : ""}
                      {formatCurrency(previewData.conversion.feeDifference)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {previewData.conversion.feeDifference > 0 
                        ? "Additional fees due" 
                        : "Reduction in fees"}
                    </p>
                  </div>
                </div>

                {/* Fee Breakdown Table */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700">Fee Schedule Breakdown</h3>
                  
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Months</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Amount</th>
                          <th className="px-6 py-3 text-center font-semibold text-gray-700">Status</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Course / Fee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {/* Paid months */}
                        {previewData.conversion.paidMonths > 0 && (
                          <tr className="bg-green-50">
                            <td className="px-6 py-4 font-medium">
                              Month 1 – {previewData.conversion.paidMonths}
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-green-700">
                              {formatCurrency(previewData.conversion.actualCashPaid)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                PAID
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {previewData.oldCourse.name} @ {formatCurrency(previewData.oldCourse.monthlyFee)}/mo
                            </td>
                          </tr>
                        )}

                        {/* Future months */}
                        <tr className="bg-yellow-50">
                          <td className="px-6 py-4 font-medium">
                            Month {previewData.conversion.conversionMonth} – {previewData.newCourse.duration}
                            <span className="ml-2 text-xs text-yellow-600">
                              ({previewData.conversion.remainingMonths} months)
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-yellow-700">
                            {formatCurrency(previewData.conversion.futureFeeTotal)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                              PENDING
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {previewData.newCourse.name} @ {formatCurrency(previewData.newCourse.monthlyFee)}/mo
                          </td>
                        </tr>

                        {/* Exam months */}
                        {previewData.conversion.examMonthsAfterConversion?.length > 0 && (
                          <tr className="bg-orange-50">
                            <td className="px-6 py-4 font-medium">
                              Exam months: {previewData.conversion.examMonthsAfterConversion.join(", ")}
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-orange-700">
                              +{formatCurrency(previewData.conversion.examFeeTotal)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                                EXAM
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {previewData.conversion.examMonthsAfterConversion.length} exam(s) @ {formatCurrency(previewData.newCourse.examFee)} each
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Important Notes */}
                  <div className="p-5 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
                    <p className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                      <Info size={18} />
                      Important Notes
                    </p>
                    <ul className="list-disc list-inside text-yellow-700 space-y-1 text-sm">
                      <li>
                        Already paid months ({previewData.conversion.paidMonths}) will remain unchanged
                        at {formatCurrency(previewData.oldCourse.monthlyFee)}/month
                      </li>
                      <li>
                        New fee of {formatCurrency(previewData.newCourse.monthlyFee)}/month applies
                        from month {previewData.conversion.conversionMonth}
                      </li>
                      {previewData.conversion.examMonthsAfterConversion?.length > 0 && (
                        <li>
                          Exam schedule updated to months: {previewData.conversion.examMonthsAfterConversion.join(", ")}
                        </li>
                      )}
                      <li className="font-semibold text-red-600">This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <button
                onClick={goBack}
                className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all font-medium"
              >
                Back
              </button>
              <button
                onClick={handleConvert}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Converting...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Confirm Conversion
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

export default CourseConversion;