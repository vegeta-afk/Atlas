import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import FeeManagement from "./FeeManagement";


import {
  User,
  DollarSign,
  Calendar,
  BookOpen,
  FileText,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Clock,
  TrendingUp,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  Percent,
  Clock as ClockIcon,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  Plus,
  Layers,
} from "lucide-react";

const ViewStudent = () => {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    leave: 0,
    late: 0,
    total: 0,
    attendancePercentage: 0
  });
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [expandedDate, setExpandedDate] = useState(null);
  const [selectedAdditionalCourse, setSelectedAdditionalCourse] = useState(null);
  const [showAdditionalCourseModal, setShowAdditionalCourseModal] = useState(false);

  useEffect(() => {
    fetchStudentDetails();
    fetchStudentAttendance();
  }, [id]);

  useEffect(() => {
    if (attendanceData.length > 0) {
      calculateAttendanceStats();
      calculateMonthlyStats();
    }
  }, [attendanceData]);



  const fetchStudentDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/students/${id}`, {
        headers: headers,
      });

      if (response.status === 401) {
  console.error("401 on student fetch - token:", localStorage.getItem("token"));
  setLoading(false);
  // window.location.href = "/login";  // comment this out temporarily
  return;
}

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStudent(data.data || data);
    } catch (error) {
      console.error("Error fetching student:", error);
    } finally {
      setLoading(false);
    }
  };

 const fetchStudentAttendance = async () => {
  setAttendanceLoading(true);
  try {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/attendance/student/${id}`, {
      headers: headers,
    });

    console.log(`📡 Response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('📊 Attendance API response:', result);
    
    if (result.success) {
      setAttendanceData(result.data || []);
      if (result.stats) {
        setAttendanceStats(result.stats);
      }
    }
  } catch (error) {
    console.error("❌ Error fetching attendance:", error);
    if (student?.attendance) {
      setAttendanceData(student.attendance);
    }
  } finally {
    setAttendanceLoading(false);
  }
};

  const calculateAttendanceStats = () => {
    const present = attendanceData.filter(a => a.status === "present").length;
    const absent = attendanceData.filter(a => a.status === "absent").length;
    const leave = attendanceData.filter(a => a.status === "leave").length;
    const late = attendanceData.filter(a => a.status === "late").length;
    const total = attendanceData.length;
    const attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 0;

    setAttendanceStats({
      present,
      absent,
      leave,
      late,
      total,
      attendancePercentage
    });
  };

  const calculateMonthlyStats = () => {
    const monthlyData = {};
    
    attendanceData.forEach(record => {
      const date = new Date(record.date);
      const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          present: 0,
          absent: 0,
          leave: 0,
          late: 0,
          total: 0
        };
      }
      
      monthlyData[monthYear][record.status]++;
      monthlyData[monthYear].total++;
    });
    
    const monthlyArray = Object.entries(monthlyData).map(([month, stats]) => {
      const percentage = stats.total > 0 
        ? Math.round((stats.present / stats.total) * 100)
        : 0;
      
      return {
        month,
        ...stats,
        percentage
      };
    }).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateB - dateA;
    }).slice(0, 3);
    
    setMonthlyStats(monthlyArray);
  };

  const getFilteredAttendance = () => {
    if (dateFilter === "all") return attendanceData;
    
    const now = new Date();
    const filtered = attendanceData.filter(record => {
      const recordDate = new Date(record.date);
      
      switch(dateFilter) {
        case "today":
          return recordDate.toDateString() === now.toDateString();
        case "week":
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return recordDate >= weekAgo;
        case "month":
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          return recordDate >= monthAgo;
        default:
          return true;
      }
    });
    
    return filtered;
  };

  const toggleDateExpansion = (date) => {
    setExpandedDate(expandedDate === date ? null : date);
  };

  const getStatusBadge = (status) => {
    const config = {
      present: { bg: "bg-green-100", text: "text-green-800", label: "Present" },
      absent: { bg: "bg-red-100", text: "text-red-800", label: "Absent" },
      leave: { bg: "bg-yellow-100", text: "text-yellow-800", label: "On Leave" },
      late: { bg: "bg-blue-100", text: "text-blue-800", label: "Late" }
    };
    
    const style = config[status] || { bg: "bg-gray-100", text: "text-gray-800", label: status };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Calculate totals for additional course
  const calculateCourseTotals = (feeSchedule) => {
    const totalMonthlyFees = feeSchedule.reduce((sum, fee) => sum + (fee.baseFee || 0), 0);
    const totalExamFees = feeSchedule.reduce((sum, fee) => sum + (fee.examFee || 0), 0);
    const totalPaid = feeSchedule.reduce((sum, fee) => sum + (fee.paidAmount || 0), 0);
    const totalFees = feeSchedule.reduce((sum, fee) => sum + (fee.totalFee || 0), 0);
    
    return { totalMonthlyFees, totalExamFees, totalPaid, totalFees };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800">Student not found</h2>
      </div>
    );
  }

  const tabs = [
    { id: "basic", label: "Basic Info", icon: <User size={18} /> },
    { id: "fees", label: "Fees", icon: <DollarSign size={18} /> },
    { id: "attendance", label: "Attendance", icon: <Calendar size={18} /> },
    { id: "academic", label: "Academic", icon: <BookOpen size={18} /> },
    { id: "documents", label: "Documents", icon: <FileText size={18} /> },
  ];

  const filteredAttendance = getFilteredAttendance();
  const groupedAttendance = filteredAttendance.reduce((groups, record) => {
    const date = new Date(record.date).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(record);
    return groups;
  }, {});

  // Check if student has additional courses
  const hasAdditionalCourses = student.additionalCourses && student.additionalCourses.length > 0;

  return (
    <div className="container mx-auto p-6">
      {/* Header - UNCHANGED */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="shrink-0">
            <img
              className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg"
              src={student.photo || "/default-avatar.png"}
              alt={student.fullName}
            />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {student.fullName}
                </h1>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-gray-600">
                    <GraduationCap size={16} />
                    {student.course || "Mathematics and Physics"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-600">
                    <ClockIcon size={16} />
                    {student.batchTime || "08:00 to 09:00"}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      student.status === "active"
                        ? "bg-green-100 text-green-800"
                        : student.status === "completed"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {student.status || "active"}
                  </span>
                  
                  {/* Additional Courses Badge */}
                  {hasAdditionalCourses && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
                      <Layers size={14} />
                      +{student.additionalCourses.length} More Courses
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                  <Printer size={18} />
                  Print
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Download size={18} />
                  Download
                </button>
              </div>
            </div>

            {/* Quick Stats - UNCHANGED */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-blue-600 font-semibold">Student ID</div>
                <div className="text-xl font-bold">{student.studentId || "STU20260014"}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-green-600 font-semibold">Attendance</div>
                <div className="text-xl font-bold">{attendanceStats.attendancePercentage}%</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-purple-600 font-semibold">Fees Paid</div>
                <div className="text-xl font-bold">₹{student.paidAmount || 0}</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-orange-600 font-semibold">Balance</div>
                <div className="text-xl font-bold">
                  ₹{student.balanceAmount || 10000}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "basic" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Personal Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User size={18} className="text-gray-400" />
                    <span className="font-medium">Name:</span>
                    <span>{student.fullName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={18} className="text-gray-400" />
                    <span className="font-medium">Email:</span>
                    <span>{student.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={18} className="text-gray-400" />
                    <span className="font-medium">Phone:</span>
                    <span>{student.mobileNumber}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin size={18} className="text-gray-400 mt-1" />
                    <div>
                      <div className="font-medium">Address:</div>
                      <div>{student.address}</div>
                      <div>
                        {student.city}, {student.state} - {student.pincode}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "fees" && (
            <>
              {/* Primary Course Fees */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Primary Course Fees</h3>
                <FeeManagement
                  studentId={id}
                  student={student.data || student}
                  course={student.courseCode || { courseFullName: student.course }}
                />
              </div>

              {/* Additional Courses Section */}
              {hasAdditionalCourses && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Layers size={20} className="text-purple-600" />
                    Additional Courses
                  </h3>

                  {student.additionalCourses.map((course, index) => (
  <div key={index} className="mb-8 border border-purple-200 rounded-lg overflow-hidden">
    <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-semibold text-purple-800">{course.courseName}</h4>
          <p className="text-xs text-purple-600">
            Faculty: {course.facultyName} • Batch: {course.batchTime}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Started Month {course.startMonth}</p>
          <p className="text-xs text-gray-500">Duration: {course.duration} months</p>
        </div>
      </div>
    </div>
    <div className="p-4">
      <FeeManagement
        studentId={id}
        student={student.data || student}
        course={{
          courseFullName: course.courseName,
          monthlyFee: course.monthlyFee,
          examFee: course.examFee,
          duration: course.duration,
        }}
        additionalCourseIndex={index}
      />
    </div>
  </div>
))}
                </div>
              )}
            </>
          )}

          {activeTab === "attendance" && (
            <>
              {/* Primary Course Attendance - UNCHANGED */}
                <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4">Attendance (Primary Course)</h3>

      {attendanceLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-700">{attendanceStats.present}</div>
              <div className="text-sm text-green-600">Present</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-700">{attendanceStats.absent}</div>
              <div className="text-sm text-red-600">Absent</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-700">{attendanceStats.leave}</div>
              <div className="text-sm text-yellow-600">Leave</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-700">{attendanceStats.late}</div>
              <div className="text-sm text-blue-600">Late</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-700">{attendanceStats.attendancePercentage}%</div>
              <div className="text-sm text-purple-600">Attendance</div>
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex gap-2 mb-4">
            {["all", "today", "week", "month"].map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                  dateFilter === f
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "all" ? "All Time" : f === "week" ? "This Week" : f === "month" ? "This Month" : "Today"}
              </button>
            ))}
          </div>

          {/* Attendance Records */}
          {filteredAttendance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
              <p>No attendance records found for this period.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedAttendance)
                .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                .map(([date, records]) => (
                  <div key={date} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleDateExpansion(date)}
                      className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium text-gray-800">{formatDate(date)}</span>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(records[0].status)}
                        {expandedDate === date ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {expandedDate === date && (
                      <div className="px-4 py-3 bg-white space-y-2">
                        {records.map((record, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <div className="text-gray-600">
                              <span className="font-medium">Batch:</span> {record.batchName || "N/A"} &nbsp;|&nbsp;
                              <span className="font-medium">Faculty:</span> {record.facultyName || "N/A"}
                              {record.remarks && (
                                <span> &nbsp;|&nbsp; <span className="font-medium">Remarks:</span> {record.remarks}</span>
                              )}
                            </div>
                            <div className="text-gray-400">{record.time || ""}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>

              {/* Additional Courses Attendance */}
              {hasAdditionalCourses && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Layers size={20} className="text-purple-600" />
                    Additional Courses Attendance
                  </h3>

                  <div className="space-y-6">
                    {student.additionalCourses.map((course, index) => (
                      <div key={index} className="border border-purple-200 rounded-lg overflow-hidden">
                        <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
                          <h4 className="font-semibold text-purple-800">{course.courseName}</h4>
                          <p className="text-xs text-purple-600">Faculty: {course.facultyName} • Batch: {course.batchTime}</p>
                        </div>

                        <div className="p-4">
                          {course.attendance && course.attendance.length > 0 ? (
                            <div className="space-y-3">
                              {course.attendance.map((record, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <div>
                                    <p className="font-medium">{new Date(record.date).toLocaleDateString()}</p>
                                    <p className="text-sm text-gray-600">{record.remarks || "No remarks"}</p>
                                  </div>
                                  {getStatusBadge(record.status)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-gray-500 py-4">No attendance records for this course</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "academic" && (
            <>
              {/* Primary Course Academic - UNCHANGED */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Academic Details (Primary Course)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Course Information</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Course:</span>{" "}
                        {student.course || "Mathematics and Physics"}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span>{" "}
                        {student.duration || "15 months"}
                      </div>
                      <div>
                        <span className="font-medium">Batch Time:</span>{" "}
                        {student.batchTime || "08:00 to 09:00"}
                      </div>
                      <div>
                        <span className="font-medium">Faculty:</span>{" "}
                        {student.facultyAllot || "Not Assigned"}
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Exam Schedule</h4>
                    <div className="space-y-2">
                      <div>Mid-term: Month 6</div>
                      <div>Final Exam: Month 15</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Courses Academic Section */}
              {hasAdditionalCourses && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Layers size={20} className="text-purple-600" />
                    Additional Courses Academic Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {student.additionalCourses.map((course, index) => (
                      <div key={index} className="border border-purple-200 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-800 mb-2">{course.courseName}</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Duration</p>
                            <p className="font-medium">{course.duration} months</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Start Month</p>
                            <p className="font-medium">Month {course.startMonth}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Monthly Fee</p>
                            <p className="font-medium">{formatCurrency(course.monthlyFee)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Faculty</p>
                            <p className="font-medium">{course.facultyName || "Not Assigned"}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Batch Time</p>
                            <p className="font-medium">{course.batchTime || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewStudent;