import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users as UsersIcon,
  Building,
  Phone,
  AlertCircle,
  Mail,
  Settings,
  List,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Briefcase,
  UserPlus,
  Calendar,
  FileText,
  CreditCard,
  BarChart,
  Clock,
  BookOpen,
  ClipboardList,
  FilePlus,
  ArrowLeftRight,
  Plus,
  PieChart,
  TrendingUp,
  XCircle,
  PauseCircle,
  CheckCircle,
  X,
} from "lucide-react";
import "./Sidebar.css";

// ─── Accept isOpen + onClose from AdminLayout ───────────────────────────────
const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [openDropdowns, setOpenDropdowns] = useState({
    frontOffice: true,
    students: true,
    faculty: true,
    exam: true,
    reports: false,
    setup: false,
  });

  const toggleDropdown = (dropdownName) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [dropdownName]: !prev[dropdownName],
    }));
  };

  const menuItems = [
    {
      path: "/admin/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
    },
    {
      key: "frontOffice",
      label: "Front Office",
      icon: <Building size={18} />,
      isDropdown: true,
      subItems: [
        { path: "/admin/front-office/enquiries",  label: "Enquiry List",    icon: <List size={15} /> },
        { path: "/admin/front-office/admissions", label: "Admission List",  icon: <UsersIcon size={15} /> },
        { path: "/admin/front-office/visitors",   label: "Visitors",        icon: <UsersIcon size={15} /> },
        { path: "/admin/front-office/calls",      label: "Call Logs",       icon: <Phone size={15} /> },
        { path: "/admin/front-office/complaints", label: "Complaints",      icon: <AlertCircle size={15} /> },
        { path: "/admin/front-office/postal",     label: "Postal",          icon: <Mail size={15} /> },
        {
          key: "setup",
          label: "Setup",
          icon: <Settings size={15} />,
          isDropdown: true,
          subItems: [
            { path: "/admin/setup/courses",    label: "Course Management", icon: <GraduationCap size={13} /> },
            { path: "/admin/setup/management", label: "Setup Management",  icon: <Briefcase size={13} /> },
          ],
        },
      ],
    },
    {
      key: "students",
      label: "Students",
      icon: <UsersIcon size={18} />,
      isDropdown: true,
      subItems: [
        { path: "/admin/students",                   label: "Student List",      icon: <UsersIcon size={15} /> },
        { path: "/admin/students/attendance",        label: "Attendance",        icon: <Calendar size={15} /> },
        { path: "/admin/students/fees",              label: "Fee Management",    icon: <CreditCard size={15} /> },
        { path: "/admin/students/exams",             label: "Exam Results",      icon: <FileText size={15} /> },
        { path: "/admin/students/batch-transfer",    label: "Batch Transfer",    icon: <ArrowLeftRight size={15} /> },
        { path: "/admin/students/course-conversion", label: "Course Conversion", icon: <TrendingUp size={15} /> },
        { path: "/admin/students/course-extension",  label: "Course Extension",  icon: <Plus size={15} /> },
      ],
    },
    {
      key: "faculty",
      label: "Faculty",
      icon: <Briefcase size={18} />,
      isDropdown: true,
      subItems: [
        { path: "/admin/faculty",             label: "Faculty List",       icon: <UsersIcon size={15} /> },
        { path: "/admin/faculty/add",         label: "Add Faculty",        icon: <UserPlus size={15} /> },
        { path: "/admin/faculty/attendance",  label: "Attendance",         icon: <Calendar size={15} /> },
        { path: "/admin/faculty/leave",       label: "Leave Management",   icon: <Clock size={15} /> },
        { path: "/admin/faculty/salary",      label: "Salary/Payroll",     icon: <CreditCard size={15} /> },
        { path: "/admin/faculty/schedule",    label: "Schedule/Timetable", icon: <FileText size={15} /> },
        { path: "/admin/faculty/performance", label: "Performance",        icon: <BarChart size={15} /> },
      ],
    },
    {
      key: "reports",
      label: "Reports",
      icon: <PieChart size={18} />,
      isDropdown: true,
      subItems: [
        { path: "/admin/reports/countdown",      label: "Course Countdown", icon: <TrendingUp size={15} /> },
        { path: "/admin/reports/exams/upcoming", label: "Upcoming Exams",   icon: <Calendar size={15} /> },
        { divider: true },
        { path: "/admin/reports/cancel-list",    label: "Cancel List",      icon: <XCircle size={15} /> },
        { path: "/admin/reports/hold-list",      label: "Hold List",        icon: <PauseCircle size={15} /> },
        { path: "/admin/reports/complete-list",  label: "Complete List",    icon: <CheckCircle size={15} /> },
      ],
    },
    {
      key: "exam",
      label: "Exam",
      icon: <BookOpen size={18} />,
      isDropdown: true,
      subItems: [
        { path: "/admin/exam/create-test",    label: "Create Test",    icon: <FilePlus size={15} /> },
        { path: "/admin/exam/question-bank",  label: "Question Bank",  icon: <BookOpen size={15} /> },
        { path: "/admin/exam/manage-tests",   label: "Manage Tests",   icon: <ClipboardList size={15} /> },
        { path: "/admin/exam/results",        label: "Results",        icon: <BarChart size={15} /> },
      ],
    },
  ];

  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (window.innerWidth <= 768 && onClose) onClose();
  };

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
              <span className={level === 0 ? "nav-icon" : "sub-nav-icon"}>{item.icon}</span>
              <span className={level === 0 ? "nav-label" : "sub-nav-label"}>{item.label}</span>
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {isOpen && item.subItems && (
              <div className={level === 0 ? "sub-menu" : "nested-sub-menu"}>
                {renderMenuItems(item.subItems, level + 1)}
              </div>
            )}
          </div>
        );
      }

      if (item.divider) {
        return <div key={`divider-${index}`} className="menu-divider" />;
      }

      const isActive = location.pathname === item.path;

      if (level === 0) {
        return (
          <Link key={item.path} to={item.path} className={`nav-link ${isActive ? "active" : ""}`} onClick={handleLinkClick}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        );
      } else if (level === 1) {
        return (
          <Link key={item.path} to={item.path} className={`sub-nav-link ${isActive ? "active" : ""}`} onClick={handleLinkClick}>
            <span className="sub-nav-icon">{item.icon}</span>
            <span className="sub-nav-label">{item.label}</span>
          </Link>
        );
      } else {
        return (
          <Link key={item.path} to={item.path} className={`nested-sub-nav-link ${isActive ? "active" : ""}`} onClick={handleLinkClick}>
            <span className="nested-sub-nav-icon">{item.icon}</span>
            <span className="nested-sub-nav-label">{item.label}</span>
          </Link>
        );
      }
    });
  };

  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar-header">
        <h3>IMS Menu</h3>
        {/* Close button — only visible on mobile */}
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>
      <nav className="sidebar-nav">{renderMenuItems(menuItems)}</nav>
    </aside>
  );
};

export default Sidebar;