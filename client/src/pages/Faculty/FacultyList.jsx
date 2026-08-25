import React, { useState, useEffect } from "react";
import { facultyAPI, setupAPI, batchTransferAPI } from "../../services/api";
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
  ArrowLeftRight,
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

  const [activeTab, setActiveTab] = useState("faculty");
  const [allBatchesData, setAllBatchesData] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesFetched, setBatchesFetched] = useState(false);
  const [totalBatches, setTotalBatches] = useState(0);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);

  const [bridgeBatchesData, setBridgeBatchesData] = useState([]);
  const [bridgeFetched, setBridgeFetched] = useState(false);
  const [batchTypeFilter, setBatchTypeFilter] = useState("all"); // "all" | "regular" | "bridge"

  const [freeBatchesData, setFreeBatchesData] = useState([]);
  const [freeBatchesLoading, setFreeBatchesLoading] = useState(false);
  const [freeBatchesFetched, setFreeBatchesFetched] = useState(false);
  const [totalFreeBatches, setTotalFreeBatches] = useState(0);

  const [expandedFaculty, setExpandedFaculty] = useState({});

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedShift, setSelectedShift] = useState("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [appliedDateRange, setAppliedDateRange] = useState({ startDate: "", endDate: "" });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "dateOfJoining", direction: "desc" });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [openDropdown, setOpenDropdown] = useState(null);

  const [selectedStudents, setSelectedStudents] = useState({}); 
  const [viewingBatchStudents, setViewingBatchStudents] = useState(null); // { batch, fac } | null
  const [setupBatches, setSetupBatches] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTargetFaculty, setBulkTargetFaculty] = useState("");
  const [bulkTargetBatch, setBulkTargetBatch] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkNewStartTime, setBulkNewStartTime] = useState("");
  const [bulkNewEndTime, setBulkNewEndTime] = useState("");

  const getCourseShortName = (courseName) => {
  if (!courseName) return "";
  const skipWords = ["and", "of", "the", "for", "in", "&"];
  return courseName
    .split(/\s+/)
    .filter((w) => w && !skipWords.includes(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .join("");
};

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

  const formatTimeRange = (timeRange) => {
    if (!timeRange) return "N/A";
    return timeRange.replace(/(\d{2}):(\d{2})/g, (_, h, m) => {
      const hour = parseInt(h);
      const period = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${m} ${period}`;
    });
  };

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
      if (appliedDateRange.startDate) params.startDate = appliedDateRange.startDate;
      if (appliedDateRange.endDate) params.endDate = appliedDateRange.endDate;
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
        setBatchesFetched(false);
        setAllBatchesData([]);
        setFreeBatchesFetched(false);   // ← add
        setFreeBatchesData([]); 
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

  const fetchBridgeBatches = async () => {
    try {
      const token = localStorage.getItem("token");
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_BASE}/api/bridge-batch/by-faculty`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        const bridgeBatches = data.data || [];

        // by-faculty only returns raw studentIds — fetch the populated
        // student objects per bridge batch, same endpoint the attendance
        // page uses, so names/studentId/courses exist for selection & transfer.
        const enrichedBridgeBatches = await Promise.all(
          bridgeBatches.map(async (b) => {
            try {
              const studentsRes = await fetch(`${API_BASE}/api/bridge-batch/${b._id}/students`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const studentsData = await studentsRes.json();
              const fullStudents = studentsData.success ? (studentsData.data?.students || []) : [];
              return { ...b, studentIds: fullStudents };
            } catch {
              return b; // keep raw batch if the per-batch fetch fails
            }
          })
        );

        setBridgeBatchesData(enrichedBridgeBatches);
      }
      setBridgeFetched(true);
    } catch (err) {
      console.error("Error fetching bridge batches:", err);
      setBridgeFetched(true);
    }
  };

  const handleTabChange = (tab) => {
  setActiveTab(tab);
  if (tab === "batches" && !batchesFetched && faculty.length > 0) {
    fetchAllBatches(faculty);
    fetchSetupBatches();
    fetchBridgeBatches();
  }
  if (tab === "free" && !freeBatchesFetched && faculty.length > 0) {
    fetchFreeBatches(faculty);
  }
};

  const fetchAllBatches = async (facultyList) => {
    setBatchesLoading(true);
    try {
      const batchResults = await Promise.all(
        facultyList.map(async (f) => {
          try {
            const res = await facultyAPI.getFacultyBatches(f._id);
            const batches = (res.data?.data?.batches || []).filter((b) => !b.isTemporary);
            return { faculty: f, batches };
          } catch {
            return { faculty: f, batches: [] };
          }
        })
      );

      const studentFetches = batchResults.flatMap(({ faculty: f, batches }) =>
        batches.map(async (batch) => {
          try {
            const res = await facultyAPI.getBatchStudents(f._id, batch._id);
            const students = res.data?.data?.students || [];
            return {
              ...batch,
              students,
              studentCount: students.length,
              facultyName: f.facultyName,
              facultyNo: f.facultyNo,
              facultyId: f._id,
              facultyStatus: f.status,
              facultyEmail: f.email,
              facultyMobile: f.mobileNo,
              courseAssigned: f.courseAssigned,
            };
          } catch {
            return {
              ...batch,
              students: [],
              studentCount: 0,
              facultyName: f.facultyName,
              facultyNo: f.facultyNo,
              facultyId: f._id,
              facultyStatus: f.status,
              facultyEmail: f.email,
              facultyMobile: f.mobileNo,
              courseAssigned: f.courseAssigned,
            };
          }
        })
      );

      const results = await Promise.all(studentFetches);
      setAllBatchesData(results);
      setTotalBatches(results.length);
      const totalStudents = results.reduce((sum, b) => sum + (b.students?.length ?? 0), 0);
      setTotalStudentsCount(totalStudents);
      setBatchesFetched(true);
    } catch (err) {
      console.error("Error fetching all batches:", err);
    } finally {
      setBatchesLoading(false);
    }
  };

const fetchFreeBatches = async (facultyList) => {
  setFreeBatchesLoading(true);
  try {
    const results = await Promise.all(
      facultyList.map(async (f) => {
        try {
          const res = await facultyAPI.getFreeBatches(f._id);
          const freeBatches = res.data?.data?.freeBatches || [];
          return freeBatches.map(batch => ({
            ...batch,
            facultyName:    f.facultyName,
            facultyNo:      f.facultyNo,
            facultyId:      f._id,
            facultyStatus:  f.status,
            facultyEmail:   f.email,
            facultyMobile:  f.mobileNo,
            facultyPhoto:   f.photo || null,
            courseAssigned: f.courseAssigned,
            shiftRange:     res.data?.data?.shiftRange,
            lunchRange:     res.data?.data?.lunchRange,
          }));
        } catch {
          return [];
        }
      })
    );

    const flat = results.flat();
    setFreeBatchesData(flat);
    setTotalFreeBatches(flat.length);
    setFreeBatchesFetched(true);
  } catch (err) {
    console.error("Error fetching free batches:", err);
  } finally {
    setFreeBatchesLoading(false);
  }
};

  
  const fetchSetupBatches = async () => {
  try {
    const response = await setupAPI.getAll();
    if (response.data.success) {
      const batchesData = response.data.data.batches || [];
      setSetupBatches(batchesData.sort((a, b) => (a.order || 0) - (b.order || 0)));
    }
  } catch (err) {
    console.error("Error fetching setup batches:", err);
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
    setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  }, [selectedStatus, selectedShift, appliedDateRange, sortConfig]);

  useEffect(() => {
    fetchFaculty();
  }, [pagination.page, selectedStatus, selectedShift, appliedDateRange, sortConfig]);

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

  const clearDateFilter = () => {
    const range = { startDate: "", endDate: "" };
    setDateRange(range);
    setAppliedDateRange(range);
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
  };

  const applyTodayFilter = () => {
    const today = new Date().toISOString().split("T")[0];
    const range = { startDate: today, endDate: today };
    setDateRange(range);
    setAppliedDateRange(range);
  };

  const applyDateFilter = () => {
    setAppliedDateRange(dateRange);
    setShowDateFilter(false);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      active:     { color: "status-active",   label: "Active",   icon: <UserCheck size={12} /> },
      inactive:   { color: "status-inactive", label: "Inactive", icon: <UserX size={12} /> },
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
      Morning:    <Sun size={14} />,
      Afternoon:  <Sun size={14} />,
      Evening:    <Moon size={14} />,
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

  const handleViewFaculty   = (id) => navigate(`${basePath}/faculty/view/${id}`);
  const handleEditFaculty   = (id) => navigate(`${basePath}/faculty/edit/${id}`);
  const handleRefresh       = () => fetchFaculty();

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
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

  const toggleFacultyExpand = (facultyId) => {
    setExpandedFaculty((prev) => ({ ...prev, [facultyId]: !prev[facultyId] }));
  };

  // ── batchesByFaculty — now carries facultyPhoto too ─────────────────────
  const batchesByFaculty = faculty.map((f) => {
    const regularBatches = allBatchesData
      .filter((b) => b.facultyId === f._id && !b.isTemporary)
      .map((b) => ({ ...b, batchType: "regular" }));

    const bridgeBatchesForFac = bridgeBatchesData
      .filter((b) => b.facultyObjectId === f._id)
      .map((b) => ({
        _id: b._id,
        batchName: b.courseName,
        startTime: b.timeSlot?.startTime,
        endTime: b.timeSlot?.endTime,
        courseAssigned: b.courseName,
        students: b.studentIds || [],
        studentCount: (b.studentIds || []).length,
        batchType: "bridge",
      }));

    let combinedBatches = [...regularBatches, ...bridgeBatchesForFac];
    if (batchTypeFilter === "regular") combinedBatches = regularBatches;
    if (batchTypeFilter === "bridge") combinedBatches = bridgeBatchesForFac;

    const totalStudents = combinedBatches.reduce(
      (sum, b) => sum + (b.studentCount ?? b.students?.length ?? 0),
      0
    );
    return {
      facultyId:      f._id,
      facultyName:    f.facultyName,
      facultyNo:      f.facultyNo,
      facultyStatus:  f.status,
      facultyEmail:   f.email,
      facultyMobile:  f.mobileNo,
      facultyPhoto:   f.photo || null,
      courseAssigned: f.courseAssigned,
      batches: combinedBatches,
      totalBatchCount: combinedBatches.length,
      totalStudents,
    };
  }).filter((f) => {
    if (!searchTerm) return true;
    return (
      f.facultyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.facultyNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.batches.some((b) =>
        (b.batchName || b.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  });

  const freeBatchesByFaculty = faculty.map((f) => {
  const batches = freeBatchesData.filter((b) => b.facultyId === f._id);
  return {
    facultyId:      f._id,
    facultyName:    f.facultyName,
    facultyNo:      f.facultyNo,
    facultyStatus:  f.status,
    facultyEmail:   f.email,
    facultyMobile:  f.mobileNo,
    facultyPhoto:   f.photo || null,
    courseAssigned: f.courseAssigned,
    batches,
    totalBatchCount: batches.length,
  };
}).filter(f => f.totalBatchCount > 0); // only show faculty with at least 1 free batch

  const filteredBatches = allBatchesData.filter((batch) => {
    if (!searchTerm) return true;
    return (
      batch.facultyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (batch.batchName || batch.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.courseAssigned?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const openBatchStudentsModal = (batch, fac) => {
  if ((batch.students || []).length === 0) return;
  setViewingBatchStudents({ batch, fac });
};

const closeBatchStudentsModal = () => setViewingBatchStudents(null);

const toggleStudentSelection = (student, batch, fac) => {
  setSelectedStudents((prev) => {
    const updated = { ...prev };
    if (updated[student._id]) {
      delete updated[student._id];
    } else {
      updated[student._id] = {
        student,
        batchId: batch._id,
        batchName: batch.batchName || batch.name,
        batchType: batch.batchType || "regular",
        facultyId: fac.facultyId,
        facultyName: fac.facultyName,
      };
    }
    return updated;
  });
};

const toggleSelectAllInBatch = (batch, fac) => {
  const studentList = batch.students || [];
  setSelectedStudents((prev) => {
    const updated = { ...prev };
    const allSelected = studentList.length > 0 && studentList.every((s) => updated[s._id]);
    if (allSelected) {
      studentList.forEach((s) => delete updated[s._id]);
    } else {
      studentList.forEach((s) => {
        updated[s._id] = {
          student: s,
          batchId: batch._id,
          batchName: batch.batchName || batch.name,
          batchType: batch.batchType || "regular",
          facultyId: fac.facultyId,
          facultyName: fac.facultyName,
        };
      });
    }
    return updated;
  });
};

const clearSelection = () => setSelectedStudents({});

const handleBulkTransferSubmit = async () => {
  const selections = Object.values(selectedStudents);
  if (selections.length === 0) return;
  if (!bulkTargetFaculty) {
    alert("Please select target teacher");
    return;
  }

  const bridgeSelections = selections.filter((s) => s.batchType === "bridge");
  const regularSelections = selections.filter((s) => s.batchType !== "bridge");

  if (bridgeSelections.length > 0 && regularSelections.length > 0) {
    alert("Please transfer bridge batch students and regular batch students separately — they use different transfer flows.");
    return;
  }

  setBulkSubmitting(true);
  try {
    if (bridgeSelections.length > 0) {
      // Bridge batch transfer: whole batch moves to the new teacher, roster untouched.
      // Timing only changes if the admin filled both new time fields.
      const bridgeBatchIds = [...new Set(bridgeSelections.map((s) => s.batchId))];

      const results = await Promise.all(
        bridgeBatchIds.map((bridgeBatchId) =>
          batchTransferAPI.transferBridgeBatch(bridgeBatchId, {
            newTeacherId: bulkTargetFaculty,
            transferReason: bulkReason || "Bridge batch reassignment",
            ...(bulkNewStartTime && bulkNewEndTime
              ? { newStartTime: bulkNewStartTime, newEndTime: bulkNewEndTime }
              : {}),
          })
        )
      );

      const failed = results.filter((r) => !r.data.success);
      alert(`✅ ${results.length - failed.length} bridge batch(es) transferred successfully.${failed.length ? ` ${failed.length} failed.` : ""}`);
    } else {
      if (!bulkTargetBatch) {
        alert("Please select target batch");
        setBulkSubmitting(false);
        return;
      }
      const studentIds = regularSelections.map((s) => s.student._id);
      const response = await batchTransferAPI.bulkTransfer({
        studentIds,
        newTeacherId: bulkTargetFaculty,
        newBatch: bulkTargetBatch,
        transferReason: bulkReason || "Bulk faculty/batch reassignment",
      });
      if (!response.data.success) {
        throw new Error(response.data.message || "Bulk transfer failed");
      }
      const { success = [], failed = [] } = response.data.data || {};
      alert(`✅ ${success.length} student(s) transferred successfully.${failed.length ? ` ${failed.length} failed.` : ""}`);
    }

    setShowBulkModal(false);
    setBulkTargetFaculty("");
    setBulkTargetBatch("");
    setBulkReason("");
    setBulkNewStartTime("");
    setBulkNewEndTime("");
    clearSelection();
    setBatchesFetched(false);
    setBridgeFetched(false);
    await fetchAllBatches(faculty);
    await fetchBridgeBatches();
  } catch (err) {
    alert(err.response?.data?.message || err.message || "Bulk transfer failed");
  } finally {
    setBulkSubmitting(false);
  }
};

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

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading faculty data...</p>
        </div>
      )}

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
                  <button onClick={applyDateFilter} className="quick-date-btn apply">Apply</button>
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
          <button
      className={`tab-pill ${activeTab === "free" ? "tab-pill--active" : ""}`}
      onClick={() => handleTabChange("free")}
    >
      <Users size={16} />
      Free Batches
      {freeBatchesFetched && (
        <span className="tab-pill__count" style={{ background: "#f59e0b" }}>
          {totalFreeBatches}
        </span>
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
                <th onClick={() => handleSort("dateOfJoining")} className="sortable">Date of Joining {getSortIndicator("dateOfJoining")}</th>
                <th onClick={() => handleSort("facultyName")} className="sortable">Faculty Name {getSortIndicator("facultyName")}</th>
                <th>Contact Information</th>
                <th onClick={() => handleSort("courseAssigned")} className="sortable">Course Assigned {getSortIndicator("courseAssigned")}</th>
                <th>Shift &amp; Timing</th>
                <th onClick={() => handleSort("basicStipend")} className="sortable">Stipend {getSortIndicator("basicStipend")}</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFaculty.length > 0 ? (
                filteredFaculty.map((facultyMember) => (
                  <tr key={facultyMember._id}>
                    <td className="student-id">{facultyMember.facultyNo}</td>

                    <td>
                      <div className="date-info">
                        <Calendar size={14} /> {formatDate(facultyMember.dateOfJoining)}
                      </div>
                    </td>

                    {/* ── Faculty Name cell with photo ── */}
                    <td>
                      <div className="student-info">
                        {/* Photo — shown when available, hidden via onError */}
                        {facultyMember.photo ? (
                          <img
                            src={facultyMember.photo}
                            alt={facultyMember.facultyName}
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
                        {/* Letter avatar — hidden when photo loads, shown as fallback */}
                        <div
                          className="avatar"
                          style={{ display: facultyMember.photo ? "none" : "flex" }}
                        >
                          {facultyMember.facultyName?.charAt(0) || "?"}
                        </div>
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

                    <td className="course-assigned">
                      {facultyMember.courseAssigned
                        ? facultyMember.courseAssigned.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                        : "N/A"}
                    </td>

                    <td>
                      <div className="shift-info">
                        <span>{getShiftIcon(facultyMember.shift)} {formatTimeRange(facultyMember.shift)}</span>
                        <span><Coffee size={12} /> Lunch: {formatTimeRange(facultyMember.lunchTime)}</span>
                      </div>
                    </td>

                    <td className="stipend-info">
                      ₹{facultyMember.basicStipend ? facultyMember.basicStipend.toLocaleString("en-IN") : "0"}
                    </td>

                    <td>
                      <div className="status-cell">{getStatusBadge(facultyMember.status)}</div>
                    </td>

                    <td>
                      <div className="action-buttons">
                        <button className="action-btn view" onClick={() => handleViewFaculty(facultyMember._id)} title="View Faculty">
                          <Eye size={16} />
                        </button>
                        <button className="action-btn edit" onClick={() => handleEditFaculty(facultyMember._id)} title="Edit Faculty">
                          <Edit size={16} />
                        </button>
                        {facultyMember.status === "active" ? (
                          <button className="action-btn delete" onClick={() => handleDeactivateFaculty(facultyMember)} title="Deactivate Faculty">
                            <UserX size={16} />
                          </button>
                        ) : (
                          <button className="action-btn view" onClick={() => handleActivateFaculty(facultyMember)} title="Activate Faculty">
                            <UserCheck size={16} />
                          </button>
                        )}
                        <div className="dropdown-container">
                          <button className="action-btn more" onClick={(e) => toggleDropdown(facultyMember._id, e)} title="More options">
                            <MoreVertical size={16} />
                          </button>
                          {openDropdown === facultyMember._id && (
                            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              {/* {facultyMember.status === "active" && (
                                <button className="dropdown-item" onClick={() => { handleMarkOnLeave(facultyMember); setOpenDropdown(null); }}>
                                  <Clock size={14} /><span>Mark as On Leave</span>
                                </button>
                              )} */}
                              {/* {facultyMember.status === "on-leave" && (
                                <button className="dropdown-item" onClick={() => { handleActivateFaculty(facultyMember); setOpenDropdown(null); }}>
                                  <UserCheck size={14} /><span>Mark as Active</span>
                                </button>
                              )} */}
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
          TAB 2 — BATCHES & STUDENTS (Accordion)
      ═══════════════════════════════════════ */}
      {!loading && !error && activeTab === "batches" && (
        <div className="table-container">
          <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
            {["all", "regular", "bridge"].map((type) => (
              <button
                key={type}
                onClick={() => setBatchTypeFilter(type)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  border: batchTypeFilter === type ? "1px solid #4f46e5" : "1px solid #e5e7eb",
                  background: batchTypeFilter === type ? "#eef2ff" : "#fff",
                  color: batchTypeFilter === type ? "#4f46e5" : "#6b7280",
                  cursor: "pointer",
                }}
              >
                {type === "all" ? "All Batches" : type === "regular" ? "Regular Only" : "Bridge Only"}
              </button>
            ))}
          </div>
          {batchesLoading ? (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>Loading batches &amp; students...</p>
            </div>
          ) : (
            <>
              <table className="data-table fba-main-table">
                <thead>
                  <tr>
                    <th style={{ width: "28%" }}>FACULTY DETAILS</th>
                    <th style={{ width: "22%" }}>CONTACT INFORMATION</th>
                    <th style={{ width: "18%" }}>ASSIGNMENT STATS</th>
                    <th style={{ width: "14%" }}>STATUS</th>
                    <th style={{ width: "18%" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {batchesByFaculty.length > 0 ? (
                    batchesByFaculty.map((f) => (
                      <React.Fragment key={f.facultyId}>
                        <tr className={`fba-faculty-row ${expandedFaculty[f.facultyId] ? "fba-faculty-row--open" : ""}`}>

                          {/* Faculty Details — with photo */}
                          <td>
                            <div className="student-info">
                              {/* Photo */}
                              {f.facultyPhoto ? (
                                <img
                                  src={f.facultyPhoto}
                                  alt={f.facultyName}
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
                              {/* Letter avatar fallback */}
                              <div
                                className="avatar fba-avatar-indigo"
                                style={{ display: f.facultyPhoto ? "none" : "flex" }}
                              >
                                {f.facultyName?.charAt(0) || "?"}
                              </div>
                              <div>
                                <strong>{f.facultyName || "N/A"}</strong>
                                <small>{f.facultyNo || ""}</small>
                                <small style={{ color: "#94a3b8" }}>{f.courseAssigned || ""}</small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="contact-info">
                              {f.facultyEmail && (
                                <div><Mail size={13} /> {f.facultyEmail}</div>
                              )}
                              {f.facultyMobile && (
                                <div><Phone size={13} /> {formatPhoneNumber(f.facultyMobile)}</div>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="fba-stats-cell">
                              <div className="fba-stat-item fba-stat--batches">
                                <span className="fba-stat-num">{f.totalBatchCount}</span>
                                <span className="fba-stat-label">Batches</span>
                              </div>
                              <div className="fba-stat-item fba-stat--students">
                                <span className="fba-stat-num">{f.totalStudents}</span>
                                <span className="fba-stat-label">Students</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="status-cell">
                              {getStatusBadge(f.facultyStatus)}
                            </div>
                          </td>

                          <td>
                            {f.totalBatchCount > 0 ? (
                              <button
                                className={`fba-view-btn ${expandedFaculty[f.facultyId] ? "fba-view-btn--active" : ""}`}
                                onClick={() => toggleFacultyExpand(f.facultyId)}
                              >
                                <Eye size={15} />
                                {expandedFaculty[f.facultyId] ? "Hide Batches" : "View Batches"}
                                <ChevronDown
                                  size={14}
                                  className={`fba-chevron ${expandedFaculty[f.facultyId] ? "fba-chevron--open" : ""}`}
                                />
                              </button>
                            ) : (
                              <span className="fba-no-batches-text">No batches yet</span>
                            )}
                          </td>
                        </tr>

                        {expandedFaculty[f.facultyId] && f.batches.length > 0 && (
                          <tr className="fba-expanded-row">
                            <td colSpan="5" className="fba-expanded-cell">
                              <div className="fba-batch-grid">
                                {f.batches.map((batch, idx) => {
  const studentCount = batch.studentCount ?? batch.students?.length ?? 0;
  const isBridge = batch.batchType === "bridge";
  return (
    <div key={batch._id || idx} className="fba-batch-card" style={{ position: "relative" }}>
      <div
        className="fba-card-header"
        style={{ cursor: studentCount > 0 ? "pointer" : "default" }}
        onClick={() => openBatchStudentsModal(batch, f)}
      >
        <div className="fba-card-icon"><BookOpen size={15} /></div>
        <div className="fba-card-title">
          <span className="fba-batch-name">
  {batch.startTime && batch.endTime
    ? `${formatTimeRange(batch.startTime)} to ${formatTimeRange(batch.endTime)}`
    : batch.batchName || batch.name || `Batch ${idx + 1}`}
</span>
          <span className="fba-batch-course">
            {batch.courseAssigned || f.courseAssigned || "N/A"}
          </span>
        </div>
        <span className="fba-student-badge">
          <Users size={12} />
          {studentCount} student{studentCount !== 1 ? "s" : ""}
        </span>
        {studentCount > 0 && <ChevronDown size={14} className="fba-chevron" style={{ marginLeft: 8 }} />}
      </div>
      <span
        style={{
          position: "absolute",
          bottom: 6,
          right: 8,
          fontSize: 9,
          padding: "2px 7px",
          borderRadius: 8,
          fontWeight: 700,
          letterSpacing: 0.3,
          background: isBridge ? "#f3e8ff" : "#e0f2fe",
          color: isBridge ? "#7e22ce" : "#0369a1",
        }}
      >
        {isBridge ? "BRIDGE" : "REGULAR"}
      </span>
    </div>
  );
})}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-row">
                        <div className="empty-state">
                          <BookOpen size={48} />
                          <h3>No faculty found</h3>
                          <p>No faculty members are available.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {batchesFetched && (
                <div className="batches-summary-footer">
                  <span><BookOpen size={14} /> <strong>{totalBatches}</strong> total batches</span>
                  <span><Users size={14} /> <strong>{totalStudentsCount}</strong> total students</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

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
      {Object.keys(selectedStudents).length > 0 && (
  <div className="fba-bulk-bar">
    <div className="fba-bulk-bar-info">
      <Users size={16} />
      <strong>{Object.keys(selectedStudents).length}</strong> student{Object.keys(selectedStudents).length !== 1 ? "s" : ""} selected
    </div>
    <div className="fba-bulk-bar-actions">
      <button className="btn-secondary" onClick={clearSelection}>Clear</button>
      <button className="btn-primary" onClick={() => setShowBulkModal(true)}>
        <ArrowLeftRight size={16} />
        Bulk Transfer
      </button>
    </div>
  </div>
)}

{showBulkModal && (
  <div className="fba-modal-overlay">
    <div className="fba-modal" onClick={(e) => e.stopPropagation()}>
      <div className="fba-modal-header">
        <h3>Bulk Transfer {Object.keys(selectedStudents).length} Student(s)</h3>
        <button onClick={() => setShowBulkModal(false)} disabled={bulkSubmitting}><X size={18} /></button>
      </div>

      <div className="fba-modal-body">
        <div className="fba-modal-field">
          <label>New Teacher *</label>
          <select value={bulkTargetFaculty} onChange={(e) => setBulkTargetFaculty(e.target.value)}>
            <option value="">Select Teacher</option>
            {faculty.map((fac) => (
              <option key={fac._id} value={fac._id}>
                {fac.facultyName} {fac.facultyNo ? `(${fac.facultyNo})` : ""}
              </option>
            ))}
          </select>
        </div>

        {Object.values(selectedStudents).some((s) => s.batchType === "bridge") ? (
          <div className="fba-modal-field">
            <label>New Batch Timing (optional — leave blank to keep current time)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="time"
                value={bulkNewStartTime}
                onChange={(e) => setBulkNewStartTime(e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                type="time"
                value={bulkNewEndTime}
                onChange={(e) => setBulkNewEndTime(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>
        ) : (
          <div className="fba-modal-field">
            <label>New Batch *</label>
            <select value={bulkTargetBatch} onChange={(e) => setBulkTargetBatch(e.target.value)}>
              <option value="">Select Batch</option>
              {setupBatches.map((b) => {
                const displayName = b.displayName || `${b.startTime || ""} to ${b.endTime || ""}`.trim();
                return (
                  <option key={b._id} value={b._id}>
                    {b.batchName} {displayName ? `(${displayName})` : ""}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div className="fba-modal-field">
          <label>Reason (optional)</label>
          <textarea
            rows="2"
            value={bulkReason}
            onChange={(e) => setBulkReason(e.target.value)}
            placeholder="e.g. Faculty reassignment, batch merge..."
          />
        </div>

        <div className="fba-modal-selected-list">
          {Object.values(selectedStudents).map(({ student }) => (
            <span key={student._id} className="fba-modal-chip">{student.fullName}</span>
          ))}
        </div>
      </div>

      <div className="fba-modal-footer">
        <button className="btn-secondary" onClick={() => setShowBulkModal(false)} disabled={bulkSubmitting}>Cancel</button>
        <button className="btn-primary" onClick={handleBulkTransferSubmit} disabled={bulkSubmitting}>
          {bulkSubmitting ? "Transferring..." : "Confirm Transfer"}
        </button>
      </div>
    </div>
  </div>
)}

{viewingBatchStudents && (() => {
  const { batch, fac } = viewingBatchStudents;
  const studentsInBatch = batch.students || [];
  const allChecked = studentsInBatch.length > 0 && studentsInBatch.every((s) => selectedStudents[s._id]);

  return (
  <div className="fba-modal-overlay">
    <div className="fba-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fba-modal-header">
          <div>
            <h3>
  {batch.startTime && batch.endTime
    ? `${formatTimeRange(batch.startTime)} to ${formatTimeRange(batch.endTime)}`
    : batch.batchName || batch.name} Students
</h3>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>
              {fac.facultyName} • {studentsInBatch.length} student{studentsInBatch.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={closeBatchStudentsModal}><X size={18} /></button>
        </div>

        <div className="fba-modal-body">
          <label className="fba-student-select-row fba-student-select-row--header">
            <input type="checkbox" checked={allChecked} onChange={() => toggleSelectAllInBatch(batch, fac)} />
            <span>Select All</span>
          </label>

          <div className="fba-student-modal-list">
            {studentsInBatch.map((s) => (
              <label key={s._id} className="fba-student-select-row">
                <input
                  type="checkbox"
                  checked={!!selectedStudents[s._id]}
                  onChange={() => toggleStudentSelection(s, batch, fac)}
                />
                <span className="fba-student-select-name">
                  {s.fullName} {s.studentId ? <span style={{ color: "#94a3b8", fontWeight: 400 }}>({s.studentId})</span> : null}
                </span>
                <span className="fba-student-course-badge">
                  {getCourseShortName(s.courses?.length ? s.courses[0] : (batch.courseAssigned || fac.courseAssigned || ""))}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="fba-modal-footer">
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            {Object.keys(selectedStudents).length} total selected
          </span>
          <button className="btn-primary" onClick={closeBatchStudentsModal}>Done</button>
        </div>
      </div>
    </div>
  );
})()}

{/* ═══════════════════════════════════════
    TAB 3 — FREE BATCHES (0 students)
═══════════════════════════════════════ */}
{!loading && !error && activeTab === "free" && (
  <div className="table-container">
    {freeBatchesLoading ? (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
        <p>Loading free batches...</p>
      </div>
    ) : (
      <>
        <table className="data-table fba-main-table">
          <thead>
            <tr>
              <th style={{ width: "28%" }}>FACULTY DETAILS</th>
              <th style={{ width: "22%" }}>CONTACT INFORMATION</th>
              <th style={{ width: "18%" }}>FREE BATCH SLOTS</th>
              <th style={{ width: "14%" }}>STATUS</th>
              <th style={{ width: "18%" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {freeBatchesByFaculty.length > 0 ? (
              freeBatchesByFaculty.map((f) => (
                <React.Fragment key={f.facultyId}>
                  <tr className={`fba-faculty-row ${expandedFaculty[f.facultyId + "_free"] ? "fba-faculty-row--open" : ""}`}>
                    <td>
                      <div className="student-info">
                        {f.facultyPhoto ? (
                          <img
                            src={f.facultyPhoto}
                            alt={f.facultyName}
                            style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                            onError={(e) => { e.target.onerror = null; e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                          />
                        ) : null}
                        <div className="avatar fba-avatar-indigo" style={{ display: f.facultyPhoto ? "none" : "flex" }}>
                          {f.facultyName?.charAt(0) || "?"}
                        </div>
                        <div>
                          <strong>{f.facultyName || "N/A"}</strong>
                          <small>{f.facultyNo || ""}</small>
                          <small style={{ color: "#94a3b8" }}>{f.courseAssigned || ""}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="contact-info">
                        {f.facultyEmail && <div><Mail size={13} /> {f.facultyEmail}</div>}
                        {f.facultyMobile && <div><Phone size={13} /> {formatPhoneNumber(f.facultyMobile)}</div>}
                      </div>
                    </td>

                    <td>
                      <div className="fba-stats-cell">
                        <div className="fba-stat-item" style={{ color: "#f59e0b" }}>
                          <span className="fba-stat-num">{f.totalBatchCount}</span>
                          <span className="fba-stat-label">Free Slots</span>
                        </div>
                        <div className="fba-stat-item" style={{ color: "#94a3b8" }}>
                          <span className="fba-stat-num">0</span>
                          <span className="fba-stat-label">Students</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="status-cell">{getStatusBadge(f.facultyStatus)}</div>
                    </td>

                    <td>
                      <button
                        className={`fba-view-btn ${expandedFaculty[f.facultyId + "_free"] ? "fba-view-btn--active" : ""}`}
                        onClick={() => setExpandedFaculty(prev => ({ ...prev, [f.facultyId + "_free"]: !prev[f.facultyId + "_free"] }))}
                      >
                        <Eye size={15} />
                        {expandedFaculty[f.facultyId + "_free"] ? "Hide Slots" : "View Slots"}
                        <ChevronDown
                          size={14}
                          className={`fba-chevron ${expandedFaculty[f.facultyId + "_free"] ? "fba-chevron--open" : ""}`}
                        />
                      </button>
                    </td>
                  </tr>

                  {expandedFaculty[f.facultyId + "_free"] && (
                    <tr className="fba-expanded-row">
                      <td colSpan="5" className="fba-expanded-cell">
                        <div className="fba-batch-grid">
                          {f.batches.map((batch, idx) => (
                            <div key={batch._id || idx} className="fba-batch-card">
                              <div className="fba-card-header" style={{ cursor: "default" }}>
                                <div className="fba-card-icon"><BookOpen size={15} /></div>
                                <div className="fba-card-title">
                                  <span className="fba-batch-name">
                                    {batch.startTime && batch.endTime
                                      ? `${formatTimeRange(batch.startTime)} to ${formatTimeRange(batch.endTime)}`
                                      : batch.batchName || batch.name || `Batch ${idx + 1}`}
                                  </span>
                                  <span className="fba-batch-course">
                                    {batch.courseAssigned || f.courseAssigned || "N/A"}
                                  </span>
                                </div>
                                <span className="fba-student-badge" style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }}>
                                  <Users size={12} />
                                  Free slot
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty-row">
                  <div className="empty-state">
                    <CheckCircle size={48} />
                    <h3>No free batch slots</h3>
                    <p>All faculty batches have students assigned.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {freeBatchesFetched && (
          <div className="batches-summary-footer">
            <span><BookOpen size={14} /> <strong>{totalFreeBatches}</strong> free batch slots</span>
            <span><Users size={14} /> <strong>{freeBatchesByFaculty.length}</strong> faculty with free slots</span>
          </div>
        )}
      </>
    )}
  </div>
)}
    </div>
  );
};

export default FacultyList;