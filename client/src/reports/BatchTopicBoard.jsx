import React, { useState, useEffect } from "react";
import { attendanceReportAPI } from "../services/api";
import { RefreshCw, AlertCircle } from "lucide-react";

const formatDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
};

const BATCH_COLORS = ["#fff9c4", "#bbdefb", "#ffcdd2", "#c8e6c9", "#e1bee7", "#ffe0b2"];

const BatchTopicBoard = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBoard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await attendanceReportAPI.getBatchTopicBoard();
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
  }, []);

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
                <th className="px-3 py-2 text-center font-semibold text-blue-700 border bg-blue-50">Double Extra</th>
                <th className="px-3 py-2 text-center font-semibold text-blue-700 border bg-blue-50">Course Start Date</th>
                <th className="px-3 py-2 text-left font-semibold text-blue-700 border bg-blue-50">Running Course (Bridge)</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((group, gi) => {
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
                        <td className="px-3 py-1.5 border text-center font-bold text-red-600">{r.total || ""}</td>
                        <td className="px-3 py-1.5 border text-center">{r.bsCount || ""}</td>
                        <td className="px-3 py-1.5 border text-center text-red-600 font-medium">{formatDate(r.courseStartDate)}</td>
                        <td className="px-3 py-1.5 border">{r.runningCourse || ""}</td>
                        <td className="px-3 py-1.5 border text-center bg-gray-50">{r.doubleExtra || ""}</td>
                        <td className="px-3 py-1.5 border text-center text-red-600 font-medium bg-gray-50">{formatDate(r.bridgeStartDate)}</td>
                        <td className="px-3 py-1.5 border bg-gray-50">{r.bridgeRunningCourse || ""}</td>
                      </tr>
                    ))}
                    <tr className="font-bold" style={{ background: color }}>
                      <td className="px-3 py-1.5 border">{group.batchTime}</td>
                      <td className="px-3 py-1.5 border">Total</td>
                      <td className="px-3 py-1.5 border text-center text-red-600">{totalRow.total}</td>
                      <td className="px-3 py-1.5 border text-center">{totalRow.bs}</td>
                      <td className="px-3 py-1.5 border"></td>
                      <td className="px-3 py-1.5 border"></td>
                      <td className="px-3 py-1.5 border text-center">{totalRow.doubleExtra}</td>
                      <td className="px-3 py-1.5 border"></td>
                      <td className="px-3 py-1.5 border"></td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BatchTopicBoard;