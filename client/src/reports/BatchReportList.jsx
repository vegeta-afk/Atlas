import React, { useState, useEffect } from "react";
import { batchReportAPI } from "../services/api";
import {
  Clock,
  Users,
  BookOpen,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Briefcase,
} from "lucide-react";

const formatTimeRange = (timeRange) => {
  if (!timeRange) return "N/A";
  return timeRange.replace(/(\d{2}):(\d{2})/g, (_, h, m) => {
    const hour = parseInt(h);
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${period}`;
  });
};

const BatchReportList = () => {
  const [batches, setBatches] = useState([]);
  const [stats, setStats] = useState({
    totalBatches: 0,
    totalStudents: 0,
    maxBatch: "N/A",
    maxBatchCount: 0,
    avgStudentsPerBatch: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await batchReportAPI.getBatchReport();
      if (res.data.success) {
        setBatches(res.data.batches || []);
        setStats(res.data.stats || stats);
      } else {
        throw new Error(res.data.message || "Failed to fetch batch report");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to load batch report"
      );
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Batch Report</h1>
          <p className="text-sm text-gray-500 mt-1">
            Student enrollment by batch time
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

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading batch report...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <AlertCircle size={20} className="text-red-500 mt-0.5" />
          <div className="flex-1">
            <strong className="text-red-700 text-sm">Error loading report:</strong>
            <p className="text-red-600 text-sm mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchReport}
            className="text-sm font-medium text-red-700 hover:underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stat cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{stats.totalBatches}</h3>
              <p className="text-sm text-gray-500">Total Batches</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{stats.totalStudents}</h3>
              <p className="text-sm text-gray-500">Total Students</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                {stats.avgStudentsPerBatch}
              </h3>
              <p className="text-sm text-gray-500">Avg per Batch</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
              <Briefcase size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{stats.maxBatchCount}</h3>
              <p className="text-sm text-gray-500">
                Busiest: {formatTimeRange(stats.maxBatch)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">
                  Batch Time
                </th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">
                  Students Enrolled
                </th>
              </tr>
            </thead>
            <tbody>
              {batches.length > 0 ? (
                batches.map((b) => (
                  <tr
                    key={b.batchTime}
                    className="border-b border-gray-50 hover:bg-gray-50 transition"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 text-gray-700 font-medium">
                        <Clock size={14} className="text-gray-400" />
                        {formatTimeRange(b.batchTime)}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-gray-800">
                        {b.studentCount}
                      </span>{" "}
                      <span className="text-gray-500">
                        student{b.studentCount !== 1 ? "s" : ""}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <BookOpen size={48} />
                      <h3 className="text-gray-600 font-medium">
                        No batch data found
                      </h3>
                      <p className="text-sm">
                        No batches configured yet.
                      </p>
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

export default BatchReportList;