import React, { useState, useEffect } from "react";
import {
  CheckCircle, XCircle, Eye, Award, BookOpen,
  Search, Filter, ChevronDown, Users, BarChart3,
  Clock, Star, TrendingUp, AlertCircle, RefreshCw
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getToken = () =>
  sessionStorage.getItem("token") || localStorage.getItem("token");

const ExamResults = () => {
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [publishing, setPublishing] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch all tests that have submissions
  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/exam/tests?limit=100`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setTests(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (testId) => {
    setSubmissionsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/exam/tests/${testId}/submissions`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data.submissions || []);
        setSelectedTest(data.data.test);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const togglePublish = async (submissionId, currentStatus) => {
    setPublishing((p) => ({ ...p, [submissionId]: true }));
    try {
      const res = await fetch(
        `${BASE_URL}/api/exam/submissions/${submissionId}/publish`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ publish: !currentStatus }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setSubmissions((prev) =>
          prev.map((s) =>
            s._id === submissionId
              ? { ...s, isPublished: !currentStatus }
              : s
          )
        );
        showToast(
          !currentStatus
            ? "Result published to student ✓"
            : "Result hidden from student",
          !currentStatus ? "success" : "warning"
        );
      }
    } catch (e) {
      showToast("Failed to update", "error");
    } finally {
      setPublishing((p) => ({ ...p, [submissionId]: false }));
    }
  };

  const publishAll = async () => {
    const unpublished = submissions.filter((s) => !s.isPublished);
    for (const s of unpublished) {
      await togglePublish(s._id, false);
    }
    showToast(`Published ${unpublished.length} results`);
  };

  const getGradeColor = (grade) => {
    const map = {
      "A+": "text-emerald-600 bg-emerald-50",
      A: "text-green-600 bg-green-50",
      "B+": "text-blue-600 bg-blue-50",
      B: "text-blue-500 bg-blue-50",
      C: "text-yellow-600 bg-yellow-50",
      D: "text-orange-600 bg-orange-50",
      F: "text-red-600 bg-red-50",
    };
    return map[grade] || "text-gray-600 bg-gray-50";
  };

  const filtered = submissions.filter((s) => {
    const name = (s.student?.fullName || s.studentName || "").toLowerCase();
    const id = (s.student?.studentId || "").toLowerCase();
    const matchSearch =
      name.includes(search.toLowerCase()) ||
      id.includes(search.toLowerCase());
    const matchFilter =
      filterStatus === "all"
        ? true
        : filterStatus === "published"
        ? s.isPublished
        : !s.isPublished;
    return matchSearch && matchFilter;
  });

  const publishedCount = submissions.filter((s) => s.isPublished).length;
  const passedCount = submissions.filter((s) => s.isPassed).length;
  const avgPct =
    submissions.length > 0
      ? Math.round(
          submissions.reduce((a, s) => a + (s.percentage || 0), 0) /
            submissions.length
        )
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-emerald-500"
              : toast.type === "warning"
              ? "bg-amber-500"
              : "bg-red-500"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="max-w-screen-xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Exam Results
          </h1>
          <p className="text-slate-500 mt-1">
            Review and publish student results
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* ── LEFT: Test List ── */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-sm">
                  All Tests
                </span>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  {tests.length}
                </span>
              </div>

              {loading ? (
                <div className="p-6 text-center">
                  <RefreshCw
                    size={20}
                    className="animate-spin text-slate-400 mx-auto"
                  />
                </div>
              ) : tests.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  No tests found
                </div>
              ) : (
                <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
                  {tests.map((test) => (
                    <button
                      key={test._id}
                      onClick={() => fetchSubmissions(test._id)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                        selectedTest?._id === test._id
                          ? "bg-blue-50 border-l-4 border-blue-500"
                          : ""
                      }`}
                    >
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {test.testName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            test.status === "active"
                              ? "bg-green-100 text-green-700"
                              : test.status === "completed"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {test.status}
                        </span>
                        <span className="text-xs text-slate-400">
                          {test.maxMarks} marks
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Submissions ── */}
          <div className="xl:col-span-3 space-y-5">
            {!selectedTest ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center">
                <BookOpen size={48} className="text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-1">
                  Select a Test
                </h3>
                <p className="text-slate-400 text-sm">
                  Click any test on the left to view and manage student results
                </p>
              </div>
            ) : (
              <>
                {/* Test Info + Stats */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {selectedTest.testName}
                      </h2>
                      <p className="text-slate-500 text-sm mt-0.5">
                        Max Marks: {selectedTest.maxMarks} •{" "}
                        {submissions.length} submissions
                      </p>
                    </div>
                    <button
                      onClick={publishAll}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle size={16} />
                      Publish All Results
                    </button>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      {
                        label: "Total Students",
                        value: submissions.length,
                        icon: <Users size={18} />,
                        color: "blue",
                      },
                      {
                        label: "Passed",
                        value: passedCount,
                        icon: <TrendingUp size={18} />,
                        color: "emerald",
                      },
                      {
                        label: "Published",
                        value: `${publishedCount}/${submissions.length}`,
                        icon: <CheckCircle size={18} />,
                        color: "purple",
                      },
                      {
                        label: "Avg Score",
                        value: `${avgPct}%`,
                        icon: <BarChart3 size={18} />,
                        color: "amber",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className={`bg-${stat.color}-50 border border-${stat.color}-100 rounded-xl p-4`}
                      >
                        <div
                          className={`text-${stat.color}-500 mb-2`}
                        >
                          {stat.icon}
                        </div>
                        <p
                          className={`text-2xl font-bold text-${stat.color}-700`}
                        >
                          {stat.value}
                        </p>
                        <p
                          className={`text-xs text-${stat.color}-600 mt-0.5`}
                        >
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Search by name or student ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Results</option>
                    <option value="published">Published</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>

                {/* Submissions Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  {submissionsLoading ? (
                    <div className="p-12 text-center">
                      <RefreshCw
                        size={24}
                        className="animate-spin text-slate-400 mx-auto"
                      />
                      <p className="text-slate-400 text-sm mt-3">
                        Loading results...
                      </p>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="p-12 text-center">
                      <AlertCircle
                        size={40}
                        className="text-slate-200 mx-auto mb-3"
                      />
                      <p className="text-slate-500 font-medium">
                        No submissions found
                      </p>
                      <p className="text-slate-400 text-sm mt-1">
                        No students have attempted this test yet
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Student
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Score
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Grade
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Submitted
                            </th>
                            <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Visibility
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filtered.map((sub) => (
                            <tr
                              key={sub._id}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              {/* Student */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {(
                                      sub.student?.fullName ||
                                      sub.studentName ||
                                      "?"
                                    )
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-800 text-sm">
                                      {sub.student?.fullName ||
                                        sub.studentName}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {sub.student?.studentId ||
                                        sub.student?.admissionNo ||
                                        "—"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Score */}
                              <td className="px-5 py-4">
                                <div>
                                  <p className="font-bold text-slate-800">
                                    {sub.marksObtained}/{sub.maxMarks}
                                  </p>
                                  <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        sub.percentage >= 75
                                          ? "bg-emerald-500"
                                          : sub.percentage >= 50
                                          ? "bg-amber-500"
                                          : "bg-red-500"
                                      }`}
                                      style={{
                                        width: `${sub.percentage || 0}%`,
                                      }}
                                    />
                                  </div>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {sub.percentage?.toFixed(1)}%
                                  </p>
                                </div>
                              </td>

                              {/* Grade */}
                              <td className="px-5 py-4">
                                <span
                                  className={`px-3 py-1 rounded-lg text-sm font-bold ${getGradeColor(
                                    sub.grade
                                  )}`}
                                >
                                  {sub.grade || "—"}
                                </span>
                              </td>

                              {/* Pass/Fail */}
                              <td className="px-5 py-4">
                                {sub.isPassed ? (
                                  <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                                    <CheckCircle size={15} />
                                    Passed
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-red-500 text-sm font-medium">
                                    <XCircle size={15} />
                                    Failed
                                  </span>
                                )}
                              </td>

                              {/* Submitted At */}
                              <td className="px-5 py-4">
                                <p className="text-sm text-slate-600">
                                  {new Date(
                                    sub.submittedAt
                                  ).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {new Date(
                                    sub.submittedAt
                                  ).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </td>

                              {/* Publish Toggle */}
                              <td className="px-5 py-4 text-center">
                                <button
                                  onClick={() =>
                                    togglePublish(sub._id, sub.isPublished)
                                  }
                                  disabled={!!publishing[sub._id]}
                                  className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                                    sub.isPublished
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  } disabled:opacity-50`}
                                >
                                  {publishing[sub._id] ? (
                                    <RefreshCw
                                      size={13}
                                      className="animate-spin"
                                    />
                                  ) : sub.isPublished ? (
                                    <CheckCircle size={13} />
                                  ) : (
                                    <Eye size={13} />
                                  )}
                                  {publishing[sub._id]
                                    ? "Updating..."
                                    : sub.isPublished
                                    ? "Published"
                                    : "Publish"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Footer */}
                      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                          Showing {filtered.length} of {submissions.length}{" "}
                          results
                        </p>
                        <p className="text-xs text-slate-500">
                          {publishedCount} published •{" "}
                          {submissions.length - publishedCount} pending
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamResults;