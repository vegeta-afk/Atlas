// pages/reports/CompleteList.jsx
import React, { useState, useEffect } from "react";
import { Search, Filter, Download, Eye, ChevronDown, MoreVertical,
  Phone, Calendar, CheckCircle, UserCheck, CalendarDays,
  MessageCircle, AlertCircle, Award, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import "./ReportList.css";
import { admissionAPI } from "../services/api";
import CertificateModal from "../components/certifications/CertificateModal";
import MarksheetModal from "../components/certifications/MarksheetModal";

const CompleteList = () => {
  // State variables
  const [admissions, setAdmissions] = useState([]);
  const [filteredAdmissions, setFilteredAdmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedFaculty, setSelectedFaculty] = useState("all");
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

  const [marksheetModal, setMarksheetModal] = useState(null);
  const [certModal, setCertModal] = useState(null);
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

  // Fetch completed admissions from backend
  const fetchCompletedAdmissions = async () => {
    try {
      setLoading(true);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        status: "completed", // Filter by completed status
      };

      if (searchTerm) params.search = searchTerm;
      if (selectedCourse !== "all") params.course = selectedCourse;
      if (selectedBatch !== "all") params.batch = selectedBatch;
      if (selectedFaculty !== "all") params.faculty = selectedFaculty;
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      const backendSortField = fieldMapping[sortConfig.key] || sortConfig.key;
      if (backendSortField) params.sortBy = backendSortField;
      if (sortConfig.direction) params.sortOrder = sortConfig.direction;

      const response = await admissionAPI.getAdmissions(params);

      if (response.data.success) {
        const transformedAdmissions = response.data.data.map((admission) => ({
          id: admission._id,
          studentId: admission.admissionNo || `ADM${admission._id.substring(0, 8)}`,
          name: admission.fullName || admission.applicantName,
          mobileNumber: admission.mobileNumber || admission.contactNo,
          whatsappNumber: admission.mobileNumber || admission.contactNo,
          course: admission.course || admission.courseInterested,
          admissionDate: admission.admissionDate || admission.createdAt,
          batch: admission.batchTime || admission.batch || "Not specified",
          facultyAllot: admission.facultyAllot || "Not Allotted",
          aadharNumber: admission.aadharNumber || "Not provided",
          admissionStatus: admission.status || "completed",
          email: admission.email,
          completionRemarks: admission.remarks || "Course completed",
          completedAt: admission.updatedAt || admission.createdAt,
        }));

        setAdmissions(transformedAdmissions);
        setFilteredAdmissions(transformedAdmissions);

        setPagination({
          ...pagination,
          total: response.data.total,
          totalPages: response.data.totalPages,
        });

        setError(null);
      }
    } catch (err) {
      console.error("Error fetching completed admissions:", err);
      setError(err.message || "Failed to load completed admissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedAdmissions();
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
    setSortConfig({
      key: frontendKey,
      direction:
        sortConfig.key === frontendKey && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const clearDateFilter = () => {
    setDateRange({ startDate: "", endDate: "" });
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

  const getStatusBadge = (status) => {
    return (
      <span className="admission-status-badge bg-green-100 text-green-800">
        <CheckCircle size={12} />
        Completed
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
          <h1>Completed Students</h1>
          <p>View all students who have completed their courses</p>
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
          <p>Loading completed students...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-alert">
          <AlertCircle size={20} />
          <div>
            <strong>Error loading completed students:</strong>
            <p>{error}</p>
          </div>
          <button onClick={() => window.location.reload()} className="btn-retry">
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {!loading && !error && (
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon bg-green-100 text-green-600">
              <Award size={24} />
            </div>
            <div>
              <h3>{admissions.length}</h3>
              <p>Total Completed</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-blue-100 text-blue-600">
              <Calendar size={24} />
            </div>
            <div>
              <h3>{new Set(admissions.map((a) => a.course)).size}</h3>
              <p>Different Courses</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-purple-100 text-purple-600">
              <UserCheck size={24} />
            </div>
            <div>
              <h3>{admissions.filter(a => a.facultyAllot !== "Not Allotted").length}</h3>
              <p>Had Faculty</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-yellow-100 text-yellow-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <h3>{Math.round(admissions.length * 0.85)}</h3>
              <p>Placement Eligible</p>
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
                  {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
                </span>
              ) : (
                <span>Completion Date</span>
              )}
              <ChevronDown size={16} />
            </button>

            {showDateFilter && (
              <div
                className="date-filter-dropdown-horizontal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="date-filter-header">
                  <h4>Filter by Completion Date</h4>
                  <button className="close-btn" onClick={() => setShowDateFilter(false)}>
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
                      max={dateRange.endDate || new Date().toISOString().split("T")[0]}
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
                  <button onClick={applyThisMonthFilter} className="quick-date-btn">
                    This Month
                  </button>
                  <button onClick={clearDateFilter} className="quick-date-btn clear">
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
                <option key={course} value={course === "All Courses" ? "all" : course}>
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
                <option key={batch} value={batch === "All Batches" ? "all" : batch}>
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
                <option key={faculty} value={faculty === "All Faculty" ? "all" : faculty}>
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
              <th>Completion Date</th>
              <th>Remarks</th>
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
                      <div className="avatar">
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
                        {admission.whatsappNumber || admission.mobileNumber || "N/A"}
                      </div>
                    </div>
                  </td>
                  <td>{admission.course || "N/A"}</td>
                  <td>
                    <div className="date-info">
                      <Calendar size={14} />
                      {formatDate(admission.completedAt)}
                    </div>
                  </td>
                  <td>
                    <div className="reason-cell" title={admission.completionRemarks}>
                      {(admission.completionRemarks?.length > 30)
  ? `${admission.completionRemarks.substring(0, 30)}...`
  : (admission.completionRemarks || "—")}
                    </div>
                  </td>
                  <td>{getStatusBadge(admission.admissionStatus)}</td>
                  <td>
                    <div className="action-buttons">
                      <Link
                       to={`/front-office/admissions/view/${admission.id}`}
                        className="action-btn view"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </Link>

                      <button
  className="action-btn"
  title="View Certificate"
  onClick={(e) => {
    e.stopPropagation();
    setCertModal({ id: admission.id, name: admission.name });
  }}
  style={{
    background: "#fff8e1",
    border: "1px solid #f9a825",
    borderRadius: 6,
    padding: "5px 8px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    color: "#f57f17",
  }}
>
  <Award size={16} />
</button>

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
                          <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="dropdown-item"
                              onClick={() => openWhatsApp(admission.whatsappNumber || admission.mobileNumber)}
                            >
                              <MessageCircle size={14} />
                              <span>Chat on WhatsApp</span>
                            </button>

                            <button
      className="dropdown-item"
      onClick={() => {
        setMarksheetModal({ id: admission.id, name: admission.name });
        setOpenDropdown(null);
      }}
    >
      <FileText size={14} />   {/* add FileText to your lucide imports */}
      <span>View Marksheet</span>
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
                <td colSpan="8" className="empty-row">
                  <div className="empty-state">
                    <Award size={48} />
                    <h3>No completed students found</h3>
                    <p>
                      {loading ? "Loading..." : "No students have completed their courses yet."}
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
            {pagination.total} completed students
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
      {certModal && (
  <CertificateModal
    studentId={certModal.id}
    studentName={certModal.name}
    onClose={() => setCertModal(null)}
  />

  
)}

{marksheetModal && (
  <MarksheetModal
    studentId={marksheetModal.id}
    studentName={marksheetModal.name}
    onClose={() => setMarksheetModal(null)}
  />
)}

      
    </div>
  );
};

export default CompleteList;