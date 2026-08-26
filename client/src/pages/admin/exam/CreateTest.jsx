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
  const basePath = useBasePath();

  // ── Exam mode + Regular-mode state ──
  const [examMode, setExamMode] = useState('regular'); // 'semester' | 'regular'
  const [facultyList, setFacultyList] = useState([]);
  const [facultyBatches, setFacultyBatches] = useState([]);
  const [regularCourses, setRegularCourses] = useState([]); // courses available in selected faculty+batch, with student counts
  const [regularTopics, setRegularTopics] = useState([]);
  const [loadingRegularTopics, setLoadingRegularTopics] = useState(false);
  const [courseStudents, setCourseStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    examMode: 'regular',
    testName: '',
    description: '',
    courseId: '',
    facultyId: '',
    batchIds: [], // multi-batch, both modes
    selectedCourseIds: [], // regular mode — which course(s) this exam targets
    selectedSemesters: [],
    selectedTopics: [],
    subtopicSelections: {}, // regular mode — { [topicName]: [selected subtopic names] }
    selectedStudentIds: [], // regular mode — explicit eligible student list
    totalQuestionsInPool: '',
    questionsPerStudent: '',
    duration: '',
    maxMarks: '',
    scheduledDate: '',
    startTime: '09:00',
    endTime: '17:00',
    shuffleQuestions: true,
    shuffleOptions: true,
    allowMultipleAttempts: false
  });

  // Load courses + batches + faculty on mount
  useEffect(() => {
    loadCourses();
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
      const response = await facultyAPI.getFacultyBatches(facultyId, { includeEmpty: 'false' });
      if (response.data.success) {
        const allBatches = response.data.data.batches || [];
        // Exam creation only wants active regular batches with actual students —
        // exclude bridge (temporary) batches entirely, and belt-and-suspenders
        // filter out any 0-student batch even if the backend ever sends one.
        const eligibleBatches = allBatches.filter(b => !b.isTemporary && b.totalStudents > 0);
        setFacultyBatches(eligibleBatches);
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
  const loadRegularCourses = async (facultyId, batchIds) => {
    try {
      const response = await testAPI.getRegularCourses(facultyId, batchIds);
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
  const loadRegularTopics = async (facultyId, batchIds, courseIds) => {
    setLoadingRegularTopics(true);
    try {
      const response = await testAPI.getRegularTopics(facultyId, batchIds, courseIds);
      if (response.success) {
        const topics = response.data.topics || [];
        setRegularTopics(topics);
        setFormData(prev => ({
          ...prev,
          selectedTopics: topics.map(t => t.name),
          subtopicSelections: Object.fromEntries(topics.map(t => [t.name, [...(t.subtopics || [])]]))
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

  // ── Step 2b (Regular mode): load students grouped by course for the picker ──
  const loadRegularStudents = async (facultyId, batchIds, courseIds) => {
    setLoadingStudents(true);
    try {
      const response = await testAPI.getRegularStudents(facultyId, batchIds, courseIds);
      if (response.success) {
        const courses = response.data.courses || [];
        setCourseStudents(courses);
        const allIds = courses.flatMap(c => c.students.map(s => s._id));
        setFormData(prev => ({ ...prev, selectedStudentIds: allIds }));
      } else {
        toast.error(response.message || 'Failed to load students');
        setCourseStudents([]);
      }
    } catch (error) {
      console.error('Load regular students error:', error);
      toast.error(error.response?.data?.message || 'Failed to load students for this selection');
      setCourseStudents([]);
    } finally {
      setLoadingStudents(false);
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
  // Regular mode: faculty + batch(es) selected → load courses across those batches
  useEffect(() => {
    if (examMode === 'regular' && formData.facultyId && formData.batchIds.length > 0) {
      loadRegularCourses(formData.facultyId, formData.batchIds);
      setFormData(prev => ({ ...prev, selectedCourseIds: [], selectedTopics: [] }));
      setRegularTopics([]);
    }
  }, [examMode, formData.facultyId, formData.batchIds]);

  // Regular mode: course(s) selected → load their deduplicated taught topics + eligible students
  useEffect(() => {
    if (examMode === 'regular' && formData.facultyId && formData.batchIds.length > 0 && formData.selectedCourseIds.length > 0) {
      loadRegularTopics(formData.facultyId, formData.batchIds, formData.selectedCourseIds);
      loadRegularStudents(formData.facultyId, formData.batchIds, formData.selectedCourseIds);
    } else if (examMode === 'regular' && formData.selectedCourseIds.length === 0) {
      setRegularTopics([]);
      setCourseStudents([]);
      setFormData(prev => ({ ...prev, selectedTopics: [], selectedStudentIds: [] }));
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

  // ── Build the granular topic+subtopic selection payload for Regular mode ──
  const buildTopicSelections = () => {
    return formData.selectedTopics.map(topicName => {
      const topicData = regularTopics.find(t => t.name === topicName);
      const totalSubs = topicData?.subtopics?.length || 0;
      const selectedSubs = formData.subtopicSelections[topicName] || [];
      if (totalSubs === 0 || selectedSubs.length === totalSubs) {
        return { topic: topicName, subtopics: null }; // whole topic
      }
      return { topic: topicName, subtopics: selectedSubs }; // partial — only these subtopics
    });
  };

  const calculateRegularAvailableQuestions = async () => {
    try {
      const response = await testAPI.getAvailableQuestions({
        courseIds: formData.selectedCourseIds.join(','),
        topicSelections: JSON.stringify(buildTopicSelections())
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
  }, [examMode, formData.selectedCourseIds, formData.selectedTopics, formData.subtopicSelections]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // ── 12-hour time picker helpers (storage stays 24-hour "HH:mm" for backend) ──
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
    if (period === 'AM') {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h += 12;
    }
    return `${String(h).padStart(2, '0')}:${minute}`;
  };

  const handleTimeChange = (field, part, value) => {
    const current = to12Hour(formData[field]);
    const updated = { ...current, [part]: value };
    const time24 = to24Hour(updated.hour, updated.minute, updated.period);
    setFormData(prev => ({ ...prev, [field]: time24 }));
  };

  const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const MINUTE_OPTIONS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  // ── Mode toggle ──
  const handleModeToggle = (mode) => {
    setExamMode(mode);
    setFormData(prev => ({
      ...prev,
      examMode: mode,
      courseId: '',
      facultyId: '',
      batchIds: [],
      selectedCourseIds: [],
      selectedSemesters: [],
      selectedTopics: [],
      subtopicSelections: {}
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
    setFormData(prev => ({ ...prev, facultyId, batchIds: [], selectedCourseIds: [], selectedTopics: [] }));
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

  // ── Regular mode: topic checkbox toggles ALL its subtopics on/off ──
  const handleRegularTopicToggle = (topicData) => {
    const totalSubs = topicData.subtopics?.length || 0;
    const isCurrentlyFull = totalSubs === 0
      ? formData.selectedTopics.includes(topicData.name)
      : (formData.subtopicSelections[topicData.name] || []).length === totalSubs && totalSubs > 0;

    setFormData(prev => {
      const newSelectedTopics = isCurrentlyFull
        ? prev.selectedTopics.filter(t => t !== topicData.name)
        : [...new Set([...prev.selectedTopics, topicData.name])];

      const newSubtopicSelections = { ...prev.subtopicSelections };
      if (totalSubs > 0) {
        newSubtopicSelections[topicData.name] = isCurrentlyFull ? [] : [...topicData.subtopics];
      }

      return { ...prev, selectedTopics: newSelectedTopics, subtopicSelections: newSubtopicSelections };
    });
  };

  // ── Regular mode: individual subtopic checkbox ──
  const handleRegularSubtopicToggle = (topicData, subtopicName) => {
    setFormData(prev => {
      const current = prev.subtopicSelections[topicData.name] || [];
      const isChecked = current.includes(subtopicName);
      const updated = isChecked ? current.filter(s => s !== subtopicName) : [...current, subtopicName];

      const newSubtopicSelections = { ...prev.subtopicSelections, [topicData.name]: updated };

      let newSelectedTopics = prev.selectedTopics;
      if (updated.length > 0 && !newSelectedTopics.includes(topicData.name)) {
        newSelectedTopics = [...newSelectedTopics, topicData.name];
      } else if (updated.length === 0) {
        newSelectedTopics = newSelectedTopics.filter(t => t !== topicData.name);
      }

      return { ...prev, subtopicSelections: newSubtopicSelections, selectedTopics: newSelectedTopics };
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
    setFormData(prev => ({
      ...prev,
      selectedTopics: regularTopics.map(t => t.name),
      subtopicSelections: Object.fromEntries(regularTopics.map(t => [t.name, [...(t.subtopics || [])]]))
    }));
  };

  const clearAllRegularTopics = () => {
    setFormData(prev => ({ ...prev, selectedTopics: [], subtopicSelections: {} }));
  };

  const handleStudentToggle = (studentId) => {
    setFormData(prev => {
      const isSelected = prev.selectedStudentIds.includes(studentId);
      return {
        ...prev,
        selectedStudentIds: isSelected
          ? prev.selectedStudentIds.filter(id => id !== studentId)
          : [...prev.selectedStudentIds, studentId]
      };
    });
  };

  const selectAllStudentsInCourse = (courseStudentIds) => {
    setFormData(prev => ({
      ...prev,
      selectedStudentIds: [...new Set([...prev.selectedStudentIds, ...courseStudentIds])]
    }));
  };

  const deselectAllStudentsInCourse = (courseStudentIds) => {
    setFormData(prev => ({
      ...prev,
      selectedStudentIds: prev.selectedStudentIds.filter(id => !courseStudentIds.includes(id))
    }));
  };

  const validateForm = () => {
    return true;
  };

  

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (examMode === 'regular') {
      if (!formData.facultyId || formData.batchIds.length === 0) {
        toast.error('Please select a faculty and at least one batch for Regular exam');
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
      if (formData.selectedStudentIds.length === 0) {
        toast.error('Please select at least one eligible student');
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
        scheduledDate: new Date(formData.scheduledDate).toISOString(),
        topicSelections: examMode === 'regular' ? buildTopicSelections() : undefined
      };

      if (!submitData.batchIds || submitData.batchIds.length === 0) {
        delete submitData.batchIds;
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
        {/* Card 1: Basic Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
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

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600">
                      This exam will be available to all students enrolled in the selected course.
                      You'll choose which specific students can see it in their portal after creating the test,
                      from the Upcoming Exam Report.
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
                      Batch(es) * <span className="text-xs font-normal text-gray-500">(hold Ctrl / Cmd to select multiple)</span>
                    </label>
                    <select
                      multiple
                      value={formData.batchIds}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                        setFormData(prev => ({ ...prev, batchIds: selected, selectedCourseIds: [], selectedTopics: [] }));
                      }}
                      required
                      disabled={!formData.facultyId}
                      size={Math.min(6, Math.max(3, facultyBatches.length || 3))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      {facultyBatches.map(batch => (
                        <option key={batch.batchId || batch._id} value={batch.batchId || batch._id}>
                          {batch.displayName || batch.name} ({batch.totalStudents} students)
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.batchIds.length > 0 && (
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

                  {formData.selectedCourseIds.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Eligible Students *
                      </label>
                      {loadingStudents ? (
                        <div className="text-center py-6">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="mt-2 text-gray-500 text-sm">Loading students...</p>
                        </div>
                      ) : courseStudents.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">No students found for this selection</p>
                      ) : (
                        <div className="border border-gray-200 rounded-lg divide-y max-h-80 overflow-y-auto">
                          {courseStudents.map(course => {
                            const ids = course.students.map(s => s._id);
                            const selectedCount = ids.filter(id => formData.selectedStudentIds.includes(id)).length;
                            return (
                              <div key={course.courseId} className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm text-gray-800">
                                    {course.courseName} <span className="text-gray-500 font-normal">({selectedCount}/{ids.length} selected)</span>
                                  </span>
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => selectAllStudentsInCourse(ids)}
                                      className="text-xs text-blue-600 hover:underline">Select all</button>
                                    <button type="button" onClick={() => deselectAllStudentsInCourse(ids)}
                                      className="text-xs text-gray-500 hover:underline">Clear</button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                  {course.students.map(s => (
                                    <label key={s._id} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={formData.selectedStudentIds.includes(s._id)}
                                        onChange={() => handleStudentToggle(s._id)}
                                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-gray-700">{s.fullName}</span>
                                      <span className="text-gray-400 text-xs">({s.studentId})</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Uncheck any student who shouldn't take this exam.
                      </p>
                    </div>
                  )}
                </>
              )}
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
              {!formData.facultyId || formData.batchIds.length === 0 || formData.selectedCourseIds.length === 0 ? (
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
                  {regularTopics.map((topicData) => {
                    const totalSubs = topicData.subtopics?.length || 0;
                    const subSelections = formData.subtopicSelections[topicData.name] || [];
                    const isTopicIncluded = formData.selectedTopics.includes(topicData.name);
                    const isFullySelected = totalSubs === 0
                      ? isTopicIncluded
                      : (subSelections.length === totalSubs && totalSubs > 0);
                    const isPartial = totalSubs > 0 && subSelections.length > 0 && subSelections.length < totalSubs;

                    return (
                      <div
                        key={topicData.name}
                        className={`p-3 rounded-lg border ${
                          isTopicIncluded ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            ref={(el) => { if (el) el.indeterminate = isPartial; }}
                            checked={isFullySelected}
                            onChange={() => handleRegularTopicToggle(topicData)}
                            className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-3 font-medium text-gray-800">{topicData.name}</span>
                        </div>
                        {totalSubs > 0 && (
                          <ul className="mt-2 ml-7 space-y-1.5">
                            {topicData.subtopics.map((st, si) => (
                              <li key={si} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={subSelections.includes(st)}
                                  onChange={() => handleRegularSubtopicToggle(topicData, st)}
                                  className="h-3.5 w-3.5 text-blue-500 focus:ring-blue-400 rounded"
                                />
                                <span className="text-xs text-gray-600">{st}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
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

        {/* Card 2: Test Configuration */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
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
                    Exam Opens At
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Closes At
                  </label>
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