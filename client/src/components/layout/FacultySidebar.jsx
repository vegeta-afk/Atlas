// components/layout/FacultySidebar.jsx
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users as UsersIcon,
  Building,
  Phone,
  AlertCircle,
  Mail,
  List,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Briefcase,
  Calendar,
  FileText,
  CreditCard,
  BarChart,
  BookOpen,
  ClipboardList,
  FilePlus,
  ArrowLeftRight,
  TrendingUp,
  Plus,
  QrCode,
  LogOut,
} from "lucide-react";
import "./Sidebar.css";

const FacultySidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [openDropdowns, setOpenDropdowns] = useState({
    frontOffice: true,
    students: true,
    exam: false,
  });

  const toggleDropdown = (key) => {
    setOpenDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login");
  };

  const menuItems = [
    {
      path: "/faculty/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    {
      key: "frontOffice",
      label: "Front Office",
      icon: <Building size={20} />,
      isDropdown: true,
      subItems: [
        {
          path: "/faculty/front-office/enquiries",
          label: "Enquiry List",
          icon: <List size={16} />,
        },
        {
          path: "/faculty/front-office/admissions",
          label: "Admission List",
          icon: <UsersIcon size={16} />,
        },
        {
          path: "/faculty/front-office/calls",
          label: "Call Logs",
          icon: <Phone size={16} />,
        },
      ],
    },
    {
      key: "students",
      label: "Students",
      icon: <UsersIcon size={20} />,
      isDropdown: true,
      subItems: [
        {
          path: "/faculty/students",
          label: "Student List",
          icon: <UsersIcon size={16} />,
        },
        {
          path: "/faculty/students/attendance",
          label: "Attendance",
          icon: <Calendar size={16} />,
        },
        {
          path: "/faculty/attendance/scan",
          label: "Scan QR Attendance",
          icon: <QrCode size={16} />,
        },
        {
          path: "/faculty/students/fees",
          label: "Fee Management",
          icon: <CreditCard size={16} />,
        },
        {
          path: "/faculty/students/batch-transfer",
          label: "Batch Transfer",
          icon: <ArrowLeftRight size={16} />,
        },
        // ❌ REMOVED: Course Conversion
        // ❌ REMOVED: Course Extension
      ],
    },
    {
      key: "exam",
      label: "Exam",
      icon: <BookOpen size={20} />,
      isDropdown: true,
      subItems: [
        {
          path: "/faculty/exam/create-test",
          label: "Create Test",
          icon: <FilePlus size={16} />,
        },
        {
          path: "/faculty/exam/question-bank",
          label: "Question Bank",
          icon: <BookOpen size={16} />,
        },
        {
          path: "/faculty/exam/manage-tests",
          label: "Manage Tests",
          icon: <ClipboardList size={16} />,
        },
        {
          path: "/faculty/exam/results",
          label: "Results",
          icon: <BarChart size={16} />,
        },
      ],
    },
  ];

  const renderMenuItems = (items, level = 0) => {
    return items.map((item, index) => {
      if (item.isDropdown) {
        const isOpen = openDropdowns[item.key];
        return (
          <div key={item.key || index} className="menu-item">
            <button
              className={level === 0 ? "dropdown-toggle" : "nested-dropdown-toggle"}
              onClick={() => toggleDropdown(item.key)}
            >
              <span className={level === 0 ? "nav-icon" : "sub-nav-icon"}>
                {item.icon}
              </span>
              <span className={level === 0 ? "nav-label" : "sub-nav-label"}>
                {item.label}
              </span>
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {isOpen && item.subItems && (
              <div className={level === 0 ? "sub-menu" : "nested-sub-menu"}>
                {renderMenuItems(item.subItems, level + 1)}
              </div>
            )}
          </div>
        );
      }

      const isActive = location.pathname === item.path;

      if (level === 0) {
        return (
          <Link key={item.path} to={item.path} className={`nav-link ${isActive ? "active" : ""}`}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        );
      } else if (level === 1) {
        return (
          <Link key={item.path} to={item.path} className={`sub-nav-link ${isActive ? "active" : ""}`}>
            <span className="sub-nav-icon">{item.icon}</span>
            <span className="sub-nav-label">{item.label}</span>
          </Link>
        );
      } else {
        return (
          <Link key={item.path} to={item.path} className={`nested-sub-nav-link ${isActive ? "active" : ""}`}>
            <span className="nested-sub-nav-icon">{item.icon}</span>
            <span className="nested-sub-nav-label">{item.label}</span>
          </Link>
        );
      }
    });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Faculty Menu</h3>
      </div>
      <nav className="sidebar-nav">
        {renderMenuItems(menuItems)}
      </nav>
      {/* Logout button at bottom */}
      <div style={{ padding: "16px", borderTop: "1px solid #e5e7eb", marginTop: "auto" }}>
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "100%",
            padding: "10px 12px",
            background: "none",
            border: "1px solid #fee2e2",
            borderRadius: "8px",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default FacultySidebar;