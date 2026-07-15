import React, { useState, useEffect } from "react";
import { attendanceReportAPI, setupAPI, facultyAPI } from "../services/api";
import { RefreshCw, AlertCircle, Filter, Users } from "lucide-react";

const formatDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
};

const formatTime = (time) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

const BATCH_COLORS = ["#fff9c4", "#bbdefb", "#ffcdd2", "#c8e6c9", "#e1bee7", "#ffe0b2"];

const CourseBreakdownTooltip = ({ topics }) => {
  const [show, setShow] = useState(false);
  if (!topics || topics.length <= 1) return null;

  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold hover:bg-indigo-200"
      >
        {topics.length}
      </button>
      {show && (
        <div className="absolute z-20 left-0 top-5 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs">
          {topics.map((t, i) => (
            <div key={i} className={`flex items-start justify-between gap-2 py-1 ${i !== 0 ? "border-t border-gray-100" : ""}`}>
              <div>
                <div className="font-medium text-gray-700 flex items-center gap-1">
                  <Users size={10} /> {t.studentCount} on {t.courseName}
                </div>
                <div className="text-gray-500">
                  {t.topicName || "No topic yet"}{t.subtopicName ? ` → ${t.subtopicName}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </span>
  );
};


const StudentListTooltip = ({ students, count }) => {
  const [show, setShow] = useState(false);
  if (!students || students.length === 0) return count || "";

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="font-bold text-red-600 hover:underline cursor-pointer"
      >
        {count}
      </button>
      {show && (
        <div className="absolute z-20 left-1/2 -translate-x-1/2 top-6 w-56 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs text-left">
          {students.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2 py-1 border-b border-gray-50 last:border-0">
              <span className="text-gray-700">{s.name}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${s.tag === 'Reg' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {s.tag}
              </span>
            </div>
          ))}
        </div>
      )}
    </span>
  );
};

const BatchTopicBoard = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [batches, setBatches] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [facultyId, setFacultyId] = useState("");

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

  const fetchBoard = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (batchId) params.batchId = batchId;
      if (facultyId) params.facultyId = facultyId;

      const res = await attendanceReportAPI.getBatchTopicBoard(params);
      if (res.data.success) {
        setRows(res.data.data || []);
      } else {
        throw new Error(res.data.message || "Failed to load board");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load board");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [batchId, facultyId]);

  const clearFilters = () => { setBatchId(""); setFacultyId(""); };

  // Group rows by batchId, in the order they appear
  const grouped = [];
  const groupIndex = {};
  rows.forEach((r) => {
    if (!(r.batchId in groupIndex)) {
      groupIndex[r.batchId] = grouped.length;
      grouped.push({ batchId: r.batchId, batchTime: r.batchTime, rows: [] });
    }
    grouped[groupIndex[r.batchId]].rows.push(r);
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Batch Topic Board</h1>
          <p className="text-sm text-gray-500 mt-1">Live view of what each faculty is currently teaching</p>
        </div>
        <button
          onClick={fetchBoard}
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
          <label className="block text-xs font-medium text-gray-500 mb-1">Batch Time</label>
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
          >
            <option value="">All Batch Times</option>
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
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
          >
            <option value="">All Faculty</option>
            {faculty.map((f) => (
              <option key={f._id} value={f._id}>{f.facultyName}</option>
            ))}
          </select>
        </div>

        {(batchId || facultyId) && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <Filter size={14} /> Clear Filters
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading board...</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle size={20} className="text-red-500 mt-0.5" />
          <div className="flex-1">
            <strong className="text-red-700 text-sm">Error loading board:</strong>
            <p className="text-red-600 text-sm mt-0.5">{error}</p>
          </div>
          <button onClick={fetchBoard} className="text-sm font-medium text-red-700 hover:underline shrink-0">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-left font-semibold text-gray-700 border">Batch Time</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 border">Faculty Name</th>
                <th className="px-3 py-2 text-center font-semibold text-red-600 border">Total</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 border">BS</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 border">Course Start Date</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 border">Running Course</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 border">Subtopic</th>
                <th className="px-3 py-2 text-center font-semibold text-blue-700 border bg-blue-50">Double Extra</th>
                <th className="px-3 py-2 text-center font-semibold text-blue-700 border bg-blue-50">Course Start Date</th>
                <th className="px-3 py-2 text-left font-semibold text-blue-700 border bg-blue-50">Running Course (Bridge)</th>
                <th className="px-3 py-2 text-left font-semibold text-blue-700 border bg-blue-50">Subtopic (Bridge)</th>
              </tr>
            </thead>
            <tbody>
              {grouped.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                    No batches match the selected filters.
                  </td>
                </tr>
              ) : (
                grouped.map((group, gi) => {
                  const color = BATCH_COLORS[gi % BATCH_COLORS.length];
                  const totalRow = {
                    total: group.rows.reduce((s, r) => s + r.total, 0),
                    bs: group.rows.reduce((s, r) => s + r.bsCount, 0),
                    doubleExtra: group.rows.reduce((s, r) => s + r.doubleExtra, 0),
                  };
                  return (
                    <React.Fragment key={group.batchId}>
                      {group.rows.map((r, idx) => (
                        <tr key={`${group.batchId}_${idx}`}>
                          <td className="px-3 py-1.5 border font-semibold" style={{ background: color }}>
                            {idx === 0 ? group.batchTime : ""}
                          </td>
                          <td className="px-3 py-1.5 border">{r.facultyName}</td>
                          <td className="px-3 py-1.5 border text-center">
                            <StudentListTooltip students={r.studentList} count={r.total} />
                          </td>
                          <td className="px-3 py-1.5 border text-center">{r.bsCount || ""}</td>
                          <td className="px-3 py-1.5 border text-center text-red-600 font-medium">{formatDate(r.courseStartDate)}</td>
                          <td className="px-3 py-1.5 border">
                            {r.runningCourse || ""}
                            {!r.hasConverged && <CourseBreakdownTooltip topics={r.regularTopics} />}
                          </td>
                          <td className="px-3 py-1.5 border text-gray-600">
                            {r.hasConverged ? (r.runningSubtopic || "") : (
                              <span className="text-gray-400 italic text-xs">mixed — hover count above</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 border text-center bg-gray-50">{r.doubleExtra || ""}</td>
                          <td className="px-3 py-1.5 border text-center text-red-600 font-medium bg-gray-50">{formatDate(r.bridgeStartDate)}</td>
                          <td className="px-3 py-1.5 border bg-gray-50">{r.bridgeRunningCourse || ""}</td>
                          <td className="px-3 py-1.5 border text-gray-600 bg-gray-50">{r.bridgeRunningSubtopic || ""}</td>
                        </tr>
                      ))}
                      <tr className="font-bold" style={{ background: color }}>
                        <td className="px-3 py-1.5 border">{group.batchTime}</td>
                        <td className="px-3 py-1.5 border">Total</td>
                        <td className="px-3 py-1.5 border text-center text-red-600">{totalRow.total}</td>
                        <td className="px-3 py-1.5 border text-center">{totalRow.bs}</td>
                        <td className="px-3 py-1.5 border"></td>
                        <td className="px-3 py-1.5 border"></td>
                        <td className="px-3 py-1.5 border"></td>
                        <td className="px-3 py-1.5 border text-center">{totalRow.doubleExtra}</td>
                        <td className="px-3 py-1.5 border"></td>
                        <td className="px-3 py-1.5 border"></td>
                        <td className="px-3 py-1.5 border"></td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BatchTopicBoard;