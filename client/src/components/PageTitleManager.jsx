// components/PageTitleManager.jsx
//
// Drop this once inside <Routes> (or right above it) in App.jsx.
// It watches the current URL and sets the browser tab title automatically —
// no need to touch any individual page file.
//
// How it works: matches the current pathname against the map below.
// Exact matches are checked first; if none match, it falls back to a
// "startsWith" check for routes with dynamic segments like /:id.
// If nothing matches at all, it falls back to the default Atlas title.

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const DEFAULT_TITLE = "Atlas - IIT Computer Institute";

// ── Add new routes here as you build them — one line each ────────────
const ROUTE_TITLES = {
  "/login": null, // null = use default title
  "/admin/dashboard": null,

  // Front Office
  "/admin/front-office/enquiries": "Enquiry List",
  "/admin/front-office/enquiries/add": "New Enquiry",
  "/admin/front-office/admissions": "Admission List",
  "/admin/front-office/admissions/add": "New Admission",
  "/admin/front-office/calls": "Call Logs",
  "/admin/front-office/create-admin": "Create Admin",
  "/admin/account-settings": "Account Settings",

  // Setup
  "/admin/setup/courses": "Course Management",
  "/admin/setup/management": "Setup Management",
  "/admin/setup/templates": "Template Designer",

  // Faculty
  "/admin/faculty": "Faculty List",
  "/admin/faculty/add": "Add Faculty",
  "/admin/faculty/bridge-batch": "Bridge Batch",
  "/admin/faculty/admin-attendance": "Faculty Attendance",
  "/admin/faculty/admin-leave": "Leave Management",

  // Students
  "/admin/students": "Student List",
  "/admin/students/attendance": "Attendance",
  "/admin/students/fees": "Fee Management",
  "/admin/students/batch-transfer": "Batch Transfer",
  "/admin/students/course-conversion": "Course Conversion",
  "/admin/students/course-extension": "Course Extension",
  "/admin/students/exams": "Exam Results",
  "/admin/students/material-issue": "Material Issue",
  "/admin/students/bridge-batch": "Bridge Batch",

  // Exam
  "/admin/exam/create-test": "Create Test",
  "/admin/exam/question-bank": "Question Bank",
  "/admin/exam/manage-tests": "Manage Tests",

  // Reports
  "/admin/reports/countdown": "Course Countdown",
  "/admin/reports/exams/upcoming": "Upcoming Exams",
  "/admin/reports/cancel-list": "Cancel List",
  "/admin/reports/hold-list": "Hold List",
  "/admin/reports/complete-list": "Complete List",
  "/admin/reports/birthdays": "Birthday Report",
  "/admin/reports/batch-report": "Batch Report",
  "/admin/reports/attendance": "Attendance Report",
  "/admin/reports/attendance-monthly": "Monthly Attendance Report",
  "/admin/reports/batch-course-progress": "Batch Course Progress",
  "/admin/reports/batch-topic-board": "Batch Topic Board",
  "/admin/reports/test-eligibility": "Test Eligibility Report",
  "/admin/reports/leave-batch-report": "Leave Batch Report",

  // Faculty portal
  "/faculty/dashboard": null,
  "/faculty/students-list": "My Students",
  "/faculty/leave": "Request Leave",

  // Student portal
  "/student/dashboard": null,
  "/student/attendance": "My Attendance",
  "/student/fees": "My Fees",
  "/student/profile": "My Profile",
  "/student/exams": "My Exams",
  "/student/marksheet": "My Marksheet",

  "/verify-email-change": "Verify Email",
};

// For routes with dynamic segments (e.g. /admin/students/view/:id) —
// checked only if no exact match was found above.
const PREFIX_TITLES = [
  { prefix: "/admin/front-office/enquiries/view", title: "View Enquiry" },
  { prefix: "/admin/front-office/enquiries/edit", title: "Edit Enquiry" },
  { prefix: "/admin/front-office/admissions/view", title: "View Admission" },
  { prefix: "/admin/front-office/admissions/edit", title: "Edit Admission" },
  { prefix: "/admin/setup/courses/add", title: "Add Course" },
  { prefix: "/admin/setup/courses/edit", title: "Edit Course" },
  { prefix: "/admin/setup/courses/view", title: "View Course" },
  { prefix: "/admin/setup/templates/new", title: "New Template" },
  { prefix: "/admin/setup/templates/edit", title: "Edit Template" },
  { prefix: "/admin/faculty/view", title: "View Faculty" },
  { prefix: "/admin/faculty/edit", title: "Edit Faculty" },
  { prefix: "/admin/students/view", title: "View Student" },
  { prefix: "/admin/students/edit", title: "Edit Student" },
  { prefix: "/admin/students/attendance", title: "Attendance" },
  { prefix: "/admin/students/fees", title: "Fee Management" },
  { prefix: "/admin/students/batch-transfer/add", title: "Add Batch Transfer" },
  { prefix: "/admin/exam/test-preview", title: "Test Preview" },
  { prefix: "/admin/exam/question-bank/add", title: "Add Question" },
  { prefix: "/admin/exam/results", title: "Exam Results" },
  { prefix: "/admin/exam/edit-test", title: "Edit Test" },
  { prefix: "/admin/reports/batch-course-progress", title: "Batch Course Progress" },
  { prefix: "/student/exam", title: "Exam" },
];

const PageTitleManager = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    let title = ROUTE_TITLES[path];

    // undefined = no exact match found, try prefix matching
    if (title === undefined) {
      const match = PREFIX_TITLES.find((entry) => path.startsWith(entry.prefix));
      title = match ? match.title : undefined;
    }

    document.title = title ? `${title} - Atlas` : DEFAULT_TITLE;
  }, [location.pathname]);

  return null; // renders nothing — just a side-effect component
};

export default PageTitleManager;