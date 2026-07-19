import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  BookOpen,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  X,
  Clock,
  Users,
  FileText,
  Hash,
  GraduationCap,
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { testAPI, examCourseAPI, questionAPI } from '../../../services/examAPI';
import { setupAPI, facultyAPI } from '../../../services/api';
import useBasePath from '../../../hooks/useBasePath';

const CreateTest = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseTopics, setCourseTopics] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState(0);
  const [batchList, setBatchList] = useState([]);
  const basePath = useBasePath();

  // ── Exam mode + Regular-mode state ──
  const [examMode, setExamMode] = useState('semester'); // 'semester' | 'regular'
  const [facultyList, setFacultyList] = useState([]);
  const [facultyBatches, setFacultyBatches] = useState([]);
  const [regularCourses, setRegularCourses] = useState([]); // courses available in selected faculty+batch, with student counts
  const [regularTopics, setRegularTopics] = useState([]);
  const [loadingRegularTopics, setLoadingRegularTopics] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    examMode: 'semester',
    testName: '',
    description: '',
    courseId: '',
    facultyId: '',
    selectedCourseIds: [], // regular mode — which course(s) this exam targets
    selectedSemesters: [],
    selectedTopics: [],
    totalQuestionsInPool: '',
    questionsPerStudent: '',
    duration: '',
    maxMarks: '',
    scheduledDate: '',
    startTime: '09:00',
    endTime: '17:00',
    shuffleQuestions: true,
    shuffleOptions: true,
    allowMultipleAttempts: false,
    batchId: ''
  });

  // Load courses + batches + faculty on mount
  useEffect(() => {
    loadCourses();
    fetchBatches();
    loadFacultyList();
  }, []);

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

  const loadFacultyList = async () => {
    try {
      const response = await facultyAPI.getFaculty({ status: 'active', limit: 200 });
      if (response.data.success) {
        setFacultyList(response.data.data || []);
      }
    } catch (error) {
      console.error('Load faculty error:', error);
      toast.error('Failed to load faculty list');
    }
  };

  const loadFacultyBatches = async (facultyId) => {
    try {
      const response = await facultyAPI.getFacultyBatches(facultyId, { includeEmpty: 'true' });
      if (response.data.success) {
        setFacultyBatches(response.data.data.batches || []);
      } else {
        setFacultyBatches([]);
      }
    } catch (error) {
      console.error('Load faculty batches error:', error);
      toast.error(error.response?.data?.message || 'Failed to load batches for this faculty');
      setFacultyBatches([]);
    }
  };

  // ── Step 1 (Regular mode): load courses in this faculty+batch, with student counts ──
  const loadRegularCourses = async (facultyId, batchId) => {
    try {
      const response = await testAPI.getRegularCourses(facultyId, batchId);
      if (response.success) {
        setRegularCourses(response.data.courses || []);
      } else {
        setRegularCourses([]);
        toast.error(response.message || 'Failed to load courses for this batch');
      }
    } catch (error) {
      console.error('Load regular courses error:', error);
      setRegularCourses([]);
      toast.error(error.response?.data?.message || 'Failed to load courses for this batch');
    }
  };

  // ── Step 2 (Regular mode): load deduplicated taught topics for SELECTED course(s) ──
  const loadRegularTopics = async (facultyId, batchId, courseIds) => {
    setLoadingRegularTopics(true);
    try {
      const response = await testAPI.getRegularTopics(facultyId, batchId, courseIds);
      if (response.success) {
        const topics = response.data.topics || [];
        setRegularTopics(topics);
        setFormData(prev => ({
          ...prev,
          selectedTopics: topics.map(t => t.name)
        }));
      } else {
        toast.error(response.message || 'Failed to load topics');
        setRegularTopics([]);
      }
    } catch (error) {
      console.error('Load regular topics error:', error);
      toast.error(error.response?.data?.message || 'Failed to load topics for this selection');
      setRegularTopics([]);
    } finally {
      setLoadingRegularTopics(false);
    }
  };

  // Load course topics when course is selected (Semester mode)
  useEffect(() => {
    if (examMode === 'semester' && formData.courseId) {
      loadCourseTopics(formData.courseId);
      const course = courses.find(c => c._id === formData.courseId);
      setSelectedCourse(course);
    }
  }, [examMode, formData.courseId, courses]);

  // Regular mode: faculty + batch selected → load courses in that batch
  useEffect(() => {
    if (examMode === 'regular' && formData.facultyId && formData.batchId) {
      loadRegularCourses(formData.facultyId, formData.batchId);
      setFormData(prev => ({ ...prev, selectedCourseIds: [], selectedTopics: [] }));
      setRegularTopics([]);
    }
  }, [examMode, formData.facultyId, formData.batchId]);

  // Regular mode: course(s) selected → load their deduplicated taught topics
  useEffect(() => {
    if (examMode === 'regular' && formData.facultyId && formData.batchId && formData.selectedCourseIds.length > 0) {
      loadRegularTopics(formData.facultyId, formData.batchId, formData.selectedCourseIds);
    } else if (examMode === 'regular' && formData.selectedCourseIds.length === 0) {
      setRegularTopics([]);
      setFormData(prev => ({ ...prev, selectedTopics: [] }));
    }
  }, [examMode, formData.selectedCourseIds]);

  const loadCourseTopics = async (courseId) => {
    try {
      const response = await questionAPI.getCourseTopics(courseId);

      if (response.success) {
        const course = response.data;
        const syllabus = course.syllabus || course.syllabusData || course.data?.syllabus || [];
        const topics = [];

        if (Array.isArray(syllabus)) {
          syllabus.forEach((semester, index) => {
            if (semester && semester.topics && Array.isArray(semester.topics)) {
              semester.topics.forEach(topic => {
                if (topic && topic.name) {
                  topics.push({
                    semester: semester.name || `Semester ${index + 1}`,
                    topic: topic.name,
                    subtopics: topic.subtopics ? topic.subtopics.map(st => st.name) : []
                  });
                }
              });
            }
          });
        }

        setCourseTopics(topics);

        const semesters = [...new Set(topics.map(t => t.semester))];
        const topicNames = topics.map(t => t.topic).filter(t => t);

        setFormData(prev => ({
          ...prev,
          selectedSemesters: semesters,
          selectedTopics: topicNames
        }));
      } else {
        toast.error('Failed to load course structure');
      }
    } catch (error) {
      console.error('Load course topics error:', error);
      toast.error('Failed to load course topics: ' + (error.response?.data?.message || error.message));
    }
  };

  // ── Auto-calculate available questions & LOCK totalQuestionsInPool to that number ──
  const calculateAvailableQuestions = async () => {
    try {
      const response = await testAPI.getAvailableQuestions({
        courseId: formData.courseId,
        semesters: formData.selectedSemesters.join(','),
        topics: formData.selectedTopics.join(',')
      });
      if (response.success) {
        const count = response.data.availableQuestions;
        setAvailableQuestions(count);
        setFormData(prev => ({ ...prev, totalQuestionsInPool: String(count) }));
      }
    } catch (error) {
      console.error('Calculate available questions error:', error);
    }
  };

  const calculateRegularAvailableQuestions = async () => {
    try {
      const response = await testAPI.getAvailableQuestions({
        courseIds: formData.selectedCourseIds.join(','),
        topics: formData.selectedTopics.join(',')
      });
      if (response.success) {
        const count = response.data.availableQuestions;
        setAvailableQuestions(count);
        setFormData(prev => ({ ...prev, totalQuestionsInPool: String(count) }));
      }
    } catch (error) {
      console.error('Calculate regular available questions error:', error);
    }
  };

  useEffect(() => {
    if (examMode === 'semester' && formData.courseId && formData.selectedSemesters.length > 0 && formData.selectedTopics.length > 0) {
      calculateAvailableQuestions();
    }
  }, [examMode, formData.courseId, formData.selectedSemesters, formData.selectedTopics]);

  useEffect(() => {
    if (examMode === 'regular' && formData.selectedCourseIds.length > 0 && formData.selectedTopics.length > 0) {
      calculateRegularAvailableQuestions();
    }
  }, [examMode, formData.selectedCourseIds, formData.selectedTopics]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // ── Mode toggle ──
  const handleModeToggle = (mode) => {
    setExamMode(mode);
    setFormData(prev => ({
      ...prev,
      examMode: mode,
      courseId: '',
      facultyId: '',
      batchId: '',
      selectedCourseIds: [],
      selectedSemesters: [],
      selectedTopics: []
    }));
    setCourseTopics([]);
    setRegularTopics([]);
    setRegularCourses([]);
    setFacultyBatches([]);
    setSelectedCourse(null);
    setAvailableQuestions(0);
  };

  // ── Faculty change (Regular mode) ──
  const handleFacultyChange = (e) => {
    const facultyId = e.target.value;
    setFormData(prev => ({ ...prev, facultyId, batchId: '', selectedCourseIds: [], selectedTopics: [] }));
    setRegularTopics([]);
    setRegularCourses([]);
    setFacultyBatches([]);
    if (facultyId) loadFacultyBatches(facultyId);
  };

  // ── Course multi-select (ctrl/cmd-click for multiple) — Regular mode ──
  const handleCourseMultiSelect = (e) => {
    const selected = Array.from(e.target.selectedOptions).map(o => o.value);
    setFormData(prev => ({ ...prev, selectedCourseIds: selected, selectedTopics: [] }));
  };

  const handleSemesterToggle = (semester) => {
    setFormData(prev => {
      const isSelected = prev.selectedSemesters.includes(semester);
      const newSemesters = isSelected
        ? prev.selectedSemesters.filter(s => s !== semester)
        : [...prev.selectedSemesters, semester];
      return { ...prev, selectedSemesters: newSemesters };
    });
  };

  const handleTopicToggle = (topic) => {
    setFormData(prev => {
      const isSelected = prev.selectedTopics.includes(topic);
      const newTopics = isSelected
        ? prev.selectedTopics.filter(t => t !== topic)
        : [...prev.selectedTopics, topic];
      return { ...prev, selectedTopics: newTopics };
    });
  };

  const selectAllSemesters = () => {
    const allSemesters = [...new Set(courseTopics.map(t => t.semester))];
    setFormData(prev => ({ ...prev, selectedSemesters: allSemesters }));
  };

  const selectAllTopics = () => {
    const allTopics = courseTopics.map(t => t.topic);
    setFormData(prev => ({ ...prev, selectedTopics: allTopics }));
  };

  const selectAllRegularTopics = () => {
    setFormData(prev => ({ ...prev, selectedTopics: regularTopics.map(t => t.name) }));
  };

  const clearAllRegularTopics = () => {
    setFormData(prev => ({ ...prev, selectedTopics: [] }));
  };

  const validateForm = () => {
    return true;
  };

  const fetchBatches = async () => {
    try {
      const response = await setupAPI.getAll();
      if (response.data.success) {
        setBatchList(response.data.data.batches || []);
      }
    } catch (err) {
      console.error("Error fetching batches:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (examMode === 'regular') {
      if (!formData.facultyId || !formData.batchId) {
        toast.error('Please select a faculty and batch for Regular exam');
        return;
      }
      if (formData.selectedCourseIds.length === 0) {
        toast.error('Please select at least one course for Regular exam');
        return;
      }
      if (formData.selectedTopics.length === 0) {
        toast.error('Please select at least one topic');
        return;
      }
    }
    if (examMode === 'semester' && !formData.courseId) {
      toast.error('Please select a course for Semester exam');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        totalQuestionsInPool: parseInt(formData.totalQuestionsInPool),
        questionsPerStudent: parseInt(formData.questionsPerStudent),
        duration: parseInt(formData.duration),
        maxMarks: formData.maxMarks ? parseInt(formData.maxMarks) : 100,
        scheduledDate: new Date(formData.scheduledDate).toISOString()
      };

      if (!submitData.batchId || submitData.batchId.toString().trim() === '') {
        delete submitData.batchId;
      }

      const response = await testAPI.createTest(submitData);

      if (response.success) {
        toast.success('Test created successfully!');
        navigate(`${basePath}/exam/manage-tests`);
      } else {
        toast.error(response.message || 'Failed to create test');
      }
    } catch (error) {
      console.error('Create test error:', error);
      toast.error(error.response?.data?.message || 'Failed to create test');
    } finally {
      setLoading(false);
    }
  };

  // Group topics by semester (Semester mode)
  const topicsBySemester = {};
  courseTopics.forEach(topic => {
    if (!topicsBySemester[topic.semester]) {
      topicsBySemester[topic.semester] = [];
    }
    topicsBySemester[topic.semester].push(topic);
  });

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
            <h1 className="text-2xl font-bold text-gray-800">Create New Test</h1>
            <p className="text-gray-600">Create a new online test with randomized questions</p>
          </div>
        </div>
      </div>

      {/* Exam Mode Toggle — Regular first, then Semester */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-3">
          <GraduationCap className="text-gray-500" size={20} />
          <span className="text-sm font-medium text-gray-700">Exam Type:</span>
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => handleModeToggle('regular')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                examMode === 'regular'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Regular
            </button>
            <button
              type="button"
              onClick={() => handleModeToggle('semester')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                examMode === 'semester'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Semester
            </button>
          </div>
          <span className="text-xs text-gray-500 ml-2">
            {examMode === 'semester'
              ? 'Course-based exam, topics grouped by semester'
              : 'Faculty/batch/course-based exam, topics actually taught so far'}
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Two Cards Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Card 1: Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="text-blue-600" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                Test Information
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Name *
                </label>
                <input
                  type="text"
                  name="testName"
                  value={formData.testName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Mid-Term Examination"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Test description and instructions..."
                />
              </div>

              {/* ── SEMESTER MODE: Course dropdown ── */}
              {examMode === 'semester' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Course *
                    </label>
                    <select
                      name="courseId"
                      value={formData.courseId}
                      onChange={handleChange}
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

                  {selectedCourse && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-blue-800">
                        <BookOpen size={16} />
                        <span className="font-medium">{selectedCourse.courseFullName}</span>
                        <span className="text-blue-600">•</span>
                        <span>{selectedCourse.duration}</span>
                        <span className="text-blue-600">•</span>
                        <span>{selectedCourse.totalSemesters} semesters</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign to Batch (Optional)
                    </label>
                    <select
                      name="batchId"
                      value={formData.batchId}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Batches (No restriction)</option>
                      {batchList.map(batch => (
                        <option key={batch._id} value={batch._id}>
                          {batch.batchName} ({batch.displayName})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Only students of selected batch will see this exam
                    </p>
                  </div>
                </>
              )}

              {/* ── REGULAR MODE: Faculty → Batch → Course(s) ── */}
              {examMode === 'regular' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Faculty *
                    </label>
                    <select
                      name="facultyId"
                      value={formData.facultyId}
                      onChange={handleFacultyChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Faculty</option>
                      {facultyList.map(f => (
                        <option key={f._id} value={f._id}>
                          {f.facultyName} ({f.facultyNo})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Only students assigned to this faculty will see this exam
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Batch *
                    </label>
                    <select
                      name="batchId"
                      value={formData.batchId}
                      onChange={handleChange}
                      required
                      disabled={!formData.facultyId}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">
                        {formData.facultyId ? 'Select Batch' : 'Select a faculty first'}
                      </option>
                      {facultyBatches.map(batch => (
                        <option key={batch.batchId || batch._id} value={batch.batchId || batch._id}>
                          {batch.displayName || batch.name} ({batch.totalStudents} students)
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.batchId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Course(s) * <span className="text-xs font-normal text-gray-500">(hold Ctrl / Cmd to select multiple)</span>
                      </label>
                      <select
                        multiple
                        value={formData.selectedCourseIds}
                        onChange={handleCourseMultiSelect}
                        required
                        size={Math.min(6, Math.max(3, regularCourses.length || 3))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {regularCourses.map(c => (
                          <option key={c.courseId} value={c.courseId}>
                            {c.courseName} ({c.studentCount} student{c.studentCount !== 1 ? 's' : ''})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        This batch has students from multiple courses mixed together — only students enrolled
                        in the selected course(s) will see this exam.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Card 2: Test Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="p-2 bg-green-50 rounded-lg">
                <Clock className="text-green-600" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                Test Configuration
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                    Total Questions in Pool *
                    <Lock size={12} className="text-gray-400" />
                  </label>
                  <input
                    type="number"
                    name="totalQuestionsInPool"
                    value={formData.totalQuestionsInPool}
                    readOnly
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                    placeholder="Auto-calculated from selected topics"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-calculated from selected topics — not editable
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Questions Per Student *
                  </label>
                  <input
                    type="number"
                    name="questionsPerStudent"
                    value={formData.questionsPerStudent}
                    onChange={handleChange}
                    min="1"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 20"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Each student gets random subset
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    min="1"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Marks
                  </label>
                  <input
                    type="number"
                    name="maxMarks"
                    value={formData.maxMarks}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Date *
                </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {availableQuestions > 0 && (
                <div className={`p-3 rounded-lg ${availableQuestions >= formData.totalQuestionsInPool ? 'bg-green-50' : 'bg-yellow-50'}`}>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className={availableQuestions >= formData.totalQuestionsInPool ? 'text-green-600' : 'text-yellow-600'} />
                    <span className={`text-sm font-medium ${availableQuestions >= formData.totalQuestionsInPool ? 'text-green-800' : 'text-yellow-800'}`}>
                      {availableQuestions} questions available from selected topics
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Topic Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <BookOpen className="text-purple-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Select Topics for Test
                </h2>
                <p className="text-sm text-gray-600">
                  Questions will be randomly selected from these topics
                </p>
              </div>
            </div>

            {examMode === 'semester' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllSemesters}
                  className="px-3 py-1.5 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200"
                >
                  Select All Semesters
                </button>
                <button
                  type="button"
                  onClick={selectAllTopics}
                  className="px-3 py-1.5 text-sm bg-green-100 text-green-800 rounded-lg hover:bg-green-200"
                >
                  Select All Topics
                </button>
              </div>
            ) : (
              regularTopics.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllRegularTopics}
                    className="px-3 py-1.5 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearAllRegularTopics}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
                  >
                    Clear All
                  </button>
                </div>
              )
            )}
          </div>

          {/* ── SEMESTER MODE topic UI ── */}
          {examMode === 'semester' && (
            formData.courseId ? (
              <div className="space-y-6">
                {Object.keys(topicsBySemester).map(semester => (
                  <div key={semester} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className={`p-4 border-b ${formData.selectedSemesters.includes(semester) ? 'bg-blue-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={formData.selectedSemesters.includes(semester)}
                            onChange={() => handleSemesterToggle(semester)}
                            className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="font-medium text-gray-800">{semester}</span>
                          <span className="text-sm text-gray-500">
                            ({topicsBySemester[semester].length} topics)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            formData.selectedSemesters.includes(semester)
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {formData.selectedTopics.filter(t =>
                              topicsBySemester[semester].some(st => st.topic === t)
                            ).length} selected
                          </span>
                        </div>
                      </div>
                    </div>

                    {formData.selectedSemesters.includes(semester) && (
                      <div className="p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {topicsBySemester[semester].map((topicData, index) => (
                            <div
                              key={`${semester}-${topicData.topic}`}
                              className={`flex items-start p-3 rounded-lg border ${
                                formData.selectedTopics.includes(topicData.topic)
                                  ? 'border-blue-300 bg-blue-50'
                                  : 'border-gray-200 bg-white'
                              }`}
                            >
                              <input
                                type="checkbox"
                                id={`topic-${semester}-${index}`}
                                checked={formData.selectedTopics.includes(topicData.topic)}
                                onChange={() => handleTopicToggle(topicData.topic)}
                                className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor={`topic-${semester}-${index}`} className="ml-3 flex-1">
                                <span className="font-medium text-gray-800">{topicData.topic}</span>
                                {topicData.subtopics && topicData.subtopics.length > 0 && (
                                  <ul className="mt-1 space-y-0.5">
                                    {topicData.subtopics.map((st, si) => (
                                      <li key={si} className="text-xs text-gray-500 flex items-start gap-1">
                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                                        <span>{st}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="mx-auto text-gray-400 mb-3" size={40} />
                <p className="text-gray-500">Select a course to view topics</p>
              </div>
            )
          )}

          {/* ── REGULAR MODE topic UI (flat, deduplicated, with subtopics) ── */}
          {examMode === 'regular' && (
            <>
              {!formData.facultyId || !formData.batchId || formData.selectedCourseIds.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto text-gray-400 mb-3" size={40} />
                  <p className="text-gray-500">Select a faculty, batch, and course(s) to view topics</p>
                </div>
              ) : loadingRegularTopics ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-3 text-gray-500 text-sm">Loading topics already taught for this selection...</p>
                </div>
              ) : regularTopics.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto text-yellow-400 mb-3" size={40} />
                  <p className="text-gray-500">No taught topics found for this selection yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {regularTopics.map((topicData, index) => (
                    <div
                      key={topicData.name}
                      className={`flex items-start p-3 rounded-lg border ${
                        formData.selectedTopics.includes(topicData.name)
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        id={`regular-topic-${index}`}
                        checked={formData.selectedTopics.includes(topicData.name)}
                        onChange={() => handleTopicToggle(topicData.name)}
                        className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor={`regular-topic-${index}`} className="ml-3 flex-1">
                        <span className="font-medium text-gray-800">{topicData.name}</span>
                        {topicData.subtopics && topicData.subtopics.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {topicData.subtopics.map((st, si) => (
                              <li key={si} className="text-xs text-gray-500 flex items-start gap-1">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                                <span>{st}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Selection Summary */}
          {formData.selectedTopics.length > 0 && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Check className="text-green-600" size={20} />
                <div>
                  <p className="font-medium text-green-800">
                    {examMode === 'semester'
                      ? `Selected ${formData.selectedTopics.length} topics from ${formData.selectedSemesters.length} semesters`
                      : `Selected ${formData.selectedTopics.length} topics (deduplicated across ${formData.selectedCourseIds.length} course(s))`}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    Each student will get {formData.questionsPerStudent || 'N/A'} random questions from a pool of {formData.totalQuestionsInPool || 'N/A'} questions
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 4: Test Settings */}
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
                  <p className="text-gray-500 text-xs mt-1">
                    Each student gets questions in different order
                  </p>
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
                  <p className="text-gray-500 text-xs mt-1">
                    Multiple choice options appear in random order
                  </p>
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
                  <p className="text-gray-500 text-xs mt-1">
                    Students can retake the test
                  </p>
                </label>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <Users size={16} />
                  <span className="font-medium">Anti-Cheating Features:</span>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-blue-600">
                  <li className="flex items-center gap-2">
                    <Check size={12} />
                    <span>Unique question sets for each student</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={12} />
                    <span>Randomized question order</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={12} />
                    <span>Randomized MCQ options</span>
                  </li>
                </ul>
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
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={20} />
              {loading ? 'Creating Test...' : 'Create Test & Generate Questions'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateTest;