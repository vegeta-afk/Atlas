import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, Calendar, Users, Clock, BookOpen,
  Edit2, Trash2, Eye, Play, StopCircle, MoreVertical,
  CheckCircle, XCircle, AlertCircle, BarChart
} from 'lucide-react';
import { testAPI, examCourseAPI } from '../../../services/examAPI';
import toast from 'react-hot-toast';
import useBasePath from "../../../hooks/useBasePath";

const ManageTests = () => {
  const basePath = useBasePath();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    courseId: ''
  });
  const [totalPages, setTotalPages] = useState(1);
  const [courses, setCourses] = useState([]);

  // Load data
  useEffect(() => {
    loadCourses();
    loadTests();
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

  const loadTests = async () => {
    setLoading(true);
    try {
      const response = await testAPI.getTests(filters);
      if (response.success) {
        setTests(response.data);
        setTotalPages(response.totalPages);
      }
    } catch (error) {
      console.error('Load tests error:', error);
      toast.error('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadTests();
  };

  const deleteTest = async (testId, testName) => {
    if (!window.confirm(`Are you sure you want to delete test "${testName}"?`)) return;

    try {
      const response = await testAPI.deleteTest(testId);
      if (response.success) {
        toast.success('Test deleted successfully');
        loadTests();
      }
    } catch (error) {
      console.error('Delete test error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete test');
    }
  };

  const updateTestStatus = async (testId, newStatus) => {
    try {
      const response = await testAPI.updateTest(testId, { status: newStatus });
      if (response.success) {
        toast.success(`Test ${newStatus} successfully`);
        loadTests();
      }
    } catch (error) {
      console.error('Update test status error:', error);
      toast.error('Failed to update test status');
    }
  };

  // Status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: <AlertCircle size={14} /> },
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: <Calendar size={14} /> },
      active: { color: 'bg-green-100 text-green-800', icon: <Play size={14} /> },
      completed: { color: 'bg-purple-100 text-purple-800', icon: <CheckCircle size={14} /> },
      cancelled: { color: 'bg-red-100 text-red-800', icon: <XCircle size={14} /> }
    };

    const config = statusConfig[status] || statusConfig.draft;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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
              <h1 className="text-2xl font-bold text-gray-800">Manage Tests</h1>
              <p className="text-gray-600">View and manage all tests</p>
            </div>
          </div>
          
          <Link
            to={`${basePath}/exam/create-test`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Play size={20} />
            Create New Test
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Filter Tests</h2>
          <Filter className="text-gray-500" size={20} />
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Tests
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search test name..."
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
                    {course.courseFullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
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

      {/* Tests Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tests...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <BookOpen className="mx-auto text-gray-400 mb-3" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No tests found</h3>
          <p className="text-gray-500 mb-6">Create your first test to get started</p>
          <Link
            to={`${basePath}/exam/create-test`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Play size={20} />
            Create Test
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <div key={test._id} className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
              {/* Test Header */}
              <div className="p-6 border-b">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                      {test.testName}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <BookOpen size={14} />
                      <span>{test.courseId?.courseFullName || test.courseName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(test.status)}
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm line-clamp-2">
                  {test.description || 'No description provided'}
                </p>
              </div>

              {/* Test Details */}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Calendar size={14} />
                      <span>Scheduled</span>
                    </div>
                    <div className="font-medium text-gray-800">
                      {formatDate(test.scheduledDate)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {test.startTime} - {test.endTime}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Clock size={14} />
                      <span>Duration</span>
                    </div>
                    <div className="font-medium text-gray-800">
                      {test.duration} minutes
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Users size={14} />
                      <span>Questions</span>
                    </div>
                    <div className="font-medium text-gray-800">
                      {test.questionsPerStudent} / {test.totalQuestionsInPool}
                    </div>
                    <div className="text-xs text-gray-500">
                      Per student / In pool
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <BarChart size={14} />
                      <span>Attempts</span>
                    </div>
                    <div className="font-medium text-gray-800">
                      {test.totalAttempts || 0}
                    </div>
                    <div className="text-xs text-gray-500">
                      Average: {test.averageScore?.toFixed(1) || 0}%
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {/* Actions */}
<div className="flex items-center justify-between pt-4 border-t">
  <div className="flex items-center gap-2">
    {/* ✅ PREVIEW BUTTON - ADD THIS */}
    <Link
      to={`${basePath}/exam/test-preview/${test._id}`}
      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
      title="Preview Test"
    >
      <Eye size={18} />
    </Link>
    
    <Link
      to={`${basePath}/exam/results/${test._id}`}
      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
      title="View Results"
    >
      <BarChart size={18} />
    </Link>
    <Link
      to={`${basePath}/exam/edit-test/${test._id}`}
      className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
      title="Edit Test"
    >
      <Edit2 size={18} />
    </Link>
    <button
      onClick={() => deleteTest(test._id, test.testName)}
      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
      title="Delete Test"
    >
      <Trash2 size={18} />
    </button>
  </div>

  <div className="flex items-center gap-2">
    {test.status === 'draft' && (
      <button
        onClick={() => updateTestStatus(test._id, 'scheduled')}
        className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
      >
        Schedule
      </button>
    )}
    {test.status === 'scheduled' && (
      <button
        onClick={() => updateTestStatus(test._id, 'active')}
        className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
      >
        Activate
      </button>
    )}
    {test.status === 'active' && (
      <button
        onClick={() => updateTestStatus(test._id, 'completed')}
        className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
      >
        Complete
      </button>
    )}
  </div>
</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white px-6 py-4 rounded-lg shadow">
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
      )}
    </div>
  );
};

export default ManageTests;