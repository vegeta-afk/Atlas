import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { attendanceReportAPI } from "../services/api";
import { RefreshCw, AlertCircle, ArrowLeft, BookOpen, Users, CheckCircle2, Clock, User, ChevronRight } from "lucide-react";

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

const BatchCourseProgressDetail = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null); // teacherName string

  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await attendanceReportAPI.getBatchCourseProgress({ batchId });
      if (res.data.success) {
        setBatch((res.data.data || [])[0] || null);
      } else {
        throw new Error(res.data.message || "Failed to load progress report");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load progress report");
      setBatch(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedTeacher(null);
    fetchProgress();
  }, [batchId]);

  const selectedGroup = batch?.teacherGroups?.find((t) => t.teacherName === selectedTeacher) || null;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <button
        onClick={() => (selectedTeacher ? setSelectedTeacher(null) : navigate(-1))}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={16} /> {selectedTeacher ? "Back to teachers" : "Back to batches"}
      </button>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {batch ? (batch.displayName || `${formatTime(batch.startTime)} - ${formatTime(batch.endTime)}`) : "Batch Progress"}
          </h1>
          {batch && (
            <p className="text-sm text-gray-500 mt-1">
              {selectedTeacher ? (
                <>Showing progress taught by <span className="font-medium text-gray-700">{selectedTeacher}</span></>
              ) : (
                <>{batch.teachers.join(", ") || "No teacher"} · {batch.courseCount} course{batch.courseCount !== 1 ? "s" : ""}</>
              )}
            </p>
          )}
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
          <p className="text-gray-500 text-sm">Loading progress...</p>
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

      {!loading && !error && !batch && (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center text-gray-400">
          <BookOpen size={48} className="mx-auto mb-3" />
          <h3 className="text-gray-600 font-medium">Batch not found</h3>
        </div>
      )}

      {/* ===== STEP 1: TEACHER CARDS ===== */}
      {!loading && !error && batch && !selectedTeacher && (
        (batch.teacherGroups || []).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-16 text-center text-gray-400">
            <Users size={48} className="mx-auto mb-3" />
            <h3 className="text-gray-600 font-medium">No teachers found for this batch</h3>
          </div>
        ) : (
          <div className="space-y-2">
            {batch.teacherGroups.map((t) => {
              const studentCount = t.courses.reduce((sum, c) => sum + c.studentCount, 0);
              const totalSub = t.courses.reduce((sum, c) => sum + c.totalSubtopics, 0);
              const doneSub = t.courses.reduce((sum, c) => sum + c.completedSubtopics, 0);
              return (
                <button
                  key={t.teacherName}
                  onClick={() => setSelectedTeacher(t.teacherName)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-indigo-200 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                      <User size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{t.teacherName}</p>
                      <p className="text-xs text-gray-500">
                        {t.courses.length} course{t.courses.length !== 1 ? "s" : ""} · {studentCount} student{studentCount !== 1 ? "s" : ""}
                        {totalSub > 0 && ` · ${doneSub}/${totalSub} done`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-400" />
                </button>
              );
            })}
          </div>
        )
      )}

      {/* ===== STEP 2: SELECTED TEACHER'S COURSE TABLES ===== */}
      {!loading && !error && batch && selectedTeacher && selectedGroup && (
        <div className="space-y-6">
          {selectedGroup.courses.map((c) => (
            <div key={c.courseId} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-indigo-500" />
                  <span className="font-semibold text-gray-800">{c.courseName}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-400 ml-2">
                    <Users size={12} /> {c.studentCount} students
                  </span>
                </div>
                <span className="text-sm font-semibold text-indigo-600">
                  {c.completedSubtopics}/{c.totalSubtopics} done ({c.progressPercent}%)
                </span>
              </div>

              {c.subtopicDetails.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400 italic">Nothing taught yet for this course.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Topic</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Subtopic</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Status</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Started</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Days Taught</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">Ended / Last Taught</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {c.subtopicDetails.map((sub) => (
                        <tr key={sub.subtopicKey} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-gray-600">{sub.topicName}</td>
                          <td className="px-4 py-3 text-gray-800 font-medium">{sub.subtopicName}</td>
                          <td className="px-4 py-3 text-center">
                            {sub.status === "completed" ? (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full">
                                <CheckCircle2 size={11} /> Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full">
                                <Clock size={11} /> In Progress
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{formatDate(sub.startedDate)}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{sub.taughtDaysCount} day{sub.taughtDaysCount !== 1 ? "s" : ""}</td>
                          <td className="px-4 py-3 text-center text-gray-600">
                            {sub.status === "completed" ? formatDate(sub.completedDate) : formatDate(sub.lastTaughtDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BatchCourseProgressDetail;