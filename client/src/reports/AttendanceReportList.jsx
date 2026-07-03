import React, { useState, useEffect, useCallback } from "react";
import { attendanceReportAPI, setupAPI, facultyAPI } from "../services/api";
import {
  Search,
  RefreshCw,
  AlertCircle,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  CalendarClock,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "leave", label: "Leave" },
];

const statusBadge = (status) => {
  const map = {
    present: "bg-green-100 text-green-700",
    absent: "bg-red-100 text-red-700",
    late: "bg-yellow-100 text-yellow-700",
    leave: "bg-blue-100 text-blue-700",
  };
  return map[status] || "bg-gray-100 text-gray-700";
};

const todayStr = () => new Date().toISOString().split("T")[0];

const AttendanceReportList = () => {
  const [date, setDate] = useState(todayStr());
  const [batches, setBatches] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [status, setStatus] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, leave: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setupAPI
      .getAll()
      .then((res) => {
        if (res.data.success) {
          setBatches((res.data.data.batches || []).filter((b) => b.isActive !== false));
        }
      })
      .catch(() => {});

    facultyAPI
      .getFaculty()
      .then((res) => {
        // NOTE: verify this matches your actual facultyAPI response shape
        const list = res.data?.data || res.data?.faculty || [];
        setFaculty(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { date };
      if (batchId) params.batchId = batchId;
      if (facultyId) params.facultyId = facultyId;
      if (status && status !== "all") params.status = status;
      if (search) params.search = search;

      const res = await attendanceReportAPI.getReport(params);
      if (res.data.success) {
        setRows(res.data.data || []);
        setStats(res.data.stats || { total: 0, present: 0, absent: 0, late: 0, leave: 0 });
      } else {
        throw new Error(res.data.message || "Failed to load attendance report");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load attendance report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [date, batchId, facultyId, status, search]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Attendance Report</h1>
          <p className="text-sm text-gray-500 mt-1">
            Daily present / absent / late / leave status by batch
          </p>
        </div>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60 transition"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <Users size={20} className="text-gray-400" />
          <div>
            <h3 className="text-lg font-bold text-gray-800">{stats.total}</h3>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-500" />
          <div>
            <h3 className="text-lg font-bold text-gray-800">{stats.present}</h3>
            <p className="text-xs text-gray-500">Present</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <Clock size={20} className="text-yellow-500" />
          <div>
            <h3 className="text-lg font-bold text-gray-800">{stats.late}</h3>
            <p className="text-xs text-gray-500">Late</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <XCircle size={20} className="text-red-500" />
          <div>
            <h3 className="text-lg font-bold text-gray-800">{stats.absent}</h3>
            <p className="text-xs text-gray-500">Absent</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <CalendarClock size={20} className="text-blue-500" />
          <div>
            <h3 className="text-lg font-bold text-gray-800">{stats.leave}</h3>
            <p className="text-xs text-gray-500">Leave</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Batch</label>
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.batchName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Faculty</label>
          <select
            value={facultyId}
            onChange={(e) => setFacultyId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
          >
            <option value="">All Faculty</option>
            {faculty.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name || f.fullName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Name, roll no, admission no..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading attendance report...</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <AlertCircle size={20} className="text-red-500 mt-0.5" />
          <div className="flex-1">
            <strong className="text-red-700 text-sm">Error loading report:</strong>
            <p className="text-red-600 text-sm mt-0.5">{error}</p>
          </div>
          <button onClick={fetchReport} className="text-sm font-medium text-red-700 hover:underline shrink-0">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Student</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Course</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Batch</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Faculty</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Present Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((r) => (
                  <tr key={`${r.studentDbId}_${r.batchId}`} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {r.photo ? (
                            <img src={r.photo} alt={r.studentName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400 text-xs font-medium">
                              {r.studentName?.charAt(0) || "?"}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{r.studentName}</p>
                          <p className="text-xs text-gray-500">{r.studentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{r.course}</td>
                    <td className="px-5 py-3 text-gray-700">
                      <div>{r.batchName}</div>
                      <div className="text-xs text-gray-400">{r.batchTiming}</div>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{r.facultyName}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{r.presentTime || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Users size={48} />
                      <h3 className="text-gray-600 font-medium">No records found</h3>
                      <p className="text-sm">Try changing the date or filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AttendanceReportList;