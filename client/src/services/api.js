import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem("token");
      // ✅ Only redirect if token doesn't exist at all
      // Not on every random 401 from sub-requests
      if (!token) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (userData) => api.put("/auth/profile", userData),
};

// Enquiry API
export const enquiryAPI = {
  // CRUD Operations
  getEnquiries: (params) => api.get("/enquiries", { params }),
  getEnquiry: (id) => api.get(`/enquiries/${id}`),
  createEnquiry: (data) => api.post("/enquiries", data),
  updateEnquiry: (id, data) => api.put(`/enquiries/${id}`, data),
  deleteEnquiry: (id) => api.delete(`/enquiries/${id}`),

  // Special Operations
  updateStatus: (id, data) => api.put(`/enquiries/${id}/status`, data),
  convertToAdmission: (id) => api.post(`/enquiries/${id}/convert-to-admission`),

  // Dashboard
  getDashboardStats: () => api.get("/enquiries/stats/dashboard"),
  getMonthlyStats: () => api.get("/enquiries/stats/monthly"),
};

// Admission API
export const admissionAPI = {
  // CRUD Operations
  getAdmissions: (params) => api.get("/admissions", { params }),
  getAdmission: (id) => api.get(`/admissions/${id}`),
  createAdmission: (data) => {
  if (data instanceof FormData) {
    return api.post("/admissions", data, {
      headers: { "Content-Type": undefined }, // ← this removes the json default
    });
  }
  return api.post("/admissions", data);
},
  updateAdmission: (id, data) => api.put(`/admissions/${id}`, data),
  deleteAdmission: (id) => api.delete(`/admissions/${id}`),

  // Special Operations
  updateStatus: (id, data) => api.put(`/admissions/${id}/status`, data),
  updateFees: (id, data) => api.put(`/admissions/${id}/fees`, data),

  // Dashboard
  getDashboardStats: () => api.get("/admissions/stats/dashboard"),

  // New Operations
  exportAdmission: (id) =>
    api.get(`/admissions/${id}/export`, { responseType: "blob" }),
  getAdmissionActivities: (id) => api.get(`/admissions/${id}/activities`),

  // ========== NEW STATUS MANAGEMENT FUNCTIONS ==========
  
  // Cancel admission
  cancelAdmission: (id, reason) => 
    api.put(`/admissions/${id}/cancel`, { reason }),
  
  // Put admission on hold
  holdAdmission: (id, reason) => 
    api.put(`/admissions/${id}/hold`, { reason }),
  
  // Mark admission as complete (manual)
  completeAdmission: (id, reason) => 
    api.put(`/admissions/${id}/complete`, { reason }),
  
  // Reactivate cancelled/on-hold admission
  reactivateAdmission: (id, reason) => 
    api.put(`/admissions/${id}/reactivate`, { reason }),
  
  // Generic function that calls the appropriate endpoint based on action
  updateAdmissionStatus: (id, data) => {
    const { action, reason } = data;
    switch(action) {
      case 'cancel':
        return api.put(`/admissions/${id}/cancel`, { reason });
      case 'hold':
        return api.put(`/admissions/${id}/hold`, { reason });
      case 'complete':
        return api.put(`/admissions/${id}/complete`, { reason });
      case 'reactivate':
        return api.put(`/admissions/${id}/reactivate`, { reason });
      default:
        return api.put(`/admissions/${id}/status`, data);
    }
  },

  // ========== AUTO FUNCTIONS (Admin only) ==========
  
  // Manually trigger auto-complete check
  runAutoComplete: () => 
    api.post("/admissions/auto-complete"),
  
  // Manually trigger auto-hold check
  runAutoHold: () => 
    api.post("/admissions/auto-hold"),

  // ========== REPORT FUNCTIONS (Will be used in Reports section) ==========
  
  // Get cancelled admissions list
  getCancelledAdmissions: (params) => 
    api.get("/admissions/reports/cancelled", { params }),
  
  // Get on-hold admissions list
  getHoldAdmissions: (params) => 
    api.get("/admissions/reports/hold", { params }),
  
  // Get completed admissions list
  getCompletedAdmissions: (params) => 
    api.get("/admissions/reports/completed", { params }),
};

// ✅ ADD COURSE API HERE
export const courseAPI = {
  // CRUD Operations
  getCourses: (params) => api.get("/courses", { params }),
  getCourse: (id) => api.get(`/courses/${id}`),
  createCourse: (data) => api.post("/courses", data),
  updateCourse: (id, data) => api.put(`/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/courses/${id}`),

  // Special Operations
  toggleStatus: (id) => api.put(`/courses/${id}/toggle-status`),

  // Dashboard
  getCourseStats: () => api.get("/courses/stats/summary"),

  // Dropdown / Enquiry usage
  getActiveCourses: () => api.get("/courses/active"),
};

export const setupAPI = {
  // Get all setup data
  getAll: () => api.get("/setup"),
  getActiveData: () => api.get("/setup/active"),

  // Qualifications
  createQualification: (data) => api.post("/setup/qualifications", data),
  updateQualification: (id, data) => api.put(`/setup/qualifications/${id}`, data),
  deleteQualification: (id) => api.delete(`/setup/qualifications/${id}`),

  // Areas
  createArea: (data) => api.post("/setup/areas", data),
  updateArea: (id, data) => api.put(`/setup/areas/${id}`, data),
  deleteArea: (id) => api.delete(`/setup/areas/${id}`),

  // Holidays
  createHoliday: (data) => api.post("/setup/holidays", data),
  updateHoliday: (id, data) => api.put(`/setup/holidays/${id}`, data),
  deleteHoliday: (id) => api.delete(`/setup/holidays/${id}`),

  // Batches
  createBatch: (data) => api.post("/setup/batches", data),
  updateBatch: (id, data) => api.put(`/setup/batches/${id}`, data),
  deleteBatch: (id) => api.delete(`/setup/batches/${id}`),
  updateBatchOrder: (data) => api.put("/setup/batches/order", data),

  // Enquiry Methods
  createEnquiryMethod: (data) => api.post("/setup/enquiry-methods", data),
  updateEnquiryMethod: (id, data) => api.put(`/setup/enquiry-methods/${id}`, data),
  deleteEnquiryMethod: (id) => api.delete(`/setup/enquiry-methods/${id}`),
  updateEnquiryMethodOrder: (data) => api.put("/setup/enquiry-methods/order", data),

  // Fees
  createFee: (data) => api.post("/setup/fees", data),
  updateFee: (id, data) => api.put(`/setup/fees/${id}`, data),
  deleteFee: (id) => api.delete(`/setup/fees/${id}`),

  // ========== ADD THESE CALL LOG SETUP APIS ==========
  // Call Status
  createCallStatus: (data) => api.post("/setup/call-status", data),
  updateCallStatus: (id, data) => api.put(`/setup/call-status/${id}`, data),
  deleteCallStatus: (id) => api.delete(`/setup/call-status/${id}`),

  // Call Reasons
  createCallReason: (data) => api.post("/setup/call-reasons", data),
  updateCallReason: (id, data) => api.put(`/setup/call-reasons/${id}`, data),
  deleteCallReason: (id) => api.delete(`/setup/call-reasons/${id}`),

  // Next Actions
  createNextAction: (data) => api.post("/setup/next-actions", data),
  updateNextAction: (id, data) => api.put(`/setup/next-actions/${id}`, data),
  deleteNextAction: (id) => api.delete(`/setup/next-actions/${id}`),
};

export const facultyAPI = {
  // CRUD Operations
  getFaculty: (params) => api.get("/faculty", { params }),
  getFacultyById: (id) => api.get(`/faculty/${id}`),
  createFaculty: (data) => api.post("/faculty", data),
  updateFaculty: (id, data) => api.put(`/faculty/${id}`, data),
  deleteFaculty: (id) => api.delete(`/faculty/${id}`),

  // Special Operations
  updateFacultyStatus: (id, data) => api.put(`/faculty/${id}/status`, data),

  // Dashboard
  getFacultyStats: () => api.get("/faculty/stats/dashboard"),
};
// Export the instance for custom requests

export const batchTransferAPI = {
  // Get all transfers with filters
 // In your api.js, replace the getTransfers method with:

getTransfers: (params) => {
  console.log("🔵 batchTransferAPI.getTransfers called with params:", params);
  
  // Clean up params - remove undefined values
  const cleanParams = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      cleanParams[key] = params[key];
    }
  });
  
  console.log("🔵 Clean params:", cleanParams);
  
  const queryParams = new URLSearchParams(cleanParams).toString();
  const url = `/batch-transfers${queryParams ? `?${queryParams}` : ''}`;
  
  console.log("🔵 Final URL:", url);
  
  return api.get(url);
},

  // Get single transfer
  getTransfer: (id) => api.get(`/batch-transfers/${id}`),

  // Create new transfer request
  createTransfer: (data) => {
    console.log("API call - createTransfer with data:", data);
    return api.post('/batch-transfers', data);
  },

  // Update transfer request
  updateTransfer: (id, data) => api.put(`/batch-transfers/${id}`, data),

  // Approve transfer
  approveTransfer: (id, data) => api.put(`/batch-transfers/${id}/approve`, data),

  // Reject transfer
  rejectTransfer: (id, data) => api.put(`/batch-transfers/${id}/reject`, data),

  // Delete transfer
  deleteTransfer: (id) => api.delete(`/batch-transfers/${id}`),

  // Get statistics
  getStats: () => api.get('/batch-transfers/stats'),
};

export const studentAPI = {
  // Get all students with filters
  getStudents: (params) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/students?${queryParams}`);
  },

  // Get single student
  getStudent: (id) => api.get(`/students/${id}`),

  // Update student
  updateStudent: (id, data) => api.put(`/students/${id}`, data),

  // Search students
  searchStudents: (params) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/students/search?${queryParams}`);
  },

  // Get student by admission no or roll no
  getStudentByRollNo: (rollNo) => api.get(`/students/roll/${rollNo}`),

  // Get student statistics
  getStudentStats: () => api.get('/students/stats/dashboard'),
};

// Add to your api.js file
export const reportAPI = {
  getCountdownReport: (params) => api.get("/reports/countdown", { params }),
  exportCountdownReport: () => api.get("/reports/countdown/export", { responseType: 'blob' }),
};

export const examReportAPI = {
  getUpcomingExamReport: (params) => {
    const cleanParams = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        cleanParams[key] = value;
      }
    });

    return api.get("/reports/exams/upcoming", {
      params: cleanParams,
      // ← removed Cache-Control header, it was causing CORS preflight to fail
    });
  },

  exportUpcomingExamReport: () =>
    api.get("/reports/exams/upcoming/export", { responseType: 'blob' }),

  getExamStats: () => api.get("/reports/exams/stats"),
};

export const courseConversionAPI = {
  // Get eligible students for conversion
  getEligibleStudents: (params) => api.get("/course-conversion/eligible-students", { params }),
  
  // Preview conversion
  getConversionPreview: (data) => api.post("/course-conversion/preview", data),
  
  // Convert student course
  convertStudentCourse: (data) => api.post("/course-conversion/convert", data),
};


export const courseExtensionAPI = {
  getEligibleStudents: (params) => api.get("/course-extension/eligible-students", { params }),
  getExtensionPreview: (data) => api.post("/course-extension/preview", data),
  extendStudentCourse: (data) => api.post("/course-extension/extend", data),
};

export const scholarshipAPI = {
  // Get all scholarships (with optional filters)
  getScholarships: (params = {}) => 
    api.get('/scholarships', { params }),
  
  // Get a single scholarship by ID
  getScholarship: (id) => 
    api.get(`/scholarships/${id}`),
  
  // Get scholarships available for a specific course
  getForCourse: (courseId) => 
    api.get(`/scholarships/course/${courseId}`),
  
  // Create a new scholarship
  createScholarship: (data) => 
    api.post('/scholarships', data),
  
  // Update a scholarship
  updateScholarship: (id, data) => 
    api.put(`/scholarships/${id}`, data),
  
  // Delete a scholarship
  deleteScholarship: (id) => 
    api.delete(`/scholarships/${id}`),
  
  // Toggle scholarship status
  toggleStatus: (id) => 
    api.put(`/scholarships/${id}/toggle-status`),
};
export const callLogAPI = {
  // Get all call logs
  getAll: (params = {}) => 
    api.get("/call-logs", { params }),
  
  // Get call logs for specific student
  getByStudent: (studentId, studentType) => 
    api.get(`/call-logs/student/${studentId}/${studentType}`),
  
  // Create new call log
  create: (data) => 
    api.post("/call-logs", data),
  
  // Update call log
  update: (id, data) => 
    api.put(`/call-logs/${id}`, data),
  
  // Delete call log
  delete: (id) => 
    api.delete(`/call-logs/${id}`),
  
  // Get statistics
  getStatistics: () => 
    api.get("/call-logs/statistics")
};
export default api;
