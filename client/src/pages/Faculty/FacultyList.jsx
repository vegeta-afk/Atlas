import React, { useState, useEffect } from "react";
import { facultyAPI } from "../../services/api";
import {
  Search,
  Filter,
  UserPlus,
  Eye,
  Edit,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  MoreVertical,
  ChevronDown,
  CalendarDays,
  RefreshCw,
  AlertCircle,
  Briefcase,
  Clock,
  DollarSign,
  MapPin,
  UserCheck,
  UserX,
  Sun,
  Moon,
  Coffee,
  Trash2,
  Download,
  Upload,
  MessageCircle,
  Users,
  BookOpen,
  X,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./FacultyList.css";

const FacultyList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/admin") ? "/admin" : "/faculty";

  const [faculty, setFaculty] = useState([]);
  const [filteredFaculty, setFilteredFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    onLeave: 0,
    newThisMonth: 0,
  });

  // Tab state
  const [activeTab, setActiveTab] = useState("faculty");
  const [allBatchesData, setAllBatchesData] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesFetched, setBatchesFetched] = useState(false);
  const [totalBatches, setTotalBatches] = useState(0);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedShift, setSelectedShift] = useState("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "dateOfJoining", direction: "desc" });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [openDropdown, setOpenDropdown] = useState(null);

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "on-leave", label: "On Leave" },
  ];

  const shiftOptions = [
    { value: "all", label: "All Shifts" },
    { value: "Morning", label: "Morning" },
    { value: "Afternoon", label: "Afternoon" },
    { value: "Evening", label: "Evening" },
    { value: "Full-day", label: "Full Day" },
  ];

  const fetchFaculty = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (searchTerm) params.search = searchTerm;
      if (selectedStatus !== "all") params.status = selectedStatus;
      if (selectedShift !== "all") params.shift = selectedShift;
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      if (sortConfig.key) params.sortBy = sortConfig.key;
      if (sortConfig.direction) params.sortOrder = sortConfig.direction;

      const response = await facultyAPI.getFaculty(params);

      if (response.data.success) {
        setFaculty(response.data.data || []);
        setFilteredFaculty(response.data.data || []);
        setPagination({
          ...pagination,
          total: response.data.total,
          totalPages: response.data.totalPages,
        });
        if (response.data.stats) {
          setStats(response.data.stats);
        } else {
          calculateStats(response.data.data || []);
        }
        // Reset batches when faculty list changes
        setBatchesFetched(false);
        setAllBatchesData([]);
      } else {
        throw new Error(response.data.message || "Failed to fetch faculty");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load faculty");
      setFaculty([]);
      setFilteredFaculty([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBatches = async (facultyList) => {
    setBatchesLoading(true);
    try {
      const results = [];
      for (const f of facultyList) {
        try {
          const response = await facultyAPI.getFacultyBatches(f._id);
          if (response.data.success && response.data.data) {
            const batches = response.data.data.batches || [];
            batches.forEach((batch) => {
              results.push({
                ...batch,
                facultyName: f.facultyName,
                facultyNo: f.facultyNo,
                facultyId: f._id,
                facultyStatus: f.status,
                courseAssigned: f.courseAssigned,
              });
            });
          }
        } catch {
          // skip failed faculty
        }
      }
      setAllBatchesData(results);
      setTotalBatches(results.length);
      const students = results.reduce(
        (sum, b) => sum + (b.studentCount ?? b.students?.length ?? 0),
        0
      );
      setTotalStudentsCount(students);
      setBatchesFetched(true);
    } catch (err) {
      console.error("Error fetching all batches:", err);
    } finally {
      setBatchesLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "batches" && !batchesFetched && faculty.length > 0) {
      fetchAllBatches(faculty);
    }
  };

  const calculateStats = (data) => {
    const total = data.length;
    const active = data.filter((f) => f.status === "active").length;
    const inactive = data.filter((f) => f.status === "inactive").length;
    const onLeave = data.filter((f) => f.status === "on-leave").length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const newThisMonth = data.filter((f) => {
      const joinDate = new Date(f.dateOfJoining);
      return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
    }).length;
    setStats({ total, active, inactive, onLeave, newThisMonth });
  };

  useEffect(() => {
    fetchFaculty();
  }, [pagination.page, selectedStatus, selectedShift, dateRange, sortConfig]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredFaculty(faculty);
      return;
    }
    const filtered = faculty.filter(
      (f) =>
        f.facultyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.mobileNo?.includes(searchTerm) ||
        f.facultyNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.courseAssigned?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.whatsappNo?.includes(searchTerm)
    );
    setFilteredFaculty(filtered);
    calculateStats(filtered);
  }, [searchTerm, faculty]);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc",
    });
  };

  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  const clearDateFilter = () => setDateRange({ startDate: "", endDate: "" });

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
      active: { color: "status-active", label: "Active", icon: <UserCheck size={12} /> },
      inactive: { color: "status-inactive", label: "Inactive", icon: <UserX size={12} /> },
      "on-leave": { color: "status-on-leave", label: "On Leave", icon: <Clock size={12} /> },
    };
    const config = statusMap[status] || statusMap.active;
    return (
      <span className={`status-badge ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const getShiftIcon = (shift) => {
    const shiftMap = {
      Morning: <Sun size={14} />,
      Afternoon: <Sun size={14} />,
      Evening: <Moon size={14} />,
      "Full-day": <Clock size={14} />,
    };
    return shiftMap[shift] || <Clock size={14} />;
  };

  const handleActivateFaculty = async (fac) => {
    if (window.confirm(`Activate ${fac.facultyName}?`)) {
      try {
        const response = await facultyAPI.updateFacultyStatus(fac._id, { status: "active" });
        if (response.data.success) { alert("Faculty activated successfully!"); fetchFaculty(); }
      } catch (err) { alert(err.response?.data?.message || "Failed to activate faculty"); }
    }
  };

  const handleDeactivateFaculty = async (fac) => {
    if (window.confirm(`Deactivate ${fac.facultyName}?`)) {
      try {
        const response = await facultyAPI.updateFacultyStatus(fac._id, { status: "inactive" });
        if (response.data.success) { alert("Faculty deactivated successfully!"); fetchFaculty(); }
      } catch (err) { alert(err.response?.data?.message || "Failed to deactivate faculty"); }
    }
  };

  const handleMarkOnLeave = async (fac) => {
    if (window.confirm(`Mark ${fac.facultyName} as On Leave?`)) {
      try {
        const response = await facultyAPI.updateFacultyStatus(fac._id, { status: "on-leave" });
        if (response.data.success) { alert("Faculty marked as on leave successfully!"); fetchFaculty(); }
      } catch (err) { alert(err.response?.data?.message || "Failed to mark faculty as on leave"); }
    }
  };

  const handleDeleteFaculty = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const response = await facultyAPI.deleteFaculty(id);
      if (response.data.success) { alert("Faculty deleted successfully!"); fetchFaculty(); }
    } catch (err) { alert(err.response?.data?.message || "Failed to delete faculty"); }
  };

  const handleViewFaculty = (facultyId) => navigate(`${basePath}/faculty/view/${facultyId}`);
  const handleEditFaculty = (facultyId) => navigate(`${basePath}/faculty/edit/${facultyId}`);
  const handleRefresh = () => fetchFaculty();

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return "N/A";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    return phone;
  };

  const toggleDropdown = (id, e) => {
    e.stopPropagation();
    setOpenDropdown(openDropdown === id ? null : id);
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleExportData = () => {
    const dataStr = JSON.stringify(faculty, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", "faculty_data.json");
    linkElement.click();
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) return sortConfig.direction === "asc" ? "↑" : "↓";
    return "";
  };

  const openWhatsApp = (phone) => {
    if (!phone) { alert("WhatsApp number not available"); return; }
    window.open(`https://wa.me/91${phone}`, "_blank");
  };

  // Filter batches by search term
  const filteredBatches = allBatchesData.filter((batch) => {
    if (!searchTerm) return true;
    return (
      batch.facultyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (batch.batchName || batch.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.courseAssigned?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="faculty-list-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Faculty List</h1>
          <p>Manage all faculty members</p>
        </div>
        <div className="header-actions">
          <button onClick={handleRefresh} className="btn-secondary" disabled={loading}>
            <RefreshCw size={18} className={loading ? "spinning" : ""} />
            Refresh
          </button>
          <button onClick={handleExportData} className="btn-secondary" disabled={loading}>
            <Download size={18} />
            Export
          </button>
          <Link to={`${basePath}/faculty/add`} className="btn-primary">
            <UserPlus size={18} />
            Add New Faculty
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading faculty data...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-alert">
          <AlertCircle size={20} />
          <div>
            <strong>Error loading faculty:</strong>
            <p>{error}</p>
          </div>
          <button onClick={fetchFaculty} className="btn-retry">Retry</button>
        </div>
      )}

      {/* Stats Cards */}
      {!loading && !error && (
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon bg-blue-100 text-blue-600"><Briefcase size={24} /></div>
            <div><h3>{stats.total}</h3><p>Total Faculty</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-green-100 text-green-600"><UserCheck size={24} /></div>
            <div><h3>{stats.active}</h3><p>Active</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-red-100 text-red-600"><UserX size={24} /></div>
            <div><h3>{stats.inactive}</h3><p>Inactive</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-yellow-100 text-yellow-600"><Clock size={24} /></div>
            <div><h3>{stats.onLeave}</h3><p>On Leave</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-purple-100 text-purple-600"><UserPlus size={24} /></div>
            <div><h3>{stats.newThisMonth}</h3><p>New This Month</p></div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      {!loading && !error && (
        <div className="filters-section-horizontal">
          <div className="search-box-horizontal">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by name, phone, faculty no or email..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPagination({ ...pagination, page: 1 }); }}
              disabled={loading}
            />
          </div>

          <div className="date-filter-section-horizontal">
            <button
              className="date-filter-toggle-horizontal"
              onClick={(e) => { e.stopPropagation(); setShowDateFilter(!showDateFilter); }}
              disabled={loading}
            >
              <CalendarDays size={18} />
              {dateRange.startDate && dateRange.endDate ? (
                <span>{formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}</span>
              ) : (
                <span>Date Range</span>
              )}
              <ChevronDown size={16} />
            </button>

            {showDateFilter && (
              <div className="date-filter-dropdown-horizontal" onClick={(e) => e.stopPropagation()}>
                <div className="date-filter-header">
                  <h4>Filter by Date Range</h4>
                  <button className="close-btn" onClick={() => setShowDateFilter(false)}>×</button>
                </div>
                <div className="date-range-inputs">
                  <div className="date-input-group">
                    <label>From Date</label>
                    <input type="date" name="startDate" value={dateRange.startDate} onChange={handleDateRangeChange} max={dateRange.endDate || new Date().toISOString().split("T")[0]} />
                  </div>
                  <div className="date-input-group">
                    <label>To Date</label>
                    <input type="date" name="endDate" value={dateRange.endDate} onChange={handleDateRangeChange} min={dateRange.startDate} max={new Date().toISOString().split("T")[0]} />
                  </div>
                </div>
                <div className="quick-date-buttons">
                  <button onClick={applyTodayFilter} className="quick-date-btn">Today</button>
                  <button onClick={applyThisMonthFilter} className="quick-date-btn">This Month</button>
                  <button onClick={clearDateFilter} className="quick-date-btn clear">Clear</button>
                </div>
              </div>
            )}
          </div>

          <div className="filter-select-horizontal">
            <Filter size={16} />
            <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setPagination({ ...pagination, page: 1 }); }} disabled={loading}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-horizontal">
            <select value={selectedShift} onChange={(e) => { setSelectedShift(e.target.value); setPagination({ ...pagination, page: 1 }); }} disabled={loading}>
              {shiftOptions.map((shift) => (
                <option key={shift.value} value={shift.value}>{shift.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── TAB SWITCHER ── */}
      {!loading && !error && (
        <div className="tab-switcher">
          <button
            className={`tab-pill ${activeTab === "faculty" ? "tab-pill--active" : ""}`}
            onClick={() => handleTabChange("faculty")}
          >
            <UserCheck size={16} />
            Faculty
            <span className="tab-pill__count">{stats.total}</span>
          </button>
          <button
            className={`tab-pill ${activeTab === "batches" ? "tab-pill--active" : ""}`}
            onClick={() => handleTabChange("batches")}
          >
            <BookOpen size={16} />
            Batches &amp; Students
            {batchesFetched && (
              <span className="tab-pill__count">{totalBatches}</span>
            )}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════
          TAB 1 — FACULTY TABLE
      ═══════════════════════════════════════ */}
      {!loading && !error && activeTab === "faculty" && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("facultyNo")} className="sortable">Faculty ID {getSortIndicator("facultyNo")}</th>
                <th onClick={() => handleSort("facultyName")} className="sortable">Faculty Name {getSortIndicator("facultyName")}</th>
                <th>Contact Information</th>
                <th onClick={() => handleSort("courseAssigned")} className="sortable">Course Assigned {getSortIndicator("courseAssigned")}</th>
                <th>Shift &amp; Timing</th>
                <th onClick={() => handleSort("basicStipend")} className="sortable">Stipend {getSortIndicator("basicStipend")}</th>
                <th>Status</th>
                <th>Date of Joining</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFaculty.length > 0 ? (
                filteredFaculty.map((facultyMember) => (
                  <tr key={facultyMember._id}>
                    <td className="student-id">{facultyMember.facultyNo}</td>
                    <td>
                      <div className="student-info">
                        <div className="avatar">{facultyMember.facultyName?.charAt(0) || "?"}</div>
                        <div>
                          <strong>{facultyMember.facultyName || "N/A"}</strong>
                          <small>{facultyMember.email || "No email"}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div><Phone size={14} /> {formatPhoneNumber(facultyMember.mobileNo || "N/A")}</div>
                        <div><MessageCircle size={14} /> {formatPhoneNumber(facultyMember.whatsappNo || "N/A")}</div>
                      </div>
                    </td>
                    <td className="course-assigned">{facultyMember.courseAssigned || "N/A"}</td>
                    <td>
                      <div className="shift-info">
                        <span>{getShiftIcon(facultyMember.shift)} {facultyMember.shift}</span>
                        <span><Coffee size={12} /> Lunch: {facultyMember.lunchTime || "N/A"}</span>
                      </div>
                    </td>
                    <td className="stipend-info">
                      ₹{facultyMember.basicStipend ? facultyMember.basicStipend.toLocaleString("en-IN") : "0"}
                    </td>
                    <td>
                      <div className="status-cell">{getStatusBadge(facultyMember.status)}</div>
                    </td>
                    <td>
                      <div className="date-info"><Calendar size={14} /> {formatDate(facultyMember.dateOfJoining)}</div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn view" onClick={() => handleViewFaculty(facultyMember._id)} title="View Faculty">
                          <Eye size={16} />
                        </button>
                        <button className="action-btn edit" onClick={() => handleEditFaculty(facultyMember._id)} title="Edit Faculty">
                          <Edit size={16} />
                        </button>
                        {facultyMember.status === "inactive" ? (
                          <button className="action-btn view" onClick={() => handleActivateFaculty(facultyMember)} title="Activate Faculty">
                            <UserCheck size={16} />
                          </button>
                        ) : facultyMember.status === "active" ? (
                          <button className="action-btn delete" onClick={() => handleDeactivateFaculty(facultyMember)} title="Deactivate Faculty">
                            <UserX size={16} />
                          </button>
                        ) : null}
                        <div className="dropdown-container">
                          <button className="action-btn more" onClick={(e) => toggleDropdown(facultyMember._id, e)} title="More options">
                            <MoreVertical size={16} />
                          </button>
                          {openDropdown === facultyMember._id && (
                            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              {facultyMember.status === "active" && (
                                <button className="dropdown-item" onClick={() => { handleMarkOnLeave(facultyMember); setOpenDropdown(null); }}>
                                  <Clock size={14} /><span>Mark as On Leave</span>
                                </button>
                              )}
                              {facultyMember.email && (
                                <button className="dropdown-item" onClick={() => { window.location.href = `mailto:${facultyMember.email}`; setOpenDropdown(null); }}>
                                  <Mail size={14} /><span>Send Email</span>
                                </button>
                              )}
                              {facultyMember.mobileNo && (
                                <button className="dropdown-item" onClick={() => { window.open(`tel:${facultyMember.mobileNo}`); setOpenDropdown(null); }}>
                                  <Phone size={14} /><span>Call Now</span>
                                </button>
                              )}
                              {facultyMember.whatsappNo && (
                                <button className="dropdown-item" onClick={() => { openWhatsApp(facultyMember.whatsappNo); setOpenDropdown(null); }}>
                                  <MessageCircle size={14} /><span>WhatsApp</span>
                                </button>
                              )}
                              <div className="dropdown-divider"></div>
                              <button className="dropdown-item delete-option" onClick={() => { handleDeleteFaculty(facultyMember._id, facultyMember.facultyName); setOpenDropdown(null); }}>
                                <Trash2 size={14} /><span>Delete Faculty</span>
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
                      <h3>No faculty members found</h3>
                      <p>Try adjusting your search or filter criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════════════════════════════════
          TAB 2 — BATCHES & STUDENTS TABLE
      ═══════════════════════════════════════ */}
      {!loading && !error && activeTab === "batches" && (
        <div className="table-container">
          {batchesLoading ? (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>Loading batches &amp; students...</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Faculty</th>
                  <th>Batch Name</th>
                  <th>Course</th>
                  <th>Students</th>
                  <th>Student Names</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.length > 0 ? (
                  filteredBatches.map((batch, idx) => (
                    <tr key={batch._id || idx}>
                      <td className="student-id">{idx + 1}</td>
                      <td>
                        <div className="student-info">
                          <div className="avatar" style={{ background: "#6366f1" }}>
                            {batch.facultyName?.charAt(0) || "?"}
                          </div>
                          <div>
                            <strong>{batch.facultyName || "N/A"}</strong>
                            <small>{batch.facultyNo || ""}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="batch-name-cell">
                          <BookOpen size={14} />
                          <span>{batch.batchName || batch.name || `Batch ${idx + 1}`}</span>
                        </div>
                      </td>
                      <td>{batch.courseAssigned || "N/A"}</td>
                      <td>
                        <span className="batch-student-count-badge">
                          <Users size={13} />
                          {batch.studentCount ?? batch.students?.length ?? 0}
                        </span>
                      </td>
                      <td>
                        {batch.students && batch.students.length > 0 ? (
                          <div className="student-chips">
                            {batch.students.map((student, sIdx) => (
                              <span key={student._id || sIdx} className="student-chip">
                                <span className="student-chip-avatar">
                                  {(student.studentName || student.name || "S").charAt(0)}
                                </span>
                                {student.studentName || student.name || "Unknown"}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="no-students-text">No students yet</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-row">
                      <div className="empty-state">
                        <BookOpen size={48} />
                        <h3>No batches found</h3>
                        <p>No batches have been assigned to any faculty member yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Batches summary footer */}
          {!batchesLoading && batchesFetched && (
            <div className="batches-summary-footer">
              <span><BookOpen size={14} /> <strong>{totalBatches}</strong> total batches</span>
              <span><Users size={14} /> <strong>{totalStudentsCount}</strong> total students</span>
            </div>
          )}
        </div>
      )}

      {/* Pagination — only on faculty tab */}
      {!loading && !error && activeTab === "faculty" && pagination.totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} faculty members
          </div>
          <div className="pagination-controls">
            <button className="pagination-btn" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1 || loading}>Previous</button>
            <span className="pagination-page-info">Page {pagination.page} of {pagination.totalPages}</span>
            <button className="pagination-btn" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || loading}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyList;