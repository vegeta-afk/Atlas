import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock, ChevronLeft, ChevronRight,
  Send, AlertCircle, CheckCircle, BookOpen
} from "lucide-react";

const StudentExamPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [testInfo, setTestInfo] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [visitedQuestions, setVisitedQuestions] = useState(new Set([0]));
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const getToken = () =>
    sessionStorage.getItem("token") || localStorage.getItem("token");

  useEffect(() => {
    startExam();
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (timeRemaining > 0 && !isSubmitted) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit(true); // auto submit
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timeRemaining, isSubmitted]);

  // Mark question visited
  useEffect(() => {
    setVisitedQuestions(prev => new Set([...prev, currentIndex]));
  }, [currentIndex]);

  const startExam = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/api/exam/tests/${testId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (data.success) {
        setSessionId(data.data.sessionId);
        setQuestions(data.data.questions);
        setTestInfo({
          testName: data.data.testName,
          duration: data.data.duration,
        });
        setTimeRemaining(data.data.timeRemaining);

        // Initialize answers
        const init = {};
        data.data.questions.forEach((_, i) => { init[i] = ""; });
        setAnswers(init);
      } else {
        setError(data.message || "Failed to start exam");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (isSubmitted || submitting) return;

    if (!autoSubmit) {
      const unanswered = questions.filter((_, i) => !answers[i]).length;
      if (unanswered > 0) {
        if (!window.confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return;
      } else {
        if (!window.confirm("Are you sure you want to submit the exam?")) return;
      }
    }

    setSubmitting(true);
    clearInterval(timerRef.current);

    try {
      const token = getToken();
      const answersArray = questions.map((_, i) => answers[i] || "");

      const res = await fetch(`${BASE_URL}/api/exam/tests/${testId}/submit`,{
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId, answers: answersArray })
      });

      const data = await res.json();
      if (data.success) {
        setIsSubmitted(true);
      } else {
        alert("Failed to submit: " + data.message);
      }
    } catch (err) {
      alert("Error submitting exam: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  };

  const currentQuestion = questions[currentIndex];

  // ---- LOADING ----
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Starting your exam...</p>
      </div>
    );
  }

  // ---- ERROR ----
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cannot Start Exam</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/student/exams")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to My Exams
          </button>
        </div>
      </div>
    );
  }

  // ---- SUBMITTED ----
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-lg text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Exam Submitted Successfully!
          </h2>
          <p className="text-gray-600 mb-2">
            Your answers have been recorded.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Results will be announced by your instructor. Check back later for your score.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Exam</span>
              <span className="font-medium">{testInfo?.testName}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Questions Attempted</span>
              <span className="font-medium">
                {Object.values(answers).filter(a => a).length} / {questions.length}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate("/student/exams")}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
          >
            Back to My Exams
          </button>
        </div>
      </div>
    );
  }

  // ---- EXAM UI ----
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{testInfo?.testName}</h1>
            <p className="text-sm text-gray-500">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg ${
            timeRemaining < 300
              ? "bg-red-100 text-red-700"
              : timeRemaining < 600
              ? "bg-yellow-100 text-yellow-700"
              : "bg-blue-100 text-blue-700"
          }`}>
            <Clock size={20} />
            {formatTime(timeRemaining)}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm p-5 sticky top-20">
            <h3 className="font-semibold text-gray-900 mb-4">Question Navigation</h3>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500"></div> Answered
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-400"></div> Visited
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-300"></div> Not Visited
              </div>
            </div>

            {/* Question Grid */}
            <div className="grid grid-cols-5 gap-2 mb-6">
              {questions.map((_, i) => {
                const isAnswered = !!answers[i];
                const isVisited = visitedQuestions.has(i);
                const isCurrent = currentIndex === i;

                let bg = "bg-gray-200 text-gray-700";
                if (isAnswered) bg = "bg-green-500 text-white";
                else if (isVisited) bg = "bg-orange-400 text-white";

                return (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`h-9 w-9 rounded-lg text-sm font-medium ${bg} ${
                      isCurrent ? "ring-2 ring-blue-600 ring-offset-1" : ""
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {/* Submit Button */}
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send size={16} />
              {submitting ? "Submitting..." : "Submit Exam"}
            </button>
          </div>
        </div>

        {/* Question Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Question Header */}
            <div className="p-6 border-b bg-gray-50">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                  {currentQuestion?.marks || 1} mark{currentQuestion?.marks > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-lg font-medium text-gray-900">
                {currentQuestion?.questionText}
              </p>
            </div>

            {/* Options */}
            <div className="p-6">
              {currentQuestion?.questionType === "mcq" ? (
                <div className="space-y-3">
  {currentQuestion.options?.filter(opt => opt && opt.text).map((option, idx) => (
    <label
      key={idx}
      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
        answers[currentIndex] === option.text
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <input
        type="radio"
        name={`q-${currentIndex}`}
        value={option.text}
        checked={answers[currentIndex] === option.text}
        onChange={() =>
          setAnswers(prev => ({ ...prev, [currentIndex]: option.text }))
        }
        className="h-5 w-5 text-blue-600"
      />
      <span className="flex-1 text-gray-800">{option.text}</span>
      <span className="text-gray-400 text-sm font-medium">
        {String.fromCharCode(65 + idx)}
      </span>
    </label>
  ))}
</div>
              ) : currentQuestion?.questionType === "truefalse" ? (
                <div className="grid grid-cols-2 gap-4">
                  {["True", "False"].map(val => (
                    <label
                      key={val}
                      className={`flex items-center justify-center gap-3 p-5 rounded-xl border-2 cursor-pointer ${
                        answers[currentIndex] === val
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${currentIndex}`}
                        value={val}
                        checked={answers[currentIndex] === val}
                        onChange={() =>
                          setAnswers(prev => ({ ...prev, [currentIndex]: val }))
                        }
                        className="h-5 w-5 text-blue-600"
                      />
                      <span className="text-lg font-medium text-gray-800">{val}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[currentIndex] || ""}
                  onChange={e =>
                    setAnswers(prev => ({ ...prev, [currentIndex]: e.target.value }))
                  }
                  rows={4}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Navigation */}
            <div className="px-6 py-4 border-t flex justify-between">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} /> Previous
              </button>

              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentExamPage;