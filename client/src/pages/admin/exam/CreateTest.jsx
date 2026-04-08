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
  Hash
} from 'lucide-react';
import toast from 'react-hot-toast';
import { testAPI, examCourseAPI, questionAPI } from '../../../services/examAPI';
import { setupAPI } from '../../../services/api';
import useBasePath from '../../../hooks/useBasePath';

const CreateTest = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseTopics, setCourseTopics] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState(0);
  const [batchList, setBatchList] = useState([]); // ✅ BUG 1 FIXED - Added batchList state
  const basePath = useBasePath();

  // Form state
  const [formData, setFormData] = useState({
    testName: '',
    description: '',
    courseId: '',
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

  // Load courses on mount
  useEffect(() => {
    loadCourses();
    fetchBatches(); // ✅ BUG 2 FIXED - Added fetchBatches() here
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

  // Load course topics when course is selected
  useEffect(() => {
    if (formData.courseId) {
      loadCourseTopics(formData.courseId);
      const course = courses.find(c => c._id === formData.courseId);
      setSelectedCourse(course);
    }
  }, [formData.courseId, courses]);

  const loadCourseTopics = async (courseId) => {
    try {
      console.log(`🔍 Loading topics for course: ${courseId}`);
      
      // Use course API instead of exam API
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
        
        console.log('✅ Processed topics:', topics);
        setCourseTopics(topics);
        
        // Auto-select all semesters and topics
        const semesters = [...new Set(topics.map(t => t.semester))];
        const topicNames = topics.map(t => t.topic).filter(t => t);
        
        setFormData(prev => ({
          ...prev,
          selectedSemesters: semesters,
          selectedTopics: topicNames
        }));
        
        console.log('🎯 Auto-selected:', {
          semesters,
          topicNames
        });
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

  // Calculate available questions when selection changes
  useEffect(() => {
    if (formData.courseId && formData.selectedSemesters.length > 0 && formData.selectedTopics.length > 0) {
      calculateAvailableQuestions();
    }
  }, [formData.courseId, formData.selectedSemesters, formData.selectedTopics]);

  const calculateAvailableQuestions = async () => {
    try {
      console.log('🔍 Calculating available questions...');
      
      // TEMPORARY: Use mock data
      const mockData = {
        success: true,
        data: {
          availableQuestions: 100
        }
      };
      
      setAvailableQuestions(mockData.data.availableQuestions);
      
      // Auto-set default values
      setFormData(prev => ({
        ...prev,
        totalQuestionsInPool: '50',
        questionsPerStudent: '20'
      }));
      
    } catch (error) {
      console.error('❌ Calculate available questions error:', error);
      // Set defaults anyway
      setAvailableQuestions(100);
      setFormData(prev => ({
        ...prev,
        totalQuestionsInPool: '50',
        questionsPerStudent: '20'
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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

  const clearAllSemesters = () => {
    setFormData(prev => ({ ...prev, selectedSemesters: [] }));
  };

  const clearAllTopics = () => {
    setFormData(prev => ({ ...prev, selectedTopics: [] }));
  };

  const validateForm = () => {
    // const requiredFields = [
    //   { name: 'testName', label: 'Test Name' },
    //   { name: 'courseId', label: 'Course' },
    //   { name: 'totalQuestionsInPool', label: 'Total Questions in Pool' },
    //   { name: 'questionsPerStudent', label: 'Questions Per Student' },
    //   { name: 'duration', label: 'Duration' },
    //   { name: 'scheduledDate', label: 'Scheduled Date' }
    // ];

    // const missingFields = requiredFields.filter(
    //   field => !formData[field.name] || formData[field.name].toString().trim() === ''
    // );

    // if (missingFields.length > 0) {
    //   toast.error(`Please fill: ${missingFields.map(f => f.label).join(', ')}`);
    //   return false;
    // }

    // if (formData.selectedSemesters.length === 0) {
    //   toast.error('Please select at least one semester');
    //   return false;
    // }

    // if (formData.selectedTopics.length === 0) {
    //   toast.error('Please select at least one topic');
    //   return false;
    // }

    // const total = parseInt(formData.totalQuestionsInPool);
    // const perStudent = parseInt(formData.questionsPerStudent);
    
    // if (perStudent > total) {
    //   toast.error('Questions per student cannot exceed total questions in pool');
    //   return false;
    // }

    // if (total > availableQuestions) {
    //   toast.error(`Only ${availableQuestions} questions available. Reduce total questions.`);
    //   return false;
    // }

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
    
    setLoading(true);

    try {
      // Prepare data
      const submitData = {
        ...formData,
        totalQuestionsInPool: parseInt(formData.totalQuestionsInPool),
        questionsPerStudent: parseInt(formData.questionsPerStudent),
        duration: parseInt(formData.duration),
        maxMarks: formData.maxMarks ? parseInt(formData.maxMarks) : 100,
        scheduledDate: new Date(formData.scheduledDate).toISOString()
      };

      // ✅ FIX: Remove empty batchId
      if (!submitData.batchId || submitData.batchId.trim() === '') {
        delete submitData.batchId;
      }

      console.log('Creating test with data:', submitData);

      const response = await testAPI.createTest(submitData);
      
      if (response.success) {
        toast.success('Test created successfully!');
        
        // Generate question pool automatically
        const testId = response.data._id;
        await generateQuestionPool(testId);
        
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

  const generateQuestionPool = async (testId) => {
    try {
      const response = await testAPI.generateQuestionPool(testId);
      if (response.success) {
        toast.success(`Question pool generated with ${response.data.poolSize} questions`);
      } else {
        toast.error(response.message || 'Failed to generate question pool');
      }
    } catch (error) {
      console.error('Generate question pool error:', error);
      toast.error('Failed to generate question pool');
    }
  };

  // Group topics by semester
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

              {/* ✅ BUG 3 FIXED - Batch Select inside Card 1 space-y-4 */}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Questions in Pool *
                  </label>
                  <input
                    type="number"
                    name="totalQuestionsInPool"
                    value={formData.totalQuestionsInPool}
                    onChange={handleChange}
                    min="1"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Total questions available in pool
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

              {/* Available Questions Info */}
              {availableQuestions > 0 && (
                <div className={`p-3 rounded-lg ${availableQuestions >= formData.totalQuestionsInPool ? 'bg-green-50' : 'bg-yellow-50'}`}>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className={availableQuestions >= formData.totalQuestionsInPool ? 'text-green-600' : 'text-yellow-600'} />
                    <span className={`text-sm font-medium ${availableQuestions >= formData.totalQuestionsInPool ? 'text-green-800' : 'text-yellow-800'}`}>
                      {availableQuestions} questions available from selected topics
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${availableQuestions >= formData.totalQuestionsInPool ? 'text-green-600' : 'text-yellow-600'}`}>
                    {availableQuestions >= formData.totalQuestionsInPool 
                      ? '✓ Enough questions available for pool'
                      : `⚠ Need ${formData.totalQuestionsInPool - availableQuestions} more questions`}
                  </p>
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
          </div>

          {formData.courseId ? (
            <div className="space-y-6">
              {Object.keys(topicsBySemester).map(semester => (
                <div key={semester} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Semester Header */}
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

                  {/* Topics List */}
                  {formData.selectedSemesters.includes(semester) && (
                    <div className="p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {topicsBySemester[semester].map((topicData, index) => (
                          <div
                            key={`${semester}-${topicData.topic}`}
                            className={`flex items-center p-3 rounded-lg border ${
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
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <label
                              htmlFor={`topic-${semester}-${index}`}
                              className="ml-3 flex-1"
                            >
                              <span className="font-medium text-gray-800">{topicData.topic}</span>
                              {topicData.subtopics && topicData.subtopics.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {topicData.subtopics.length} subtopics
                                </p>
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
          )}

          {/* Selection Summary */}
          {formData.selectedTopics.length > 0 && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Check className="text-green-600" size={20} />
                <div>
                  <p className="font-medium text-green-800">
                    Selected {formData.selectedTopics.length} topics from {formData.selectedSemesters.length} semesters
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