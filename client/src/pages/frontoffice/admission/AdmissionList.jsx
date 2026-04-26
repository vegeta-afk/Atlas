// pages/frontoffice/admission/AdmissionList.jsx
import React, { useState, useEffect } from "react";
import { facultyAPI } from "../../../services/api";
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
  RotateCcw
} from "lucide-react";
import { Link } from "react-router-dom";
import "./AdmissionList.css";
import { admissionAPI } from "../../../services/api";

const AdmissionList = () => {

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
  const [processingStatus, setProcessingStatus] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
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

  const [facultyMembers, setFacultyMembers] = useState([]);
  const [loadingFaculty, setLoadingFaculty] = useState(false);

  // Course options
  const courseOptions = [
    "All Courses",
    "B.Tech Computer Science",
    "MBA",
    "MCA",
    "BBA",
    "BCA",
    "M.Tech",
    "Ph.D",
  ];

  const batchOptions = [
    "All Batches",
    "Morning",
    "Afternoon",
    "Evening",
    "Weekend",
  ];

  const facultyOptions = [
    "All Faculty",
    "Dr. Sharma",
    "Prof. Gupta",
    "Dr. Singh",
    "Prof. Patel",
    "Dr. Kumar",
    "Prof. Reddy",
    "Dr. Joshi",
    "Prof. Mishra",
    "Not Allotted",
  ];

  // Field mapping for sorting
  const fieldMapping = {
    studentId: "admissionNo",
    name: "fullName",
    course: "course",
    admissionDate: "admissionDate",
  };

  // Fetch admissions from backend
  const fetchAdmissions = async () => {
    try {
      setLoading(true);

      // Prepare API params
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      // Add search if available
      if (searchTerm) params.search = searchTerm;

      // Add filters
      if (selectedCourse !== "all") params.course = selectedCourse;
      if (selectedBatch !== "all") params.batch = selectedBatch;
      if (selectedFaculty !== "all") params.faculty = selectedFaculty;
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

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
          photo: admission.photo || null,
          mobileNumber: admission.mobileNumber || admission.contactNo,
          whatsappNumber: admission.mobileNumber || admission.contactNo,
          course: admission.course || admission.courseInterested,
          admissionDate: admission.admissionDate || admission.createdAt,
          batch: admission.batchTime || admission.batch || "Not specified",
          facultyAllot: admission.facultyAllot || "Not Allotted",
          aadharNumber: admission.aadharNumber || "Not provided",
          admissionStatus: admission.status || "confirmed",
          email: admission.email,
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
    fetchAdmissions();
  }, [
    pagination.page,
    selectedCourse,
    selectedBatch,
    selectedFaculty,
    dateRange,
    sortConfig.key,
    sortConfig.direction,
  ]);

  // Local filtering for search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredAdmissions(admissions);
      return;
    }

    const filtered = admissions.filter(
      (admission) =>
        admission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admission.mobileNumber.includes(searchTerm) ||
        admission.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admission.aadharNumber.includes(searchTerm) ||
        admission.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredAdmissions(filtered);
  }, [searchTerm, admissions]);

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
          response = await admissionAPI.holdAdmission(selectedStudent.id, statusReason);
          break;
        case 'complete':
          response = await admissionAPI.completeAdmission(selectedStudent.id, statusReason);
          break;
        case 'reactivate':
          response = await admissionAPI.reactivateAdmission(selectedStudent.id, statusReason);
          break;
        default:
          return;
      }
      
      if (response.data.success) {
  // Instantly remove from UI without waiting for refetch
  setAdmissions(prev => prev.filter(a => a.id !== selectedStudent.id));
  setFilteredAdmissions(prev => prev.filter(a => a.id !== selectedStudent.id));
  setShowStatusModal(false);
  fetchAdmissions(); // still refresh for accurate counts
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

  const clearDateFilter = () => {
    setDateRange({
      startDate: "",
      endDate: "",
    });
    setPagination({ ...pagination, page: 1 });
  };

  const applyThisMonthFilter = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setDateRange({
      startDate: firstDay.toISOString().split("T")[0],
      endDate: lastDay.toISOString().split("T")[0],
    });
    setPagination({ ...pagination, page: 1 });
  };

  const applyTodayFilter = () => {
    const today = new Date().toISOString().split("T")[0];
    setDateRange({
      startDate: today,
      endDate: today,
    });
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
              <h3>{admissions.length}</h3>
              <p>Total Admissions</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-green-100 text-green-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <h3>
                {
                  admissions.filter((a) => a.facultyAllot !== "Not Allotted")
                    .length
                }
              </h3>
              <p>Faculty Allotted</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-purple-100 text-purple-600">
              <Calendar size={24} />
            </div>
            <div>
              <h3>{new Set(admissions.map((a) => a.course)).size}</h3>
              <p>Different Courses</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-orange-100 text-orange-600">
              <UserCheck size={24} />
            </div>
            <div>
              <h3>
                {
                  admissions.filter(
                    (a) =>
                      a.admissionStatus === "admitted" ||
                      a.admissionStatus === "confirmed"
                  ).length
                }
              </h3>
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
              {dateRange.startDate && dateRange.endDate ? (
                <span>
                  {formatDate(dateRange.startDate)} -{" "}
                  {formatDate(dateRange.endDate)}
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
              disabled={loading}
            >
              {courseOptions.map((course) => (
                <option
                  key={course}
                  value={course === "All Courses" ? "all" : course}
                >
                  {course}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Filter */}
          <div className="filter-select-horizontal">
            <select
              value={selectedBatch}
              onChange={(e) => handleFilterChange("batch", e.target.value)}
              disabled={loading}
            >
              {batchOptions.map((batch) => (
                <option
                  key={batch}
                  value={batch === "All Batches" ? "all" : batch}
                >
                  {batch}
                </option>
              ))}
            </select>
          </div>

          {/* Faculty Filter */}
          <div className="filter-select-horizontal">
            <select
              value={selectedFaculty}
              onChange={(e) => handleFilterChange("faculty", e.target.value)}
              disabled={loading}
            >
              {facultyOptions.map((faculty) => (
                <option
                  key={faculty}
                  value={faculty === "All Faculty" ? "all" : faculty}
                >
                  {faculty}
                </option>
              ))}
            </select>
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
              <th>Status</th>
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
      <small>Aadhar: {admission.aadharNumber}</small>
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
                  <td>{admission.course || "N/A"}</td>
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
                  <td>{getAdmissionStatusBadge(admission.admissionStatus)}</td>
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
                                  setShowStatusModal(true);
                                  setOpenDropdown(null);
                                }}
                              >
                                <PauseCircle size={14} color="#f59e0b" />
                                <span>Put on Hold</span>
                              </button>
                            )}
                            
                            {/* Complete Option - Only show if active/admitted */}
                            {(admission.admissionStatus === "admitted" || admission.admissionStatus === "confirmed") && (
                              <button
                                className="dropdown-item complete-option"
                                onClick={() => {
                                  setSelectedStudent(admission);
                                  setStatusAction('complete');
                                  setStatusReason('');
                                  setShowStatusModal(true);
                                  setOpenDropdown(null);
                                }}
                              >
                                <CheckCircle2 size={14} color="#10b981" />
                                <span>Mark Complete</span>
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
                              onClick={() =>
                                openWhatsApp(
                                  admission.whatsappNumber ||
                                    admission.mobileNumber
                                )
                              }
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
    </div>
  );
};

export default AdmissionList;