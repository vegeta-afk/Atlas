import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  BookOpen,
  AlertCircle,
  Check,
  Clock,
  Users,
  FileText,
  Lock,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { testAPI } from '../../../services/examAPI';
import useBasePath from '../../../hooks/useBasePath';

const EditTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const basePath = useBasePath();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState(null);

  const [formData, setFormData] = useState({
    testName: '',
    description: '',
    questionsPerStudent: '',
    duration: '',
    maxMarks: '',
    scheduledDate: '',
    startTime: '09:00',
    endTime: '17:00',
    shuffleQuestions: true,
    shuffleOptions: true,
    allowMultipleAttempts: false,
    status: 'draft'
  });

  useEffect(() => {
    loadTest();
  }, [testId]);

  const loadTest = async () => {
    setLoading(true);
    try {
      const response = await testAPI.getTest(testId);
      if (response.success) {
        const t = response.data;
        setTest(t);
        setFormData({
          testName: t.testName || '',
          description: t.description || '',
          questionsPerStudent: t.questionsPerStudent || '',
          duration: t.duration || '',
          maxMarks: t.maxMarks || '',
          scheduledDate: t.scheduledDate ? t.scheduledDate.slice(0, 10) : '',
          startTime: t.startTime || '09:00',
          endTime: t.endTime || '17:00',
          shuffleQuestions: t.shuffleQuestions !== false,
          shuffleOptions: t.shuffleOptions !== false,
          allowMultipleAttempts: !!t.allowMultipleAttempts,
          status: t.status || 'draft'
        });
      } else {
        toast.error('Failed to load test');
      }
    } catch (error) {
      console.error('Load test error:', error);
      toast.error(error.response?.data?.message || 'Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // ── 12-hour time picker helpers (storage stays 24-hour "HH:mm") ──
  const to12Hour = (time24) => {
    if (!time24) return { hour: '09', minute: '00', period: 'AM' };
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour: String(hour12).padStart(2, '0'), minute: String(m).padStart(2, '0'), period };
  };

  const to24Hour = (hour12, minute, period) => {
    let h = parseInt(hour12, 10);
    if (period === 'AM') { if (h === 12) h = 0; } else { if (h !== 12) h += 12; }
    return `${String(h).padStart(2, '0')}:${minute}`;
  };

  const handleTimeChange = (field, part, value) => {
    const current = to12Hour(formData[field]);
    const updated = { ...current, [part]: value };
    setFormData(prev => ({ ...prev, [field]: to24Hour(updated.hour, updated.minute, updated.period) }));
  };

  const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const MINUTE_OPTIONS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (Number(formData.questionsPerStudent) > Number(test.totalQuestionsInPool)) {
      toast.error(`Questions per student cannot exceed the pool size (${test.totalQuestionsInPool})`);
      return;
    }

    setSaving(true);
    try {
      const submitData = {
        testName: formData.testName,
        description: formData.description,
        questionsPerStudent: parseInt(formData.questionsPerStudent),
        duration: parseInt(formData.duration),
        maxMarks: parseInt(formData.maxMarks),
        scheduledDate: new Date(formData.scheduledDate).toISOString(),
        startTime: formData.startTime,
        endTime: formData.endTime,
        shuffleQuestions: formData.shuffleQuestions,
        shuffleOptions: formData.shuffleOptions,
        allowMultipleAttempts: formData.allowMultipleAttempts,
        status: formData.status
      };

      const response = await testAPI.updateTest(testId, submitData);
      if (response.success) {
        toast.success('Test updated successfully!');
        navigate(`${basePath}/exam/manage-tests`);
      } else {
        toast.error(response.message || 'Failed to update test');
      }
    } catch (error) {
      console.error('Update test error:', error);
      toast.error(error.response?.data?.message || 'Failed to update test');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading test...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="p-6 text-center py-20">
        <AlertCircle className="mx-auto text-red-400 mb-3" size={48} />
        <p className="text-gray-600">Test not found</p>
        <button
          onClick={() => navigate(`${basePath}/exam/manage-tests`)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Back to Tests
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`${basePath}/exam/manage-tests`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Tests
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Edit Test</h1>
            <p className="text-gray-600">Update test details, schedule, and settings</p>
          </div>
        </div>
      </div>

      {/* Locked context banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Info className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Course, topics, and question pool can't be changed here</p>
          <p className="text-amber-700 mt-1">
            This test's question pool was generated from the topics selected at creation. Changing course/topic
            selection here wouldn't update the actual questions students receive, so those fields are locked.
            To change topics or course targeting, delete this test and create a new one.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Card 1: Test Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="text-blue-600" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Test Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Name *</label>
              <input
                type="text"
                name="testName"
                value={formData.testName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Mode</label>
                <input
                  type="text"
                  readOnly
                  value={test.examMode === 'regular' ? 'Regular' : 'Semester'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed capitalize"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <input
                  type="text"
                  readOnly
                  value={test.courseId?.courseFullName || test.courseName || '—'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selected Topics</label>
              <div className="flex flex-wrap gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                {(test.selectedTopics || []).map((topic, i) => (
                  <span key={i} className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Test Configuration */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="p-2 bg-green-50 rounded-lg">
              <Clock className="text-green-600" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Test Configuration</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                  Total Questions in Pool
                  <Lock size={12} className="text-gray-400" />
                </label>
                <input
                  type="number"
                  readOnly
                  value={test.totalQuestionsInPool}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Fixed at creation — not editable</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Questions Per Student *</label>
                <input
                  type="number"
                  name="questionsPerStudent"
                  value={formData.questionsPerStudent}
                  onChange={handleChange}
                  min="1"
                  max={test.totalQuestionsInPool}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks *</label>
                <input
                  type="number"
                  name="maxMarks"
                  value={formData.maxMarks}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date *</label>
              <input
                type="date"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <div className="flex gap-2">
                  <select
                    value={to12Hour(formData.startTime).hour}
                    onChange={(e) => handleTimeChange('startTime', 'hour', e.target.value)}
                    className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <select
                    value={to12Hour(formData.startTime).minute}
                    onChange={(e) => handleTimeChange('startTime', 'minute', e.target.value)}
                    className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MINUTE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select
                    value={to12Hour(formData.startTime).period}
                    onChange={(e) => handleTimeChange('startTime', 'period', e.target.value)}
                    className="px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <div className="flex gap-2">
                  <select
                    value={to12Hour(formData.endTime).hour}
                    onChange={(e) => handleTimeChange('endTime', 'hour', e.target.value)}
                    className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <select
                    value={to12Hour(formData.endTime).minute}
                    onChange={(e) => handleTimeChange('endTime', 'minute', e.target.value)}
                    className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MINUTE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select
                    value={to12Hour(formData.endTime).period}
                    onChange={(e) => handleTimeChange('endTime', 'period', e.target.value)}
                    className="px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 3: Test Settings */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="p-2 bg-orange-50 rounded-lg">
              <AlertCircle className="text-orange-600" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Test Settings</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="shuffleQuestions"
                  name="shuffleQuestions"
                  checked={formData.shuffleQuestions}
                  onChange={handleChange}
                  className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="shuffleQuestions" className="ml-3 text-sm text-gray-700">
                  <span className="font-medium">Shuffle Questions</span>
                  <p className="text-gray-500 text-xs mt-1">Each student gets questions in different order</p>
                </label>
              </div>

              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="shuffleOptions"
                  name="shuffleOptions"
                  checked={formData.shuffleOptions}
                  onChange={handleChange}
                  className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="shuffleOptions" className="ml-3 text-sm text-gray-700">
                  <span className="font-medium">Shuffle MCQ Options</span>
                  <p className="text-gray-500 text-xs mt-1">Multiple choice options appear in random order</p>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="allowMultipleAttempts"
                  name="allowMultipleAttempts"
                  checked={formData.allowMultipleAttempts}
                  onChange={handleChange}
                  className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="allowMultipleAttempts" className="ml-3 text-sm text-gray-700">
                  <span className="font-medium">Allow Multiple Attempts</span>
                  <p className="text-gray-500 text-xs mt-1">Students can retake the test</p>
                </label>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <Users size={16} />
                  <span className="font-medium">Attempt Stats</span>
                </div>
                <p className="mt-2 text-sm text-blue-700">
                  {test.totalAttempts || 0} total attempt{test.totalAttempts !== 1 ? 's' : ''} so far
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(`${basePath}/exam/manage-tests`)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={20} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditTest;