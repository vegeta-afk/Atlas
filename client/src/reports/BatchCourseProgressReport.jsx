import React, { useState, useEffect } from "react";
import { attendanceReportAPI } from "../services/api";
import { RefreshCw, AlertCircle, BookOpen, Users, ChevronDown, Clock, Calendar, CheckCircle2 } from "lucide-react";

const formatTime = (time) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const BatchCourseProgressReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBatches, setExpandedBatches] = useState({});
  const [expandedSubtopics, setExpandedSubtopics] = useState({});

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

  const toggleBatch = (id) => setExpandedBatches((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleSubtopic = (id) => setExpandedSubtopics((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Batch-wise Course Progress</h1>
          <p className="text-sm text-gray-500 mt-1">See which topic is currently being taught, per course, per batch</p>
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
          <p className="text-gray-500 text-sm">Loading progress report...</p>
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
        <div className="space-y-3">
          {data.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-16 text-center text-gray-400">
              <BookOpen size={48} className="mx-auto mb-3" />
              <h3 className="text-gray-600 font-medium">No batches found</h3>
            </div>
          ) : (
            data.map((batch) => (
              <div key={batch.batchId} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleBatch(batch.batchId)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                      <Clock size={18} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">
                        {batch.displayName || `${formatTime(batch.startTime)} - ${formatTime(batch.endTime)}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {batch.teachers.join(", ") || "No teacher"} · {batch.courses.length} course{batch.courses.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform ${expandedBatches[batch.batchId] ? "rotate-180" : ""}`}
                  />
                </button>

                {expandedBatches[batch.batchId] && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {batch.courses.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-gray-400">No course data for this batch.</p>
                    ) : (
                      batch.courses.map((c) => (
                        <div key={c.courseId} className="px-5 py-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <BookOpen size={15} className="text-indigo-500" />
                              <span className="font-medium text-gray-800 text-sm">{c.courseName}</span>
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Users size={12} /> {c.studentCount}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-indigo-600">
                              {c.completedSubtopics}/{c.totalSubtopics} done ({c.progressPercent}%)
                            </span>
                          </div>

                          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                            <div
                              className="bg-indigo-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${c.progressPercent}%` }}
                            />
                          </div>

                          {c.subtopicDetails.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Nothing taught yet</p>
                          ) : (
                            <div className="space-y-1.5">
                              {c.subtopicDetails.map((sub) => {
                                const rowId = `${c.courseId}_${sub.subtopicKey}`;
                                const isOpen = !!expandedSubtopics[rowId];
                                const isCompleted = sub.status === "completed";
                                return (
                                  <div key={rowId} className="border border-gray-100 rounded-lg overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => toggleSubtopic(rowId)}
                                      className={`w-full flex items-center justify-between gap-2 text-xs px-3 py-2 transition ${
                                        isCompleted ? "bg-green-50 hover:bg-green-100" : "bg-amber-50 hover:bg-amber-100"
                                      }`}
                                    >
                                      <span className="flex items-center gap-1.5">
                                        {isCompleted ? (
                                          <CheckCircle2 size={12} className="text-green-600" />
                                        ) : (
                                          <Clock size={12} className="text-amber-600" />
                                        )}
                                        <span className={isCompleted ? "text-green-700" : "text-amber-700"}>
                                          {sub.topicName} → {sub.subtopicName}
                                        </span>
                                      </span>
                                      <ChevronDown
                                        size={13}
                                        className={`transition-transform ${isCompleted ? "text-green-500" : "text-amber-500"} ${isOpen ? "rotate-180" : ""}`}
                                      />
                                    </button>

                                    {isOpen && (
                                      <div className="px-3 py-2 bg-white text-xs text-gray-600 flex flex-wrap gap-x-5 gap-y-1">
                                        <span className="flex items-center gap-1">
                                          <Calendar size={11} className="text-gray-400" />
                                          Started: <strong>{formatDate(sub.startedDate)}</strong>
                                        </span>
                                        <span>
                                          Taught on: <strong>{sub.taughtDaysCount} day{sub.taughtDaysCount !== 1 ? "s" : ""}</strong>
                                        </span>
                                        {isCompleted ? (
                                          <span className="flex items-center gap-1 text-green-700">
                                            <CheckCircle2 size={11} />
                                            Ended: <strong>{formatDate(sub.completedDate)}</strong>
                                          </span>
                                        ) : (
                                          <span className="text-amber-700">
                                            Last taught: <strong>{formatDate(sub.lastTaughtDate)}</strong> (still in progress)
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default BatchCourseProgressReport;