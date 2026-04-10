import React, { useState, useEffect } from "react";
import {
  BookOpen, Clock, Calendar, CheckCircle,
  XCircle, AlertCircle, Play, Award, ChevronRight
} from "lucide-react";

import { useNavigate } from "react-router-dom";

const MyExams = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");

  const getToken = () =>
    sessionStorage.getItem("token") || localStorage.getItem("token");

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/api/exam/tests/student/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setExams(data.data || []);
    } catch (error) {
      console.error("Error fetching exams:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric"
    });
  };

  const getStatusBadge = (exam) => {
    if (exam.attempted && !exam.allowMultipleAttempts) {
      return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1"><CheckCircle size={12} /> Completed</span>;
    }
    if (exam.status === "active") {
      return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1"><Play size={12} /> Live Now</span>;
    }
    if (exam.status === "scheduled") {
      return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold flex items-center gap-1"><Calendar size={12} /> Scheduled</span>;
    }
    if (exam.status === "completed") {
      return <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold flex items-center gap-1"><CheckCircle size={12} /> Ended</span>;
    }
    return null;
  };

  const upcomingExams = exams.filter(e =>
    e.status === "active" || e.status === "scheduled"
  );
  const completedExams = exams.filter(e =>
    e.status === "completed" || (e.attempted && !e.allowMultipleAttempts)
  );

  const currentExams = activeTab === "upcoming" ? upcomingExams : completedExams;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Exams</h1>
        <p className="text-gray-500">View your scheduled and completed exams</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-100">
          <p className="text-2xl font-bold text-blue-600">{exams.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Exams</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-100">
          <p className="text-2xl font-bold text-green-600">
            {exams.filter(e => e.status === "active").length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Live Now</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-100">
          <p className="text-2xl font-bold text-purple-600">
            {exams.filter(e => e.attempted).length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Attempted</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {["upcoming", "completed"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab === "upcoming" ? "Upcoming / Live" : "Completed"}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
            }`}>
              {tab === "upcoming" ? upcomingExams.length : completedExams.length}
            </span>
          </button>
        ))}
      </div>

      {/* Exam Cards */}
      {currentExams.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No {activeTab === "upcoming" ? "upcoming" : "completed"} exams
          </h3>
          <p className="text-gray-500">
            {activeTab === "upcoming"
              ? "You have no scheduled or live exams right now."
              : "You haven't completed any exams yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentExams.map(exam => (
            <div
              key={exam._id}
              className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                      <BookOpen size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{exam.testName}</h3>
                      <p className="text-gray-500 text-sm">{exam.courseName}</p>
                      {exam.description && (
                        <p className="text-gray-600 text-sm mt-1">{exam.description}</p>
                      )}
                    </div>
                    <div className="ml-auto">{getStatusBadge(exam)}</div>
                  </div>

                  {/* Exam Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar size={14} className="text-gray-400" />
                      {formatDate(exam.scheduledDate)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock size={14} className="text-gray-400" />
                      {exam.startTime} - {exam.endTime}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock size={14} className="text-gray-400" />
                      {exam.duration} minutes
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Award size={14} className="text-gray-400" />
                      {exam.questionsPerStudent} questions • {exam.maxMarks} marks
                    </div>
                  </div>

                  {/* Result if attempted */}
                  {exam.attempted && exam.attemptDetails && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-700 font-semibold">Your Result:</span>
                        <span className="text-green-800 font-bold">
                          {exam.attemptDetails.marksObtained}/{exam.attemptDetails.totalMarks} marks
                        </span>
                        <span className="text-green-700">
                          ({exam.attemptDetails.percentage?.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="flex-shrink-0">
                  {exam.status === "active" && !exam.attempted && (
                    <button
                      onClick={() => navigate(`/student/exam/${exam._id}`)}
                      className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <Play size={18} />
                      Start Exam
                    </button>
                  )}
                  {exam.status === "active" && exam.attempted && !exam.allowMultipleAttempts && (
                    <div className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl text-sm text-center">
                      Already Attempted
                    </div>
                  )}
                  {exam.status === "scheduled" && (
                    <div className="px-6 py-3 bg-blue-50 text-blue-600 rounded-xl text-sm text-center font-medium">
                      Not Started Yet
                    </div>
                  )}
                  {exam.status === "completed" && (
                    <div className="px-6 py-3 bg-purple-50 text-purple-600 rounded-xl text-sm text-center font-medium">
                      Exam Ended
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyExams;