import React, { useState, useEffect } from "react";
import {
  Award, BookOpen, CheckCircle, XCircle,
  TrendingUp, Calendar, Clock, Star,
  BarChart3, RefreshCw, AlertCircle, GraduationCap
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const getToken = () => sessionStorage.getItem("token") || localStorage.getItem("token");

const gradeConfig = {
  "A+": { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-500" },
  "A":  { color: "text-green-700",   bg: "bg-green-50",   border: "border-green-200",   bar: "bg-green-500"   },
  "B+": { color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",    bar: "bg-blue-500"    },
  "B":  { color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200",    bar: "bg-blue-400"    },
  "C":  { color: "text-yellow-700",  bg: "bg-yellow-50",  border: "border-yellow-200",  bar: "bg-yellow-500"  },
  "D":  { color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200",  bar: "bg-orange-500"  },
  "F":  { color: "text-red-700",     bg: "bg-red-50",     border: "border-red-200",     bar: "bg-red-500"     },
};

const MyMarksheet = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => { fetchMarksheet(); }, []);

  const fetchMarksheet = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/exam/tests/student/marksheet`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your marksheet...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Could not load marksheet</p>
          <button onClick={fetchMarksheet} className="mt-3 text-blue-500 text-sm hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { student, monthlyExams, semesterExams, summary } = data;
  const allExams = [...(monthlyExams || []), ...(semesterExams || [])];
  const currentExams =
    activeTab === "all" ? allExams :
    activeTab === "monthly" ? monthlyExams :
    semesterExams;

  const overallGrade = summary?.overallGrade || "F";
  const gradeStyle = gradeConfig[overallGrade] || gradeConfig["F"];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── Header Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                  <GraduationCap size={28} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {student?.fullName || "Student"}
                  </h1>
                  <p className="text-blue-100 text-sm mt-0.5">
                    {student?.studentId} • {student?.course}
                  </p>
                  <p className="text-blue-200 text-xs mt-0.5">
                    Batch: {student?.batchTime}
                  </p>
                </div>
              </div>

              {/* Overall Grade */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-1">
                  <span className="text-2xl font-black text-white">{overallGrade}</span>
                </div>
                <p className="text-blue-100 text-xs">Overall Grade</p>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-gray-100">
            {[
              { label: "Total Exams",  value: summary?.totalExams || 0,          icon: <BookOpen size={16} />,   color: "blue"    },
              { label: "Passed",       value: summary?.passed || 0,              icon: <CheckCircle size={16} />,color: "emerald" },
              { label: "Failed",       value: summary?.failed || 0,              icon: <XCircle size={16} />,    color: "red"     },
              { label: "Total Marks",  value: `${summary?.totalMarksObtained || 0}/${summary?.totalMaxMarks || 0}`, icon: <Star size={16} />, color: "amber" },
              { label: "Percentage",   value: `${summary?.overallPercentage || 0}%`, icon: <TrendingUp size={16} />, color: "purple" },
            ].map((s) => (
              <div key={s.label} className="px-4 py-4 text-center">
                <div className={`text-${s.color}-500 flex justify-center mb-1`}>{s.icon}</div>
                <p className={`text-xl font-bold text-${s.color}-600`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Overall Progress Bar ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Overall Performance</span>
            <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${gradeStyle.color} ${gradeStyle.bg} ${gradeStyle.border}`}>
              {summary?.overallPercentage || 0}% — Grade {overallGrade}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${gradeStyle.bar}`}
              style={{ width: `${summary?.overallPercentage || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>0%</span>
            <span>Pass: 40%</span>
            <span>100%</span>
          </div>
        </div>

        {/* ── Exam Results ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-4 pt-4 gap-2">
            {[
              { key: "all",      label: "All Exams",       count: allExams.length        },
              { key: "monthly",  label: "Monthly Tests",   count: monthlyExams?.length   },
              { key: "semester", label: "Semester Exams",  count: semesterExams?.length  },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {tab.count || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Results List */}
          <div className="p-4 space-y-3">
            {!currentExams || currentExams.length === 0 ? (
              <div className="text-center py-12">
                <Award size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No results available yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  Results will appear here once your teacher publishes them
                </p>
              </div>
            ) : (
              currentExams.map((exam) => {
                const g = gradeConfig[exam.grade] || gradeConfig["F"];
                return (
                  <div
                    key={exam._id}
                    className={`border rounded-xl p-4 transition-all hover:shadow-sm ${g.border} ${g.bg}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Exam Info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${g.bg} border ${g.border} flex-shrink-0`}>
                            <BookOpen size={16} className={g.color} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{exam.testName}</h3>
                            <p className="text-gray-500 text-sm">{exam.courseName}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Calendar size={11} />
                                {new Date(exam.submittedAt).toLocaleDateString("en-IN", {
                                  day: "numeric", month: "short", year: "numeric"
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={11} />
                                {exam.timeTaken ? `${Math.floor(exam.timeTaken / 60)}m ${exam.timeTaken % 60}s` : "—"}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                exam.examType === "semester"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}>
                                {exam.examType}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Score Details */}
                      <div className="flex items-center gap-6 md:gap-8">
                        {/* Mini Stats */}
                        <div className="grid grid-cols-3 gap-3 text-center text-xs">
                          <div>
                            <p className="font-bold text-green-600">{exam.correctAnswers}</p>
                            <p className="text-gray-400">Correct</p>
                          </div>
                          <div>
                            <p className="font-bold text-red-500">{exam.wrongAnswers}</p>
                            <p className="text-gray-400">Wrong</p>
                          </div>
                          <div>
                            <p className="font-bold text-gray-400">{exam.skippedQuestions}</p>
                            <p className="text-gray-400">Skipped</p>
                          </div>
                        </div>

                        {/* Score + Grade */}
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-2xl font-black text-gray-800">
                              {exam.marksObtained}
                            </span>
                            <span className="text-gray-400 text-sm">/ {exam.maxMarks}</span>
                          </div>

                          {/* Score bar */}
                          <div className="w-28 h-1.5 bg-white rounded-full mt-1 ml-auto">
                            <div
                              className={`h-1.5 rounded-full ${g.bar}`}
                              style={{ width: `${exam.percentage || 0}%` }}
                            />
                          </div>

                          <div className="flex items-center gap-2 justify-end mt-1.5">
                            <span className="text-xs text-gray-500">{exam.percentage?.toFixed(1)}%</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${g.color} ${g.bg} border ${g.border}`}>
                              {exam.grade}
                            </span>
                            {exam.isPassed ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                <CheckCircle size={12} /> Pass
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                                <XCircle size={12} /> Fail
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Footer Note ── */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Only results approved by your institution are shown here.
          Contact admin for any discrepancies.
        </p>
      </div>
    </div>
  );
};

export default MyMarksheet;