import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, X, BookOpen, FileText,
  CheckCircle, AlertCircle, Trash2, Copy, List, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { questionAPI, examCourseAPI } from '../../../services/examAPI';
import useBasePath from "../../../hooks/useBasePath";

const AddQuestion = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [topicsBySemester, setTopicsBySemester] = useState({});
  const [availableTopics, setAvailableTopics] = useState([]);
  const basePath = useBasePath();
  
  // Course selection (shared for all questions)
  const [courseSelection, setCourseSelection] = useState({
    courseId: '',
    semester: '',
    topic: '',
    subtopic: ''
  });

  // Current question being edited
  const [currentQuestion, setCurrentQuestion] = useState({
    questionText: '',
    questionType: 'mcq',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    correctAnswer: '',
    marks: 1
  });

  // List of all questions to be submitted
  const [questionList, setQuestionList] = useState([]);

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, []);

  // Load topics when course changes
  useEffect(() => {
    if (courseSelection.courseId) {
      loadCourseTopics(courseSelection.courseId);
      const course = courses.find(c => c._id === courseSelection.courseId);
    }
  }, [courseSelection.courseId, courses]);

  const loadCourses = async () => {
    try {
      const response = await examCourseAPI.getActiveCourses();
      if (response.success) {
        setCourses(response.data);
      }
    } catch (error) {
      console.error('Load courses error:', error);
      toast.error('Failed to load courses');
    }
  };

  const loadCourseTopics = async (courseId) => {
  try {
    console.log(`🔍 AddQuestion - Loading topics for course: ${courseId}`);
    
    const response = await questionAPI.getCourseTopics(courseId);
    
    console.log('📦 Course API response:', response);
    
    if (response.success) {
      const course = response.data;
      console.log('📚 Full course data:', course);
      
      // Extract syllabus from course - check different possible structures
      const syllabus = course.syllabus || course.syllabusData || course.data?.syllabus || [];
      console.log('📖 Extracted syllabus:', syllabus);
      
      // Extract topics from syllabus
      const topics = [];
      const topicsBySemester = {};
      
      if (Array.isArray(syllabus)) {
        syllabus.forEach((semester, index) => {
          if (semester && semester.topics && Array.isArray(semester.topics)) {
            const semesterName = semester.name || `Semester ${index + 1}`;
            topicsBySemester[semesterName] = [];
            
            semester.topics.forEach(topic => {
              if (topic && topic.name) {
                topics.push({
                  semester: semesterName,
                  topic: topic.name,
                  subtopics: topic.subtopics ? topic.subtopics.map(st => st.name) : []
                });
                topicsBySemester[semesterName].push(topic.name);
              }
            });
          }
        });
      }
      
      console.log('✅ Processed topics:', topics);
      console.log('✅ Topics by semester:', topicsBySemester);
      
      setTopicsBySemester(topicsBySemester);
      setAvailableTopics(topics);
    } else {
      console.error('❌ API response not successful:', response);
      toast.error('Failed to load course structure');
    }
  } catch (error) {
    console.error('❌ Load course topics error:', error);
    console.error('❌ Error details:', error.response?.data);
    toast.error('Failed to load course topics: ' + (error.response?.data?.message || error.message));
  }
};

  // Handle course selection changes
  const handleCourseSelectionChange = (e) => {
    const { name, value } = e.target;
    setCourseSelection(prev => {
      const newSelection = { ...prev, [name]: value };
      
      // Clear dependent fields
      if (name === 'courseId') {
        newSelection.semester = '';
        newSelection.topic = '';
      }
      if (name === 'semester') {
        newSelection.topic = '';
      }
      
      return newSelection;
    });
  };

  // Handle current question changes
  const handleQuestionChange = (e) => {
    const { name, value } = e.target;
    setCurrentQuestion(prev => ({ ...prev, [name]: value }));
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...currentQuestion.options];
    
    if (field === 'isCorrect') {
      // If marking correct, unmark others
      if (currentQuestion.questionType === 'mcq' && value === true) {
        newOptions.forEach((opt, i) => {
          if (i !== index) opt.isCorrect = false;
        });
      }
      newOptions[index][field] = value;
    } else {
      newOptions[index][field] = value;
    }
    
    setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: [...prev.options, { text: '', isCorrect: false }]
    }));
  };

  const removeOption = (index) => {
    if (currentQuestion.options.length > 2) {
      const newOptions = currentQuestion.options.filter((_, i) => i !== index);
      setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
    } else {
      toast.error('Minimum 2 options required for MCQ');
    }
  };

  // Add current question to the list
  const addToQuestionList = () => {
    // Validate course selection
    if (!courseSelection.courseId || !courseSelection.semester || !courseSelection.topic) {
      toast.error('Please select course, semester and topic first');
      return;
    }

    // Validate current question
    if (!currentQuestion.questionText.trim()) {
      toast.error('Question text is required');
      return;
    }

    if (currentQuestion.questionType === 'mcq') {
      const emptyOptions = currentQuestion.options.filter(opt => !opt.text.trim());
      if (emptyOptions.length > 0) {
        toast.error('All MCQ options must have text');
        return;
      }
      const hasCorrect = currentQuestion.options.some(opt => opt.isCorrect);
      if (!hasCorrect) {
        toast.error('At least one option must be marked as correct');
        return;
      }
    } else {
      if (!currentQuestion.correctAnswer.trim()) {
        toast.error('Correct answer is required');
        return;
      }
    }

    // Create question object
    const questionToAdd = {
      ...currentQuestion,
      marks: parseInt(currentQuestion.marks),
      ...courseSelection,
      options: currentQuestion.questionType === 'mcq' ? currentQuestion.options : undefined,
      correctAnswer: currentQuestion.questionType !== 'mcq' ? currentQuestion.correctAnswer : undefined
    };

    // Add to list
    setQuestionList(prev => [...prev, questionToAdd]);
    
    // Reset current question (keep course selection)
    setCurrentQuestion({
      questionText: '',
      questionType: 'mcq',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      correctAnswer: '',
      marks: 1
    });

    toast.success('Question added to list! Add more or submit bulk.');
  };

  // Remove question from list
  const removeFromQuestionList = (index) => {
    setQuestionList(prev => prev.filter((_, i) => i !== index));
  };

  // Duplicate a question
  const duplicateQuestion = (index) => {
    const questionToDuplicate = questionList[index];
    setQuestionList(prev => [...prev, { ...questionToDuplicate }]);
    toast.success('Question duplicated!');
  };

  // Validate all questions
  const validateAllQuestions = () => {
    if (questionList.length === 0) {
      toast.error('No questions added yet');
      return false;
    }

    if (!courseSelection.courseId || !courseSelection.semester || !courseSelection.topic) {
      toast.error('Course selection incomplete');
      return false;
    }

    return true;
  };

  // Submit all questions in bulk
 const submitBulkQuestions = async () => {
  if (!validateAllQuestions()) return;
  
  setLoading(true);

  try {
    // Prepare questions array
    const questionsToSubmit = questionList.map(q => ({
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options,
      correctAnswer: q.correctAnswer,
      marks: q.marks,
      courseId: q.courseId,
      semester: q.semester,
      topic: q.topic,
      subtopic: q.subtopic || ''
    }));

    console.log('📤 Submitting bulk questions:', questionsToSubmit);

    // Send just the array, not wrapped in another object
    const response = await questionAPI.bulkAddQuestions(questionsToSubmit);
    
    if (response.success) {
      toast.success(`Successfully added ${questionList.length} questions!`);
      // Clear everything
      setQuestionList([]);
      setCourseSelection({
        courseId: '',
        semester: '',
        topic: '',
        subtopic: ''
      });
      navigate(`${basePath}/exam/question-bank`);
    } else {
      toast.error(response.message || 'Failed to add questions');
    }
  } catch (error) {
    console.error('Bulk add questions error:', error);
    console.error('Error response:', error.response?.data);
    toast.error(error.response?.data?.message || 'Failed to add questions');
  } finally {
    setLoading(false);
  }
};

  // Submit single question
  const submitSingleQuestion = async () => {
    // Add current question to list first
    addToQuestionList();
    
    // Then submit immediately if only one question
    if (questionList.length === 1) {
      setLoading(true);
      try {
        const response = await questionAPI.addQuestion(questionList[0]);
        if (response.success) {
          toast.success('Question added successfully!');
          setQuestionList([]);
          setCourseSelection({
            courseId: '',
            semester: '',
            topic: '',
            subtopic: ''
          });
          navigate(`${basePath}/exam/question-bank`);
        }
      } catch (error) {
        console.error('Add single question error:', error);
        toast.error(error.response?.data?.message || 'Failed to add question');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`${basePath}/exam/question-bank`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Question Bank
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Add Questions</h1>
            <p className="text-gray-600">Add single or multiple questions in batch</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Course Selection & Question List */}
        <div className="lg:col-span-1 space-y-6">
          {/* Card 1: Course Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <BookOpen className="text-green-600" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                Course Selection
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course *
                </label>
                <select
                  name="courseId"
                  value={courseSelection.courseId}
                  onChange={handleCourseSelectionChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Course</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>
                      {course.courseFullName} ({course.courseCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester *
                </label>
                <select
                  name="semester"
                  value={courseSelection.semester}
                  onChange={handleCourseSelectionChange}
                  required
                  disabled={!courseSelection.courseId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Semester</option>
                  {Object.keys(topicsBySemester).map(semester => (
                    <option key={semester} value={semester}>
                      {semester}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topic *
                </label>
                <select
                  name="topic"
                  value={courseSelection.topic}
                  onChange={handleCourseSelectionChange}
                  required
                  disabled={!courseSelection.semester}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Topic</option>
                  {topicsBySemester[courseSelection.semester]?.map(topic => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtopic (Optional)
                </label>
                <input
                  type="text"
                  name="subtopic"
                  value={courseSelection.subtopic}
                  onChange={handleCourseSelectionChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter subtopic if applicable"
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <AlertCircle size={16} />
                  <span className="text-sm">
                    <span className="font-medium">Selected:</span> {courseSelection.courseId ? courses.find(c => c._id === courseSelection.courseId)?.courseShortName : 'None'} 
                    {courseSelection.semester && ` • ${courseSelection.semester}`}
                    {courseSelection.topic && ` • ${courseSelection.topic}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Question List */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <List className="text-purple-600" size={20} />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Questions ({questionList.length})
                </h2>
              </div>
              {questionList.length > 0 && (
                <button
                  onClick={() => setQuestionList([])}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              )}
            </div>

            {questionList.length === 0 ? (
              <div className="text-center py-8">
                <List className="mx-auto text-gray-400 mb-3" size={40} />
                <p className="text-gray-500">No questions added yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Add questions using the form
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {questionList.map((question, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 text-sm line-clamp-2">
                          {index + 1}. {question.questionText.substring(0, 60)}...
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                            {question.questionType}
                          </span>
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-800 rounded">
                            {question.marks} marks
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => duplicateQuestion(index)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Duplicate"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => removeFromQuestionList(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {questionList.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={submitBulkQuestions}
                  disabled={loading || !courseSelection.courseId}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {loading ? 'Submitting...' : `Submit ${questionList.length} Questions`}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Question Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="text-blue-600" size={20} />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Add New Question
                </h2>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addToQuestionList}
                  disabled={!courseSelection.courseId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add to List
                </button>
                <button
                  type="button"
                  onClick={submitSingleQuestion}
                  disabled={!courseSelection.courseId}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={18} />
                  Add Single Question
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Text *
                </label>
                <textarea
                  name="questionText"
                  value={currentQuestion.questionText}
                  onChange={handleQuestionChange}
                  rows="3"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter the question here..."
                />
              </div>

              {/* Question Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Type *
                  </label>
                  <select
                    name="questionType"
                    value={currentQuestion.questionType}
                    onChange={handleQuestionChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="truefalse">True/False</option>
                    <option value="shortanswer">Short Answer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marks *
                  </label>
                  <input
                    type="number"
                    name="marks"
                    value={currentQuestion.marks}
                    onChange={handleQuestionChange}
                    min="1"
                    max="10"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Answer Section */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <CheckCircle className="text-purple-600" size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {currentQuestion.questionType === 'mcq' ? 'MCQ Options' : 'Correct Answer'}
                  </h3>
                </div>

                {currentQuestion.questionType === 'mcq' ? (
                  <div className="space-y-4">
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-700 w-8">
                              {String.fromCharCode(65 + index)}.
                            </span>
                            <input
                              type="text"
                              value={option.text}
                              onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter option text"
                            />
                            <button
                              type="button"
                              onClick={() => handleOptionChange(index, 'isCorrect', !option.isCorrect)}
                              className={`px-4 py-2 rounded-lg border ${
                                option.isCorrect
                                  ? 'bg-green-100 text-green-800 border-green-300'
                                  : 'bg-gray-100 text-gray-800 border-gray-300'
                              }`}
                            >
                              {option.isCorrect ? '✓ Correct' : 'Mark Correct'}
                            </button>
                            {currentQuestion.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(index)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <X size={20} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addOption}
                      className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                    >
                      <Plus size={18} />
                      Add Another Option
                    </button>

                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <AlertCircle size={18} />
                        <span className="text-sm">
                          <span className="font-medium">Note:</span> Only one option should be marked as correct
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <textarea
                      name="correctAnswer"
                      value={currentQuestion.correctAnswer}
                      onChange={handleQuestionChange}
                      rows="2"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={
                        currentQuestion.questionType === 'truefalse' 
                          ? 'Enter "True" or "False"' 
                          : 'Enter the correct answer'
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddQuestion;