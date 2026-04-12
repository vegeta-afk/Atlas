import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, CreditCard, User, LogOut, BookOpen, Bell, QrCode, FileText } from "lucide-react"; // ✅ added FileText
import "./Sidebar.css";

const StudentSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const menuItems = [
    { path: "/student/dashboard",  label: "Dashboard",    icon: <LayoutDashboard size={20} /> },
    { path: "/student/attendance", label: "My Attendance", icon: <Calendar size={20} />       },
    { path: "/student/fees",       label: "My Fees",       icon: <CreditCard size={20} />     },
    { path: "/student/exams",      label: "My Exams",      icon: <BookOpen size={20} />       },
    { path: "/student/marksheet",  label: "My Marksheet",  icon: <FileText size={20} />       }, // ✅ added
    { path: "/student/scan-qr",    label: "Scan QR",       icon: <QrCode size={20} />         },
    { path: "/student/profile",    label: "My Profile",    icon: <User size={20} />           },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Student Portal</h3>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className={`nav-link ${isActive ? "active" : ""}`}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
        <button onClick={handleLogout} className="nav-link" style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "#e74c3c", marginTop: "auto" }}>
          <span className="nav-icon"><LogOut size={20} /></span>
          <span className="nav-label">Logout</span>
        </button>
      </nav>
    </aside>
  );
};

export default StudentSidebar;