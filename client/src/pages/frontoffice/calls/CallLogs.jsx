import React, { useState, useEffect, useCallback } from "react";
import {
  Phone,
  Search,
  Calendar,
  MessageCircle,
  MoreVertical,
  Eye,
  RefreshCw,
  ChevronDown,
  PhoneCall,
  UserCheck,
  Users,
  CalendarDays,
  AlertCircle,
  Clock,
  ChevronRight,
  History,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  callLogAPI,
  setupAPI,
  facultyAPI,
  admissionAPI,
  enquiryAPI,
} from "../../../services/api";
import "./CallLogs.css";

const CallLogs = () => {
  const [activeTab, setActiveTab] = useState("admission");

  const [admissions, setAdmissions] = useState([]);
  const [enquiries, setEnquiries] = useState([]);

  // call logs stored as a map: { studentId → [logs sorted newest first] }
  const [callLogsMap, setCallLogsMap] = useState({});

  // separate loading flags — table vs initial bootstrap
  const [tableLoading, setTableLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCounselor, setSelectedCounselor] = useState("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [showDateFilter, setShowDateFilter] = useState(false);

  const [showCallModal, setShowCallModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const [callForm, setCallForm] = useState({
    callStatus: "", callReason: "", callDuration: "",
    followUpDate: "", notes: "", counselorId: "", nextAction: "",
  });

  const [callStatusOptions, setCallStatusOptions] = useState([]);
  const [callReasonOptions, setCallReasonOptions] = useState([]);
  const [nextActionOptions, setNextActionOptions] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // persisted counts so stats cards never flash to 0
  const [admissionCount, setAdmissionCount] = useState(0);
  const [enquiryCount, setEnquiryCount] = useState(0);
  const [todayCallCount, setTodayCallCount] = useState(0);

  // ── helpers ────────────────────────────────────────────────────
  const getCounselorName = (c) => c.name || c.facultyName || c.fullName || "Unknown";

  const getStatusLabel = (s) => ({
    interested: "Interested", not_interested: "Not Interested",
    call_later: "Call Later", wrong_number: "Wrong Number",
    not_reachable: "Not Reachable", already_enrolled: "Already Enrolled",
  }[s] || s);

  const getStatusBadgeClass = (s) => ({
    interested: "badge-green", not_interested: "badge-red",
    call_later: "badge-yellow", wrong_number: "badge-gray",
    not_reachable: "badge-orange", already_enrolled: "badge-blue",
  }[s] || "badge-gray");

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "N/A";

  const formatDuration = (secs) => {
    if (!secs) return "—";
    const m = Math.floor(secs / 60), s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const openWhatsApp = (phone) => {
    if (!phone) { toast.error("No WhatsApp number available"); return; }
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}`, "_blank");
  };

  // ── fetch call logs → build map ────────────────────────────────
  const fetchCallLogs = useCallback(async () => {
    try {
      const res = await callLogAPI.getAll({ limit: 1000 });
      if (res.data.success) {
        const logs = res.data.data || [];
        const map = {};
        logs.forEach((log) => {
          const sid = log.studentId?._id || log.studentId;
          if (!sid) return;
          if (!map[sid]) map[sid] = [];
          map[sid].push(log);
        });
        Object.keys(map).forEach((sid) =>
          map[sid].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        );
        setCallLogsMap(map);
        const today = new Date().toDateString();
        setTodayCallCount(logs.filter((l) => new Date(l.createdAt).toDateString() === today).length);
      }
    } catch (err) {
      console.error("Fetch call logs error:", err);
    }
  }, []);

  // ── fetch admissions ───────────────────────────────────────────
  const fetchAdmissions = useCallback(async (showLoader = true) => {
    if (showLoader) setTableLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (searchTerm) params.search = searchTerm;
      const res = await admissionAPI.getAdmissions(params);
      if (res.data && res.data.success !== false) {
        const data = res.data.data || res.data;
        const arr = Array.isArray(data) ? data : [];
        setAdmissions(arr);
        setAdmissionCount(res.data.total || arr.length);
        setPagination((p) => ({ ...p, total: res.data.total || arr.length, totalPages: res.data.totalPages || 1 }));
      } else { setAdmissions([]); }
      setError(null);
    } catch (err) {
      setError("Failed to load admissions"); setAdmissions([]);
    } finally {
      setTableLoading(false); setInitialLoaded(true);
    }
  }, [pagination.page, pagination.limit, searchTerm]);

  // ── fetch enquiries ────────────────────────────────────────────
  const fetchEnquiries = useCallback(async (showLoader = true) => {
    if (showLoader) setTableLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (searchTerm) params.search = searchTerm;
      const res = await enquiryAPI.getEnquiries(params);
      if (res.data && res.data.success !== false) {
        const data = res.data.data || res.data;
        const arr = Array.isArray(data) ? data : [];
        setEnquiries(arr);
        setEnquiryCount(res.data.total || arr.length);
        setPagination((p) => ({ ...p, total: res.data.total || arr.length, totalPages: res.data.totalPages || 1 }));
      } else { setEnquiries([]); }
      setError(null);
    } catch (err) {
      setError("Failed to load enquiries"); setEnquiries([]);
    } finally {
      setTableLoading(false); setInitialLoaded(true);
    }
  }, [pagination.page, pagination.limit, searchTerm]);

  const fetchSetupOptions = async () => {
    try {
      const res = await setupAPI.getAll();
      if (res.data.success) {
        const d = res.data.data;
        setCallStatusOptions(d.callStatuses || []);
        setCallReasonOptions(d.callReasons || []);
        setNextActionOptions(d.nextActions || []);
      }
    } catch (err) { console.error("Setup options error:", err); }
  };

  const fetchCounselors = async () => {
    try {
      const res = await facultyAPI.getFaculty();
      if (res.data.success) setCounselors(res.data.data || []);
    } catch (err) { console.error("Counselors error:", err); }
  };

  // ── initial load: everything in parallel, no flash ─────────────
  useEffect(() => {
    Promise.all([
      fetchAdmissions(true),
      fetchEnquiries(false),   // silent — just for the count
      fetchSetupOptions(),
      fetchCounselors(),
      fetchCallLogs(),
    ]);
  }, []); // eslint-disable-line

  // ── tab / page / search changes ────────────────────────────────
  useEffect(() => {
    if (!initialLoaded) return;
    if (activeTab === "admission") fetchAdmissions(true);
    else fetchEnquiries(true);
  }, [activeTab, pagination.page, searchTerm]); // eslint-disable-line

  // ── modal ──────────────────────────────────────────────────────
  const handleOpenCallModal = (item, type) => {
    setSelectedStudent(item); setSelectedType(type);
    setCallForm({ callStatus: "", callReason: "", callDuration: "", followUpDate: "", notes: "", counselorId: "", nextAction: "" });
    setShowCallModal(true);
  };

  const handleCallFormChange = (e) => {
    const { name, value } = e.target;
    setCallForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitCallLog = async () => {
    if (!callForm.callStatus) { toast.error("Please select call status"); return; }
    if (!callForm.counselorId) { toast.error("Please select counselor"); return; }
    setSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      await callLogAPI.create({
        studentId: selectedStudent._id,
        studentType: selectedType,
        studentName: selectedStudent.fullName || selectedStudent.applicantName,
        studentContact: selectedStudent.mobileNumber || selectedStudent.contactNo,
        studentEmail: selectedStudent.email,
        studentCourse: selectedStudent.course || selectedStudent.courseInterested,
        callStatus: callForm.callStatus,
        callReason: callForm.callReason,
        callDuration: parseInt(callForm.callDuration) || 0,
        followUpDate: callForm.followUpDate || null,
        notes: callForm.notes,
        counselorId: callForm.counselorId,
        nextAction: callForm.nextAction,
        calledBy: user?.id || null,
      });
      toast.success("Call log saved successfully!");
      setShowCallModal(false);
      fetchCallLogs(); // refresh silently
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save call log");
    } finally { setSubmitting(false); }
  };

  // ── misc ───────────────────────────────────────────────────────
  const toggleDropdown = (id) => setOpenDropdown(openDropdown === id ? null : id);
  const toggleHistory  = (id) => setExpandedRow(expandedRow === id ? null : id);

  useEffect(() => {
    const close = () => setOpenDropdown(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const getDisplayData = () => activeTab === "admission" ? admissions : enquiries;

  const handleRefresh = () => {
    fetchAdmissions(false);
    fetchEnquiries(false);
    fetchCallLogs();
    toast.success("Refreshed!");
  };

  // ── render ─────────────────────────────────────────────────────
  return (
    <div className="call-log-page">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Call Log</h1>
          <p>Manage and track all outbound calls to students and enquiries</p>
        </div>
        <button className="btn-refresh" onClick={handleRefresh}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="error-alert">
          <AlertCircle size={20} />
          <div><strong>Error loading data:</strong><p>{error}</p></div>
          <button onClick={() => { setError(null); fetchAdmissions(); }} className="btn-retry">Retry</button>
        </div>
      )}

      {/* Stats — always rendered, counts update smoothly */}
      <div className="stats-cards">
        {[
          { icon: <Users size={24} />, cls: "bg-blue",   val: admissionCount + enquiryCount, label: "Total Students" },
          { icon: <UserCheck size={24} />, cls: "bg-purple", val: admissionCount, label: "Admissions" },
          { icon: <MessageCircle size={24} />, cls: "bg-green",  val: enquiryCount, label: "Enquiries" },
          { icon: <Phone size={24} />, cls: "bg-orange", val: todayCallCount, label: "Calls Today" },
        ].map(({ icon, cls, val, label }) => (
          <div key={label} className="stat-card">
            <div className={`stat-icon ${cls}`}>{icon}</div>
            <div><h3>{val}</h3><p>{label}</p></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { key: "admission", icon: <Users size={16} />, label: "Admissions", count: admissionCount },
          { key: "enquiry",   icon: <MessageCircle size={16} />, label: "Enquiries",  count: enquiryCount },
        ].map(({ key, icon, label, count }) => (
          <button
            key={key}
            className={`tab-btn ${activeTab === key ? "active" : ""}`}
            onClick={() => { setActiveTab(key); setPagination((p) => ({ ...p, page: 1 })); }}
          >
            {icon} {label} <span className="tab-count">{count}</span>
          </button>
        ))}
      </div>

      {/* Filters - SWAPPED: Date Range now comes before All Counselors */}
      <div className="filters-section-horizontal">
        <div className="search-box-horizontal">
          <Search size={18} />
          <input
            type="text" placeholder="Search by name, phone, course..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
          />
        </div>

        {/* Date Range Filter - NOW FIRST */}
        <div className="date-filter-section-horizontal">
          <button className="date-filter-toggle-horizontal" onClick={(e) => { e.stopPropagation(); setShowDateFilter(!showDateFilter); }}>
            <CalendarDays size={16} />
            {dateRange.startDate ? `${formatDate(dateRange.startDate)} – ${formatDate(dateRange.endDate)}` : "Date Range"}
            <ChevronDown size={14} />
          </button>

          {showDateFilter && (
            <div className="date-filter-dropdown-horizontal" onClick={(e) => e.stopPropagation()}>
              <div className="date-filter-header">
                <h4>Filter by Call Date</h4>
                <button className="close-btn" onClick={() => setShowDateFilter(false)}>×</button>
              </div>
              <div className="date-range-inputs">
                <div className="date-input-group">
                  <label>From</label>
                  <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div className="date-input-group">
                  <label>To</label>
                  <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="quick-date-buttons">
                <button className="quick-date-btn" onClick={() => { const t = new Date().toISOString().split("T")[0]; setDateRange({ startDate: t, endDate: t }); }}>Today</button>
                <button className="quick-date-btn" onClick={() => { const n = new Date(); setDateRange({ startDate: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0], endDate: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0] }); }}>This Month</button>
                <button className="quick-date-btn clear" onClick={() => setDateRange({ startDate: "", endDate: "" })}>Clear</button>
              </div>
            </div>
          )}
        </div>

        {/* All Counselors Filter - NOW SECOND */}
        <div className="filter-select-horizontal">
          <UserCheck size={15} className="filter-icon" />
          <select value={selectedCounselor} onChange={(e) => setSelectedCounselor(e.target.value)}>
            <option value="all">All Counselors</option>
            {counselors.map((c) => (
              <option key={c._id} value={c._id}>{getCounselorName(c)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {tableLoading ? (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <p>Loading records...</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th>ID</th>
                <th style={{ textAlign: "left" }}>Name</th>
                <th>Contact</th>
                <th>Course</th>
                <th>Last Call Status</th>
                <th>Last Call Date</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getDisplayData().length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className="empty-state">
                      <Phone size={48} />
                      <h3>No records found</h3>
                      <p>Try adjusting your search or filter criteria.</p>
                    </div>
                   </td>
                 </tr>
              ) : (
                getDisplayData().map((item) => {
                  const logs = callLogsMap[item._id] || [];
                  const lastCall = logs[0] || null;
                  const isExpanded = expandedRow === item._id;
                  const name = item.fullName || item.applicantName || "?";

                  return (
                    <React.Fragment key={item._id}>
                      <tr className={isExpanded ? "row-expanded" : ""}>
                        <td style={{ paddingRight: 0 }}>
                          {logs.length > 0 && (
                            <button className={`expand-btn ${isExpanded ? "open" : ""}`} onClick={() => toggleHistory(item._id)} title="View call history">
                              <ChevronRight size={15} />
                            </button>
                          )}
                        </td>

                        <td className="student-id">{item.admissionNo || item.enquiryNo || "N/A"}</td>

                        <td>
                          <div className="student-info">
                            <div className="avatar">{name.charAt(0).toUpperCase()}</div>
                            <div>
                              <strong>{name}</strong>
                              <small>{item.email || "—"}</small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="contact-info">
                            <div><Phone size={13} />{item.mobileNumber || item.contactNo || "N/A"}</div>
                            <button className="whatsapp-link" onClick={() => openWhatsApp(item.mobileNumber || item.contactNo)}>
                              <MessageCircle size={13} /> WhatsApp
                            </button>
                          </div>
                        </td>

                        <td>{item.course || item.courseInterested || "N/A"}</td>

                        <td>
                          {lastCall
                            ? <span className={`call-status-badge ${getStatusBadgeClass(lastCall.callStatus)}`}>{getStatusLabel(lastCall.callStatus)}</span>
                            : <span className="no-call-text">No calls yet</span>
                          }
                        </td>

                        <td>
                          <div className="date-info">
                            <Calendar size={13} />
                            {lastCall ? formatDate(lastCall.createdAt) : "N/A"}
                          </div>
                        </td>

                        <td><span className="counselor-name">{lastCall?.counselorName || "Not assigned"}</span></td>

                        <td>
                          <div className="action-buttons">
                            <button className="action-btn call-btn" onClick={() => handleOpenCallModal(item, activeTab)} title="Log a Call">
                              <PhoneCall size={15} />
                            </button>

                            {logs.length > 0 && (
                              <button className={`action-btn history-btn ${isExpanded ? "active" : ""}`} onClick={() => toggleHistory(item._id)} title={`${logs.length} call(s)`}>
                                <History size={15} />
                              </button>
                            )}

                            <div className="dropdown-container">
                              <button className="action-btn more" onClick={(e) => { e.stopPropagation(); toggleDropdown(item._id); }}>
                                <MoreVertical size={15} />
                              </button>
                              {openDropdown === item._id && (
                                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                  <Link to={`/admin/front-office/${activeTab === "admission" ? "admissions/view" : "enquiries/view"}/${item._id}`} className="dropdown-item">
                                    <Eye size={14} /> View Details
                                  </Link>
                                  <button className="dropdown-item" onClick={() => openWhatsApp(item.mobileNumber || item.contactNo)}>
                                    <MessageCircle size={14} /> WhatsApp
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* ── History expanded row ── */}
                      {isExpanded && logs.length > 0 && (
                        <tr className="history-row">
                          <td colSpan="9" className="history-cell">
                            <div className="history-panel">
                              <div className="history-panel-header">
                                <History size={15} />
                                <strong>Call History</strong>
                                <span className="history-count">{logs.length} call{logs.length !== 1 ? "s" : ""}</span>
                              </div>
                              <div className="history-list">
                                {logs.map((log, idx) => (
                                  <div key={log._id || idx} className="history-item">
                                    <div className="history-item-left">
                                      <span className={`call-status-badge ${getStatusBadgeClass(log.callStatus)}`}>{getStatusLabel(log.callStatus)}</span>
                                      {log.callReason && <span className="history-reason">{log.callReason}</span>}
                                    </div>
                                    <div className="history-item-mid">
                                      {log.notes && <p className="history-notes">"{log.notes}"</p>}
                                      {log.nextAction && <span className="history-action">→ {log.nextAction}</span>}
                                    </div>
                                    <div className="history-item-right">
                                      <span className="history-counselor">👤 {log.counselorName || "Unknown"}</span>
                                      {log.callDuration > 0 && <span className="history-duration"><Clock size={11} />{formatDuration(log.callDuration)}</span>}
                                      {log.followUpDate && <span className="history-followup">📅 Follow-up: {formatDate(log.followUpDate)}</span>}
                                      <span className="history-date">{formatDate(log.createdAt)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!tableLoading && pagination.totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} records
          </div>
          <div className="pagination-controls">
            <button className="pagination-btn" onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}>Previous</button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 1)
              .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("..."); acc.push(p); return acc; }, [])
              .map((p, idx) => p === "..." ? <span key={`e-${idx}`} className="ellipsis">…</span> : (
                <button key={p} className={`pagination-btn ${pagination.page === p ? "active" : ""}`} onClick={() => setPagination((prev) => ({ ...prev, page: p }))}>{p}</button>
              ))}
            <button className="pagination-btn" onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.totalPages}>Next</button>
          </div>
        </div>
      )}

      {/* Call Log Modal */}
      {showCallModal && (
        <div className="modal-overlay" onClick={() => setShowCallModal(false)}>
          <div className="modal-content call-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><PhoneCall size={20} />Log Call — {selectedStudent?.fullName || selectedStudent?.applicantName}</h3>
              <button className="close-btn" onClick={() => setShowCallModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="caller-info">
                <p><strong>📞 Student:</strong> {selectedStudent?.fullName || selectedStudent?.applicantName}</p>
                <p><strong>📱 Phone:</strong> {selectedStudent?.mobileNumber || selectedStudent?.contactNo}</p>
                <p><strong>📚 Course:</strong> {selectedStudent?.course || selectedStudent?.courseInterested}</p>
              </div>
              <div className="form-grid-modal">
                <div className="form-group full-width">
                  <label>Call Status <span className="required">*</span></label>
                  <select name="callStatus" value={callForm.callStatus} onChange={handleCallFormChange}>
                    <option value="">Select Status</option>
                    {callStatusOptions.map((o) => <option key={o._id} value={o.value}>{o.name}</option>)}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Call Reason</label>
                  <select name="callReason" value={callForm.callReason} onChange={handleCallFormChange}>
                    <option value="">Select Reason</option>
                    {callReasonOptions.map((o) => <option key={o._id} value={o.value}>{o.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Duration (seconds)</label>
                  <input type="number" name="callDuration" value={callForm.callDuration} onChange={handleCallFormChange} placeholder="e.g. 120" />
                </div>
                <div className="form-group">
                  <label>Follow-up Date</label>
                  <input type="date" name="followUpDate" value={callForm.followUpDate} onChange={handleCallFormChange} />
                </div>
                <div className="form-group full-width">
                  <label>Assigned Counselor <span className="required">*</span></label>
                  <select name="counselorId" value={callForm.counselorId} onChange={handleCallFormChange}>
                    <option value="">Select Counselor</option>
                    {counselors.map((c) => <option key={c._id} value={c._id}>{getCounselorName(c)}</option>)}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Next Action</label>
                  <select name="nextAction" value={callForm.nextAction} onChange={handleCallFormChange}>
                    <option value="">Select Next Action</option>
                    {nextActionOptions.map((o) => <option key={o._id} value={o.value}>{o.name}</option>)}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Notes / Remarks</label>
                  <textarea name="notes" value={callForm.notes} onChange={handleCallFormChange} rows="3" placeholder="Enter call summary, student feedback, etc..." />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCallModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSubmitCallLog} disabled={submitting}>{submitting ? "Saving..." : "Save Call Log"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallLogs;