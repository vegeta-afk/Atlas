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



// Faculty imports
import FacultyLayout from "./components/layout/FacultyLayout";
import FacultyDashboard from "./pages/dashboard/FacultyDashboard";

import CallLogs from "./pages/frontoffice/calls/CallLogs";

// Admission components
import AdmissionList from "./pages/frontoffice/admission/AdmissionList";
import AddAdmission from "./pages/frontoffice/admission/AddAdmission";
import ViewAdmission from "./pages/frontoffice/admission/ViewAdmission";

// Enquiry components
import EnquiryList from "./pages/frontoffice/enquiry/EnquiryList";
import NewEnquiry from "./pages/frontoffice/enquiry/NewEnquiry";
import ViewEnquiry from "./pages/frontoffice/enquiry/ViewEnquiry";

// Course components
import CourseList from "./pages/frontoffice/setup/Courses/CourseList";
import AddCourse from "./pages/frontoffice/setup/Courses/AddCourse";
import SetupList from "./pages/frontoffice/setup/SetupList";

// Faculty components
import FacultyList from "./pages/Faculty/FacultyList";
import AddFaculty from "./pages/Faculty/AddFaculty";

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

import BatchTransferList from "./pages/students/BatchTransferList";
import AddBatchTransfer from "./pages/students/AddBatchTransfer";

import CountdownReport from "./reports/CountdownReport";
import UpcomingExamReport from "./reports/UpcomingExamReport";
import CancelList from "./reports/CancelList";
import HoldList from "./reports/HoldList";
import CompleteList from "./reports/CompleteList";

import StudentScanQR from "./pages/student/StudentScanQR";

import FacultyStudentList from "./pages/Faculty/FacultyStudentList";

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
          <Route path="admissions" element={<AdmissionList />} />
          <Route path="admissions/add" element={<AddAdmission />} />
          <Route path="admissions/view/:id" element={<ViewAdmission />} />
          <Route path="admissions/edit/:id" element={<AddAdmission />} />
          <Route path="calls" element={<CallLogs />} />
        </Route>

        <Route path="setup">
          <Route path="courses" element={<CourseList />} />
          <Route path="courses/add" element={<AddCourse />} />
          <Route path="management" element={<SetupList />} />
        </Route>

        <Route path="faculty">
          <Route index element={<FacultyList />} />
          <Route path="add" element={<AddFaculty />} />
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
          <Route path="admissions" element={<AdmissionList />} />
          <Route path="admissions/add" element={<AddAdmission />} />
          <Route path="admissions/view/:id" element={<ViewAdmission />} />
          <Route path="calls" element={<CallLogs />} />
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
        <Route path="attendance/scan" element={<StudentScanQR />} />

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
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;