import React, { useState, useEffect } from "react";
import { User, GraduationCap, Clock, Calendar } from "lucide-react";

const holidays = [
  { date: "April 14, 2026",  name: "Dr. Ambedkar Jayanti", type: "National" },
  { date: "April 18, 2026",  name: "Good Friday",           type: "National" },
  { date: "May 1, 2026",     name: "Labour Day",             type: "National" },
  { date: "May 12, 2026",    name: "Buddha Purnima",         type: "National" },
  { date: "June 15, 2026",   name: "Eid ul-Adha",            type: "National" },
  { date: "August 15, 2026", name: "Independence Day",       type: "National" },
  { date: "October 2, 2026", name: "Gandhi Jayanti",         type: "National" },
  { date: "October 20, 2026",name: "Dussehra",               type: "National" },
  { date: "November 5, 2026",name: "Diwali",                 type: "National" },
  { date: "December 25, 2026",name:"Christmas",              type: "National" },
];

const StudentDashboard = () => {
  const [student, setStudent]     = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [fees, setFees]           = useState(null);
  const [loading, setLoading]     = useState(true);

  const getStudentFromStorage = () => {
    const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!userStr) return null;
    try { return JSON.parse(userStr); } catch { return null; }
  };

  useEffect(() => {
    const user = getStudentFromStorage();
    if (!user) { window.location.href = "/login"; return; }
    fetchStudentData(user.studentId || user.id);
  }, []);

  const fetchStudentData = async (studentId) => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [studentRes, attendanceRes, feesRes] = await Promise.allSettled([
        fetch(`/api/students/${studentId}`, { headers }),
        fetch(`/api/attendance/student/${studentId}`, { headers }),
        fetch(`/api/students/${studentId}/fees`, { headers }),
      ]);

      if (studentRes.status === "fulfilled") {
        const d = await studentRes.value.json();
        if (d.success) setStudent(d.data);
      }
      if (attendanceRes.status === "fulfilled") {
        const d = await attendanceRes.value.json();
        if (d.success) setAttendance(d.stats);
      }
      if (feesRes.status === "fulfilled") {
        const d = await feesRes.value.json();
        if (d.success) setFees(d.data.summary);
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUpcomingHolidays = () =>
    holidays.filter((h) => new Date(h.date) >= new Date()).slice(0, 5);

  const fmt = (n) => (n || 0).toLocaleString("en-IN");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">

      {/* ── Student Info Card ── */}
      <div className="bg-white rounded-2xl shadow-md p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">

          {/* Avatar */}
          <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
                          flex items-center justify-content-center text-white text-2xl md:text-3xl
                          font-bold shadow-lg flex-shrink-0 flex items-center justify-center">
            {student?.fullName?.charAt(0) || "S"}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
                  {student?.fullName || "Student"}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-gray-500 text-xs md:text-sm">
                    <GraduationCap size={14} />
                    {student?.course || "N/A"}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500 text-xs md:text-sm">
                    <Clock size={14} />
                    {student?.batchTime || "N/A"}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    student?.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {student?.status || "active"}
                  </span>
                </div>
              </div>

              {/* Student ID Badge */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center flex-shrink-0">
                <p className="text-xs text-blue-500 font-medium">Student ID</p>
                <p className="text-base md:text-lg font-bold text-blue-700">
                  {student?.studentId || "N/A"}
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-3">
              {[
                { value: `${attendance?.attendancePercentage || 0}%`, label: "Attendance",   color: "green"  },
                { value: attendance?.present || 0,                     label: "Days Present", color: "blue"   },
                { value: `₹${fmt(fees?.paidAmount)}`,                  label: "Fees Paid",   color: "purple" },
                { value: `₹${fmt(fees?.balanceAmount)}`,               label: "Balance",     color: "orange" },
              ].map(({ value, label, color }) => (
                <div key={label} className={`bg-${color}-50 rounded-xl p-2 md:p-3 text-center border border-${color}-100`}>
                  <p className={`text-lg md:text-2xl font-bold text-${color}-600 leading-tight`}>{value}</p>
                  <p className={`text-xs text-${color}-600 mt-0.5`}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Upcoming Holidays ── */}
      <div className="bg-white rounded-2xl shadow-md p-4 md:p-6">
        <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-blue-600" />
          Upcoming Holidays
        </h2>

        {getUpcomingHolidays().length === 0 ? (
          <p className="text-gray-500 text-center py-4 text-sm">No upcoming holidays</p>
        ) : (
          <div className="space-y-2 md:space-y-3">
            {getUpcomingHolidays().map((holiday, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl
                           border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100
                                  flex items-center justify-center flex-shrink-0">
                    <Calendar size={15} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{holiday.name}</p>
                    <p className="text-xs text-gray-500">{holiday.date}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold
                                 ml-2 flex-shrink-0">
                  {holiday.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;