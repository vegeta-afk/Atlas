// pages/frontoffice/enquiry/EnquiryList.jsx
import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  UserPlus,
  Eye,
  UserCheck,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  MoreVertical,
  ChevronDown,
  CalendarDays,
  RefreshCw,
  AlertCircle,
  MessageCircle,
  Trash2,
  Edit,
  Bell,
  RotateCcw,
} from "lucide-react";
import { Link } from "react-router-dom";
import "./EnquiryList.css";
import { enquiryAPI } from "../../../services/api";

const EnquiryList = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [filteredEnquiries, setFilteredEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    converted: 0,
    followUp: 0,
    new: 0,
    rejectedLost: 0,
  });

  const basePath = "";

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: "enquiryNo",
    direction: "desc",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // State for dropdown menu
  const [openDropdown, setOpenDropdown] = useState(null);

  // Status options
  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "follow_up", label: "Follow Up" },
    { value: "converted", label: "Converted" },
    { value: "rejected", label: "Rejected" },
    { value: "lost", label: "Lost" },
  ];

  const enquiryMethods = [
    "All Methods",
    "walkin",
    "phone_call",
    "website",
    "reference",
    "social_media",
    "newspaper",
    "seminar",
    "other",
  ];

  // Fetch enquiries from backend
  const fetchEnquiries = async () => {
    setLoading(true);
    setError(null);

    try {
      // Prepare API params
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (searchTerm) params.search = searchTerm;
      if (selectedStatus !== "all") params.status = selectedStatus;
      if (selectedMethod !== "all") params.method = selectedMethod;
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      if (sortConfig.key) params.sortBy = sortConfig.key;
      if (sortConfig.direction) params.sortOrder = sortConfig.direction;

      const response = await enquiryAPI.getEnquiries(params);

      if (response.data.success) {
        setEnquiries(response.data.data || []);
        setFilteredEnquiries(response.data.data || []);

        // Update pagination
        setPagination({
          ...pagination,
          total: response.data.total,
          totalPages: response.data.totalPages,
        });

        // Calculate stats
        calculateStats(response.data.data || []);
      } else {
        throw new Error(response.data.message || "Failed to fetch enquiries");
      }
    } catch (err) {
      console.error("Error fetching enquiries:", err);
      setError(
        err.response?.data?.message || err.message || "Failed to load enquiries"
      );
      setEnquiries([]);
      setFilteredEnquiries([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (data) => {
    const total = data.length;
    const converted = data.filter((e) => e.status === "converted").length;
    const followUp = data.filter((e) => e.status === "follow_up").length;
    const newCount = data.filter((e) => e.status === "new").length;
    const rejectedLost = data.filter(
      (e) => e.status === "rejected" || e.status === "lost"
    ).length;

    setStats({ total, converted, followUp, new: newCount, rejectedLost });
  };

  // Initial fetch
  useEffect(() => {
    fetchEnquiries();
  }, [pagination.page, selectedStatus, selectedMethod, dateRange, sortConfig]);

  // Local search/filter
  useEffect(() => {
    if (!searchTerm) {
      setFilteredEnquiries(enquiries);
      return;
    }

    const filtered = enquiries.filter(
      (enquiry) =>
        enquiry.applicantName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        enquiry.contactNo?.includes(searchTerm) ||
        enquiry.enquiryNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enquiry.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enquiry.whatsappNo?.includes(searchTerm)
    );
    setFilteredEnquiries(filtered);
    calculateStats(filtered);
  }, [searchTerm, enquiries]);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
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
  };

  const applyThisMonthFilter = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setDateRange({
      startDate: firstDay.toISOString().split("T")[0],
      endDate: lastDay.toISOString().split("T")[0],
    });
  };

  const applyTodayFilter = () => {
    const today = new Date().toISOString().split("T")[0];
    setDateRange({ startDate: today, endDate: today });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      new: {
        color: "bg-blue-100 text-blue-800",
        label: "New",
        icon: <Clock size={12} />,
      },
      contacted: {
        color: "bg-yellow-100 text-yellow-800",
        label: "Contacted",
        icon: <Phone size={12} />,
      },
      follow_up: {
        color: "bg-orange-100 text-orange-800",
        label: "Follow Up",
        icon: <Bell size={12} />,
      },
      converted: {
        color: "bg-green-100 text-green-800",
        label: "Converted",
        icon: <CheckCircle size={12} />,
      },
      rejected: {
        color: "bg-red-100 text-red-800",
        label: "Rejected",
        icon: <XCircle size={12} />,
      },
      lost: {
        color: "bg-gray-100 text-gray-800",
        label: "Lost",
        icon: <XCircle size={12} />,
      },
    };
    const config = statusMap[status] || statusMap.new;
    return (
      <span className={`status-badge ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // Function to update enquiry status
  const updateEnquiryStatus = async (enquiryId, newStatus) => {
    try {
      setLoading(true);
      const response = await enquiryAPI.updateEnquiryStatus(enquiryId, {
        status: newStatus,
      });

      if (response.data.success) {
        alert(`Status updated to ${newStatus.replace("_", " ")} successfully!`);
        fetchEnquiries(); // Refresh the list
      } else {
        throw new Error(response.data.message || "Failed to update status");
      }
    } catch (err) {
      console.error("Error updating enquiry status:", err);
      alert(err.response?.data?.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  // Quick action handlers
  const handleFollowUpEnquiry = (enquiry) => {
    if (
      window.confirm(`Mark ${enquiry.applicantName}'s enquiry for Follow Up?`)
    ) {
      updateEnquiryStatus(enquiry._id, "follow_up");
    }
  };

  const handleRejectEnquiry = (enquiry) => {
    if (window.confirm(`Reject ${enquiry.applicantName}'s enquiry?`)) {
      updateEnquiryStatus(enquiry._id, "rejected");
    }
  };

  const handleResetToNew = (enquiry) => {
    if (window.confirm(`Reset ${enquiry.applicantName}'s enquiry to New?`)) {
      updateEnquiryStatus(enquiry._id, "new");
    }
  };

  // UPDATED: Handle Convert to Admission - Include father number and DOB
  // UPDATED: Handle Convert to Admission - Include father number and DOB
  // UPDATED: Handle Convert to Admission - Include father number, DOB, AND COURSE ID
const handleConvertToAdmission = (enquiry) => {
  // Store enquiry data with father's number, DOB, and COURSE ID
  const enquiryData = {
    _id: enquiry._id,
    enquiryNo: enquiry.enquiryNo,

    // Personal Information
    applicantName: enquiry.applicantName || "",
    fatherName: enquiry.guardianName || "", // Guardian name as father's name
    dateOfBirth: enquiry.dateOfBirth || "", // Include DOB
    gender: enquiry.gender || "",

    // Contact Information - Include father's number
    contactNo: enquiry.contactNo || "",
    fatherNumber: enquiry.guardianContact || enquiry.whatsappNo || "", // Use guardianContact or whatsappNo
    email: enquiry.email || "",

    // Address Information
    address: enquiry.place || "",
    place: enquiry.place || "",
    city: enquiry.city || "",
    state: enquiry.state || "",

    // Academic Information
    qualification: enquiry.qualification || "",
    yearOfPassing: enquiry.yearOfPassing || "",

    // Course Information - IMPORTANT: Include courseId
    courseInterested: enquiry.courseInterested || "",
    courseId: enquiry.courseId                                          // shape 1: courseId field exists
  || (typeof enquiry.course === "object" && enquiry.course !== null 
      ? enquiry.course._id                                          // shape 2: course is populated object
      : enquiry.course)                                             // shape 3: course is a raw string ID
  || "", // ADD THIS LINE
    batchTime: enquiry.batchTime || "",

    // Reference
    reference: enquiry.reference || "",

    // Other
    enquiryMethod: enquiry.enquiryMethod || "",
    enquiryBy: enquiry.enquiryBy || "",
    remark: enquiry.remark || "", // Correct field name from your enquiry model
  };

  // ✅ ADD DEBUG LOGS HERE:
  console.log("🔍 DEBUG: Enquiry data being saved to localStorage:");
  console.log("Place from enquiry:", enquiry.place);
  console.log("State from enquiry:", enquiry.state);
  console.log("Qualification from enquiry:", enquiry.qualification);
  console.log("Course ID from enquiry:", enquiry.courseId || enquiry.course?._id); // ADD THIS LOG
  console.log("Full enquiryData object:", enquiryData);

  // Save to localStorage
  localStorage.setItem("enquiryData", JSON.stringify(enquiryData));

  // ✅ VERIFY THE SAVE:
  const savedData = localStorage.getItem("enquiryData");
  console.log(
    "🔍 DEBUG: Data retrieved from localStorage:",
    JSON.parse(savedData)
  );

  // Redirect to AddAdmission page
  window.location.href = `/front-office/admissions/add?fromEnquiry=true`;
};

  const handleDeleteEnquiry = async (id) => {
    if (!window.confirm("Are you sure you want to delete this enquiry?"))
      return;

    try {
      const response = await enquiryAPI.deleteEnquiry(id);
      if (response.data.success) {
        alert("Enquiry deleted successfully!");
        fetchEnquiries(); // Refresh the list
      }
    } catch (err) {
      console.error("Error deleting enquiry:", err);
      alert(err.response?.data?.message || "Failed to delete enquiry");
    }
  };

  const handleRefresh = () => {
    fetchEnquiries();
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const formatMethod = (method) => {
    return method
      ? method.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
      : "";
  };

  // Open WhatsApp chat
  const openWhatsApp = (phoneNumber) => {
    if (!phoneNumber) {
      alert("No WhatsApp number available");
      return;
    }

    // Clean the phone number (remove any non-digit characters)
    const cleanNumber = phoneNumber.replace(/\D/g, "");

    // Open WhatsApp with the number
    window.open(`https://wa.me/${cleanNumber}`, "_blank");
  };

  // Toggle dropdown menu
  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div className="enquiry-list-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Enquiry List</h1>
          <p>Manage all incoming enquiries</p>
        </div>
        <div className="header-actions">
          <button
            onClick={handleRefresh}
            className="btn-secondary"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "spinning" : ""} />
            Refresh
          </button>
          <Link to="/front-office/enquiries/add" className="btn-primary">
            <UserPlus size={18} />
            New Enquiry
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading enquiries...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-alert">
          <AlertCircle size={20} />
          <div>
            <strong>Error loading enquiries:</strong>
            <p>{error}</p>
          </div>
          <button onClick={fetchEnquiries} className="btn-retry">
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {!loading && !error && (
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon bg-blue-100 text-blue-600">
              <UserPlus size={24} />
            </div>
            <div>
              <h3>{stats.total}</h3>
              <p>Total Enquiries</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-green-100 text-green-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <h3>{stats.converted}</h3>
              <p>Converted</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-orange-100 text-orange-600">
              <Bell size={24} />
            </div>
            <div>
              <h3>{stats.followUp}</h3>
              <p>Follow Up</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-blue-100 text-blue-600">
              <Clock size={24} />
            </div>
            <div>
              <h3>{stats.new}</h3>
              <p>New</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-red-100 text-red-600">
              <XCircle size={24} />
            </div>
            <div>
              <h3>{stats.rejectedLost}</h3>
              <p>Rejected/Lost</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      {!loading && !error && (
        <>
          <div className="filters-section-horizontal">
            {/* Search Box */}
            <div className="search-box">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search by name, phone, enquiry no or WhatsApp no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Date Range Filter */}
            <div className="date-filter-section">
              <button
                className="date-filter-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDateFilter(!showDateFilter);
                }}
              >
                <CalendarDays size={18} />
                {dateRange.startDate && dateRange.endDate ? (
                  <span>
                    {new Date(dateRange.startDate).toLocaleDateString()} -{" "}
                    {new Date(dateRange.endDate).toLocaleDateString()}
                  </span>
                ) : (
                  <span>Date Range</span>
                )}
                <ChevronDown size={16} />
              </button>

              {showDateFilter && (
                <div className="date-filter-dropdown">
                  <div className="date-filter-header">
                    <h4>Filter by Date Range</h4>
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
                    <button
                      onClick={applyTodayFilter}
                      className="quick-date-btn"
                    >
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

            {/* Status Filter */}
            <div className="filter-select">
              <Filter size={16} />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                disabled={loading}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </div>

            {/* Method Filter */}
            <div className="filter-select">
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                disabled={loading}
              >
                {enquiryMethods.map((method) => (
                  <option
                    key={method}
                    value={method === "All Methods" ? "all" : method}
                  >
                    {method === "All Methods" ? method : formatMethod(method)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort("enquiryNo")}
                    className="sortable"
                  >
                    Enquiry ID{" "}
                    {sortConfig.key === "enquiryNo" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    onClick={() => handleSort("applicantName")}
                    className="sortable"
                  >
                    Name{" "}
                    {sortConfig.key === "applicantName" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Contact Info</th>
                  <th
                    onClick={() => handleSort("courseInterested")}
                    className="sortable"
                  >
                    Course{" "}
                    {sortConfig.key === "courseInterested" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Enquiry Details</th>
                  <th>Status</th>
                  <th>Dates</th>
                  <th>Prospectus</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnquiries.length > 0 ? (
                  filteredEnquiries.map((enquiry) => (
                    <tr key={enquiry._id}>
                      <td className="enquiry-id">{enquiry.enquiryNo}</td>
                      <td>
                        <div className="student-info">
                          <div className="avatar">
                            {enquiry.applicantName?.charAt(0) || "?"}
                          </div>
                          <div>
                            <strong>{enquiry.applicantName || "N/A"}</strong>
                            <small>{enquiry.contactNo || "No contact"}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <div>
                            <Phone size={14} /> {enquiry.contactNo || "N/A"}
                          </div>
                          {enquiry.whatsappNo && (
                            <div>
                              <MessageCircle
                                size={14}
                                className="whatsapp-icon"
                              />
                              {enquiry.whatsappNo}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{enquiry.courseInterested || "N/A"}</td>
                      <td>
                        <div className="enquiry-details">
                          <div>
                            <strong>Method:</strong>{" "}
                            {formatMethod(enquiry.enquiryMethod)}
                          </div>
                          <div>
                            <strong>By:</strong> {enquiry.enquiryBy || "N/A"}
                          </div>
                        </div>
                      </td>
                      <td>{getStatusBadge(enquiry.status)}</td>
                      <td>
                        <div className="date-info">
                          <div>
                            <Calendar size={14} />{" "}
                            {new Date(enquiry.enquiryDate).toLocaleDateString()}
                          </div>
                          {enquiry.followUpDate && (
                            <div className="follow-up-date">
                              Follow-up:{" "}
                              {new Date(
                                enquiry.followUpDate
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {enquiry.prospectusFees === "yes" ? (
                          <div className="prospectus-paid">
                            <CheckCircle size={14} />
                            <span>₹{enquiry.prospectusAmount || 0}</span>
                          </div>
                        ) : (
                          <span className="prospectus-not-paid">Not Paid</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          {/* Convert to Admission Button */}
                          {enquiry.status !== "converted" && (
                            <button
                              className="action-btn convert"
                              onClick={() => handleConvertToAdmission(enquiry)}
                              title="Convert to Admission"
                              disabled={enquiry.status === "converted"}
                            >
                              <UserCheck size={16} />
                            </button>
                          )}

                          {/* Follow Up Button */}
                          {enquiry.status !== "follow_up" &&
                            enquiry.status !== "converted" &&
                            enquiry.status !== "rejected" &&
                            enquiry.status !== "lost" && (
                              <button
                                className="action-btn followup"
                                onClick={() => handleFollowUpEnquiry(enquiry)}
                                title="Mark for Follow Up"
                              >
                                <Bell size={16} />
                              </button>
                            )}

                          {/* Reject Button */}
                          {enquiry.status !== "rejected" &&
                            enquiry.status !== "converted" &&
                            enquiry.status !== "lost" && (
                              <button
                                className="action-btn reject"
                                onClick={() => handleRejectEnquiry(enquiry)}
                                title="Reject Enquiry"
                              >
                                <XCircle size={16} />
                              </button>
                            )}

                          {/* Reset to New Button */}
                          {enquiry.status !== "new" &&
                            enquiry.status !== "converted" &&
                            enquiry.status !== "lost" && (
                              <button
                                className="action-btn reset"
                                onClick={() => handleResetToNew(enquiry)}
                                title="Reset to New"
                              >
                                <RotateCcw size={16} />
                              </button>
                            )}

                          {/* View Button */}
                          <Link
                            to={`/front-office/enquiries/view/${enquiry._id}`}
                            className="action-btn view"
                            title="View Enquiry"
                          >
                            <Eye size={16} />
                          </Link>

                          {/* Three dots dropdown menu */}
                          <div className="dropdown-container">
                            <button
                              className="action-btn more"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDropdown(enquiry._id);
                              }}
                              title="More options"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {openDropdown === enquiry._id && (
                              <div
                                className="dropdown-menu"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  className="dropdown-item"
                                  onClick={() => {
                                    window.location.href = `/front-office/enquiries/edit/${enquiry._id}`;
                                  }}
                                >
                                  <Edit size={14} />
                                  <span>Edit Enquiry</span>
                                </button>
                                <button
                                  className="dropdown-item"
                                  onClick={() =>
                                    openWhatsApp(
                                      enquiry.whatsappNo || enquiry.contactNo
                                    )
                                  }
                                >
                                  <MessageCircle size={14} />
                                  <span>Chat on WhatsApp</span>
                                </button>
                                <button
                                  className="dropdown-item delete-option"
                                  onClick={() =>
                                    handleDeleteEnquiry(enquiry._id)
                                  }
                                >
                                  <Trash2 size={14} />
                                  <span>Delete Enquiry</span>
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
                        <Search size={48} />
                        <h3>No enquiries found</h3>
                        <p>Try adjusting your search or filter criteria.</p>
                        {/* <Link
                          to={`${basePath}/front-office/enquiries/add`}
                          className="btn-primary"
                        >
                          Create New Enquiry
                        </Link> */}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="enquiry-pagination">
            <div className="enquiry-pagination-info">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} enquiries
            </div>
            <div className="enquiry-pagination-controls">
              <button
                className="enquiry-pagination-btn prev"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || loading}
              >
                Previous
              </button>

              <div className="enquiry-page-number">
                <span className="enquiry-current-page">{pagination.page}</span>
                <span className="enquiry-total-pages">
                  of {pagination.totalPages}
                </span>
              </div>

              <button
                className="enquiry-pagination-btn next"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EnquiryList;
