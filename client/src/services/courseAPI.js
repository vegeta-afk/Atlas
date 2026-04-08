// services/api/courseAPI.js
import axios from "axios";
import { API_BASE_URL } from "../config";

const API_URL = `${API_BASE_URL}/courses`;

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem("token");
};

const courseAPI = {
  // Get all courses
  getCourses: async (params = {}) => {
    const token = getAuthToken();
    return axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
  },

  // Get single course
  getCourse: async (id) => {
    const token = getAuthToken();
    return axios.get(`${API_URL}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Create course
  createCourse: async (courseData) => {
    const token = getAuthToken();
    return axios.post(API_URL, courseData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Update course
  updateCourse: async (id, courseData) => {
    const token = getAuthToken();
    return axios.put(`${API_URL}/${id}`, courseData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Delete course
  deleteCourse: async (id) => {
    const token = getAuthToken();
    return axios.delete(`${API_URL}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Toggle course status
  toggleStatus: async (id) => {
    const token = getAuthToken();
    return axios.put(
      `${API_URL}/${id}/toggle-status`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  // Get course statistics
  getCourseStats: async () => {
    const token = getAuthToken();
    return axios.get(`${API_URL}/stats/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export default courseAPI;
