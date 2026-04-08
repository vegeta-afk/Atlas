import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Filter, Edit2, Trash2, BookOpen, 
  CheckCircle, XCircle, Clock, Hash, Eye, BarChart3, FileText,
  Loader
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { questionAPI, examCourseAPI } from '../../../services/examAPI';
import useBasePath from "../../../hooks/useBasePath";

const QuestionBank = () => {
  const basePath = useBasePath();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    courseId: '',
    semester: '',
    topic: '',
    questionType: '',
    isActive: 'true'
  });
  const [totalPages, setTotalPages] = useState(1);
  const [courses, setCourses] = useState([]);
  const [availableFilters, setAvailableFilters] = useState({
    semesters: [],
    topics: []
  });
  
  // Summary statistics
  const [summary, setSummary] = useState({
    totalQuestions: 0,
    totalMarks: 0
  });

  // Load data
  useEffect(() => {
    loadCourses();
  }, []);

  // Separate effect for questions with loading state
  useEffect(() => {
    loadQuestions();
  }, [filters]);

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

  const loadQuestions = async () => {
    setLoading(true);
    setStatsLoading(true);
    try {
      const response = await questionAPI.getQuestions(filters);
      if (response.success) {
        setQuestions(response.data);
        setTotalPages(response.totalPages);
        
        // Calculate total questions and marks
        const totalQ = response.data.length;
        const totalM = response.data.reduce((sum, q) => sum + (q.marks || 0), 0);
        
        setSummary({
          totalQuestions: totalQ,
          totalMarks: totalM
        });
        
        if (response.filters) {
          setAvailableFilters({
            semesters: response.filters.semesters || [],
            topics: response.filters.topics || []
          });
        }
      }
    } catch (error) {
      console.error('Load questions error:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
      // Small delay to make stats transition smooth
      setTimeout(() => setStatsLoading(false), 300);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadQuestions();
  };

  const deleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      const response = await questionAPI.deleteQuestion(questionId);
      if (response.success) {
        toast.success('Question deleted successfully');
        loadQuestions();
      }
    } catch (error) {
      console.error('Delete question error:', error);
      toast.error('Failed to delete question');
    }
  };

  const toggleStatus = async (questionId, currentStatus) => {
    try {
      const response = await questionAPI.updateQuestion(questionId, {
        isActive: !currentStatus
      });
      if (response.success) {
        toast.success(`Question ${!currentStatus ? 'activated' : 'deactivated'}`);
        loadQuestions();
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      toast.error('Failed to update question status');
    }
  };

  // Question type badge
  const getTypeBadge = (type) => {
    const colors = {
      mcq: 'bg-blue-100 text-blue-800',
      truefalse: 'bg-purple-100 text-purple-800',
      shortanswer: 'bg-orange-100 text-orange-800'
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[type] || 'bg-gray-100'}`}>
        {type === 'mcq' ? 'MCQ' : type === 'truefalse' ? 'True/False' : 'Short Answer'}
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="text-blue-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Question Bank</h1>
              <p className="text-gray-600">Manage your question database</p>
            </div>
          </div>
          
          <Link
            to={`${basePath}/exam/question-bank/add`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Question
          </Link>
        </div>
      </div>

      {/* Summary Stats Card - Always visible with smooth transitions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-100 transition-opacity duration-300 ${statsLoading ? 'opacity-50' : 'opacity-100'}`}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="text-blue-600" size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 font-medium">Total Questions</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold text-gray-800">
                  {statsLoading ? (
                    <span className="inline-block w-12 h-8 bg-blue-200 rounded animate-pulse"></span>
                  ) : (
                    summary.totalQuestions
                  )}
                </p>
                <span className="text-xs text-gray-500">on current page</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className={`bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow p-6 border border-green-100 transition-opacity duration-300 ${statsLoading ? 'opacity-50' : 'opacity-100'}`}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <BarChart3 className="text-green-600" size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 font-medium">Total Marks</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold text-gray-800">
                  {statsLoading ? (
                    <span className="inline-block w-12 h-8 bg-green-200 rounded animate-pulse"></span>
                  ) : (
                    summary.totalMarks
                  )}
                </p>
                <span className="text-xs text-gray-500">combined value</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
          <Filter className="text-gray-500" size={20} />
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Questions
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search question text..."
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>

            {/* Course */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course
              </label>
              <select
                value={filters.courseId}
                onChange={(e) => handleFilterChange('courseId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Courses</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>
                    {course.courseShortName}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semester
              </label>
              <select
                value={filters.semester}
                onChange={(e) => handleFilterChange('semester', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Semesters</option>
                {availableFilters.semesters.map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <select
                value={filters.topic}
                onChange={(e) => handleFilterChange('topic', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Topics</option>
                {availableFilters.topics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Question Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Type
              </label>
              <select
                value={filters.questionType}
                onChange={(e) => handleFilterChange('questionType', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="mcq">MCQ</option>
                <option value="truefalse">True/False</option>
                <option value="shortanswer">Short Answer</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
                <option value="">All</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {/* Questions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto text-gray-400 mb-3" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No questions found</h3>
            <p className="text-gray-500">Try changing your filters or add new questions</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course & Topic
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marks & Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {questions.map((question) => (
                    <tr key={question._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium line-clamp-2">
                          {question.questionText}
                        </div>
                        <div className="mt-1 flex items-center text-xs text-gray-500">
                          <Clock size={12} className="mr-1" />
                          {new Date(question.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {question.courseId?.courseShortName || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {question.semester} • {question.topic}
                        </div>
                        {question.subtopic && (
                          <div className="text-xs text-gray-400">
                            {question.subtopic}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        {getTypeBadge(question.questionType)}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Hash size={14} className="text-gray-400" />
                            <span className="font-medium">{question.marks}</span>
                            <span className="text-gray-500 text-sm">marks</span>
                          </div>
                          <div className="h-4 w-px bg-gray-300"></div>
                          <div className="flex items-center gap-1">
                            <Eye size={14} className="text-gray-400" />
                            <span className="text-gray-600 text-sm">
                              Used {question.timesUsed || 0} times
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleStatus(question._id, question.isActive)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                            question.isActive
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {question.isActive ? (
                            <>
                              <CheckCircle size={14} />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle size={14} />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {/* View details */}}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="View"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => {/* Edit */}}
                            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => deleteQuestion(question._id)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {filters.page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFilterChange('page', filters.page - 1)}
                      disabled={filters.page <= 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handleFilterChange('page', filters.page + 1)}
                      disabled={filters.page >= totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default QuestionBank;