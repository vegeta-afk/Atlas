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
  Trash2,
  CheckSquare,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  callLogAPI,
  setupAPI,
  facultyAPI,
  admissionAPI,
  enquiryAPI,
  adminAPI,
} from "../../../services/api";
import "./CallLogs.css";
import { useNavigate, useLocation } from "react-router-dom";

const CallLogs = () => {
  const [activeTab, setActiveTab] = useState("enquiry");

  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  const [selectedCallReason, setSelectedCallReason] = useState("all"); // NEW: Call reason filter
  const [selectedCallStatus, setSelectedCallStatus] = useState("all"); // NEW: Last call status filter
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [showDateFilter, setShowDateFilter] = useState(false);

  const [showCallModal, setShowCallModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const [callForm, setCallForm] = useState({
    callStatus: "", callReason: "", callDuration: "",
    followUpDate: "", notes: "", counselorId: "", nextAction: "",enquiryAction: "",
  });

  const [callStatusOptions, setCallStatusOptions] = useState([]);
  const [callReasonOptions, setCallReasonOptions] = useState([]);
  const [nextActionOptions, setNextActionOptions] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [admissionPagination, setAdmissionPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [enquiryPagination, setEnquiryPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [holdPagination, setHoldPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [cancelPagination, setCancelPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const paginationMap = {
    admission: [admissionPagination, setAdmissionPagination],
    enquiry: [enquiryPagination, setEnquiryPagination],
    hold: [holdPagination, setHoldPagination],
    cancel: [cancelPagination, setCancelPagination],
  };
  const [pagination, setPagination] = paginationMap[activeTab];

  // persisted counts so stats cards never flash to 0
  const [admissionCount, setAdmissionCount] = useState(0);
  const [enquiryCount, setEnquiryCount] = useState(0);
  const [holdCount, setHoldCount] = useState(0);
  const [cancelCount, setCancelCount] = useState(0);
  const [todayCallCount, setTodayCallCount] = useState(0);

  // ── helpers ────────────────────────────────────────────────────
  const getCounselorName = (c) => c.name || c.facultyName || c.fullName || "Unknown";

  const location = useLocation();

  useEffect(() => {
    if (location.state?.openCallModalFor) {
      setSelectedStudent(location.state.openCallModalFor);
      setSelectedType(location.state.openCallModalType || "enquiry");
      setActiveTab(location.state.openCallModalType || "enquiry");
      setShowCallModal(true);
    }
  }, [location.state]);


  // Hardcoded enquiry call reasons
  const enquiryCallReasons = [
    { value: "call not picked", name: "call not picked" },
    { value: "अभी सोच रहा हूँ", name: "अभी सोच रहा हूँ" },
    { value: "मैं कल आऊँगा/आऊँगी", name: "मैं कल आऊँगा/आऊँगी" },
    { value: "Fees ज़्यादा है", name: "Fees ज़्यादा है" },
    { value: "घर वालों से पूछना है", name: "घर वालों से पूछना है" },
    { value: "अभी time नहीं है", name: "अभी time नहीं है" },
    { value: "कहीं और enquiry की है", name: "कहीं और enquiry की है" },
    { value: "Online सीख लेंगे", name: "Online सीख लेंगे" },
    { value: "Job लग गई है", name: "Job लग गई है" },
    { value: "अभी पैसे नहीं हैं", name: "अभी पैसे नहीं हैं" },
    { value: "Interest नहीं रहा", name: "Interest नहीं रहा" },
    { value: "बाद में करेंगे", name: "बाद में करेंगे" },
    { value: "Location दूर है", name: "Location दूर है" },
    { value: "Certificate मान्य है या नहीं", name: "Certificate मान्य है या नहीं?" },
    { value: "other", name: "other" },
  ];

  // Hardcoded cancel call reasons
  const cancelCallReasons = [
    { value: "Fees की problem हो गई है", name: "Fees की problem हो गई है" },
    { value: "घर में कोई समस्या है", name: "घर में कोई समस्या है" },
    { value: "स्वास्थ्य ठीक नहीं है", name: "स्वास्थ्य ठीक नहीं है" },
    { value: "Job लग गई है, इसलिए course नहीं कर पाऊँगा", name: "Job लग गई है, इसलिए course नहीं कर पाऊँगा" },
    { value: "Course के लिए time नहीं मिल रहा", name: "Course के लिए time नहीं मिल रहा" },
    { value: "School/College/Exam की वजह से course रोकना है", name: "School/College/Exam की वजह से course रोकना है" },
    { value: "दूसरे शहर/स्थान पर जाना पड़ रहा है", name: "दूसरे शहर/स्थान पर जाना पड़ रहा है" },
    { value: "Institute आने-जाने में परेशानी है, बहुत दूर है", name: "Institute आने-जाने में परेशानी है, बहुत दूर है" },
    { value: "Current batch की timing suit नहीं कर रही", name: "Current batch की timing suit नहीं कर रही" },
    { value: "Course मेरी requirement के अनुसार नहीं है", name: "Course मेरी requirement के अनुसार नहीं है" },
    { value: "दूसरा course करना चाहता हूँ", name: "दूसरा course करना चाहता हूँ" },
    { value: "किसी दूसरे institute में admission ले लिया है", name: "किसी दूसरे institute में admission ले लिया है" },
    { value: "अब online course करना चाहता हूँ", name: "अब online course करना चाहता हूँ" },
    { value: "अब computer course करने में interest नहीं है", name: "अब computer course करने में interest नहीं है" },
    { value: "Parents ने course continue करने से मना कर दिया", name: "Parents ने course continue करने से मना कर दिया" },
    { value: "Personal कारण से course छोड़ना है", name: "Personal कारण से course छोड़ना है" },
    { value: "आगे की पढ़ाई के लिए जाना है", name: "आगे की पढ़ाई के लिए जाना है" },
    { value: "Family responsibility बढ़ गई है", name: "Family responsibility बढ़ गई है" },
    { value: "Teaching से संतुष्ट नहीं है", name: "Teaching से संतुष्ट नहीं है" },
    { value: "उपलब्ध timings convenient नहीं हैं", name: "उपलब्ध timings convenient नहीं हैं" },
    { value: "अभी कुछ समय का break चाहिए", name: "अभी कुछ समय का break चाहिए" },
    { value: "कोई अन्य कारण", name: "कोई अन्य कारण" },
  ];

  const ACTIVE_ADMISSION_STATUSES = ["admitted", "confirmed", "pending", "provisional", "new", "under_process", "approved"];

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

  const formatTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";

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
      const params = { limit: 10000 }; // NEW: fetch all, paginate client-side for global sort
      if (searchTerm) params.search = searchTerm;
      const res = await admissionAPI.getAdmissions(params);
      if (res.data && res.data.success !== false) {
        const data = res.data.data || res.data;
        const arr = Array.isArray(data) ? data : [];
        setAdmissions(arr);
        setAdmissionCount(arr.filter((a) => ACTIVE_ADMISSION_STATUSES.includes(a.status)).length);
        setHoldCount(arr.filter((a) => a.status === "on_hold").length);
        setCancelCount(arr.filter((a) => a.status === "cancelled").length);
      } else { setAdmissions([]); }
      setError(null);
    } catch (err) {
      setError("Failed to load admissions"); setAdmissions([]);
    } finally {
      setTableLoading(false); setInitialLoaded(true);
    }
  }, [searchTerm]);

  // ── fetch enquiries ────────────────────────────────────────────
  const fetchEnquiries = useCallback(async (showLoader = true) => {
    if (showLoader) setTableLoading(true);
    try {
      const params = { limit: 10000 }; // NEW: fetch all, paginate client-side for global sort
      if (searchTerm) params.search = searchTerm;
      const res = await enquiryAPI.getEnquiries(params);
      if (res.data && res.data.success !== false) {
        const data = res.data.data || res.data;
        const arr = Array.isArray(data) ? data : [];
        setEnquiries(arr);
        setEnquiryCount(arr.length);
      } else { setEnquiries([]); }
      setError(null);
    } catch (err) {
      setError("Failed to load enquiries"); setEnquiries([]);
    } finally {
      setTableLoading(false); setInitialLoaded(true);
    }
  }, [searchTerm]);

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
      const [facultyRes, adminRes] = await Promise.allSettled([
        facultyAPI.getFaculty(),
        adminAPI.getAdmins(),
      ]);

      const facultyList =
        facultyRes.status === "fulfilled" && facultyRes.value.data.success
          ? facultyRes.value.data.data || []
          : [];

      const adminList =
        adminRes.status === "fulfilled"
          ? adminRes.value.data.admins || adminRes.value.data.data || []
          : [];

      const taggedAdmins = adminList.map((a) => ({ ...a, _role: "admin" }));
      const taggedFaculty = facultyList.map((f) => ({ ...f, _role: "faculty" }));

      setCounselors([...taggedAdmins, ...taggedFaculty]);
    } catch (err) {
      console.error("Counselors error:", err);
    }
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

  // NEW: recompute pagination totals whenever the filtered/sorted set changes
  useEffect(() => {
    const filteredCount = getFilteredSortedData().length;
    const totalPages = Math.max(1, Math.ceil(filteredCount / pagination.limit));
    setPagination((p) => ({ ...p, total: filteredCount, totalPages }));
  }, [admissions, enquiries, callLogsMap, activeTab, selectedCallReason, selectedCallStatus]); // eslint-disable-line

  // ── tab / page / search changes ────────────────────────────────
  useEffect(() => {
  if (!initialLoaded) return;
  if (activeTab === "enquiry") fetchEnquiries(true);
  else fetchAdmissions(true); // admission, hold, cancel all read from the same admissions dataset
}, [activeTab, searchTerm]); // eslint-disable-line; // eslint-disable-line — removed pagination.page, no longer needs a refetch

  // ── modal ──────────────────────────────────────────────────────
  const handleOpenCallModal = (item, type) => {
    setSelectedStudent(item); 
    setSelectedType(type);
    setCallForm({
  callStatus: "", callReason: "", callDuration: "",
  followUpDate: "", notes: "",
  counselorId: loggedInUser?.id || loggedInUser?._id || "",
  nextAction: "",
  enquiryAction: "",
});
    setShowCallModal(true);
  };

  const handleCallFormChange = (e) => {
    const { name, value } = e.target;
    setCallForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitCallLog = async () => {
  if (!callForm.callStatus) { toast.error("Please select call status"); return; }
  if (!callForm.callReason) { toast.error("Please select call reason"); return; }
  if (selectedType === "enquiry" && !callForm.enquiryAction) { toast.error("Please select an enquiry action"); return; }
  if (!callForm.notes || !callForm.notes.trim()) { toast.error("Please enter notes / remarks"); return; }
  if (!loggedInUser?.id && !loggedInUser?._id) { toast.error("Unable to identify logged-in user. Please log in again."); return; }
  setSubmitting(true);

    try {
      // FIX: Ensure counselor name is extracted correctly
      const counselorName = loggedInUser?.name || loggedInUser?.fullName || loggedInUser?.username || "Unknown";
      
      // Log the call
      await callLogAPI.create({
        studentId: selectedStudent._id,
        studentType: selectedType === "enquiry" ? "enquiry" : "admission",
        studentName: selectedStudent.fullName || selectedStudent.applicantName,
        studentContact: selectedStudent.mobileNumber || selectedStudent.contactNo,
        studentEmail: selectedStudent.email,
        studentCourse: selectedStudent.course || selectedStudent.courseInterested,
        callStatus: callForm.callStatus,
        callReason: callForm.callReason,
        callDuration: parseInt(callForm.callDuration) || 0,
        followUpDate: callForm.followUpDate || null,
        notes: callForm.notes,
        counselorId: loggedInUser?.id || loggedInUser?._id || null,
        counselorName: counselorName,
        nextAction: callForm.nextAction,
        enquiryAction: callForm.enquiryAction, // FIX: was missing entirely, backend requires it for enquiries
        calledBy: loggedInUser?.id || loggedInUser?._id || null,
      });
      
      // If enquiry action dropdown selected, update enquiry status
      if (selectedType === "enquiry" && callForm.enquiryAction) {
        await enquiryAPI.updateEnquiry(selectedStudent._id, { 
          status: callForm.enquiryAction,
          followUpDate: callForm.enquiryAction === "follow_up" ? callForm.followUpDate : null
        });
      }

      toast.success("Call logged successfully!");
      setShowCallModal(false);
      fetchCallLogs();
    } catch (err) {
      console.error("Call log error:", err.response?.data || err);
      toast.error(err.response?.data?.message || "Failed to log call");
    } finally {
      setSubmitting(false);
    }
  };

  // ── misc ───────────────────────────────────────────────────────
  const toggleDropdown = (id) => setOpenDropdown(openDropdown === id ? null : id);
  const toggleHistory  = (id) => setExpandedRow(expandedRow === id ? null : id);

  useEffect(() => {
    const close = () => setOpenDropdown(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const getFilteredSortedData = () => {
    let data = activeTab === "enquiry" ? enquiries : admissions;

    if (activeTab === "enquiry") {
  data = data.filter((item) => item.status !== "converted" || (callLogsMap[item._id] || []).length > 0);
}
    if (activeTab === "admission") {
      data = data.filter((item) => ACTIVE_ADMISSION_STATUSES.includes(item.status));
    }
    if (activeTab === "hold") {
      data = data.filter((item) => item.status === "on_hold");
    }
    if (activeTab === "cancel") {
      data = data.filter((item) => item.status === "cancelled");
    }

    data = data.filter((item) => (callLogsMap[item._id] || []).length > 0);

    if ((activeTab === "enquiry" || activeTab === "cancel") && selectedCallReason !== "all") {
      data = data.filter((item) => {
        const lastCall = (callLogsMap[item._id] || [])[0];
        return lastCall?.callReason === selectedCallReason;
      });
    }

    if (selectedCallStatus !== "all") {
      data = data.filter((item) => {
        const lastCall = (callLogsMap[item._id] || [])[0];
        if (selectedCallStatus === "no_calls") return !lastCall;
        return lastCall?.callStatus === selectedCallStatus;
      });
    }

    // Global sort — most recently called first, across the entire dataset
    data = [...data].sort((a, b) => {
      const aDate = callLogsMap[a._id]?.[0]?.createdAt;
      const bDate = callLogsMap[b._id]?.[0]?.createdAt;
      return new Date(bDate) - new Date(aDate);
    });

    return data;
  };

  const getDisplayData = () => {
    const filtered = getFilteredSortedData();
    const start = (pagination.page - 1) * pagination.limit;
    return filtered.slice(start, start + pagination.limit);
  };

  const handleRefresh = () => {
    fetchAdmissions(false);
    fetchEnquiries(false);
    fetchCallLogs();
    toast.success("Refreshed!");
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedIds([]);
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm("Delete this call log entry permanently? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/call-logs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Call log deleted!");
        fetchCallLogs();
      } else {
        toast.error(data.message || "Failed to delete call log");
      }
    } catch (err) {
      console.error("Error deleting call log:", err);
      toast.error("Failed to delete call log");
    }
  };

  const handleBulkDeleteLogs = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} call log(s) permanently? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/call-logs/bulk-delete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`${data.data.deletedCount} call log(s) deleted!`);
        setSelectedIds([]);
        setSelectMode(false);
        fetchCallLogs();
      } else {
        toast.error(data.message || "Failed to bulk delete call logs");
      }
    } catch (err) {
      console.error("Error bulk deleting call logs:", err);
      toast.error("Failed to bulk delete call logs");
    }
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
        <button
          className={`btn-refresh ${selectMode ? "active" : ""}`}
          onClick={toggleSelectMode}
        >
          <CheckSquare size={16} /> {selectMode ? "Cancel Select" : "Select Logs"}
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
          { key: "enquiry",   icon: <MessageCircle size={16} />, label: "Enquiries",  count: enquiryCount },
          { key: "admission", icon: <Users size={16} />, label: "Admissions", count: admissionCount },
          { key: "hold",      icon: <PhoneCall size={16} />, label: "Hold",       count: holdCount },
          { key: "cancel",    icon: <AlertCircle size={16} />, label: "Cancelled",  count: cancelCount },
        ].map(({ key, icon, label, count }) => (
          <button
            key={key}
            className={`tab-btn ${activeTab === key ? "active" : ""}`}
            onClick={() => { 
              setActiveTab(key); 
              setPagination((p) => ({ ...p, page: 1 })); 
              setSelectedCallReason("all"); // Reset call reason filter on tab change
            }}
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

        {/* Call Reason Filter - NEW: Only shows for enquiry tab */}
        {(activeTab === "enquiry" || activeTab === "cancel") && (
          <div className="filter-select-horizontal">
            <MessageCircle size={15} className="filter-icon" />
            <select value={selectedCallReason} onChange={(e) => {
              setSelectedCallReason(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}>
              <option value="all">All Call Reasons</option>
              {(activeTab === "enquiry" ? enquiryCallReasons : cancelCallReasons).map((reason) => (
                <option key={reason.value} value={reason.value}>{reason.name}</option>
              ))}
            </select>
          </div>
        )}

        

        {/* Last Call Status Filter - NEW */}
        <div className="filter-select-horizontal">
          <PhoneCall size={15} className="filter-icon" />
          <select value={selectedCallStatus} onChange={(e) => {
            setSelectedCallStatus(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}>
            <option value="all">All Call Statuses</option>
            {callStatusOptions.map((o) => (
              <option key={o._id} value={o.value}>{o.name}</option>
            ))}
          </select>
        </div>

        {/* All Counselors Filter - NOW SECOND */}
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
                <th>Last Call By</th>
                <th>Last Call Date</th>
                <th>Last Call Status</th>
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
                            {(item.mobileNumber || item.contactNo) ? (
                              <a href={`tel:${item.mobileNumber || item.contactNo}`} className="call-link">
                                <Phone size={13} />{item.mobileNumber || item.contactNo}
                              </a>
                            ) : (
                              <div><Phone size={13} />N/A</div>
                            )}
                            <button className="whatsapp-link" onClick={() => openWhatsApp(item.mobileNumber || item.contactNo)}>
                              <MessageCircle size={13} /> WhatsApp
                            </button>
                          </div>
                        </td>

                        <td>{item.course || item.courseInterested || "N/A"}</td>

                        <td>
                          <span className="counselor-name">
                            {lastCall?.counselorName && lastCall.counselorName !== "Unknown" 
                              ? lastCall.counselorName 
                              : "Not assigned"}
                          </span>
                        </td>

                        <td>
                          <div className="date-info">
                            <Calendar size={13} />
                            {lastCall ? formatDate(lastCall.createdAt) : "N/A"}
                          </div>
                        </td>

                        <td>
                          {lastCall
                            ? <span className={`call-status-badge ${getStatusBadgeClass(lastCall.callStatus)}`}>{getStatusLabel(lastCall.callStatus)}</span>
                            : <span className="no-call-text">No calls yet</span>
                          }
                        </td>

                        <td>
                          <div className="action-buttons">
                            {/* <button className="action-btn call-btn" onClick={() => handleOpenCallModal(item, activeTab)} title="Log a Call">
                              <PhoneCall size={15} />
                            </button> */}

                            {logs.length > 0 && (
                              <button className={`action-btn history-btn ${isExpanded ? "active" : ""}`} onClick={() => toggleHistory(item._id)} title={`${logs.length} call(s)`}>
                                <History size={15} />
                              </button>
                            )}
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
                                    {selectMode && (
                                      <input
                                        type="checkbox"
                                        checked={selectedIds.includes(log._id)}
                                        onChange={() => toggleSelectOne(log._id)}
                                        className="history-item-checkbox"
                                      />
                                    )}
                                    <div className="history-item-left">
                                      <span className={`call-status-badge ${getStatusBadgeClass(log.callStatus)}`}>{getStatusLabel(log.callStatus)}</span>
                                      {log.callReason && <span className="history-reason">{log.callReason}</span>}
                                    </div>
                                    <div className="history-item-mid">
                                      {log.notes && <p className="history-notes">"{log.notes}"</p>}
                                      {log.nextAction && <span className="history-action">→ {log.nextAction}</span>}
                                    </div>
                                    <div className="history-item-right">
                                      <span className="history-counselor">👤 {log.counselorName && log.counselorName !== "Unknown" ? log.counselorName : "Unknown"}</span>
                                      {log.callDuration > 0 && <span className="history-duration"><Clock size={11} />{formatDuration(log.callDuration)}</span>}
                                      {log.followUpDate && <span className="history-followup">📅 Follow-up: {formatDate(log.followUpDate)}</span>}
                                      <div className="history-date-wrap">
  <span className="history-date">{formatDate(log.createdAt)}</span>
  <span className="history-time">{formatTime(log.createdAt)}</span>
</div>
                                      <button
                                        className="history-delete-btn"
                                        onClick={() => handleDeleteLog(log._id)}
                                        title="Delete this call log"
                                      >
                                        <Trash2 size={13} />
                                      </button>
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
      {!tableLoading && pagination.total > 0 && (
        <div className="enquiry-pagination">
          <div className="enquiry-pagination-info">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
            of {pagination.total} records
          </div>
          <div className="enquiry-pagination-controls">
            <button
              className="enquiry-pagination-btn prev"
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Previous
            </button>

            <div className="enquiry-page-number">
              <span className="enquiry-current-page">{pagination.page}</span>
              <span className="enquiry-total-pages">of {pagination.totalPages}</span>
            </div>

            <button
              className="enquiry-pagination-btn next"
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectMode && selectedIds.length > 0 && (
        <div className="bulk-delete-bar">
          <span>{selectedIds.length} selected</span>
          <button onClick={handleBulkDeleteLogs} className="bulk-delete-btn">
            <Trash2 size={14} /> Delete Selected
          </button>
          <button onClick={() => setSelectedIds([])} className="bulk-clear-btn">
            Clear
          </button>
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
                <p>
                  <strong>📱 Phone:</strong>{" "}
                  {(selectedStudent?.mobileNumber || selectedStudent?.contactNo) ? (
                    <a href={`tel:${selectedStudent.mobileNumber || selectedStudent.contactNo}`} className="call-link-inline">
                      {selectedStudent.mobileNumber || selectedStudent.contactNo}
                    </a>
                  ) : "N/A"}
                </p>
                <p><strong>📚 Course:</strong> {selectedStudent?.course || selectedStudent?.courseInterested}</p>

                {selectedType !== "enquiry" ? (
                  <>
                    <p>
                      <strong>👨 Father's No:</strong>{" "}
                      {selectedStudent?.fatherNumber ? (
                        <a href={`tel:${selectedStudent.fatherNumber}`} className="call-link-inline">
                          {selectedStudent.fatherNumber}
                        </a>
                      ) : "N/A"}
                    </p>
                    <p>
                      <strong>👩 Mother's No:</strong>{" "}
                      {selectedStudent?.motherNumber ? (
                        <a href={`tel:${selectedStudent.motherNumber}`} className="call-link-inline">
                          {selectedStudent.motherNumber}
                        </a>
                      ) : "N/A"}
                    </p>
                  </>
                ) : (
                  <p>
                    <strong>👨‍👩 Guardian's No:</strong>{" "}
                    {selectedStudent?.guardianContact ? (
                      <a href={`tel:${selectedStudent.guardianContact}`} className="call-link-inline">
                        {selectedStudent.guardianContact}
                      </a>
                    ) : "N/A"}
                  </p>
                )}
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
  <label>Call Reason <span className="required">*</span></label>
                  <select name="callReason" value={callForm.callReason} onChange={handleCallFormChange}>
                    <option value="">Select Reason</option>
                    {selectedType === "enquiry" 
                      ? enquiryCallReasons.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)
                      : selectedType === "cancel"
                      ? cancelCallReasons.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)
                      : callReasonOptions.map((o) => <option key={o._id} value={o.value}>{o.name}</option>)
                    }
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Assigned Counselor</label>
                  <input
                    type="text"
                    value={loggedInUser?.name || loggedInUser?.fullName || loggedInUser?.username || "Unknown"}
                    readOnly
                    className="readonly-input"
                  />
                </div>

                {selectedType === "enquiry" && (
  <div className="form-group full-width">
    <label>Enquiry Action <span className="required">*</span></label>
                    <select 
                      name="enquiryAction" 
                      value={callForm.enquiryAction} 
                      onChange={handleCallFormChange}
                      className="form-control"
                    >
                      <option value="">Select Action</option>
<option value="follow_up">Mark for Follow Up</option>
<option value="rejected">Reject Enquiry</option>
                    </select>
                  </div>
                )}

                <div className="form-group full-width">
  <label>Notes / Remarks <span className="required">*</span></label>
                  <textarea name="notes" value={callForm.notes} onChange={handleCallFormChange} rows="3" placeholder="Enter call summary, student feedback, etc..." />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowCallModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleSubmitCallLog} className="btn-primary">
                Save Call Log
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default CallLogs;