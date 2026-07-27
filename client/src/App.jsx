// App.jsx - CORRECTED VERSION
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login";
import AdminLayout from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import StudentLayout from "./components/layout/StudentLayout";
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import MyAttendance from "./pages/student/MyAttendance";
import MyFees from "./pages/student/MyFees";
import StudentExamResults from "./pages/students/Examresults";
import MyProfile from "./pages/student/MyProfile";
import MyExams from "./pages/student/MyExams";
import MyMarksheet from "./pages/student/Mymarksheet";
import BirthdayReport from "./reports/BirthdayReport";
import BatchReportList from "./reports/BatchReportList";
import AttendanceReportList from "./reports/AttendanceReportList";
import MonthlyAttendanceReport from "./reports/MonthlyAttendanceReport";
import BatchCourseProgressReport from "./reports/BatchCourseProgressReport";
import BatchCourseProgressDetail from "./reports/BatchCourseProgressDetail";



// Faculty imports
import FacultyLayout from "./components/layout/FacultyLayout";
import FacultyDashboard from "./pages/dashboard/FacultyDashboard";

import CallLogs from "./pages/frontoffice/calls/CallLogs";

// Admission components
import AdmissionList from "./pages/frontoffice/admission/AdmissionList";
import AddAdmission from "./pages/frontoffice/admission/AddAdmission";
import ViewAdmission from "./pages/frontoffice/admission/ViewAdmission";
import EditAdmission from "./pages/frontoffice/admission/EditAdmission";

// Enquiry components
import EnquiryList from "./pages/frontoffice/enquiry/EnquiryList";
import NewEnquiry from "./pages/frontoffice/enquiry/NewEnquiry";
import ViewEnquiry from "./pages/frontoffice/enquiry/ViewEnquiry";
import EditEnquiry from "./pages/frontoffice/enquiry/EditEnquiry";

// Course components
import CourseList from "./pages/frontoffice/setup/Courses/CourseList";
import AddCourse from "./pages/frontoffice/setup/Courses/AddCourse";
import SetupList from "./pages/frontoffice/setup/SetupList";
import EditCourse from "./pages/frontoffice/setup/Courses/EditCourse";
import ViewCourse from "./pages/frontoffice/setup/Courses/ViewCourse";

// Faculty components
import FacultyList from "./pages/Faculty/FacultyList";
import AddFaculty from "./pages/Faculty/AddFaculty";
import EditFaculty from "./pages/Faculty/EditFaculty";
import ViewFaculty from "./pages/Faculty/ViewFaculty";

// Student components
import StudentList from "./pages/students/StudentList";
import ViewStudent from "./pages/students/ViewStudent";
import StudentAttendance from "./pages/students/StudentAttendance";
import StudentFees from "./pages/students/StudentFees";
import CourseConversion from "./pages/students/CourseConversion";
import CourseExtension from "./pages/students/CourseExtension";



// Exam components
import CreateTest from './pages/admin/exam/CreateTest';
import QuestionBank from './pages/admin/exam/QuestionBank';
import ManageTests from './pages/admin/exam/ManageTests';
import ExamResults from './pages/admin/exam/ExamResults';
import AddQuestion from './pages/admin/exam/AddQuestion';
import EditTest from './pages/admin/exam/EditTest';
import TestPreview from './pages/admin/exam/TestPreview';
import StudentExamPage from "./pages/student/StudentExamPage";
import StudentExamInstructions from "./pages/student/ExamInstructions";

import BatchTransferList from "./pages/students/BatchTransferList";
import AddBatchTransfer from "./pages/students/AddBatchTransfer";

import CountdownReport from "./reports/CountdownReport";
import UpcomingExamReport from "./reports/UpcomingExamReport";
import CancelList from "./reports/CancelList";
import HoldList from "./reports/HoldList";
import CompleteList from "./reports/CompleteList";

import StudentScanQR from "./pages/student/StudentScanQR";

import FacultyStudentList from "./pages/Faculty/FacultyStudentList";

import MaterialIssue from "./pages/students/MaterialIssue";

import TemplateDesigner from "./pages/admin/TemplateDesigner";
import TemplateList from "./pages/admin/TemplateList";
import TemplateEditPage from "./pages/admin/TemplateEditPage";
import BridgeBatchList from "./pages/students/BridgeBatchList";
import AddBridgeBatchRequest from "./pages/students/AddBridgeBatchRequest";
import BatchTopicBoard from "./reports/BatchTopicBoard";
import TestEligibilityReport from "./reports/TestEligibilityReport";
import ExamInstructions from "./pages/student/ExamInstructions";

import FacultyScanAttendance from "./pages/Faculty/FacultyScanAttendance";
import AdminFacultyAttendance from "./pages/Faculty/AdminFacultyAttendance";


function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* ========== ADMIN ROUTES ========== */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<AdminDashboard />} />

        <Route path="front-office">
          <Route path="enquiries" element={<EnquiryList />} />
          <Route path="enquiries/add" element={<NewEnquiry />} />
          <Route path="enquiries/view/:id" element={<ViewEnquiry />} />
          <Route path="enquiries/edit/:id" element={<EditEnquiry />} />
          <Route path="admissions" element={<AdmissionList />} />
          <Route path="admissions/add" element={<AddAdmission />} />
          <Route path="admissions/view/:id" element={<ViewAdmission />} />
          <Route path="calls" element={<CallLogs />} />
           <Route path="admissions/edit/:id" element={<EditAdmission />} />
           

        </Route>

        <Route path="setup">
          <Route path="courses" element={<CourseList />} />
          <Route path="courses/add" element={<AddCourse />} />
          <Route path="courses/edit/:id" element={<EditCourse />} />
          <Route path="courses/view/:id" element={<ViewCourse />} />
          <Route path="management" element={<SetupList />} />
          <Route path="templates" element={<TemplateList />} />
          <Route path="templates/new" element={<TemplateEditPage />} />
          <Route path="templates/edit/:id" element={<TemplateEditPage />} />
        </Route>

        <Route path="faculty">
          <Route index element={<FacultyList />} />
          <Route path="add" element={<AddFaculty />} />
          <Route path="view/:facultyId" element={<ViewFaculty />} />  // ← new
          <Route path="edit/:facultyId" element={<EditFaculty />} />  // ← new
          <Route path="bridge-batch" element={<BridgeBatchList />} />
          <Route path="bridge-batch/add" element={<AddBridgeBatchRequest />} />
          <Route path="admin-attendance" element={<AdminFacultyAttendance />} />
        </Route>

        <Route path="students">
          <Route index element={<StudentList />} />
          <Route path="view/:id" element={<ViewStudent />} />
          <Route path="edit/:id" element={<AddAdmission />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="attendance/:id" element={<StudentAttendance />} />
          <Route path="fees" element={<StudentFees />} />
          <Route path="fees/:id" element={<StudentFees />} />
          <Route path="batch-transfer" element={<BatchTransferList />} />
          <Route path="batch-transfer/add" element={<AddBatchTransfer />} />
          <Route path="course-conversion" element={<CourseConversion />} />
          <Route path="course-extension" element={<CourseExtension />} />
          <Route path="exams" element={<StudentExamResults />} />
          <Route path="material-issue" element={<MaterialIssue />} />
          <Route path="bridge-batch" element={<BridgeBatchList />} />
          <Route path="bridge-batch/add" element={<AddBridgeBatchRequest />} />
        </Route>

        <Route path="exam">
          <Route path="test-preview/:testId" element={<TestPreview />} />
          <Route path="create-test" element={<CreateTest />} />
          <Route path="question-bank" element={<QuestionBank />} />
          <Route path="question-bank/add" element={<AddQuestion />} />
          <Route path="manage-tests" element={<ManageTests />} />
          <Route path="results/:testId" element={<ExamResults />} />
          <Route path="edit-test/:testId" element={<EditTest />} />
        </Route>

        <Route path="reports">
          <Route path="countdown" element={<CountdownReport />} />
          <Route path="exams/upcoming" element={<UpcomingExamReport />} />
          <Route path="cancel-list" element={<CancelList />} />
          <Route path="hold-list" element={<HoldList />} />
          <Route path="complete-list" element={<CompleteList />} />
          <Route path="birthdays" element={<BirthdayReport />} />
          <Route path="batch-report" element={<BatchReportList />} />
          <Route path="attendance" element={<AttendanceReportList />} />
          <Route path="attendance-monthly" element={<MonthlyAttendanceReport />} />
          <Route path="batch-course-progress" element={<BatchCourseProgressReport />} />
          <Route path="batch-course-progress/:batchTime" element={<BatchCourseProgressDetail />} />
          <Route path="batch-topic-board" element={<BatchTopicBoard />} />
          <Route path="test-eligibility" element={<TestEligibilityReport />} />
        </Route>
      </Route>

      {/* ========== FACULTY ROUTES ========== */}
      <Route path="/faculty" element={<FacultyLayout />}>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<FacultyDashboard />} />
        
        {/* ✅ FIXED: Use relative path, not absolute */}
        <Route path="students-list" element={<FacultyStudentList />} />

        {/* Front Office */}
        <Route path="front-office">
          <Route path="enquiries" element={<EnquiryList />} />
          <Route path="enquiries/add" element={<NewEnquiry />} />
          <Route path="enquiries/view/:id" element={<ViewEnquiry />} />
          <Route path="enquiries/edit/:id" element={<EditEnquiry />} />
          <Route path="admissions" element={<AdmissionList />} />
          <Route path="admissions/add" element={<AddAdmission />} />
          <Route path="admissions/view/:id" element={<ViewAdmission />} />
          <Route path="calls" element={<CallLogs />} />
          <Route path="admissions/edit/:id" element={<EditAdmission />} />
        </Route>

        {/* ✅ FIXED: Faculty Student section - READ ONLY */}
        <Route path="students">
          <Route index element={<FacultyStudentList />} />  {/* This is the read-only list */}
          <Route path="view/:id" element={<ViewStudent />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="attendance/:id" element={<StudentAttendance />} />
          <Route path="fees" element={<StudentFees />} />
          <Route path="fees/:id" element={<StudentFees />} />
          <Route path="batch-transfer" element={<BatchTransferList />} />
          <Route path="batch-transfer/add" element={<AddBatchTransfer />} />
        </Route>


        {/* QR Attendance Scan */}
        <Route path="attendance/scan" element={<FacultyScanAttendance />} />

        {/* Exam */}
        <Route path="exam">
          <Route path="test-preview/:testId" element={<TestPreview />} />
          <Route path="create-test" element={<CreateTest />} />
          <Route path="question-bank" element={<QuestionBank />} />
          <Route path="question-bank/add" element={<AddQuestion />} />
          <Route path="manage-tests" element={<ManageTests />} />
          <Route path="results/:testId" element={<ExamResults />} />
          <Route path="edit-test/:testId" element={<EditTest />} />
        </Route>
      </Route>

      {/* ========== STUDENT ROUTES ========== */}
      <Route path="/student" element={<StudentLayout />}>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="attendance" element={<MyAttendance />} />
        <Route path="fees" element={<MyFees />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="exams" element={<MyExams />} />
        <Route path="marksheet" element={<MyMarksheet />} />
        <Route path="exam/:testId" element={<StudentExamPage />} />
        <Route path="scan-qr" element={<StudentScanQR />} />
        <Route path="exam/:testId/instructions" element={<StudentExamInstructions />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;