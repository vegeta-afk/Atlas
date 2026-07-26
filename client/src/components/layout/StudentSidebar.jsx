import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, CreditCard, User, LogOut, BookOpen, Bell, QrCode, FileText } from "lucide-react"; // ✅ added FileText
import "./Sidebar.css";
import { X } from "lucide-react";

const StudentSidebar = ({ isOpen, onClose }) => {
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
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar-header">
        <h3>Student Portal</h3>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive ? "active" : ""}`}
              onClick={onClose}   // closes sidebar after tapping a link on mobile
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
        {/* logout button unchanged */}
      </nav>
    </aside>
  );
};

export default StudentSidebar;