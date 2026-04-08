import React, { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Percent,
  ChevronDown,
  ChevronUp,
  Layers,
  Filter,
} from "lucide-react";

const MyAttendance = () => {
  const [student, setStudent] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0, absent: 0, leave: 0, late: 0,
    total: 0, attendancePercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("all");
  const [expandedDate, setExpandedDate] = useState(null);

  const getUser = () => {
    const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!userStr) return null;
    try { return JSON.parse(userStr); } catch { return null; }
  };

  const getToken = () =>
    sessionStorage.getItem("token") || localStorage.getItem("token");

  useEffect(() => {
    const user = getUser();
    if (!user) { window.location.href = "/login"; return; }
    fetchData(user.studentId);
  }, []);

  const fetchData = async (studentId) => {
    setLoading(true);
    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Step 1: Get student by studentId to get MongoDB _id
      const studentRes = await fetch(`/api/students?studentId=${studentId}`, { headers });
      const studentData = await studentRes.json();
      
      // Find matching student
      const students = studentData.data || [];
      const matched = students.find(s => s.studentId === studentId);
      
      if (!matched) {
        console.error("Student not found");
        setLoading(false);
        return;
      }
      
      setStudent(matched);

      // Step 2: Fetch attendance using MongoDB _id
      const attRes = await fetch(`/api/attendance/student/${matched._id}`, { headers });
      const attData = await attRes.json();

      if (attData.success) {
        setAttendanceData(attData.data || []);
        setAttendanceStats(attData.stats || {});
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAttendance = () => {
    if (dateFilter === "all") return attendanceData;
    const now = new Date();
    return attendanceData.filter(record => {
      const recordDate = new Date(record.date);
      if (dateFilter === "today") return recordDate.toDateString() === now.toDateString();
      if (dateFilter === "week") {
        const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
        return recordDate >= weekAgo;
      }
      if (dateFilter === "month") {
        const monthAgo = new Date(); monthAgo.setMonth(now.getMonth() - 1);
        return recordDate >= monthAgo;
      }
      return true;
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      present: { bg: "bg-green-100", text: "text-green-800", label: "Present" },
      absent:  { bg: "bg-red-100",   text: "text-red-800",   label: "Absent"  },
      leave:   { bg: "bg-yellow-100",text: "text-yellow-800",label: "On Leave"},
      late:    { bg: "bg-blue-100",  text: "text-blue-800",  label: "Late"    },
    };
    const style = config[status] || { bg: "bg-gray-100", text: "text-gray-800", label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const filteredAttendance = getFilteredAttendance();
  const groupedAttendance = filteredAttendance.reduce((groups, record) => {
    const date = new Date(record.date).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(record);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <p className="text-gray-500">
          {student?.course} • {student?.batchTime}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Present",    value: attendanceStats.present,              color: "green"  },
          { label: "Absent",     value: attendanceStats.absent,               color: "red"    },
          { label: "Leave",      value: attendanceStats.leave,                color: "yellow" },
          { label: "Late",       value: attendanceStats.late,                 color: "blue"   },
          { label: "Attendance", value: `${attendanceStats.attendancePercentage || 0}%`, color: "purple" },
        ].map((stat) => (
          <div key={stat.label} className={`bg-${stat.color}-50 border border-${stat.color}-100 rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
            <p className={`text-sm text-${stat.color}-600 mt-1`}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Primary Course Attendance */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Primary Course Attendance
          </h2>
          {/* Filter Buttons */}
          <div className="flex gap-2">
            {["all", "today", "week", "month"].map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-3 py-1 rounded-lg text-sm font-medium capitalize ${
                  dateFilter === f
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "all" ? "All Time" : f === "week" ? "This Week" :
                 f === "month" ? "This Month" : "Today"}
              </button>
            ))}
          </div>
        </div>

        {filteredAttendance.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
            <p>No attendance records found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedAttendance)
              .sort((a, b) => new Date(b[0]) - new Date(a[0]))
              .map(([date, records]) => (
                <div key={date} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedDate(expandedDate === date ? null : date)}
                    className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-gray-800">{formatDate(date)}</span>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(records[0].status)}
                      {expandedDate === date
                        ? <ChevronUp size={16} />
                        : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {expandedDate === date && (
                    <div className="px-4 py-3 bg-white space-y-2">
                      {records.map((record, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Batch:</span> {record.batchName || "N/A"} &nbsp;|&nbsp;
                            <span className="font-medium">Faculty:</span> {record.facultyName || "N/A"}
                            {record.remarks && <span> &nbsp;|&nbsp; <span className="font-medium">Remarks:</span> {record.remarks}</span>}
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
      </div>

      {/* Additional Courses Attendance */}
      {student?.additionalCourses?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Layers size={20} className="text-purple-600" />
            Additional Courses Attendance
          </h2>
          <div className="space-y-6">
            {student.additionalCourses.map((course, index) => (
              <div key={index} className="border border-purple-200 rounded-xl overflow-hidden">
                <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
                  <h4 className="font-semibold text-purple-800">{course.courseName}</h4>
                  <p className="text-xs text-purple-600">
                    Faculty: {course.facultyName} • Batch: {course.batchTime}
                  </p>
                </div>
                <div className="p-4">
                  {course.attendance?.length > 0 ? (
                    <div className="space-y-3">
                      {course.attendance
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((record, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{formatDate(record.date)}</p>
                              <p className="text-sm text-gray-500">{record.remarks || "No remarks"}</p>
                            </div>
                            {getStatusBadge(record.status)}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">No attendance records</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAttendance;