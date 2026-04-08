// pages/dashboard/FacultyDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ClipboardList, QrCode, BookOpen, Calendar, CreditCard, TrendingUp, ArrowRight } from "lucide-react";
import { studentAPI, enquiryAPI, admissionAPI } from "../../services/api";

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalEnquiries: 0,
    totalAdmissions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (userStr) {
      try { setUser(JSON.parse(userStr)); } catch {}
    }
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [studentsRes, enquiriesRes, admissionsRes] = await Promise.allSettled([
        studentAPI.getStudentStats(),
        enquiryAPI.getDashboardStats(),
        admissionAPI.getDashboardStats(),
      ]);
      setStats({
        totalStudents:   studentsRes.status === "fulfilled"  ? studentsRes.value?.data?.totalStudents || 0 : 0,
        totalEnquiries:  enquiriesRes.status === "fulfilled" ? enquiriesRes.value?.data?.total || 0 : 0,
        totalAdmissions: admissionsRes.status === "fulfilled"? admissionsRes.value?.data?.total || 0 : 0,
      });
    } catch (err) {
      console.error("Stats fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: "Scan QR Attendance",   description: "Mark attendance via QR code",         icon: <QrCode size={24} color="#3b82f6" />,  path: "/faculty/attendance/scan",              bg: "#eff6ff", border: "#bfdbfe" },
    { label: "Student Attendance",   description: "View & manage attendance records",     icon: <Calendar size={24} color="#10b981" />, path: "/faculty/students/attendance",          bg: "#f0fdf4", border: "#bbf7d0" },
    { label: "Student List",         description: "Browse all enrolled students",         icon: <Users size={24} color="#8b5cf6" />,    path: "/faculty/students",                     bg: "#faf5ff", border: "#ddd6fe" },
    { label: "Enquiry List",         description: "View & manage enquiries",              icon: <ClipboardList size={24} color="#f59e0b" />, path: "/faculty/front-office/enquiries",   bg: "#fffbeb", border: "#fde68a" },
    { label: "Admission List",       description: "Track all admissions",                icon: <TrendingUp size={24} color="#ef4444" />, path: "/faculty/front-office/admissions",    bg: "#fef2f2", border: "#fecaca" },
    { label: "Manage Tests",         description: "Create and manage exams",             icon: <BookOpen size={24} color="#06b6d4" />,  path: "/faculty/exam/manage-tests",            bg: "#ecfeff", border: "#a5f3fc" },
  ];

  const statCards = [
    { label: "Total Students",   value: loading ? "..." : stats.totalStudents,   icon: <Users size={20} color="#3b82f6" />,       bg: "#eff6ff" },
    { label: "Total Enquiries",  value: loading ? "..." : stats.totalEnquiries,  icon: <ClipboardList size={20} color="#f59e0b" />, bg: "#fffbeb" },
    { label: "Total Admissions", value: loading ? "..." : stats.totalAdmissions, icon: <CreditCard size={20} color="#10b981" />,  bg: "#f0fdf4" },
  ];

  return (
    <div style={{ padding: "16px", maxWidth: "1200px" }}>

      {/* Responsive styles injected once */}
      <style>{`
        .faculty-banner {
          background: linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%);
          border-radius: 14px;
          padding: 22px 24px;
          margin-bottom: 20px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
        }
        .faculty-banner h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }
        .faculty-banner p {
          margin: 5px 0 0;
          opacity: 0.85;
          font-size: 13px;
        }
        .faculty-banner-btn {
          background: white;
          color: #1d4ed8;
          border: none;
          border-radius: 10px;
          padding: 10px 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .faculty-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 22px;
        }
        .faculty-stat-card {
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .faculty-stat-icon {
          background: white;
          border-radius: 10px;
          padding: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .faculty-stat-label {
          margin: 0;
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }
        .faculty-stat-value {
          margin: 2px 0 0;
          font-size: 22px;
          font-weight: 700;
          color: #111827;
        }
        .faculty-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
        }
        .faculty-action-btn {
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 14px;
          text-align: left;
          transition: transform 0.15s, box-shadow 0.15s;
          width: 100%;
        }
        .faculty-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.10);
        }
        .faculty-action-icon {
          background: white;
          border-radius: 10px;
          padding: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .faculty-action-title {
          margin: 0;
          font-weight: 600;
          color: #111827;
          font-size: 14px;
        }
        .faculty-action-desc {
          margin: 3px 0 0;
          font-size: 12px;
          color: #6b7280;
        }
        .faculty-section-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 14px;
        }

        @media (max-width: 640px) {
          .faculty-banner { padding: 16px; }
          .faculty-banner h1 { font-size: 17px; }
          .faculty-banner-btn { width: 100%; justify-content: center; }
          .faculty-stat-grid { grid-template-columns: 1fr; gap: 8px; }
          .faculty-stat-card { padding: 12px; }
          .faculty-stat-value { font-size: 20px; }
          .faculty-actions-grid { grid-template-columns: 1fr; }
          .faculty-action-btn { padding: 14px; }
        }

        @media (max-width: 420px) {
          .faculty-stat-grid { grid-template-columns: 1fr 1fr; }
          .faculty-stat-grid > :last-child { grid-column: 1 / -1; }
        }
      `}</style>

      {/* Welcome Banner */}
      <div className="faculty-banner">
        <div>
          <h1>Welcome back, {user?.fullName || user?.name || "Faculty"} 👋</h1>
          <p>
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <button className="faculty-banner-btn" onClick={() => navigate("/faculty/attendance/scan")}>
          <QrCode size={17} />
          Scan QR Attendance
        </button>
      </div>

      {/* Stat Cards */}
      <div className="faculty-stat-grid">
        {statCards.map((card) => (
          <div key={card.label} className="faculty-stat-card" style={{ background: card.bg }}>
            <div className="faculty-stat-icon">{card.icon}</div>
            <div>
              <p className="faculty-stat-label">{card.label}</p>
              <p className="faculty-stat-value">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="faculty-section-title">Quick Actions</h2>
      <div className="faculty-actions-grid">
        {quickActions.map((action) => (
          <button
            key={action.label}
            className="faculty-action-btn"
            onClick={() => navigate(action.path)}
            style={{ background: action.bg, border: `1px solid ${action.border}` }}
          >
            <div className="faculty-action-icon">{action.icon}</div>
            <div style={{ flex: 1 }}>
              <p className="faculty-action-title">{action.label}</p>
              <p className="faculty-action-desc">{action.description}</p>
            </div>
            <ArrowRight size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default FacultyDashboard;