import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, X, BookOpen, FileText,
  CheckCircle, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { questionAPI, examCourseAPI } from '../../../services/examAPI';
import useBasePath from "../../../hooks/useBasePath";

const EditQuestion = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const basePath = useBasePath();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [courses, setCourses] = useState([]);
  const [topicsBySemester, setTopicsBySemester] = useState({});
  const [availableTopics, setAvailableTopics] = useState([]);

  const [courseSelection, setCourseSelection] = useState({
    courseId: '', semester: '', topic: '', subtopic: ''
  });

  const [question, setQuestion] = useState({
    questionText: '',
    questionType: 'mcq',
    options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
    correctAnswer: '',
    marks: 1
  });

  useEffect(() => {
    loadCourses();
    loadQuestion();
  }, [id]);

  useEffect(() => {
    if (courseSelection.courseId) {
      loadCourseTopics(courseSelection.courseId);
    }
  }, [courseSelection.courseId]);

  const loadCourses = async () => {
    try {
      const response = await examCourseAPI.getActiveCourses();
      if (response.success) setCourses(response.data);
    } catch (error) {
      console.error('Load courses error:', error);
      toast.error('Failed to load courses');
    }
  };

  const loadQuestion = async () => {
    setFetching(true);
    try {
      const response = await questionAPI.getQuestion(id);
      if (response.success) {
        const q = response.data;
        setCourseSelection({
          courseId: q.courseId?._id || q.courseId || '',
          semester: q.semester || '',
          topic: q.topic || '',
          subtopic: q.subtopic || ''
        });
        setQuestion({
          questionText: q.questionText || '',
          questionType: q.questionType || 'mcq',
          options: q.questionType === 'mcq'
            ? (q.options?.length ? q.options : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }])
            : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
          correctAnswer: q.questionType !== 'mcq' ? (q.correctAnswer || '') : '',
          marks: q.marks || 1
        });
      } else {
        toast.error('Question not found');
        navigate(`${basePath}/exam/question-bank`);
      }
    } catch (error) {
      console.error('Load question error:', error);
      toast.error('Failed to load question');
      navigate(`${basePath}/exam/question-bank`);
    } finally {
      setFetching(false);
    }
  };

  const loadCourseTopics = async (courseId) => {
    try {
      const response = await questionAPI.getCourseTopics(courseId);
      if (response.success) {
        const syllabus = response.data.syllabus || response.data.syllabusData || response.data.data?.syllabus || [];
        const topics = [];
        const bySemester = {};

        if (Array.isArray(syllabus)) {
          syllabus.forEach((semester, index) => {
            if (semester?.topics?.length) {
              const semName = semester.name || `Semester ${index + 1}`;
              bySemester[semName] = [];
              semester.topics.forEach(topic => {
                if (topic?.name) {
                  topics.push({
                    semester: semName,
                    topic: topic.name,
                    subtopics: topic.subtopics ? topic.subtopics.map(st => st.name) : []
                  });
                  bySemester[semName].push(topic.name);
                }
              });
            }
          });
        }
        setTopicsBySemester(bySemester);
        setAvailableTopics(topics);
      }
    } catch (error) {
      console.error('Load course topics error:', error);
      toast.error('Failed to load course topics');
    }
  };

  const handleCourseSelectionChange = (e) => {
    const { name, value } = e.target;
    setCourseSelection(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'semester') updated.topic = '';
      return updated;
    });
  };

  const handleQuestionChange = (e) => {
    const { name, value } = e.target;
    setQuestion(prev => ({ ...prev, [name]: value }));
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...question.options];
    if (field === 'isCorrect' && value === true) {
      newOptions.forEach((opt, i) => { if (i !== index) opt.isCorrect = false; });
    }
    newOptions[index][field] = value;
    setQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setQuestion(prev => ({ ...prev, options: [...prev.options, { text: '', isCorrect: false }] }));
  };

  const removeOption = (index) => {
    if (question.options.length > 2) {
      setQuestion(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
    } else {
      toast.error('Minimum 2 options required for MCQ');
    }
  };

  const handleSave = async () => {
    if (!courseSelection.courseId || !courseSelection.semester || !courseSelection.topic) {
      toast.error('Course, semester and topic are required');
      return;
    }
    if (!question.questionText.trim()) {
      toast.error('Question text is required');
      return;
    }
    if (question.questionType === 'mcq') {
      if (question.options.some(opt => !opt.text.trim())) {
        toast.error('All MCQ options must have text');
        return;
      }
      if (!question.options.some(opt => opt.isCorrect)) {
        toast.error('At least one option must be marked as correct');
        return;
      }
    } else if (!question.correctAnswer.trim()) {
      toast.error('Correct answer is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...courseSelection,
        questionText: question.questionText,
        questionType: question.questionType,
        marks: parseInt(question.marks),
        options: question.questionType === 'mcq' ? question.options : undefined,
        correctAnswer: question.questionType !== 'mcq' ? question.correctAnswer : undefined
      };
      const response = await questionAPI.updateQuestion(id, payload);
      if (response.success) {
        toast.success('Question updated successfully!');
        navigate(`${basePath}/exam/question-bank`);
      } else {
        toast.error(response.message || 'Failed to update question');
      }
    } catch (error) {
      console.error('Update question error:', error);
      toast.error(error.response?.data?.message || 'Failed to update question');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-6 text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading question...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
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
            <h1 className="text-2xl font-bold text-gray-800">Edit Question</h1>
            <p className="text-gray-600">Update this question's content or classification</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <BookOpen className="text-green-600" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Course Selection</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                <select
                  name="courseId"
                  value={courseSelection.courseId}
                  onChange={handleCourseSelectionChange}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
                <select
                  name="semester"
                  value={courseSelection.semester}
                  onChange={handleCourseSelectionChange}
                  disabled={!courseSelection.courseId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Semester</option>
                  {Object.keys(topicsBySemester).map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic *</label>
                <select
                  name="topic"
                  value={courseSelection.topic}
                  onChange={handleCourseSelectionChange}
                  disabled={!courseSelection.semester}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Topic</option>
                  {topicsBySemester[courseSelection.semester]?.map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtopic</label>
                <select
                  name="subtopic"
                  value={courseSelection.subtopic}
                  onChange={handleCourseSelectionChange}
                  disabled={!courseSelection.topic}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">-- No specific subtopic (whole topic) --</option>
                  {availableTopics
                    .find(t => t.semester === courseSelection.semester && t.topic === courseSelection.topic)
                    ?.subtopics.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="text-blue-600" size={20} />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Question Details</h2>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text *</label>
                <textarea
                  name="questionText"
                  value={question.questionText}
                  onChange={handleQuestionChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Type *</label>
                  <select
                    name="questionType"
                    value={question.questionType}
                    onChange={handleQuestionChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="truefalse">True/False</option>
                    <option value="shortanswer">Short Answer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marks *</label>
                  <input
                    type="number"
                    name="marks"
                    value={question.marks}
                    onChange={handleQuestionChange}
                    min="1"
                    max="10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <CheckCircle className="text-purple-600" size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {question.questionType === 'mcq' ? 'MCQ Options' : 'Correct Answer'}
                  </h3>
                </div>

                {question.questionType === 'mcq' ? (
                  <div className="space-y-4">
                    {question.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700 w-8">{String.fromCharCode(65 + index)}.</span>
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleOptionChange(index, 'isCorrect', !option.isCorrect)}
                          className={`px-4 py-2 rounded-lg border ${
                            option.isCorrect ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-800 border-gray-300'
                          }`}
                        >
                          {option.isCorrect ? '✓ Correct' : 'Mark Correct'}
                        </button>
                        {question.options.length > 2 && (
                          <button type="button" onClick={() => removeOption(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                            <X size={20} />
                          </button>
                        )}
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
                  </div>
                ) : (
                  <textarea
                    name="correctAnswer"
                    value={question.correctAnswer}
                    onChange={handleQuestionChange}
                    rows="2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={question.questionType === 'truefalse' ? 'Enter "True" or "False"' : 'Enter the correct answer'}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditQuestion;