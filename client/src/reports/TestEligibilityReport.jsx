import React, { useState, useEffect } from "react";
import {
  Users, CheckCircle, XCircle, Search, BookOpen,
  RefreshCw, AlertCircle, TrendingUp, Percent
} from "lucide-react";
import { testAPI } from "../services/examAPI";

const TestEligibilityReport = () => {
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all | attempted | notAttempted

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const response = await testAPI.getTests({ limit: 100 });
      if (response.success) setTests(response.data || []);
    } catch (error) {
      console.error("Load tests error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async (testId) => {
    setReportLoading(true);
    try {
      const response = await testAPI.getEligibilityReport(testId);
      if (response.success) {
        setSelectedTest(response.data.test);
        setSummary(response.data.summary);
        setStudents(response.data.students || []);
      }
    } catch (error) {
      console.error("Load eligibility report error:", error);
    } finally {
      setReportLoading(false);
    }
  };

  const handleToggleActivation = async (studentId, currentlyActivated) => {
    try {
      const response = await testAPI.toggleStudentActivation(selectedTest._id, studentId, !currentlyActivated);
      if (response.success) {
        setStudents(prev => prev.map(s =>
          s._id === studentId ? { ...s, activated: !currentlyActivated } : s
        ));
      }
    } catch (error) {
      console.error("Toggle activation error:", error);
    }
  };

  const filtered = students.filter((s) => {
    const matchSearch =
      s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filterStatus === "all"
        ? true
        : filterStatus === "attempted"
        ? s.attempted
        : !s.attempted;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-screen-xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Exam Eligibility Report
          </h1>
          <p className="text-slate-500 mt-1">
            See how many students were eligible for a test vs how many actually attempted it
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* ── LEFT: Test List ── */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-sm">All Tests</span>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  {tests.length}
                </span>
              </div>

              {loading ? (
                <div className="p-6 text-center">
                  <RefreshCw size={20} className="animate-spin text-slate-400 mx-auto" />
                </div>
              ) : tests.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">No tests found</div>
              ) : (
                <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
                  {tests.map((test) => (
                    <button
                      key={test._id}
                      onClick={() => fetchReport(test._id)}
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
                          {test.examMode === "regular" ? "Regular" : "Semester"}
                        </span>
                      </div>
                      {test.scheduledDate && (
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(test.scheduledDate).toLocaleDateString("en-GB", {
                            day: "2-digit", month: "short", year: "numeric"
                          })}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Report ── */}
          <div className="xl:col-span-3 space-y-5">
            {!selectedTest ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center">
                <BookOpen size={48} className="text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-1">Select a Test</h3>
                <p className="text-slate-400 text-sm">
                  Click any test on the left to see its eligibility report
                </p>
              </div>
            ) : reportLoading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center">
                <RefreshCw size={24} className="animate-spin text-slate-400 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Loading report...</p>
              </div>
            ) : (
              <>
                {/* Test Info + Stats */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <div className="mb-5">
                    <h2 className="text-xl font-bold text-slate-900">{selectedTest.testName}</h2>
                    <p className="text-slate-500 text-sm mt-0.5">
                      {selectedTest.courseName} • {selectedTest.examMode === "regular" ? "Regular" : "Semester"} exam
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <div className="text-blue-500 mb-2"><Users size={18} /></div>
                      <p className="text-2xl font-bold text-blue-700">{summary.totalEligible}</p>
                      <p className="text-xs text-blue-600 mt-0.5">Eligible Students</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                      <div className="text-emerald-500 mb-2"><CheckCircle size={18} /></div>
                      <p className="text-2xl font-bold text-emerald-700">{summary.totalAttempted}</p>
                      <p className="text-xs text-emerald-600 mt-0.5">Attempted</p>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                      <div className="text-red-500 mb-2"><XCircle size={18} /></div>
                      <p className="text-2xl font-bold text-red-700">{summary.notAttemptedCount}</p>
                      <p className="text-xs text-red-600 mt-0.5">Did Not Attempt</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                      <div className="text-amber-500 mb-2"><Percent size={18} /></div>
                      <p className="text-2xl font-bold text-amber-700">{summary.attemptPercentage}%</p>
                      <p className="text-xs text-amber-600 mt-0.5">Attempt Rate</p>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                    <option value="all">All Students</option>
                    <option value="attempted">Attempted</option>
                    <option value="notAttempted">Did Not Attempt</option>
                  </select>
                </div>

                {/* Students Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  {filtered.length === 0 ? (
                    <div className="p-12 text-center">
                      <AlertCircle size={40} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No students found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Submitted</th>
                            {selectedTest.examMode === "semester" && (
                              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Portal Access</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filtered.map((s) => (
                            <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {(s.fullName || "?").charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-slate-800 text-sm">{s.fullName}</p>
                                      {s.courseShortName && (
                                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-semibold uppercase tracking-wide">
                                          {s.courseShortName}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-400">{s.studentId}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                {s.attempted ? (
                                  <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                                    <CheckCircle size={15} /> Attempted
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-red-500 text-sm font-medium">
                                    <XCircle size={15} /> Not Attempted
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-700">
                                {s.attempted ? `${s.marksObtained}/${s.maxMarks} (${s.percentage?.toFixed(1)}%)` : "—"}
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-500">
                                {s.attempted
                                  ? new Date(s.submittedAt).toLocaleDateString("en-IN", {
                                      day: "numeric", month: "short", year: "numeric"
                                    })
                                  : "—"}
                              </td>
                              {selectedTest.examMode === "semester" && (
                                <td className="px-5 py-4">
                                  {s.attempted ? (
                                    <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700 inline-block">
                                      Completed
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleToggleActivation(s._id, s.activated)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                        s.activated
                                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                      }`}
                                    >
                                      {s.activated ? "Active" : "Activate"}
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
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

export default TestEligibilityReport;