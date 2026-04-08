import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  TrendingUp,
  UserCheck,
  Layers,
} from "lucide-react";
import { reportAPI } from "../services/api";

const CountdownReport = () => {
  // State variables
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedFaculty, setSelectedFaculty] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedCourseType, setSelectedCourseType] = useState("all"); // 'all', 'primary', 'additional'
  const [sortConfig, setSortConfig] = useState({
    key: "daysLeft",
    direction: "asc",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCourses: 0,
    endingSoon: 0,
    nearEnd: 0,
    ongoing: 0,
    expired: 0,
    averageDaysLeft: 0,
  });
  const [filters, setFilters] = useState({
    courses: [],
    faculties: [],
    batches: [],
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedSearch, selectedCourse, selectedFaculty, selectedBatch, selectedCourseType, sortConfig.key, sortConfig.direction]);

  // Fetch report data
  useEffect(() => {
    fetchReportData();
  }, [
    pagination.page,
    debouncedSearch,
    selectedCourse,
    selectedFaculty,
    selectedBatch,
    selectedCourseType,
    sortConfig.key,
    sortConfig.direction,
  ]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
        courseType: selectedCourseType,
      };

      if (debouncedSearch?.trim()) params.search = debouncedSearch.trim();
      if (selectedCourse && selectedCourse !== "all") params.course = selectedCourse;
      if (selectedFaculty && selectedFaculty !== "all") params.faculty = selectedFaculty;
      if (selectedBatch && selectedBatch !== "all") params.batch = selectedBatch;

      console.log("Fetching countdown report with params:", params);

      const response = await reportAPI.getCountdownReport(params);

      if (response?.data?.success) {
        const { data, stats, filters, currentPage, count, total, totalPages } = response.data;
        
        setCourses(data || []);
        setFilteredCourses(data || []);
        setStats(stats || {
          totalCourses: 0,
          endingSoon: 0,
          nearEnd: 0,
          ongoing: 0,
          expired: 0,
          averageDaysLeft: 0,
        });
        setFilters(filters || { courses: [], faculties: [], batches: [] });
        setPagination({
          page: currentPage || 1,
          limit: count || pagination.limit,
          total: total || 0,
          totalPages: totalPages || 1,
        });
      } else {
        throw new Error(response?.data?.message || "Failed to fetch report data");
      }
    } catch (err) {
      console.error("Error fetching countdown report:", err);
      setError(err.response?.data?.message || err.message || "Failed to load report data");
      
      setCourses([]);
      setFilteredCourses([]);
      setStats({
        totalCourses: 0,
        endingSoon: 0,
        nearEnd: 0,
        ongoing: 0,
        expired: 0,
        averageDaysLeft: 0,
      });
      setFilters({ courses: [], faculties: [], batches: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  const handleExport = async () => {
    try {
      const response = await reportAPI.exportCountdownReport();
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'countdown-report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export report");
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return "";
  };

  const getStatusBadge = (status, daysLeft) => {
    const statusMap = {
      "Ending Soon": { color: "bg-orange-100 text-orange-800", icon: "⚠️" },
      "Near End": { color: "bg-yellow-100 text-yellow-800", icon: "⏳" },
      "Ongoing": { color: "bg-green-100 text-green-800", icon: "✓" },
      "Expired": { color: "bg-red-100 text-red-800", icon: "✗" },
    };

    const config = statusMap[status] || statusMap["Ongoing"];
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <span>{config.icon}</span>
        {status} {daysLeft !== "N/A" && `(${daysLeft} days)`}
      </span>
    );
  };

  const getCourseTypeBadge = (courseType) => {
    if (courseType === "primary") {
      return <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">Primary</span>;
    } else if (courseType === "additional") {
      return <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs">Additional</span>;
    }
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === "N/A") return "N/A";
    return dateString;
  };

  // Calculate showing range
  const start = ((pagination.page - 1) * pagination.limit) + 1;
  const end = Math.min(start + courses.length - 1, pagination.total);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Countdown Report</h1>
          <p className="text-gray-600">Track remaining days for each student's course completion</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalCourses}</h3>
              <p className="text-sm text-gray-600">Total Courses</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{stats.endingSoon}</h3>
              <p className="text-sm text-gray-600">Ending Soon (≤30 days)</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{stats.nearEnd}</h3>
              <p className="text-sm text-gray-600">Near End (31-90 days)</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
              <UserCheck size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{stats.averageDaysLeft}</h3>
              <p className="text-sm text-gray-600">Avg Days Left</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Generating report...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <strong className="text-red-700">Error loading report:</strong>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button 
            onClick={() => fetchReportData()} 
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters Section */}
      {!loading && !error && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 mb-6 flex flex-wrap items-center gap-4">
          {/* Search Box */}
          <div className="flex-1 min-w-[300px] relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name, roll no, or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Course Type Filter */}
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg min-w-[150px]">
            <Filter size={16} className="text-gray-400" />
            <select
              value={selectedCourseType}
              onChange={(e) => {
                setSelectedCourseType(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="w-full bg-transparent outline-none text-sm text-gray-700"
            >
              <option value="all">All Courses</option>
              <option value="primary">Primary Only</option>
              <option value="additional">Additional Only</option>
            </select>
          </div>

          {/* Course Filter */}
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg min-w-[150px]">
            <Filter size={16} className="text-gray-400" />
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="w-full bg-transparent outline-none text-sm text-gray-700"
            >
              <option value="all">All Courses</option>
              {filters.courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>

          {/* Faculty Filter */}
          <div className="px-3 py-2 border border-gray-200 rounded-lg min-w-[150px]">
            <select
              value={selectedFaculty}
              onChange={(e) => {
                setSelectedFaculty(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="w-full bg-transparent outline-none text-sm text-gray-700"
            >
              <option value="all">All Faculty</option>
              {filters.faculties.map((faculty) => (
                <option key={faculty} value={faculty}>
                  {faculty}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Filter */}
          <div className="px-3 py-2 border border-gray-200 rounded-lg min-w-[150px]">
            <select
              value={selectedBatch}
              onChange={(e) => {
                setSelectedBatch(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="w-full bg-transparent outline-none text-sm text-gray-700"
            >
              <option value="all">All Batches</option>
              {filters.batches.map((batch) => (
                <option key={batch} value={batch}>
                  {batch}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6 overflow-x-auto">
          <table className="w-full min-w-[1400px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th onClick={() => handleSort("dateOfJoining")} className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  D.O.A {getSortIndicator("dateOfJoining")}
                </th>
                <th onClick={() => handleSort("facultyName")} className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  Faculty Name {getSortIndicator("facultyName")}
                </th>
                <th onClick={() => handleSort("batchTime")} className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  Batch Time {getSortIndicator("batchTime")}
                </th>
                <th onClick={() => handleSort("rollNo")} className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  Roll No {getSortIndicator("rollNo")}
                </th>
                <th onClick={() => handleSort("studentName")} className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  Student Name {getSortIndicator("studentName")}
                </th>
                <th onClick={() => handleSort("courseName")} className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  Course Name {getSortIndicator("courseName")}
                </th>
                <th onClick={() => handleSort("dateOfCompletion")} className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  D.O.C {getSortIndicator("dateOfCompletion")}
                </th>
                <th onClick={() => handleSort("daysLeft")} className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  Days Left {getSortIndicator("daysLeft")}
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.length > 0 ? (
                courses.map((course, index) => (
                  <tr key={course.id || index} className={`hover:bg-gray-50 ${course.courseType === 'additional' ? 'bg-purple-50/30' : ''}`}>
                    <td className="px-4 py-4 text-center">
                      {course.courseType === 'primary' ? (
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          Primary
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          <Layers size={10} className="mr-1" />
                          Additional
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-700">{formatDate(course.dateOfJoining)}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-block px-3 py-1 text-xs font-medium rounded ${
                        course.facultyName === "Not Allotted" 
                          ? "bg-gray-100 text-gray-600" 
                          : "bg-blue-50 text-blue-700"
                      }`}>
                        {course.facultyName}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {course.batchTime}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-medium text-blue-600">{course.rollNo}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {course.studentName ? course.studentName.charAt(0).toUpperCase() : "?"}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{course.studentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-700">
                      {course.courseName}
                      {course.courseType === 'additional' && (
                        <div className="text-xs text-purple-600 mt-1">Additional Course</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1.5 text-sm text-gray-600">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDate(course.dateOfCompletion)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`font-bold ${
                        course.daysLeft <= 30 ? "text-red-600" : 
                        course.daysLeft <= 90 ? "text-orange-600" : "text-green-600"
                      }`}>
                        {course.daysLeft}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(course.status, course.daysLeft)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="py-16 text-center">
                    <Users size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-1">No data found</h3>
                    <p className="text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && pagination.totalPages > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {start} to {end} of {pagination.total} courses
          </div>
          <div className="flex gap-2 items-center">
            <button
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1 || loading}
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountdownReport;