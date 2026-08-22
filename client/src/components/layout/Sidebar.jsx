import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  Package,
   Cake,
   Users,
   LayoutTemplate,
   ClipboardCheck,
   GitBranch,
   PanelLeftClose,
   PanelLeftOpen,
   KeyRound,
   LogOut,
   ChevronUp,
} from "lucide-react";
import "./Sidebar.css";

// ─── Accept isOpen + onClose from AdminLayout, plus collapsed + onToggleCollapse ──
const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [openDropdowns, setOpenDropdowns] = useState({
  frontOffice: false,
  students: false,
  faculty: false,
  exam: false,
  reports: false,
  setup: false,
});

  // ── Profile popup state ──────────────────────────────────────────────
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef(null);

  // Close the popup on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Pull logged-in user info (saved at login, same pattern as your authController response)
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem("user"));
  } catch (e) {
    currentUser = null;
  }
  const displayName = currentUser?.name || currentUser?.fullName || "Admin";
  const displayEmail = currentUser?.email || "";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const goToSettings = (tab) => {
    setProfileMenuOpen(false);
    navigate(`/admin/account-settings?tab=${tab}`);
  };
  // ─────────────────────────────────────────────────────────────────────

  const toggleDropdown = (dropdownName) => {
    if (collapsed) {
      onToggleCollapse();
      setOpenDropdowns((prev) => ({
        ...prev,
        [dropdownName]: true,
      }));
      return;
    }
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
        { path: "/admin/front-office/calls",      label: "Call Logs",       icon: <Phone size={15} /> },
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
        { path: "/admin/students/batch-transfer",    label: "Batch Transfer",    icon: <ArrowLeftRight size={15} /> },
        { path: "/admin/students/course-conversion", label: "Course Conversion", icon: <TrendingUp size={15} /> },
        { path: "/admin/students/course-extension",  label: "Course Extension",  icon: <Plus size={15} /> },
        { path: "/admin/students/bridge-batch",      label: "Bridge Batch",      icon: <GitBranch size={15} /> },
        { path: "/admin/students/material-issue", label: "Material Issue", icon: <Package size={15} /> },
        { path: "/admin/students/exams",             label: "Exam Results",      icon: <FileText size={15} /> },
      ],
    },
    {
      key: "faculty",
      label: "Faculty",
      icon: <Briefcase size={18} />,
      isDropdown: true,
      subItems: [
        { path: "/admin/faculty",             label: "Faculty List",       icon: <UsersIcon size={15} /> },
        { path: "/admin/faculty/admin-attendance",  label: "Attendance",         icon: <Calendar size={15} /> },
        { path: "/admin/faculty/admin-leave",       label: "Leave Management",   icon: <Clock size={15} /> },
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
        { path: "/admin/reports/cancel-list",    label: "Cancel List",      icon: <XCircle size={15} /> },
        { path: "/admin/reports/hold-list",      label: "Hold List",        icon: <PauseCircle size={15} /> },
        { path: "/admin/reports/complete-list",  label: "Complete List",    icon: <CheckCircle size={15} /> },
        { path: "/admin/reports/birthdays",      label: "Birthday Report",  icon: <Cake size={15} /> },
        { path: "/admin/reports/batch-report",   label: "Batch Report",     icon: <Users size={15} /> },
        { path: "/admin/reports/attendance",     label: "Attendance Report", icon: <ClipboardCheck size={15} /> },
        { path: "/admin/reports/attendance-monthly",     label: "Monthly Attendance Report", icon: <ClipboardCheck size={15} /> },
        { path: "/admin/reports/batch-course-progress",  label: "Batch Course Progress",     icon: <BookOpen size={15} /> },
        { path: "/admin/reports/batch-topic-board", label: "Batch Topic Board", icon: <BookOpen size={15} /> },
        { divider: true },
        { path: "/admin/reports/test-eligibility", label: "Test Eligibility Report", icon: <ClipboardCheck size={15} /> },
        { path: "/admin/reports/leave-batch-report", label: "Leave Batch Report", icon: <ClipboardCheck size={15} /> },
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
      ],
    },

    {
        key: "setup",
        label: "Setup",
        icon: <Settings size={15} />,
        isDropdown: true,
        subItems: [
          { path: "/admin/setup/courses",    label: "Course Management", icon: <GraduationCap size={13} /> },
          { path: "/admin/setup/management", label: "Setup Management",  icon: <Briefcase size={13} /> },
          { path: "/admin/setup/templates",  label: "Template Designer", icon: <LayoutTemplate size={13} /> },
          { path: "/admin/setup/create-admin", label: "Create Admin", icon: <UserPlus size={15} /> },
          ],
        },
  ];

  const handleLinkClick = () => {
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
              title={collapsed ? item.label : undefined}
            >
              <span className={level === 0 ? "nav-icon" : "sub-nav-icon"}>{item.icon}</span>
              {!collapsed && (
                <>
                  <span className={level === 0 ? "nav-label" : "sub-nav-label"}>{item.label}</span>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </>
              )}
            </button>

            {!collapsed && isOpen && item.subItems && (
              <div className={level === 0 ? "sub-menu" : "nested-sub-menu"}>
                {renderMenuItems(item.subItems, level + 1)}
              </div>
            )}
          </div>
        );
      }

      if (item.divider) {
        return collapsed ? null : <div key={`divider-${index}`} className="menu-divider" />;
      }

      const isActive = location.pathname === item.path;

      if (level === 0) {
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-link ${isActive ? "active" : ""}`}
            onClick={handleLinkClick}
            title={collapsed ? item.label : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
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
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""} ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div className="sidebar-header">
        {!collapsed && <h3>IMS Menu</h3>}

        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          title={collapsed ? "Expand menu" : "Collapse menu"}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-nav">{renderMenuItems(menuItems)}</nav>

      {/* ── Profile bar — pinned to the bottom of the sidebar ──────────── */}
      <div className="sidebar-profile" ref={profileRef}>
        {profileMenuOpen && (
          <div className={`sidebar-profile-popup ${collapsed ? "sidebar-profile-popup--collapsed" : ""}`}>
            <div className="sidebar-profile-popup-header">
              <div className="sidebar-profile-avatar-lg">{displayName.charAt(0).toUpperCase()}</div>
              <div>
                <div className="sidebar-profile-popup-name">{displayName}</div>
                {displayEmail && <div className="sidebar-profile-popup-email">{displayEmail}</div>}
              </div>
            </div>
            <div className="sidebar-profile-popup-divider" />
            <button className="sidebar-profile-popup-item" onClick={() => goToSettings("password")}>
              <KeyRound size={16} />
              Change Password
            </button>
            <button className="sidebar-profile-popup-item" onClick={() => goToSettings("email")}>
              <Mail size={16} />
              Change Email
            </button>
            <div className="sidebar-profile-popup-divider" />
            <button className="sidebar-profile-popup-item sidebar-profile-popup-item--danger" onClick={handleLogout}>
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        )}

        <button
          className="sidebar-profile-bar"
          onClick={() => setProfileMenuOpen((prev) => !prev)}
          title={collapsed ? displayName : undefined}
        >
          <div className="sidebar-profile-avatar">{displayName.charAt(0).toUpperCase()}</div>
          {!collapsed && (
            <>
              <div className="sidebar-profile-info">
                <div className="sidebar-profile-name">{displayName}</div>
                <div className="sidebar-profile-role">Admin</div>
              </div>
              {profileMenuOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </>
          )}
        </button>
      </div>
      {/* ─────────────────────────────────────────────────────────────── */}
    </aside>
  );
};

export default Sidebar;