import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { attendanceReportAPI } from "../services/api";
import { RefreshCw, AlertCircle, BookOpen, Users, ChevronRight, Clock } from "lucide-react";

const formatTime = (time) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

const BatchCourseProgressReport = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await attendanceReportAPI.getBatchCourseProgress();
      if (res.data.success) {
        setData(res.data.data || []);
      } else {
        throw new Error(res.data.message || "Failed to load progress report");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load progress report");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Batch-wise Course Progress</h1>
          <p className="text-sm text-gray-500 mt-1">Select a batch to see detailed topic progress</p>
        </div>
        <button
          onClick={fetchProgress}
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
          <p className="text-gray-500 text-sm">Loading batches...</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle size={20} className="text-red-500 mt-0.5" />
          <div className="flex-1">
            <strong className="text-red-700 text-sm">Error loading report:</strong>
            <p className="text-red-600 text-sm mt-0.5">{error}</p>
          </div>
          <button onClick={fetchProgress} className="text-sm font-medium text-red-700 hover:underline shrink-0">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {data.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-16 text-center text-gray-400">
              <BookOpen size={48} className="mx-auto mb-3" />
              <h3 className="text-gray-600 font-medium">No batches found</h3>
            </div>
          ) : (
            data.map((batch) => (
              <button
                key={batch.batchId}
                onClick={() => navigate(`${batch.batchId}`)}
                className="w-full flex items-center justify-between px-5 py-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-indigo-200 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {batch.displayName || `${formatTime(batch.startTime)} - ${formatTime(batch.endTime)}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {batch.teachers.join(", ") || "No teacher"} · {batch.courses.length} course{batch.courses.length !== 1 ? "s" : ""}
                      {" · "}
                      <span className="inline-flex items-center gap-1">
                        <Users size={11} /> {batch.courses.reduce((sum, c) => sum + c.studentCount, 0)}
                      </span>
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default BatchCourseProgressReport;