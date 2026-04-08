// services/examAPI.js
import api from './api'; // This is now correct since api.js exports default

// Question API
export const questionAPI = {
  // Add a new question
  addQuestion: async (questionData) => {
    const response = await api.post("/exam/questions", questionData);
    return response.data;
  },

  // Get questions with filters
  getQuestions: async (params = {}) => {
    const response = await api.get("/exam/questions", { params });
    return response.data;
  },

  // Get course topics
 getCourseTopics: async (courseId) => {
  const response = await api.get(`/courses/${courseId}`);
  return response.data;
},

  // Bulk add questions
  bulkAddQuestions: async (questions) => {
    const response = await api.post("/exam/questions/bulk", { questions });
    return response.data;
  },

  // Update question
  updateQuestion: async (questionId, updateData) => {
    const response = await api.put(`/exam/questions/${questionId}`, updateData);
    return response.data;
  },

  // Delete question (soft delete)
  deleteQuestion: async (questionId) => {
    const response = await api.delete(`/exam/questions/${questionId}`);
    return response.data;
  }
};

// Test API
export const testAPI = {
  // Create test
  createTest: async (testData) => {
    const response = await api.post("/exam/tests", testData);
    return response.data;
  },

  // Get tests
  getTests: async (params = {}) => {
    const response = await api.get("/exam/tests", { params });
    return response.data;
  },

  // Get single test
  getTest: async (testId) => {
    const response = await api.get(`/exam/tests/${testId}`);
    return response.data;
  },

  

  // Generate question pool
  generateQuestionPool: async (testId) => {
    const response = await api.post(`/exam/tests/${testId}/generate-pool`, {});
    return response.data;
  },

  // Get student results
  getStudentResults: async (studentId) => {
    const response = await api.get(`/exam/tests/student/${studentId}/results`);
    return response.data;
  },


  // Get available questions count
  getAvailableQuestions: async (courseId, semesters, topics) => {
  console.log('📊 Checking available questions (MOCKED)');
  
  // TEMPORARY: Return mock data until backend is implemented
  return {
    success: true,
    data: {
      availableQuestions: 100, // Assume 100 questions available
      courseId,
      semesters: Array.isArray(semesters) ? semesters : semesters,
      topics: Array.isArray(topics) ? topics : topics
    }
  };
},

  // Get test results
  getTestResults: async (testId) => {
    const response = await api.get(`/exam/tests/${testId}/results`);
    return response.data;
  },

  // Update test
  updateTest: async (testId, updateData) => {
    const response = await api.put(`/exam/tests/${testId}`, updateData);
    return response.data;
  },

  // Delete test
  deleteTest: async (testId) => {
    const response = await api.delete(`/exam/tests/${testId}`);
    return response.data;
  }
};

// Course API (for dropdown) - Reusing your existing courseAPI
export const examCourseAPI = {
  getActiveCourses: async () => {
    const response = await api.get("/courses/active");
    return response.data;
  },

  getCoursesForDropdown: async () => {
    const response = await api.get("/courses/dropdown");
    return response.data;
  }
};

// Batch API (if needed for test assignment)
export const examBatchAPI = {
  getBatchesForDropdown: async () => {
    const response = await api.get("/batches/active");
    return response.data;
  }
};

getStudentResults: (studentId) => api.get(`/tests/student/${studentId}/results`);