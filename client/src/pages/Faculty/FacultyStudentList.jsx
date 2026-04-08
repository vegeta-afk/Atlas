// pages/Faculty/FacultyStudentList.jsx
import React, { useState, useEffect } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
} from "lucide-react";
import "./FacultyStudentList.css";
import axios from "axios";

const FacultyStudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Can be changed
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCourse, setFilterCourse] = useState("all");
  const [courses, setCourses] = useState([]);

  // Sample data based on your image - you can add more for testing
  useEffect(() => {
  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/students", {
        headers: { Authorization: `Bearer ${token}` }
      });


      const raw = response.data.data || response.data || [];
console.log("Raw student sample:", raw[0]); // ✅ logs full raw object
console.log("enrolledBatches:", raw[0]?.enrolledBatches); // ✅ logs actual field

      const data = (response.data.data || response.data || []).map(s => ({
  studentId: s.studentId,
  studentName: s.fullName,
  course: s.course,
batchTime: s.batchTime || "—",
  status: s.status || "active"
}));
setStudents(data);

console.log("enrolledBatches sample:", data[0]?.enrolledBatches);
      

      const uniqueCourses = [...new Set(data.map(s => s.course).filter(c => c))];
      setCourses(uniqueCourses);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchStudents();
}, []);
  // Filter students
  const filteredStudents = students.filter((student) => {
    const matchesSearch = 
      student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.course?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || student.status === filterStatus;
    const matchesCourse = filterCourse === "all" || student.course === filterCourse;
    
    return matchesSearch && matchesStatus && matchesCourse;
  });

  // Pagination calculations
  const totalItems = filteredStudents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterCourse, itemsPerPage]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleExport = () => {
    const headers = ["Student ID", "Student Name", "Course", "Batch Time", "Status"];
    const csvData = filteredStudents.map(s => [
      s.studentId,
      s.studentName,
      s.course,
      s.batchTime,
      s.status
    ]);
    
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell || ""}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student_list_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pageNumbers.push(i);
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers;
  };

  if (loading) {
    return <div className="loading-container">Loading students...</div>;
  }

  return (
    <div className="faculty-student-container">
      <div className="faculty-student-header">
        <h1>Student List</h1>
        <p className="subtitle">View-only access - Student information</p>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by ID, Name, or Course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Courses</option>
            {courses.map((course, index) => (
              <option key={index} value={course}>
                {course}
              </option>
            ))}
          </select>

          <button onClick={handleExport} className="export-btn">
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Results Info */}
      <div className="results-info">
        <span>
          Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} students
        </span>
        <div className="items-per-page">
          <label>Show:</label>
          <select value={itemsPerPage} onChange={handleItemsPerPageChange}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Student Table */}
      <div className="table-responsive">
        <table className="faculty-student-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Student Name</th>
              <th>Course</th>
              <th>Batch Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((student, index) => (
                <tr key={student.studentId || index}>
                  <td>{student.studentId || "—"}</td>
                  <td>{student.studentName || "—"}</td>
                  <td>{student.course || "—"}</td>
                  <td>{student.batchTime || "—"}</td>
                  <td>
                    <span className={`status-badge ${student.status || "inactive"}`}>
                      {student.status === "active" ? "Active" : 
                       student.status === "inactive" ? "Inactive" : 
                       student.status === "completed" ? "Completed" : "—"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-data">
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="page-btn"
          >
            <ChevronLeft size={18} />
            Previous
          </button>
          
          <div className="page-numbers">
            {getPageNumbers().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' && handlePageChange(page)}
                className={`page-number ${currentPage === page ? "active" : ""} ${page === '...' ? "dots" : ""}`}
                disabled={page === '...'}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="page-btn"
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Footer Note */}
      <div className="faculty-footer-note">
        <p>🔒 Note: This is a read-only view. For modifications, please contact administrator.</p>
      </div>
    </div>
  );
};

export default FacultyStudentList;