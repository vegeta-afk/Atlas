import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle,
  FileText, BookOpen, ChevronRight, ChevronLeft, 
  Send, Eye, RefreshCw, Hash
} from 'lucide-react';
import toast from 'react-hot-toast';
import { testAPI } from '../../../services/examAPI';
import useBasePath from "../../../hooks/useBasePath";

const TestPreview = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const basePath = useBasePath();
  
  // Add new state to track visited questions
  const [visitedQuestions, setVisitedQuestions] = useState(new Set());
  
  // 🔍 ADDED: Debug logging to trace where "1" is coming from
  useEffect(() => {
    console.log('🔍 ========== DEBUG START ==========');
    console.log('📍 testId from URL:', testId);
    console.log('📍 Full URL:', window.location.href);
    console.log('📍 Pathname:', window.location.pathname);
    console.log('📍 Referrer (where you came from):', document.referrer);
    console.log('📍 Is valid MongoDB ID?', /^[0-9a-fA-F]{24}$/.test(testId));
    console.log('🔍 ========== DEBUG END ==========');
  }, [testId]);
  
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [shuffledOrder, setShuffledOrder] = useState([]);

  // Mark question as visited when viewed
  useEffect(() => {
    if (questions.length > 0 && !isSubmitted) {
      setVisitedQuestions(prev => {
        const newSet = new Set(prev);
        newSet.add(currentQuestionIndex);
        return newSet;
      });
    }
  }, [currentQuestionIndex, questions.length, isSubmitted]);

  // Main useEffect
  useEffect(() => {
    // Check if testId is a valid MongoDB ObjectId (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(testId);
    
    if (!isValidObjectId) {
      console.error('❌ Invalid test ID format:', testId);
      console.error('💡 TIP: You need to use a real test ID like:');
      console.error('   - 6981e8f6d38fe1a52aeb7407 (Test 2)');
      console.error('   - 6981ea28d38fe1a52aeb744b (Test 3)');
      
      toast.error(`Invalid test ID. Please select a valid test from the list.`);
      navigate(`${basePath}/exam/manage-tests`);
      return;
    }
    
    loadTest();
  }, [testId, navigate]);

  const loadTest = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching test with ID:', testId);
      
      const response = await testAPI.getTest(testId);
      if (response.success) {
        const testData = response.data;
        console.log('✅ Test loaded:', testData.testName);
        setTest(testData);
        
        // Get questions for preview
        const allQuestions = await getTestQuestions(testData);
        
        if (allQuestions.length === 0) {
          toast.error('No questions available for preview');
          return;
        }
        
        // Generate random order for preview
        const order = Array.from({ length: allQuestions.length }, (_, i) => i);
        shuffleArray(order);
        setShuffledOrder(order);
        
        setQuestions(allQuestions);
        setTimeRemaining(testData.duration * 60);
        
        // Initialize answers object
        const initialAnswers = {};
        allQuestions.forEach((q, index) => {
          initialAnswers[index] = '';
        });
        setAnswers(initialAnswers);
        
        toast.success(`Previewing: ${testData.testName}`);
      } else {
        toast.error(response.message || 'Failed to load test');
        navigate(`${basePath}/exam/manage-tests`);
      }
    } catch (error) {
      console.error('❌ Load test error:', error);
      toast.error(`Failed to load test: ${error.message}`);
      navigate(`${basePath}/exam/manage-tests`);
    } finally {
      setLoading(false);
    }
  };

  const getTestQuestions = async (testData) => {
    if (testData.questionPool && testData.questionPool.length > 0) {
      console.log('✅ Using', testData.questionPool.length, 'real questions from pool');
      
      return testData.questionPool.map((q, index) => ({
  _id: q._id || `q-${index}`,
  questionText: q.questionText || `Question ${index + 1}`,
  questionType: q.questionType || 'mcq',
  options: q.options || [],   // ← just empty array, no fake fallback
  correctAnswer: q.correctAnswer || '',
  marks: q.marks || 1
}));
    } else {
      console.log('⚠ Using sample questions (pool is empty)');
      toast('Using sample questions for preview', { icon: '📝' });
      
      return [
        {
          _id: 'sample-1',
          questionText: "Sample MCQ Question: What is 2 + 2?",
          questionType: 'mcq',
          options: [
            { text: "3", isCorrect: false },
            { text: "4", isCorrect: true },
            { text: "5", isCorrect: false },
            { text: "6", isCorrect: false }
          ],
          marks: 1
        },
        {
          _id: 'sample-2',
          questionText: "Sample True/False: The Earth is flat.",
          questionType: 'truefalse',
          correctAnswer: "False",
          marks: 1
        },
        {
          _id: 'sample-3',
          questionText: "Sample Short Answer: What is the capital of India?",
          questionType: 'shortanswer',
          correctAnswer: "New Delhi",
          marks: 2
        }
      ];
    }
  };

  // Fisher-Yates shuffle
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  // Timer effect
  useEffect(() => {
    if (timeRemaining <= 0 || isSubmitted || !test) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!isSubmitted) {
            submitTest();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isSubmitted, test]);

  const handleAnswerChange = (questionIndex, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const submitTest = () => {
    if (isSubmitted) return;
    
    if (!window.confirm('Submit test preview? This will calculate your score.')) return;
    
    let totalMarks = 0;
    let marksObtained = 0;
    const results = [];
    
    questions.forEach((question, index) => {
      const userAnswer = answers[index];
      const isCorrect = checkAnswer(question, userAnswer);
      
      totalMarks += question.marks;
      
      if (isCorrect) {
        marksObtained += question.marks;
      }
      
      results.push({
        question: question.questionText,
        userAnswer: userAnswer || 'Not answered',
        correctAnswer: getCorrectAnswer(question),
        isCorrect,
        marks: question.marks,
        marksObtained: isCorrect ? question.marks : 0
      });
    });
    
    const percentage = totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;
    
    setResult({
      marksObtained,
      totalMarks,
      percentage: percentage.toFixed(2),
      results
    });
    
    setIsSubmitted(true);
    toast.success(`Test submitted! Score: ${marksObtained}/${totalMarks} (${percentage.toFixed(1)}%)`);
  };

  const checkAnswer = (question, userAnswer) => {
    if (!userAnswer || userAnswer.trim() === '') return false;
    
    if (question.questionType === 'mcq') {
      const selectedOption = question.options.find(opt => 
        opt.text === userAnswer || opt._id === userAnswer
      );
      return selectedOption ? selectedOption.isCorrect : false;
    } else {
      return userAnswer.trim().toLowerCase() === 
             question.correctAnswer.trim().toLowerCase();
    }
  };

  const getCorrectAnswer = (question) => {
    if (question.questionType === 'mcq') {
      const correctOption = question.options.find(opt => opt.isCorrect);
      return correctOption ? correctOption.text : 'Not set';
    }
    return question.correctAnswer || 'Not set';
  };

  const resetPreview = () => {
    if (!test) return;
    
    setCurrentQuestionIndex(0);
    setVisitedQuestions(new Set([0])); // Reset visited with first question
    const initialAnswers = {};
    questions.forEach((_, index) => {
      initialAnswers[index] = '';
    });
    setAnswers(initialAnswers);
    setTimeRemaining(test.duration * 60);
    setIsSubmitted(false);
    setResult(null);
  };

  const currentQuestion = questions[shuffledOrder[currentQuestionIndex]];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading test preview...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Test not found</h2>
          <p className="text-gray-600 mb-4">Test ID: {testId}</p>
          <button
            onClick={() => navigate(`${basePath}/exam/manage-tests`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Manage Tests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`${basePath}/exam/manage-tests`)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft size={20} />
                Back to Manage Tests
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{test.testName}</h1>
                <p className="text-sm text-gray-600">
                  Preview Mode • {test.courseName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {!isSubmitted && test && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg">
                  <Clock size={18} />
                  <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
                </div>
              )}
              
              <button
                onClick={resetPreview}
                className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <RefreshCw size={18} />
                Reset Preview
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Question List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-4">Test Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen size={16} className="text-gray-400" />
                    <span className="text-gray-700">Course:</span>
                    <span className="font-medium">{test.courseName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-gray-700">Duration:</span>
                    <span className="font-medium">{test.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText size={16} className="text-gray-400" />
                    <span className="text-gray-700">Questions:</span>
                    <span className="font-medium">{questions.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Hash size={16} className="text-gray-400" />
                    <span className="text-gray-700">Total Marks:</span>
                    <span className="font-medium">
                      {questions.reduce((sum, q) => sum + q.marks, 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-600 mb-2">QUESTION STATUS</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Attempted</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span>Visited</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Not Visited</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Question Navigation</h3>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((_, index) => {
                    const isCurrent = currentQuestionIndex === index;
                    const isAttempted = answers[shuffledOrder[index]] && answers[shuffledOrder[index]].trim() !== '';
                    const isVisited = visitedQuestions.has(index);
                    
                    // Determine color based on status
                    let bgColor = 'bg-red-500 text-white'; // Not visited (default)
                    if (isAttempted) {
                      bgColor = 'bg-green-500 text-white'; // Attempted
                    } else if (isVisited) {
                      bgColor = 'bg-orange-500 text-white'; // Visited but not attempted
                    }
                    
                    return (
                      <button
                        key={index}
                        onClick={() => goToQuestion(index)}
                        className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-medium
                          ${isCurrent ? 'ring-2 ring-blue-600 ring-offset-2' : ''}
                          ${bgColor}`}
                        disabled={isSubmitted}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!isSubmitted && (
                <div className="mt-6 pt-6 border-t">
                  <button
                    onClick={submitTest}
                    className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                  >
                    <Send size={18} />
                    Submit Test Preview
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    This will calculate your score based on answers
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Question */}
          <div className="lg:col-span-3">
            {isSubmitted ? (
              // Results View
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Test Preview Results</h2>
                  <p className="text-gray-600">Here's how you performed in the preview</p>
                </div>

                {/* Score Summary */}
                <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 mb-8">
                  <div className="flex items-center justify-around">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-800">
                        {result.marksObtained}/{result.totalMarks}
                      </div>
                      <div className="text-gray-600">Marks Obtained</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600">
                        {result.percentage}%
                      </div>
                      <div className="text-gray-600">Percentage</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-800">
                        {result.results.filter(r => r.isCorrect).length}/{questions.length}
                      </div>
                      <div className="text-gray-600">Correct Answers</div>
                    </div>
                  </div>
                </div>

                {/* Detailed Results */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800">Detailed Review</h3>
                  
                  {result.results.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-800">Q{index + 1}:</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              item.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2">{item.question}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Your Answer:</p>
                              <div className={`p-2 rounded ${item.userAnswer && item.userAnswer !== 'Not answered' ? 'bg-gray-100' : 'bg-yellow-50'}`}>
                                <p className={item.userAnswer && item.userAnswer !== 'Not answered' ? 'text-gray-800' : 'text-yellow-700'}>
                                  {item.userAnswer}
                                </p>
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Correct Answer:</p>
                              <div className="p-2 rounded bg-green-50">
                                <p className="text-green-800 font-medium">{item.correctAnswer}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4 text-center">
                          <div className={`text-lg font-bold ${
                            item.isCorrect ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {item.marksObtained}/{item.marks}
                          </div>
                          <div className="text-xs text-gray-500">Marks</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 flex justify-center gap-4">
                  <button
                    onClick={resetPreview}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => navigate(`${basePath}/exam/manage-tests`)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Back to Manage Tests
                  </button>
                </div>
              </div>
            ) : (
              // Question View
              <div className="bg-white rounded-lg shadow">
                {/* Question Header */}
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        Question {currentQuestionIndex + 1} of {questions.length}
                      </span>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                        {currentQuestion?.marks || 1} marks
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      Preview Mode • All answers are tracked
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-medium text-gray-800 mt-4">
                    {currentQuestion?.questionText || "Question text not available"}
                  </h3>
                </div>

                {/* Answer Options */}
                <div className="p-6">
                  {currentQuestion?.questionType === 'mcq' ? (
                    <div className="space-y-3">
                      {currentQuestion.options?.map((option, optIndex) => (
                        <label
                          key={optIndex}
                          className={`flex items-center p-4 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                            answers[shuffledOrder[currentQuestionIndex]] === option.text
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestionIndex}`}
                            value={option.text}
                            checked={answers[shuffledOrder[currentQuestionIndex]] === option.text}
                            onChange={(e) => handleAnswerChange(shuffledOrder[currentQuestionIndex], e.target.value)}
                            className="h-5 w-5 text-blue-600"
                            disabled={isSubmitted}
                          />
                          <span className="ml-4 flex-1">
                            <span className="font-medium text-gray-800">{option.text}</span>
                            {option.isCorrect && (
                              <span className="ml-2 text-xs text-green-600">(Correct Answer)</span>
                            )}
                          </span>
                          <span className="text-gray-400">
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : currentQuestion?.questionType === 'truefalse' ? (
                    <div className="grid grid-cols-2 gap-4">
                      {['True', 'False'].map((value) => (
                        <label
                          key={value}
                          className={`flex items-center justify-center p-4 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                            answers[shuffledOrder[currentQuestionIndex]] === value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestionIndex}`}
                            value={value}
                            checked={answers[shuffledOrder[currentQuestionIndex]] === value}
                            onChange={(e) => handleAnswerChange(shuffledOrder[currentQuestionIndex], e.target.value)}
                            className="h-5 w-5 text-blue-600"
                            disabled={isSubmitted}
                          />
                          <span className="ml-3 text-lg font-medium text-gray-800">{value}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <textarea
                        value={answers[shuffledOrder[currentQuestionIndex]] || ''}
                        onChange={(e) => handleAnswerChange(shuffledOrder[currentQuestionIndex], e.target.value)}
                        rows="4"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type your answer here..."
                        disabled={isSubmitted}
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        Correct Answer: <span className="font-medium text-green-600">
                          {currentQuestion?.correctAnswer || 'Not set'}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="p-6 border-t flex justify-between">
                  <button
                    onClick={prevQuestion}
                    disabled={currentQuestionIndex === 0 || isSubmitted}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      currentQuestionIndex === 0 || isSubmitted
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <ChevronLeft size={20} />
                    Previous
                  </button>
                  
                  <button
                    onClick={submitTest}
                    disabled={isSubmitted}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Submit Test
                  </button>
                  
                  <button
                    onClick={nextQuestion}
                    disabled={currentQuestionIndex === questions.length - 1 || isSubmitted}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      currentQuestionIndex === questions.length - 1 || isSubmitted
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    Next
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPreview;