import React, { useState, useEffect, useCallback } from "react";
import { attendanceReportAPI, setupAPI, facultyAPI } from "../services/api";
import {
  Search,
  RefreshCw,
  AlertCircle,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const formatTime = (time) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

const currentMonthYear = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

const CELL_STYLES = {
  P: "bg-green-100 text-green-700",
  La: "bg-orange-100 text-orange-700",
  A: "bg-red-100 text-red-700",
  L: "bg-blue-100 text-blue-700",
  S: "bg-gray-100 text-gray-400",
  H: "bg-purple-100 text-purple-600",
};

const MonthlyAttendanceReport = () => {
  const { month: defMonth, year: defYear } = currentMonthYear();
  const [month, setMonth] = useState(defMonth);
  const [year, setYear] = useState(defYear);
  const [batches, setBatches] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [daysInMonth, setDaysInMonth] = useState(30);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setupAPI.getAll().then((res) => {
      if (res.data.success) {
        setBatches((res.data.data.batches || []).filter((b) => b.isActive !== false));
      }
    }).catch(() => {});

    facultyAPI.getFaculty({ limit: 1000 }).then((res) => {
      if (res.data.success) setFaculty(res.data.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to page 1 whenever a filter (other than page itself) changes
  useEffect(() => { setPage(1); }, [month, year, batchId, facultyId]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { month, year, page, limit: 10 };
      if (batchId) params.batchId = batchId;
      if (facultyId) params.facultyId = facultyId;
      if (search) params.search = search;

      const res = await attendanceReportAPI.getMonthlyReport(params);
      if (res.data.success) {
        setRows(res.data.data || []);
        setDaysInMonth(res.data.daysInMonth || 30);
        setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      } else {
        throw new Error(res.data.message || "Failed to load monthly report");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load monthly report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [month, year, batchId, facultyId, search, page]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthOptions = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Attendance Monthly Report</h1>
          <p className="text-sm text-gray-500 mt-1">Full month grid, 10 students per page</p>
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

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {monthOptions.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value) || defYear)}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                {b.batchName} ({formatTime(b.startTime)} - {formatTime(b.endTime)})
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
              <option key={f._id} value={f._id}>{f.facultyName}</option>
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

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {[
          ["P", "Present", "bg-green-100 text-green-700"],
          ["La", "Late", "bg-orange-100 text-orange-700"],
          ["A", "Absent", "bg-red-100 text-red-700"],
          ["L", "Leave", "bg-blue-100 text-blue-700"],
          ["S", "Sunday", "bg-gray-100 text-gray-500"],
          ["H", "Holiday", "bg-purple-100 text-purple-600"],
        ].map(([key, label, cls]) => (
          <span key={key} className={`px-2 py-1 rounded font-medium ${cls}`}>{key} = {label}</span>
        ))}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading monthly report...</p>
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
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="sticky left-0 bg-gray-50 text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap z-10">Faculty</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Batch Time</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Roll No</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Student Name</th>
                  {dayNumbers.map((d) => (
                    <th key={d} className="px-2 py-3 font-semibold text-gray-500 text-center w-8">{d}</th>
                  ))}
                  <th className="px-3 py-3 font-semibold text-green-600 text-center whitespace-nowrap">Present</th>
                  <th className="px-3 py-3 font-semibold text-red-600 text-center whitespace-nowrap">Absent</th>
                  <th className="px-3 py-3 font-semibold text-blue-600 text-center whitespace-nowrap">Leave</th>
                  <th className="px-3 py-3 font-semibold text-purple-600 text-center whitespace-nowrap">Holiday</th>
                  <th className="px-3 py-3 font-semibold text-gray-500 text-center whitespace-nowrap">Sunday</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((r) => (
                    <tr key={`${r.studentDbId}`} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="sticky left-0 bg-white text-gray-700 px-4 py-2 whitespace-nowrap">{r.facultyName}</td>
                      <td className="text-gray-600 px-4 py-2 whitespace-nowrap">{r.batchName} {r.batchTiming}</td>
                      <td className="text-gray-600 px-4 py-2 whitespace-nowrap">{r.studentId}</td>
                      <td className="text-gray-800 font-medium px-4 py-2 whitespace-nowrap">{r.studentName}</td>
                      {dayNumbers.map((d) => {
                        const val = r.days[d] || "";
                        return (
                          <td key={d} className="text-center px-1 py-2">
                            {val ? (
                              <span className={`inline-block w-6 h-6 leading-6 rounded text-xs font-semibold ${CELL_STYLES[val] || ""}`}>
                                {val}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center px-3 py-2 font-semibold text-green-700">{r.present}</td>
                      <td className="text-center px-3 py-2 font-semibold text-red-700">{r.absent}</td>
                      <td className="text-center px-3 py-2 font-semibold text-blue-700">{r.leave}</td>
                      <td className="text-center px-3 py-2 font-semibold text-purple-700">{r.holidayCount}</td>
                      <td className="text-center px-3 py-2 font-semibold text-gray-500">{r.sundayCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9 + daysInMonth} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Users size={48} />
                        <h3 className="text-gray-600 font-medium">No records found</h3>
                        <p className="text-sm">Try changing the month or filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-sm text-gray-500">
              Showing {rows.length ? (pagination.page - 1) * pagination.limit + 1 : 0}
              {"–"}
              {(pagination.page - 1) * pagination.limit + rows.length} of {pagination.total} students
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={pagination.page <= 1}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-sm text-gray-600 px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                disabled={pagination.page >= pagination.totalPages}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MonthlyAttendanceReport;