// pages/frontoffice/admission/AdmissionList.jsx
import React, { useState, useEffect } from "react";
import { admissionAPI, facultyAPI, courseAPI, setupAPI } from "../../../services/api";
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  MoreVertical,
  Phone,
  Calendar,
  CheckCircle,
  UserCheck,
  CalendarDays,
  MessageCircle,
  AlertCircle,
  XCircle,
  PauseCircle,
  CheckCircle2,
  RotateCcw,
  ArrowLeftRight,
  Package,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "./AdmissionList.css";

const AdmissionList = () => {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const basePath = user?.role === "faculty" || user?.role === "instructor"
    ? "/faculty"
    : "/admin";

  // State variables
  const [admissions, setAdmissions] = useState([]);
  const [filteredAdmissions, setFilteredAdmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedFaculty, setSelectedFaculty] = useState("all");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [statusAction, setStatusAction] = useState(null);
  const [statusReason, setStatusReason] = useState("");
  const [selectedCourseType, setSelectedCourseType] = useState("all"); // "all" | "primary" | additionalCourse _id
  const [processingStatus, setProcessingStatus] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [showDateFilter, setShowDateFilter] = useState(false);

  const [appliedDateRange, setAppliedDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [sortConfig, setSortConfig] = useState({
    key: "admissionNo",
    direction: "desc",
  });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedAdmissionForWhatsApp, setSelectedAdmissionForWhatsApp] = useState(null);

  const [dashboardStats, setDashboardStats] = useState({
    totalAdmissions: 0,
    facultyAllotted: 0,
    activeStudents: 0,
    differentCourses: 0,
  });

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [facultyMembers, setFacultyMembers] = useState([]);
  const [loadingFaculty, setLoadingFaculty] = useState(false);

const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const getCourseDuration = (courseName) => {
    const match = courses.find((c) => c.courseFullName === courseName);
    return match?.duration || null;
  };

  const formatDuration = (value) => {
    if (!value) return value;
    const str = value.toString().trim();
    return /^\d+$/.test(str) ? `${str} Month${str === "1" ? "" : "s"}` : str;
  };
 
  // Field mapping for sorting
  const fieldMapping = {
    studentId: "admissionNo",
    name: "fullName",
    course: "course",
    admissionDate: "admissionDate",
  };

 const fetchFilterData = async () => {
    try {
      setLoadingFilters(true);
      setLoadingFaculty(true);

      const [courseRes, setupRes, facultyRes] = await Promise.all([
        courseAPI.getActiveCourses(),
        setupAPI.getAll(),
        facultyAPI.getFaculty({ limit: 100, status: "active" }),
      ]);

      if (courseRes.data.success) {
        setCourses(courseRes.data.data || []);
      }
      if (setupRes.data.success) {
        setBatches(setupRes.data.data.batches || []);
      }
      if (facultyRes.data.success) {
        setFacultyMembers(facultyRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load filter data:", err);
    } finally {
      setLoadingFilters(false);
      setLoadingFaculty(false);
    }
  };
 
 
  const fetchAdmissions = async () => {
    try {
      setLoading(true);

      // Prepare API params
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      // Add search if available
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;

      // Add filters
      if (selectedCourse !== "all") params.course = selectedCourse;
      if (selectedBatch !== "all") params.batch = selectedBatch;
      if (selectedFaculty !== "all") params.faculty = selectedFaculty;
      if (appliedDateRange.startDate) params.startDate = appliedDateRange.startDate;
      if (appliedDateRange.endDate) params.endDate = appliedDateRange.endDate;

      // Send mapped field name to backend
      const backendSortField = fieldMapping[sortConfig.key] || sortConfig.key;
      if (backendSortField) params.sortBy = backendSortField;
      if (sortConfig.direction) params.sortOrder = sortConfig.direction;

      console.log("API Params:", params); // Debug log

      const response = await admissionAPI.getAdmissions(params);

      if (response.data.success) {
        const transformedAdmissions = response.data.data.map((admission) => ({
          id: admission._id,
          studentId:
            admission.admissionNo || `ADM${admission._id.substring(0, 8)}`,
          name: admission.fullName || admission.applicantName,
          fullName: admission.fullName || admission.applicantName,
          fatherName: admission.fatherName || "",
          photo: admission.photo || null,
          mobileNumber: admission.mobileNumber || admission.contactNo,
          contactNo: admission.mobileNumber || admission.contactNo,
          whatsappNumber: admission.mobileNumber || admission.contactNo,
          fatherNumber: admission.fatherNumber || "",
          motherNumber: admission.motherNumber || "",
          course: admission.course || admission.courseInterested,
          admissionDate: admission.admissionDate || admission.createdAt,
          batch: admission.batchTime || admission.batch || "Not specified",
          facultyAllot: admission.facultyAllot || "Not Allotted",
          aadharNumber: admission.aadharNumber || "Not provided",
          admissionStatus: admission.status || "confirmed",
          admissionBy: admission.admissionBy || "N/A",
          email: admission.email,
          primaryCourseStatus: admission.primaryCourseStatus || "active",
          additionalCourses: admission.additionalCourses || [],
        }));

        const ACTIVE_STATUSES = ["admitted", "confirmed", "pending", "provisional", "new", "under_process", "approved"];

const activeAdmissions = transformedAdmissions.filter(a => 
  ACTIVE_STATUSES.includes(a.admissionStatus)
);

setAdmissions(activeAdmissions);
setFilteredAdmissions(activeAdmissions);

        setPagination({
          ...pagination,
          total: response.data.total,
          totalPages: response.data.totalPages,
        });

        setError(null);
      } else {
        throw new Error(
          response.data.message || "Failed to fetch admissions"
        );
      }
    } catch (err) {
      console.error("Error fetching admissions:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load admissions"
      );
      setAdmissions([]);
      setFilteredAdmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  }, [debouncedSearchTerm, selectedCourse, selectedBatch, selectedFaculty, appliedDateRange]);

  const fetchStats = async () => {
    try {
      const response = await admissionAPI.getDashboardStats();
      if (response.data.success) {
        setDashboardStats(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchFilterData();
  }, []);

  useEffect(() => {
    fetchAdmissions();
  }, [
    pagination.page,
    selectedCourse,
    selectedBatch,
    selectedFaculty,
    appliedDateRange,
    sortConfig.key,
    sortConfig.direction,
    debouncedSearchTerm,
  ]);

  
  

  const handleSort = (frontendKey) => {
    // Use frontend key for comparison, but map when sending to backend
    setSortConfig({
      key: frontendKey,
      direction:
        sortConfig.key === frontendKey && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  const handleStatusAction = async () => {
    if (!selectedStudent || !statusAction) return;
    
    setProcessingStatus(true);
    try {
      let response;
      switch(statusAction) {
        case 'cancel':
          response = await admissionAPI.cancelAdmission(selectedStudent.id, statusReason);
          break;
        case 'hold':
          response = await admissionAPI.holdAdmission(selectedStudent.id, statusReason, selectedCourseType);
          break;
        case 'complete':
          response = await admissionAPI.completeAdmission(selectedStudent.id, statusReason, selectedCourseType);
          break;
        case 'reactivate':
          response = await admissionAPI.reactivateAdmission(selectedStudent.id, statusReason, selectedCourseType);
          break;
        default:
          return;
      }
      
      if (response.data.success) {
  setAdmissions(prev => prev.filter(a => a.id !== selectedStudent.id));
  setFilteredAdmissions(prev => prev.filter(a => a.id !== selectedStudent.id));
  setShowStatusModal(false);
  fetchAdmissions();
  fetchStats();
}
    } catch (error) {
      console.error(`Error ${statusAction}ing student:`, error);
      alert(`Failed to ${statusAction} student: ${error.response?.data?.message || error.message}`);
    } finally {
      setProcessingStatus(false);
    }
  };

  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const applyDateFilter = () => {
    setAppliedDateRange(dateRange);
    setShowDateFilter(false);
    setPagination({ ...pagination, page: 1 });
  };

  const clearDateFilter = () => {
    const empty = { startDate: "", endDate: "" };
    setDateRange(empty);
    setAppliedDateRange(empty);
    setPagination({ ...pagination, page: 1 });
  };

  const applyThisMonthFilter = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const range = {
      startDate: firstDay.toISOString().split("T")[0],
      endDate: lastDay.toISOString().split("T")[0],
    };
    setDateRange(range);
    setAppliedDateRange(range);
    setPagination({ ...pagination, page: 1 });
  };

  const applyTodayFilter = () => {
    const today = new Date().toISOString().split("T")[0];
    const range = { startDate: today, endDate: today };
    setDateRange(range);
    setAppliedDateRange(range);
    setPagination({ ...pagination, page: 1 });
  };

  const handleFilterChange = (filterType, value) => {
    // Reset to page 1 when any filter changes
    setPagination({ ...pagination, page: 1 });

    switch (filterType) {
      case "course":
        setSelectedCourse(value);
        break;
      case "batch":
        setSelectedBatch(value);
        break;
      case "faculty":
        setSelectedFaculty(value);
        break;
      default:
        break;
    }
  };

  const getAdmissionStatusBadge = (status) => {
    const statusMap = {
      confirmed: { color: "bg-green-100 text-green-800", label: "Confirmed" },
      admitted: { color: "bg-green-100 text-green-800", label: "Admitted" },
      pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
      provisional: { color: "bg-blue-100 text-blue-800", label: "Provisional" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" },
      completed: { color: "bg-gray-100 text-gray-800", label: "Completed" },
      on_hold: { color: "bg-orange-100 text-orange-800", label: "On Hold" },
      new: { color: "bg-blue-100 text-blue-800", label: "New" },
      under_process: {
        color: "bg-yellow-100 text-yellow-800",
        label: "Under Process",
      },
      approved: { color: "bg-green-100 text-green-800", label: "Approved" },
      rejected: { color: "bg-red-100 text-red-800", label: "Rejected" },
    };

    const config = statusMap[status] || statusMap.confirmed;
    return (
      <span className={`admission-status-badge ${config.color}`}>
        <CheckCircle size={12} />
        {config.label}
      </span>
    );
  };

  const openWhatsApp = (phoneNumber) => {
    if (!phoneNumber) {
      alert("No WhatsApp number available");
      return;
    }

    const cleanNumber = phoneNumber.replace(/\D/g, "");
    window.open(`https://wa.me/${cleanNumber}`, "_blank");
  };

  const handleDeleteAdmission = async (id, name) => {
    if (
      window.confirm(`Are you sure you want to delete admission for ${name}?`)
    ) {
      try {
        const response = await admissionAPI.deleteAdmission(id);

        if (response.data.success) {
          alert("Admission deleted successfully!");

          setAdmissions(admissions.filter((admission) => admission.id !== id));
          setFilteredAdmissions(
            filteredAdmissions.filter((admission) => admission.id !== id)
          );
          fetchStats();
        } else {
          throw new Error(
            response.data.message || "Failed to delete admission"
          );
        }
      } catch (err) {
        console.error("Error deleting admission:", err);
        alert(
          err.response?.data?.message ||
            err.message ||
            "Failed to delete admission"
        );
      }
    }
  };

  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString || dateString === "N/A") return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const handleExport = () => {
    alert("Export feature coming soon!");
  };

  // Get unique frontend key for sort indicator
  const getSortIndicator = (frontendKey) => {
    if (sortConfig.key === frontendKey) {
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return "";
  };

  return (
    <div className="admission-list-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Admission List</h1>
          <p>View all student admissions converted from enquiries</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleExport}>
            <Download size={18} />
            Export List
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading admissions...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-alert">
          <AlertCircle size={20} />
          <div>
            <strong>Error loading admissions:</strong>
            <p>{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="btn-retry"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {!loading && !error && (
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon bg-blue-100 text-blue-600">
              <UserCheck size={24} />
            </div>
            <div>
              <h3>{dashboardStats.totalAdmissions}</h3>
              <p>Total Admissions</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-green-100 text-green-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <h3>{dashboardStats.facultyAllotted}</h3>
              <p>Faculty Allotted</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-purple-100 text-purple-600">
              <Calendar size={24} />
            </div>
            <div>
              <h3>{dashboardStats.differentCourses}</h3>
              <p>Different Courses</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-orange-100 text-orange-600">
              <UserCheck size={24} />
            </div>
            <div>
              <h3>{dashboardStats.activeStudents}</h3>
              <p>Active Students</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      {!loading && !error && (
        <div className="filters-section-horizontal">
          {/* Search Box */}
          <div className="search-box-horizontal">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by name, student ID, phone, or Aadhar..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              disabled={loading}
            />
          </div>

          {/* Date Range Filter */}
          <div className="date-filter-section-horizontal">
            <button
              className="date-filter-toggle-horizontal"
              onClick={(e) => {
                e.stopPropagation();
                setShowDateFilter(!showDateFilter);
              }}
              disabled={loading}
            >
              <CalendarDays size={18} />
              {appliedDateRange.startDate && appliedDateRange.endDate ? (
                <span>
                  {formatDate(appliedDateRange.startDate)} -{" "}
                  {formatDate(appliedDateRange.endDate)}
                </span>
              ) : (
                <span>Date Range</span>
              )}
              <ChevronDown size={16} />
            </button>

            {showDateFilter && (
              <div
                className="date-filter-dropdown-horizontal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="date-filter-header">
                  <h4>Filter by Admission Date</h4>
                  <button
                    className="close-btn"
                    onClick={() => setShowDateFilter(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="date-range-inputs">
                  <div className="date-input-group">
                    <label>From Date</label>
                    <input
                      type="date"
                      name="startDate"
                      value={dateRange.startDate}
                      onChange={handleDateRangeChange}
                      max={
                        dateRange.endDate ||
                        new Date().toISOString().split("T")[0]
                      }
                    />
                  </div>

                  <div className="date-input-group">
                    <label>To Date</label>
                    <input
                      type="date"
                      name="endDate"
                      value={dateRange.endDate}
                      onChange={handleDateRangeChange}
                      min={dateRange.startDate}
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>

                <div className="quick-date-buttons">
                  <button onClick={applyTodayFilter} className="quick-date-btn">
                    Today
                  </button>
                  <button
                    onClick={applyThisMonthFilter}
                    className="quick-date-btn"
                  >
                    This Month
                  </button>
                  <button
                    onClick={clearDateFilter}
                    className="quick-date-btn clear"
                  >
                    Clear
                  </button>
                  <button
                    onClick={applyDateFilter}
                    className="quick-date-btn apply"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Course Filter */}
          <div className="filter-select-horizontal">
            <Filter size={16} />
            <select
              value={selectedCourse}
              onChange={(e) => handleFilterChange("course", e.target.value)}
              disabled={loading || loadingFilters}
            >
              <option value="all">
                {loadingFilters ? "Loading courses..." : "All Courses"}
              </option>
              {courses.map((course) => (
                <option key={course._id} value={course.courseFullName}>
                  {course.courseFullName}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="filter-chevron" />
          </div>

          {/* Batch Filter */}
          <div className="filter-select-horizontal">
            <select
              value={selectedBatch}
              onChange={(e) => handleFilterChange("batch", e.target.value)}
              disabled={loading || loadingFilters}
            >
              <option value="all">
                {loadingFilters ? "Loading batches..." : "All Batches"}
              </option>
              {batches.map((batch) => {
                const displayName = `${formatTime(batch.startTime)} to ${formatTime(batch.endTime)}`;
                return (
                  <option key={batch._id} value={displayName}>
                    {batch.batchName} ({displayName})
                  </option>
                );
              })}
            </select>
            <ChevronDown size={16} className="filter-chevron" />
          </div>

          {/* Faculty Filter */}
          <div className="filter-select-horizontal">
            <select
              value={selectedFaculty}
              onChange={(e) => handleFilterChange("faculty", e.target.value)}
              disabled={loading || loadingFaculty}
            >
              <option value="all">
                {loadingFaculty ? "Loading faculty..." : "All Faculty"}
              </option>
              {facultyMembers.map((faculty) => (
                <option key={faculty._id} value={faculty.facultyName}>
                  {faculty.facultyName} ({faculty.facultyNo})
                </option>
              ))}
              <option value="Not Allotted">Not Allotted</option>
            </select>
            <ChevronDown size={16} className="filter-chevron" />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("studentId")} className="sortable">
                Student ID {getSortIndicator("studentId")}
              </th>
              <th onClick={() => handleSort("name")} className="sortable">
                Student Name {getSortIndicator("name")}
              </th>
              <th>Contact Info</th>
              <th onClick={() => handleSort("course")} className="sortable">
                Course {getSortIndicator("course")}
              </th>
              <th
                onClick={() => handleSort("admissionDate")}
                className="sortable"
              >
                Admission Date {getSortIndicator("admissionDate")}
              </th>
              <th>Batch</th>
              <th>Faculty Allot</th>
              <th>Admitted By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && !error && filteredAdmissions.length > 0 ? (
              filteredAdmissions.map((admission) => (
                <tr key={admission.id}>
                  <td className="student-id">{admission.studentId}</td>
                  <td>
  <div className="student-info">
    {admission.photo ? (
      <img
        src={admission.photo}
        alt={admission.name}
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
        onError={(e) => {
          e.target.onerror = null;
          e.target.style.display = "none";
          e.target.nextSibling.style.display = "flex";
        }}
      />
    ) : null}
    <div
      className="avatar"
      style={{ display: admission.photo ? "none" : "flex" }}
    >
      {admission.name ? admission.name.charAt(0) : "?"}
    </div>
    <div>
      <strong>{admission.name || "N/A"}</strong>
      <small>Father: {admission.fatherName || "N/A"}</small>
    </div>
  </div>
</td>
                  <td>
                    <div className="contact-info">
                      <div>
                        <Phone size={14} /> {admission.mobileNumber || "N/A"}
                      </div>
                      <div>
                        <MessageCircle size={14} className="whatsapp-icon" />
                        {admission.whatsappNumber ||
                          admission.mobileNumber ||
                          "N/A"}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="course-cell">
                      <span>{admission.course || "N/A"}</span>
                      {getCourseDuration(admission.course) && (
                        <span className="course-duration-tag">
                          {formatDuration(getCourseDuration(admission.course))}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="date-info">
                      <Calendar size={14} />
                      {formatDate(admission.admissionDate)}
                    </div>
                  </td>
                  <td>
                    <span className="batch-badge">{admission.batch}</span>
                  </td>
                  <td>
                    <span
                      className={`faculty-badge ${
                        admission.facultyAllot === "Not Allotted"
                          ? "not-allotted"
                          : ""
                      }`}
                    >
                      {admission.facultyAllot}
                    </span>
                  </td>
                  <td>
  <span className="admitted-by-badge">{admission.admissionBy}</span>
</td>
                  <td>
                    <div className="action-buttons">
                      <Link
                        to={`${basePath}/front-office/admissions/view/${admission.id}`}
                        className="action-btn view"
                        title="View Admission"
                      >
                        <Eye size={16} />
                      </Link>

                      <div className="dropdown-container">
                        <button
                          className="action-btn more"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown(admission.id);
                          }}
                          title="More options"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openDropdown === admission.id && (
                          <div
                            className="dropdown-menu"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              to={`${basePath}/front-office/admissions/edit/${admission.id}`}
                              className="dropdown-item"
                            >
                              <Edit size={14} />
                              <span>Edit Admission</span>
                            </Link>

                            <button
                              className="dropdown-item"
                              onClick={() => {
                                navigate(`${basePath}/front-office/calls`, {
                                  state: {
                                    openCallModalFor: { ...admission, _id: admission.id },
                                    openCallModalType: "admission",
                                  }
                                });
                                setOpenDropdown(null);
                              }}
                            >
                              <Phone size={14} />
                              <span>Log Call</span>
                            </button>

                            <Link
                              to={`${basePath}/students/batch-transfer/add?admissionId=${admission.id}`}
                              className="dropdown-item"
                            >
                              <ArrowLeftRight size={14} />
                              <span>Batch Transfer</span>
                            </Link>

                                                        <Link
  to={`${basePath}/students/material-issue?search=${encodeURIComponent(admission.studentId)}&tab=issue`}
  className="dropdown-item"
>
  <Package size={14} />
  <span>Issue Material</span>
</Link>
                            
                            {/* Cancel Option - Only show if not already cancelled */}
                            {admission.admissionStatus !== "cancelled" && (
                              <button
                                className="dropdown-item cancel-option"
                                onClick={() => {
                                  setSelectedStudent(admission);
                                  setStatusAction('cancel');
                                  setStatusReason('');
                                  setShowStatusModal(true);
                                  setOpenDropdown(null);
                                }}
                              >
                                <XCircle size={14} color="#dc2626" />
                                <span>Cancel Admission</span>
                              </button>
                            )}
                            
                            {/* Hold Option - Only show if active/admitted */}
                            {(admission.admissionStatus === "admitted" || admission.admissionStatus === "confirmed") && (
                              <button
                                className="dropdown-item hold-option"
                                onClick={() => {
                                  setSelectedStudent(admission);
                                  setStatusAction('hold');
                                  setStatusReason('');
                                  setSelectedCourseType('all');
                                  setShowStatusModal(true);
                                  setOpenDropdown(null);
                                }}
                              >
                                <PauseCircle size={14} color="#f59e0b" />
                                <span>Put on Hold</span>
                              </button>
                            )}
                            
                            
                            {/* Reactivate Option - Only show if cancelled or on hold */}
                            {(admission.admissionStatus === "cancelled" || admission.admissionStatus === "on_hold") && (
                              <button
                                className="dropdown-item reactivate-option"
                                onClick={() => {
                                  setSelectedStudent(admission);
                                  setStatusAction('reactivate');
                                  setStatusReason('');
                                  setSelectedCourseType('all');
                                  setShowStatusModal(true);
                                  setOpenDropdown(null);
                                }}
                              >
                                <RotateCcw size={14} color="#3b82f6" />
                                <span>Reactivate Student</span>
                              </button>
                            )}
                            
                            <button
  className="dropdown-item"
  onClick={() => {
    setSelectedAdmissionForWhatsApp(admission);
    setShowWhatsAppModal(true);
    setOpenDropdown(null);
  }}
>
  <MessageCircle size={14} />
  <span>Chat on WhatsApp</span>
</button>
                            
                            <button
                              className="dropdown-item delete-option"
                              onClick={() =>
                                handleDeleteAdmission(
                                  admission.id,
                                  admission.name
                                )
                              }
                            >
                              <Trash2 size={14} />
                              <span>Delete Admission</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="empty-row">
                  <div className="empty-state">
                    <UserCheck size={48} />
                    <h3>No admissions found</h3>
                    <p>
                      {loading
                        ? "Loading..."
                        : "Try adjusting your search or filter criteria."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && !error && pagination.totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} admissions
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1 || loading}
            >
              Previous
            </button>
            <span className="pagination-page-info">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Status Action Modal */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              {statusAction === 'cancel' && 'Cancel Admission'}
              {statusAction === 'hold' && 'Put Student on Hold'}
              {statusAction === 'complete' && 'Mark Student as Complete'}
              {statusAction === 'reactivate' && 'Reactivate Student'}
            </h3>
            
            <p className="modal-student-name">
              {selectedStudent?.name} ({selectedStudent?.studentId})
            </p>

            {(statusAction === 'hold' || statusAction === 'reactivate') &&
              selectedStudent?.additionalCourses?.length > 0 && (
              <div className="form-group">
                <label>Apply to</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <button
                    type="button"
                    className={`btn-secondary${selectedCourseType === "primary" ? " active" : ""}`}
                    style={{
                      textAlign: "left",
                      border: selectedCourseType === "primary" ? "2px solid #3b82f6" : "1px solid #d1d5db",
                    }}
                    onClick={() => setSelectedCourseType("primary")}
                  >
                    Primary course only ({selectedStudent.course})
                  </button>

                  {selectedStudent.additionalCourses.map((ac) => (
                    <button
                      key={ac._id}
                      type="button"
                      className={`btn-secondary${selectedCourseType === ac._id ? " active" : ""}`}
                      style={{
                        textAlign: "left",
                        border: selectedCourseType === ac._id ? "2px solid #3b82f6" : "1px solid #d1d5db",
                      }}
                      onClick={() => setSelectedCourseType(ac._id)}
                    >
                      {ac.courseName} only
                    </button>
                  ))}

                  <button
                    type="button"
                    className={`btn-secondary${selectedCourseType === "all" ? " active" : ""}`}
                    style={{
                      textAlign: "left",
                      border: selectedCourseType === "all" ? "2px solid #3b82f6" : "1px solid #d1d5db",
                    }}
                    onClick={() => setSelectedCourseType("all")}
                  >
                    All courses (normal hold)
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Reason {statusAction !== 'reactivate' ? '(required)' : '(optional)'}</label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder={
                  statusAction === 'cancel' ? 'Why is this admission being cancelled?' :
                  statusAction === 'hold' ? 'Reason for putting on hold' :
                  statusAction === 'complete' ? 'Completion remarks (optional)' :
                  'Reason for reactivation (optional)'
                }
                rows="3"
                required={statusAction !== 'reactivate'}
              />
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setShowStatusModal(false)}
                disabled={processingStatus}
              >
                Cancel
              </button>
              <button 
                className={`btn-${statusAction}`}
                onClick={handleStatusAction}
                disabled={
                  processingStatus || 
                  (statusAction !== 'reactivate' && !statusReason.trim())
                }
              >
                {processingStatus ? 'Processing...' : 
                  statusAction === 'cancel' ? 'Yes, Cancel' :
                  statusAction === 'hold' ? 'Yes, Hold' :
                  statusAction === 'complete' ? 'Yes, Complete' :
                  'Yes, Reactivate'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {showWhatsAppModal && selectedAdmissionForWhatsApp && (
  <div className="modal-overlay" onClick={() => setShowWhatsAppModal(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <div>
          <h3>Select WhatsApp Number</h3>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#666" }}>
            {selectedAdmissionForWhatsApp.name || "N/A"}
          </p>
        </div>
        <button className="close-btn" onClick={() => setShowWhatsAppModal(false)}>×</button>
      </div>
      <div className="modal-body">
        <div className="whatsapp-options">
          {selectedAdmissionForWhatsApp.mobileNumber && (
            <button
              className="whatsapp-option-btn"
              onClick={() => {
                openWhatsApp(selectedAdmissionForWhatsApp.mobileNumber);
                setShowWhatsAppModal(false);
              }}
            >
              <MessageCircle size={18} />
              <div>
                <strong>Student Number</strong>
                <p>{selectedAdmissionForWhatsApp.mobileNumber}</p>
              </div>
            </button>
          )}

          {selectedAdmissionForWhatsApp.fatherNumber && (
            <button
              className="whatsapp-option-btn"
              onClick={() => {
                openWhatsApp(selectedAdmissionForWhatsApp.fatherNumber);
                setShowWhatsAppModal(false);
              }}
            >
              <MessageCircle size={18} />
              <div>
                <strong>Father's Number</strong>
                <p>{selectedAdmissionForWhatsApp.fatherNumber}</p>
              </div>
            </button>
          )}

          {selectedAdmissionForWhatsApp.motherNumber && (
            <button
              className="whatsapp-option-btn"
              onClick={() => {
                openWhatsApp(selectedAdmissionForWhatsApp.motherNumber);
                setShowWhatsAppModal(false);
              }}
            >
              <MessageCircle size={18} />
              <div>
                <strong>Mother's Number</strong>
                <p>{selectedAdmissionForWhatsApp.motherNumber}</p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default AdmissionList;