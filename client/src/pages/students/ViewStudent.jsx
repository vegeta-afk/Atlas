import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import FeeManagement from "./FeeManagement";


import {
  User,
  DollarSign,
  Calendar,
  BookOpen,
  FileText,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Clock,
  TrendingUp,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  Percent,
  Clock as ClockIcon,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  Plus,
  Layers,
  Package,
  Award,
  Hash,
  Users,
  Cake,
  VenetianMask,
  UserCircle2,
  ArrowLeftRight,
  Repeat,
  GitBranch,
  History as HistoryIcon,
} from "lucide-react";

const ViewStudent = () => {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    leave: 0,
    late: 0,
    total: 0,
    attendancePercentage: 0
  });
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [expandedDate, setExpandedDate] = useState(null);
  const [selectedAdditionalCourse, setSelectedAdditionalCourse] = useState(null);
  const [showAdditionalCourseModal, setShowAdditionalCourseModal] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [materialIssues, setMaterialIssues] = useState({}); // materialId -> issue record
  const [materialLoading, setMaterialLoading] = useState(false);
  const [togglingMaterial, setTogglingMaterial] = useState(null);
  const [syllabusProgress, setSyllabusProgress] = useState({}); // courseId -> { courseName, syllabus }
  const [syllabusLoading, setSyllabusLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [bridgeBatches, setBridgeBatches] = useState([]);
  const [batchTransfers, setBatchTransfers] = useState([]);
  const [expandedHistoryKey, setExpandedHistoryKey] = useState(null);

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchStudentDetails();
    fetchStudentAttendance();
  }, [id]);

  useEffect(() => {
    if (attendanceData.length > 0) {
      calculateAttendanceStats();
      calculateMonthlyStats();
    }
  }, [attendanceData]);

  useEffect(() => {
    if (student) {
      fetchSyllabusProgress();
    }
  }, [student]);

  useEffect(() => {
  fetchStudentDetails();
  fetchStudentAttendance();
  fetchStudentMaterials();
  fetchStudentHistory();
}, [id]);





  const fetchStudentDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${BASE_URL}/api/students/${id}`,{
        headers: headers,
      });

      if (response.status === 401) {
  console.error("401 on student fetch - token:", localStorage.getItem("token"));
  setLoading(false);
  // window.location.href = "/login";  // comment this out temporarily
  return;
}

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStudent(data.data || data);
    } catch (error) {
      console.error("Error fetching student:", error);
    } finally {
      setLoading(false);
    }
  };

 const fetchStudentAttendance = async () => {
  setAttendanceLoading(true);
  try {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}/api/attendance/student/${id}`, {
      headers: headers,
    });

    console.log(`📡 Response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('📊 Attendance API response:', result);
    
    if (result.success) {
      setAttendanceData(result.data || []);
      if (result.stats) {
        setAttendanceStats(result.stats);
      }
    }
  } catch (error) {
    console.error("❌ Error fetching attendance:", error);
    if (student?.attendance) {
      setAttendanceData(student.attendance);
    }
  } finally {
    setAttendanceLoading(false);
  }
};

  const fetchStudentMaterials = async () => {
  setMaterialLoading(true);
  try {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const [materialsRes, issuesRes] = await Promise.all([
      fetch(`${BASE_URL}/api/materials`, { headers }),
      fetch(`${BASE_URL}/api/materials/issues?studentId=${id}`, { headers }),
    ]);

    const materialsData = await materialsRes.json();
    const issuesData = await issuesRes.json();

    setMaterials(materialsData.data || []);

    const map = {};
    (issuesData.data || []).forEach((issue) => {
      map[issue.materialId] = issue;
    });
    setMaterialIssues(map);
  } catch (error) {
    console.error("Error fetching materials:", error);
  } finally {
    setMaterialLoading(false);
  }
};



const fetchStudentHistory = async () => {
  setHistoryLoading(true);
  try {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const [bridgeRes, transferRes] = await Promise.all([
      fetch(`${BASE_URL}/api/bridge-batch/student/${id}`, { headers }),
      fetch(`${BASE_URL}/api/batch-transfers/student/${id}`, { headers }),
    ]);

    const bridgeData = await bridgeRes.json();
    const transferData = await transferRes.json();

    setBridgeBatches(bridgeData.data || []);
    setBatchTransfers(transferData.data || []);
  } catch (error) {
    console.error("Error fetching student history:", error);
  } finally {
    setHistoryLoading(false);
  }
};

const fetchSyllabusProgress = async () => {
  setSyllabusLoading(true);
  try {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // courseCode/courseId may come back as a populated Course object (has ._id)
    // or as a plain ObjectId string, depending on the backend route — normalize either way.
    const resolveCourseId = (field) => {
      if (!field) return null;
      if (typeof field === "object") return field._id || field.id || null;
      return field;
    };

    const courseList = [];
    const primaryCourseId = resolveCourseId(student?.courseCode);
    if (primaryCourseId) {
      courseList.push({ courseId: primaryCourseId, label: student.course || "Primary Course" });
    }
    if (student?.additionalCourses?.length > 0) {
      student.additionalCourses.forEach((ac) => {
        const acCourseId = resolveCourseId(ac.courseId);
        if (acCourseId) {
          courseList.push({ courseId: acCourseId, label: ac.courseName });
        }
      });
    }
    
    const results = await Promise.all(
      courseList.map(async (c) => {
        const response = await fetch(
          `${BASE_URL}/api/attendance/student/${id}/topic-progress?courseId=${c.courseId}`,
          { headers }
        );
        const result = await response.json();
        return { courseId: c.courseId, label: c.label, ...(result.data || {}) };
      })
    );

    const map = {};
    results.forEach((r) => { map[r.courseId] = r; });
    setSyllabusProgress(map);
  } catch (error) {
    console.error("Error fetching syllabus progress:", error);
  } finally {
    setSyllabusLoading(false);
  }
};

const handleMaterialToggle = async (materialId) => {
  const current = materialIssues[materialId];
  const nextIssued = !current?.issued;

  setMaterialIssues((prev) => ({
    ...prev,
    [materialId]: { ...(prev[materialId] || {}), materialId, studentId: id, issued: nextIssued },
  }));
  setTogglingMaterial(materialId);

  try {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}/api/materials/issues/toggle`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ studentId: id, materialId, issued: nextIssued }),
    });

    const result = await response.json();
    if (result.success) {
      setMaterialIssues((prev) => ({ ...prev, [materialId]: result.data }));
    }
  } catch (error) {
    console.error("Error toggling material:", error);
    setMaterialIssues((prev) => ({
      ...prev,
      [materialId]: { ...(prev[materialId] || {}), issued: !nextIssued },
    }));
  } finally {
    setTogglingMaterial(null);
  }
};

  const calculateAttendanceStats = () => {
    const present = attendanceData.filter(a => a.status === "present").length;
    const absent = attendanceData.filter(a => a.status === "absent").length;
    const leave = attendanceData.filter(a => a.status === "leave").length;
    const late = attendanceData.filter(a => a.status === "late").length;
    const total = attendanceData.length;
    const attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 0;

    setAttendanceStats({
      present,
      absent,
      leave,
      late,
      total,
      attendancePercentage
    });
  };

  const calculateMonthlyStats = () => {
    const monthlyData = {};
    
    attendanceData.forEach(record => {
      const date = new Date(record.date);
      const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          present: 0,
          absent: 0,
          leave: 0,
          late: 0,
          total: 0
        };
      }
      
      monthlyData[monthYear][record.status]++;
      monthlyData[monthYear].total++;
    });
    
    const monthlyArray = Object.entries(monthlyData).map(([month, stats]) => {
      const percentage = stats.total > 0 
        ? Math.round((stats.present / stats.total) * 100)
        : 0;
      
      return {
        month,
        ...stats,
        percentage
      };
    }).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateB - dateA;
    }).slice(0, 3);
    
    setMonthlyStats(monthlyArray);
  };

  const getFilteredAttendance = () => {
    if (dateFilter === "all") return attendanceData;
    
    const now = new Date();
    const filtered = attendanceData.filter(record => {
      const recordDate = new Date(record.date);
      
      switch(dateFilter) {
        case "today":
          return recordDate.toDateString() === now.toDateString();
        case "week":
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return recordDate >= weekAgo;
        case "month":
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          return recordDate >= monthAgo;
        default:
          return true;
      }
    });
    
    return filtered;
  };

  const toggleDateExpansion = (date) => {
    setExpandedDate(expandedDate === date ? null : date);
  };

  const getStatusBadge = (status) => {
    const config = {
      present: { bg: "bg-green-100", text: "text-green-800", label: "Present" },
      absent: { bg: "bg-red-100", text: "text-red-800", label: "Absent" },
      leave: { bg: "bg-yellow-100", text: "text-yellow-800", label: "On Leave" },
      late: { bg: "bg-blue-100", text: "text-blue-800", label: "Late" }
    };
    
    const style = config[status] || { bg: "bg-gray-100", text: "text-gray-800", label: status };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatSimpleDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatPhoneDisplay = (phone) => {
    if (!phone) return "N/A";
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length === 10 ? `${cleaned.slice(0, 5)} ${cleaned.slice(5)}` : phone;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Calculate totals for additional course
  const calculateCourseTotals = (feeSchedule) => {
    const totalMonthlyFees = feeSchedule.reduce((sum, fee) => sum + (fee.baseFee || 0), 0);
    const totalExamFees = feeSchedule.reduce((sum, fee) => sum + (fee.examFee || 0), 0);
    const totalPaid = feeSchedule.reduce((sum, fee) => sum + (fee.paidAmount || 0), 0);
    const totalFees = feeSchedule.reduce((sum, fee) => sum + (fee.totalFee || 0), 0);
    
    return { totalMonthlyFees, totalExamFees, totalPaid, totalFees };
  };

  const buildHistoryTimeline = () => {
    if (!student) return [];
    const events = [];

    (student.conversionHistory || []).forEach((c, idx) => {
      events.push({
        key: `conv-${idx}`,
        type: "conversion",
        date: c.conversionDate,
        title: `Course Converted: ${c.fromCourse} → ${c.toCourse}`,
        subtitle: `Month ${c.conversionMonth || "N/A"}`,
        details: [
          { label: "Reason", value: c.reason || "N/A" },
          { label: "Old Total Fee", value: formatCurrency(c.oldTotalFee) },
          { label: "New Total Fee", value: formatCurrency(c.newTotalFee) },
          { label: "Old Paid Amount", value: formatCurrency(c.oldPaidAmount) },
          { label: "New Paid Amount", value: formatCurrency(c.newPaidAmount) },
        ],
      });
    });

    (student.extensionHistory || []).forEach((e, idx) => {
      events.push({
        key: `ext-${idx}`,
        type: "extension",
        date: e.extensionDate,
        title: `Course Extended: ${e.fromCourse} → ${e.toCourse}`,
        subtitle: `Month ${e.extensionMonth || "N/A"}`,
        details: [
          { label: "Reason", value: e.reason || "N/A" },
          { label: "Additional Fees", value: formatCurrency(e.additionalFees) },
          { label: "New Total Fee", value: formatCurrency(e.newTotalFee) },
        ],
      });
    });

    bridgeBatches.forEach((b, idx) => {
      const statusLabelMap = {
        pending: "Pending Approval",
        active: "Active",
        ready_to_merge: "Ready to Merge",
        merged: "Merged Back",
        cancelled: "Cancelled",
        rejected: "Rejected",
      };
      events.push({
        key: `bridge-${b._id || idx}`,
        type: "bridge",
        date: b.createdAt,
        title: `Bridge Batch: ${b.courseName || "N/A"}`,
        subtitle: statusLabelMap[b.status] || b.status,
        details: [
          { label: "Status", value: statusLabelMap[b.status] || b.status },
          { label: "Reason", value: b.reason || "N/A" },
          { label: "Temp Faculty", value: b.tempFacultyName || "N/A" },
          { label: "Parent Batch", value: b.parentBatchId?.displayName || b.parentBatchId?.batchName || "N/A" },
          { label: "Requested By", value: b.requestedBy?.name || "N/A" },
          ...(b.approvedBy ? [{ label: "Approved By", value: b.approvedBy?.name || "N/A" }] : []),
          ...(b.approvedDate ? [{ label: "Approved Date", value: formatSimpleDate(b.approvedDate) }] : []),
          ...(b.mergedBy ? [{ label: "Merged By", value: b.mergedBy?.name || "N/A" }] : []),
          ...(b.mergedDate ? [{ label: "Merged Date", value: formatSimpleDate(b.mergedDate) }] : []),
          ...(b.rejectedReason ? [{ label: "Rejected Reason", value: b.rejectedReason }] : []),
          { label: "Topics Covered", value: `${(b.selectedTopics || []).filter(t => t.completed).length} / ${(b.selectedTopics || []).length}` },
        ],
      });
    });

    batchTransfers.forEach((t, idx) => {
      const statusLabelMap = {
        pending: "Pending Approval",
        approved: "Approved",
        rejected: "Rejected",
      };
      events.push({
        key: `transfer-${t._id || idx}`,
        type: "transfer",
        date: t.requestDate || t.createdAt,
        title: `Batch Transfer: ${t.previousBatch || t.previousBatchTime || "N/A"} → ${t.newBatchTime || t.newBatch || "N/A"}`,
        subtitle: statusLabelMap[t.status] || t.status,
        details: [
          { label: "Status", value: statusLabelMap[t.status] || t.status },
          { label: "Reason", value: t.transferReason || "N/A" },
          { label: "Previous Teacher", value: t.previousTeacher || "N/A" },
          { label: "New Teacher", value: t.newTeacher || "N/A" },
          { label: "Requested By", value: t.requestedByName || t.requestedBy?.name || "N/A" },
          ...(t.approvedBy ? [{ label: "Approved/Rejected By", value: t.approvedBy?.name || t.approvedBy?.username || "N/A" }] : []),
          ...(t.approvedDate ? [{ label: "Decision Date", value: formatSimpleDate(t.approvedDate) }] : []),
          ...(t.rejectionReason ? [{ label: "Rejection Reason", value: t.rejectionReason }] : []),
          ...(t.remarks ? [{ label: "Remarks", value: t.remarks }] : []),
        ],
      });
    });

    return events
      .filter(e => e.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const historyTimeline = buildHistoryTimeline();

  const historyTypeConfig = {
    conversion: { icon: <GitBranch size={16} />, bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-200" },
    extension: { icon: <Repeat size={16} />, bg: "bg-teal-100", text: "text-teal-700", ring: "ring-teal-200" },
    bridge: { icon: <Layers size={16} />, bg: "bg-purple-100", text: "text-purple-700", ring: "ring-purple-200" },
    transfer: { icon: <ArrowLeftRight size={16} />, bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-200" },
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800">Student not found</h2>
      </div>
    );
  }


  const activeFeeSchedule = (student.feeSchedule || []).filter(
  f => f.status !== "suspended"
);
let additionalTotalFee = 0;
let additionalPaid = 0;
if (student.additionalCourses && student.additionalCourses.length > 0) {
  student.additionalCourses.forEach(course => {
    const fees = (course.feeSchedule || []).filter(f => f.status !== "suspended");
    additionalTotalFee += fees.reduce((s, f) => s + (f.totalFee || 0), 0);
    additionalPaid += fees.reduce((s, f) => s + (f.paidAmount || 0), 0);
  });
}
const activeTotalFee = activeFeeSchedule.reduce(
  (s, f) => s + (f.totalFee || 0), 0
) + (student.admissionFee || 0) + additionalTotalFee;  // ← add admission fee + additional courses to total

const monthlyPaid = activeFeeSchedule.reduce(
  (s, f) => s + (f.paidAmount || 0), 0
);
const admissionPaid = student.admissionFeePaidAmount || 0;
const activePaidAmount = monthlyPaid + admissionPaid + additionalPaid;


const activeBalanceAmount = activeTotalFee - activePaidAmount;

const monthlyPaidTotal = activeFeeSchedule.reduce(
  (s, f) => s + (f.isExamMonth ? (f.monthlyPaid || 0) : Math.max(0, (f.paidAmount || 0) - (f.otherFeePaid || 0))),
  0
);
const otherFeePaidTotal = activeFeeSchedule.reduce((s, f) => s + (f.otherFeePaid || 0), 0);
const examPaidTotal = activeFeeSchedule.reduce((s, f) => s + (f.examPaid || 0), 0);

const monthlyFeeTotal = activeFeeSchedule.reduce((s, f) => s + (f.baseFee || 0), 0);
const examFeeTotal = activeFeeSchedule.reduce((s, f) => s + (f.isExamMonth ? (f.examFee || 0) : 0), 0);
const otherFeeTotal = activeFeeSchedule.reduce((s, f) => s + (f.otherFeeAmount || 0), 0);

const monthlyBalance = Math.max(0, monthlyFeeTotal - monthlyPaidTotal);
const examBalance = Math.max(0, examFeeTotal - examPaidTotal);
const otherFeeBalance = Math.max(0, otherFeeTotal - otherFeePaidTotal);
const admissionBalance = Math.max(0, (student.admissionFee || 0) - admissionPaid);
const additionalBalance = Math.max(0, additionalTotalFee - additionalPaid);



  const tabs = [
    { id: "basic", label: "Basic Info", icon: <User size={18} /> },
    { id: "fees", label: "Fees", icon: <DollarSign size={18} /> },
    { id: "attendance", label: "Attendance", icon: <Calendar size={18} /> },
    { id: "academic", label: "Academic", icon: <BookOpen size={18} /> },
    { id: "syllabus", label: "Syllabus Progress", icon: <CheckCircle size={18} /> },
    { id: "history", label: "History", icon: <HistoryIcon size={18} /> },
    { id: "documents", label: "Documents", icon: <FileText size={18} /> },
    { id: "material", label: "Material Issue", icon: <Package size={18} /> },
  ];

  const filteredAttendance = getFilteredAttendance();
  const groupedAttendance = filteredAttendance.reduce((groups, record) => {
    const date = new Date(record.date).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(record);
    return groups;
  }, {});

  // Check if student has additional courses
  const hasAdditionalCourses = student.additionalCourses && student.additionalCourses.length > 0;

  return (
    <div className="container mx-auto p-6">
      {/* Header - UNCHANGED */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="shrink-0">
            <img
              className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg"
              src={student.photo || "/default-avatar.png"}
              alt={student.fullName}
            />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {student.fullName}
                </h1>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-gray-600">
                    <GraduationCap size={16} />
                    {student.course || "Mathematics and Physics"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-600">
                    <ClockIcon size={16} />
                    {student.batchTime || "08:00 to 09:00"}
                  </span>
                                    <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      student.status === "active"
                        ? "bg-green-100 text-green-800"
                        : student.status === "completed"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {student.status || "active"}
                  </span>

                  {/* Scholarship Badge */}
                  {student.hasScholarship && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Award size={14} />
                      Scholarship Applied
                    </span>
                  )}

                  
                  {/* Additional Courses Badge */}
                  {hasAdditionalCourses && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
                      <Layers size={14} />
                      +{student.additionalCourses.length} More Courses
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                  <Printer size={18} />
                  Print
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Download size={18} />
                  Download
                </button>
              </div>
            </div>

            {/* Quick Stats - UNCHANGED */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-blue-600 font-semibold">Student ID</div>
                <div className="text-xl font-bold">{student.studentId || "STU20260014"}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-green-600 font-semibold">Attendance</div>
                <div className="text-xl font-bold">{attendanceStats.attendancePercentage}%</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
  <div className="text-purple-600 font-semibold">Fees Paid</div>
  <div className="flex items-center gap-1.5">
    <span className="text-xl font-bold">₹{activePaidAmount}</span>
    <div className="group relative inline-flex">
      <AlertCircle size={14} className="text-gray-400 hover:text-purple-600 cursor-help transition-colors" />
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-44 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div className="bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 space-y-1.5">
          <div className="flex justify-between gap-3">
            <span className="text-gray-300">Monthly</span>
            <span className="font-semibold">{formatCurrency(monthlyPaidTotal)}</span>
          </div>
          {otherFeePaidTotal > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-gray-300">Other Fees</span>
              <span className="font-semibold">{formatCurrency(otherFeePaidTotal)}</span>
            </div>
          )}
          {examPaidTotal > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-gray-300">Exam Fee</span>
              <span className="font-semibold">{formatCurrency(examPaidTotal)}</span>
            </div>
          )}
          {admissionPaid > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-gray-300">Admission Fee</span>
              <span className="font-semibold">{formatCurrency(admissionPaid)}</span>
            </div>
          )}
          {additionalPaid > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-gray-300">Additional Courses</span>
              <span className="font-semibold">{formatCurrency(additionalPaid)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3 pt-1.5 border-t border-gray-700">
            <span className="text-gray-300">Total</span>
            <span className="font-bold text-purple-400">{formatCurrency(activePaidAmount)}</span>
          </div>
        </div>
        <div className="w-2.5 h-2.5 bg-gray-900 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
      </div>
    </div>
  </div>
</div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
  <div className="text-orange-600 font-semibold">Balance</div>
  <div className="flex items-center gap-1.5">
    <span className="text-xl font-bold">₹{activeBalanceAmount}</span>
    <div className="group relative inline-flex">
      <AlertCircle size={14} className="text-gray-400 hover:text-orange-600 cursor-help transition-colors" />
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-44 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div className="bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 space-y-1.5">
          <div className="flex justify-between gap-3">
            <span className="text-gray-300">Monthly</span>
            <span className="font-semibold">{formatCurrency(monthlyBalance)}</span>
          </div>
          {otherFeeBalance > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-gray-300">Other Fees</span>
              <span className="font-semibold">{formatCurrency(otherFeeBalance)}</span>
            </div>
          )}
          {examBalance > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-gray-300">Exam Fee</span>
              <span className="font-semibold">{formatCurrency(examBalance)}</span>
            </div>
          )}
          {admissionBalance > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-gray-300">Admission Fee</span>
              <span className="font-semibold">{formatCurrency(admissionBalance)}</span>
            </div>
          )}
          {additionalBalance > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-gray-300">Additional Courses</span>
              <span className="font-semibold">{formatCurrency(additionalBalance)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3 pt-1.5 border-t border-gray-700">
            <span className="text-gray-300">Total</span>
            <span className="font-bold text-orange-400">{formatCurrency(activeBalanceAmount)}</span>
          </div>
        </div>
        <div className="w-2.5 h-2.5 bg-gray-900 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
      </div>
    </div>
  </div>
</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "basic" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Personal Information */}
                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-3 border-b border-blue-100 flex items-center gap-2">
                    <User size={18} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-800">Personal Information</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <UserCircle2 size={15} className="text-gray-400" /> Full Name
                      </span>
                      <span className="text-sm font-medium text-gray-800">{student.fullName || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <Cake size={15} className="text-gray-400" /> Date of Birth
                      </span>
                      <span className="text-sm font-medium text-gray-800">{formatSimpleDate(student.dateOfBirth)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <VenetianMask size={15} className="text-gray-400" /> Gender
                      </span>
                      <span className="text-sm font-medium text-gray-800 capitalize">{student.gender || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <Users size={15} className="text-gray-400" /> Father's Name
                      </span>
                      <span className="text-sm font-medium text-gray-800">{student.fatherName || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <Users size={15} className="text-gray-400" /> Mother's Name
                      </span>
                      <span className="text-sm font-medium text-gray-800">{student.motherName || "N/A"}</span>
                    </div>
                                        <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Caste</span>
                      <span className="text-sm font-medium text-gray-800 uppercase">{student.cast || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Category</span>
                      <span className="text-sm font-medium text-gray-800">{student.category || "N/A"}</span>
                    </div>
                    {student.speciallyAbled && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Specially Abled</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Yes</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-3 border-b border-emerald-100 flex items-center gap-2">
                    <Phone size={18} className="text-emerald-600" />
                    <h3 className="font-semibold text-gray-800">Contact Information</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <Mail size={15} className="text-gray-400" /> Email
                      </span>
                      <span className="text-sm font-medium text-gray-800">{student.email || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <Phone size={15} className="text-gray-400" /> Mobile
                      </span>
                      <span className="text-sm font-medium text-gray-800">{formatPhoneDisplay(student.mobileNumber)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <Phone size={15} className="text-gray-400" /> Father's Mobile
                      </span>
                      <span className="text-sm font-medium text-gray-800">{formatPhoneDisplay(student.fatherNumber)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <Phone size={15} className="text-gray-400" /> Mother's Mobile
                      </span>
                      <span className="text-sm font-medium text-gray-800">{formatPhoneDisplay(student.motherNumber)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <Hash size={15} className="text-gray-400" /> Aadhar Number
                      </span>
                      <span className="text-sm font-medium text-gray-800">{student.aadharNumber || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Address */}
                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-3 border-b border-orange-100 flex items-center gap-2">
                    <MapPin size={18} className="text-orange-600" />
                    <h3 className="font-semibold text-gray-800">Address</h3>
                  </div>
                                    <div className="p-5 space-y-1.5">
                    {student.place && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <MapPin size={12} className="text-gray-400" /> {student.place}
                      </p>
                    )}
                    <p className="text-sm font-medium text-gray-800">{student.address || "N/A"}</p>
                    <p className="text-sm text-gray-600">
                      {[student.city, student.state].filter(Boolean).join(", ")}
                      {student.pincode ? ` - ${student.pincode}` : ""}
                    </p>
                  </div>
                </div>

                {/* Enrollment */}
                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 px-5 py-3 border-b border-purple-100 flex items-center gap-2">
                    <Calendar size={18} className="text-purple-600" />
                    <h3 className="font-semibold text-gray-800">Enrollment</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Admission Date</span>
                      <span className="text-sm font-medium text-gray-800">{formatSimpleDate(student.admissionDate)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Admission No</span>
                      <span className="text-sm font-medium text-gray-800">{student.admissionNo || "N/A"}</span>
                    </div>
                                        <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Faculty</span>
                      <span className="text-sm font-medium text-gray-800">{student.facultyAllot || "Not Allotted"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remarks — only if present */}
              {student.remarks && (
                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                    <FileText size={18} className="text-gray-600" />
                    <h3 className="font-semibold text-gray-800">Remarks</h3>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-gray-700">{student.remarks}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "fees" && (
            <>
              {/* Primary Course Fees */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Primary Course Fees</h3>
                <FeeManagement
                  studentId={id}
                  student={student.data || student}
                  course={student.courseCode || { courseFullName: student.course }}
                />
              </div>

              {/* Additional Courses Section */}
              {hasAdditionalCourses && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Layers size={20} className="text-purple-600" />
                    Additional Courses
                  </h3>

                  {student.additionalCourses.map((course, index) => (
  <div key={index} className="mb-8 border border-purple-200 rounded-lg overflow-hidden">
    <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-semibold text-purple-800">{course.courseName}</h4>
          <p className="text-xs text-purple-600">
            Faculty: {course.facultyName} • Batch: {course.batchTime}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Started Month {course.startMonth}</p>
          <p className="text-xs text-gray-500">Duration: {course.duration} months</p>
        </div>
      </div>
    </div>
    <div className="p-4">
      <FeeManagement
        studentId={id}
        student={student.data || student}
        course={{
          courseFullName: course.courseName,
          monthlyFee: course.monthlyFee,
          examFee: course.examFee,
          duration: course.duration,
        }}
        additionalCourseIndex={index}
      />
    </div>
  </div>
))}
                </div>
              )}
            </>
          )}

          {activeTab === "attendance" && (
            <>
              {/* Primary Course Attendance - UNCHANGED */}
                <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4">Attendance (Primary Course)</h3>

      {attendanceLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-700">{attendanceStats.present}</div>
              <div className="text-sm text-green-600">Present</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-700">{attendanceStats.absent}</div>
              <div className="text-sm text-red-600">Absent</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-700">{attendanceStats.leave}</div>
              <div className="text-sm text-yellow-600">Leave</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-700">{attendanceStats.late}</div>
              <div className="text-sm text-blue-600">Late</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-700">{attendanceStats.attendancePercentage}%</div>
              <div className="text-sm text-purple-600">Attendance</div>
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex gap-2 mb-4">
            {["all", "today", "week", "month"].map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                  dateFilter === f
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "all" ? "All Time" : f === "week" ? "This Week" : f === "month" ? "This Month" : "Today"}
              </button>
            ))}
          </div>

          {/* Attendance Records */}
          {filteredAttendance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
              <p>No attendance records found for this period.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedAttendance)
                .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                .map(([date, records]) => (
                  <div key={date} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleDateExpansion(date)}
                      className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium text-gray-800">{formatDate(date)}</span>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(records[0].status)}
                        {expandedDate === date ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {expandedDate === date && (
                      <div className="px-4 py-3 bg-white space-y-2">
                        {records.map((record, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <div className="text-gray-600">
                              <span className="font-medium">Batch:</span> {record.batchName || "N/A"} &nbsp;|&nbsp;
                              <span className="font-medium">Faculty:</span> {record.facultyName || "N/A"}
                              {record.remarks && (
                                <span> &nbsp;|&nbsp; <span className="font-medium">Remarks:</span> {record.remarks}</span>
                              )}
                            </div>
                            <div className="text-gray-400">{record.time || ""}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>

              {/* Additional Courses Attendance */}
              {hasAdditionalCourses && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Layers size={20} className="text-purple-600" />
                    Additional Courses Attendance
                  </h3>

                  <div className="space-y-6">
                    {student.additionalCourses.map((course, index) => (
                      <div key={index} className="border border-purple-200 rounded-lg overflow-hidden">
                        <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
                          <h4 className="font-semibold text-purple-800">{course.courseName}</h4>
                          <p className="text-xs text-purple-600">Faculty: {course.facultyName} • Batch: {course.batchTime}</p>
                        </div>

                        <div className="p-4">
                          {course.attendance && course.attendance.length > 0 ? (
                            <div className="space-y-3">
                              {course.attendance.map((record, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <div>
                                    <p className="font-medium">{new Date(record.date).toLocaleDateString()}</p>
                                    <p className="text-sm text-gray-600">{record.remarks || "No remarks"}</p>
                                  </div>
                                  {getStatusBadge(record.status)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-gray-500 py-4">No attendance records for this course</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "academic" && (
            <>
              {/* Primary Course Academic - UNCHANGED */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Academic Details (Primary Course)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Course Information</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Course:</span>{" "}
                        {student.course || "Mathematics and Physics"}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span>{" "}
                        {student.duration || "15 months"}
                      </div>
                      <div>
                        <span className="font-medium">Batch Time:</span>{" "}
                        {student.batchTime || "08:00 to 09:00"}
                      </div>
                      <div>
                        <span className="font-medium">Faculty:</span>{" "}
                        {student.facultyAllot || "Not Assigned"}
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Exam Schedule</h4>
                    <div className="space-y-2">
                      <div>Mid-term: Month 6</div>
                      <div>Final Exam: Month 15</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Courses Academic Section */}
              {hasAdditionalCourses && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Layers size={20} className="text-purple-600" />
                    Additional Courses Academic Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {student.additionalCourses.map((course, index) => (
                      <div key={index} className="border border-purple-200 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-800 mb-2">{course.courseName}</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Duration</p>
                            <p className="font-medium">{course.duration} months</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Start Month</p>
                            <p className="font-medium">Month {course.startMonth}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Monthly Fee</p>
                            <p className="font-medium">{formatCurrency(course.monthlyFee)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Faculty</p>
                            <p className="font-medium">{course.facultyName || "Not Assigned"}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Batch Time</p>
                            <p className="font-medium">{course.batchTime || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {activeTab === "syllabus" && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-600" />
            Syllabus Progress
          </h3>

          {syllabusLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : Object.keys(syllabusProgress).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
              <p>No syllabus progress recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.values(syllabusProgress).map((courseProgress) => {
                const allTopics = courseProgress.syllabus || [];
                const totalTopics = allTopics.length;
                const completedTopics = allTopics.filter((t) => t.completed).length;
                const percent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

                return (
                  <div key={courseProgress.courseId} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-blue-50 px-4 py-3 border-b border-blue-200 flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-blue-800">
                          {courseProgress.courseName || courseProgress.label}
                        </h4>
                        <p className="text-xs text-blue-600">
                          {completedTopics} of {totalTopics} topics completed
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        percent >= 75 ? "bg-green-100 text-green-800" :
                        percent >= 40 ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {percent}%
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      {allTopics.map((topic) => (
                        <div key={topic.key}>
                          <div className="flex items-center gap-2">
                            {topic.completed ? (
                              <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle size={16} className="text-gray-300 flex-shrink-0" />
                            )}
                            <span className={`text-sm ${topic.completed ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                              {topic.name}
                            </span>
                          </div>
                          {topic.subtopics?.length > 0 && (
                            <div className="pl-6 mt-1 space-y-1">
                              {topic.subtopics.map((sub) => (
                                <div key={sub.key} className="flex items-center gap-2">
                                  {sub.completed ? (
                                    <CheckCircle size={13} className="text-green-500 flex-shrink-0" />
                                  ) : (
                                    <XCircle size={13} className="text-gray-200 flex-shrink-0" />
                                  )}
                                  <span className={`text-xs ${sub.completed ? "text-gray-700" : "text-gray-400"}`}>
                                    {sub.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

            {activeTab === "history" && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <HistoryIcon size={20} className="text-indigo-600" />
            Student History Timeline
          </h3>

          {historyLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : historyTimeline.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <HistoryIcon size={40} className="mx-auto mb-3 text-gray-300" />
              <p>No history records found for this student.</p>
            </div>
          ) : (
            <div className="relative pl-8 space-y-4">
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />

              {historyTimeline.map((event) => {
                const config = historyTypeConfig[event.type];
                const isExpanded = expandedHistoryKey === event.key;

                return (
                  <div key={event.key} className="relative">
                    <div className={`absolute -left-8 top-1 w-6 h-6 rounded-full flex items-center justify-center ${config.bg} ${config.text} ring-4 ring-white`}>
                      {config.icon}
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedHistoryKey(isExpanded ? null : event.key)}
                        className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                      >
                        <div>
                          <p className="font-medium text-gray-800">{event.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatSimpleDate(event.date)} • <span className={config.text}>{event.subtitle}</span>
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp size={16} className="flex-shrink-0" /> : <ChevronDown size={16} className="flex-shrink-0" />}
                      </button>

                      {isExpanded && (
                        <div className="px-4 py-3 bg-white space-y-2">
                          {event.details.map((d, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-500">{d.label}</span>
                              <span className="font-medium text-gray-800 text-right max-w-[60%]">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "material" && (
  <div>
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
      <Package size={20} className="text-orange-600" />
      Material Issued
    </h3>

    {materialLoading ? (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    ) : materials.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        <Package size={40} className="mx-auto mb-3 text-gray-300" />
        <p>No materials added yet. Add some from the Material Issue page.</p>
      </div>
    ) : (
      <div className="space-y-3">
        {materials.map((m) => {
          const issue = materialIssues[m._id];
          const isIssued = !!issue?.issued;
          return (
            <div key={m._id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Package size={18} className="text-gray-400" />
                <div>
                  <p className="font-medium">{m.name}</p>
                  {isIssued && issue?.issuedDate && (
                    <p className="text-xs text-gray-500">
                      Issued on {new Date(issue.issuedDate).toLocaleDateString("en-GB")}
                    </p>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${isIssued ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                  {isIssued ? "Issued" : "Not Issued"}
                </span>
                <input
                  type="checkbox"
                  checked={isIssued}
                  disabled={togglingMaterial === m._id}
                  onChange={() => handleMaterialToggle(m._id)}
                  className="w-5 h-5"
                />
              </label>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}
    </div>
  );
};

export default ViewStudent;