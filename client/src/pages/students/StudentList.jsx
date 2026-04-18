import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  Edit,
  DollarSign,
  Calendar,
  Filter,
  Search,
  User,
  AlertCircle,
  RefreshCw,
  CheckCircle,
} from "lucide-react";

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const basePath = "/admin";

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${BASE_URL}/api/students`, { headers });

      if (response.status === 401) {
        setError("Authentication failed. Please login again.");
        return;
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.success && data.data) {
        setStudents(data.data);
      } else {
        setStudents([]);
      }
      setError(null);
    } catch (error) {
      setError("Failed to load students. Please try again.");
      setStudents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStudents();
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      (student.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.studentId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.admissionNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.course || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || (student.status || "active") === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const calculateFeePercentage = (student) => {
    const totalFee = student.totalCourseFee || 0;
    const paidAmount = student.paidAmount || 0;
    if (totalFee === 0) return 0;
    return Math.min(100, Math.round((paidAmount / totalFee) * 100));
  };

  if (loading && !refreshing) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Student List</h1>
          <div className="flex items-center gap-2 mt-1">
            <CheckCircle size={16} className="text-green-500" />
            <p className="text-gray-600 text-sm">Auto-generated from approved admissions</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          disabled={refreshing}
        >
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh List"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={fetchStudents} className="ml-auto text-blue-600 hover:text-blue-800 font-medium">
            Retry
          </button>
        </div>
      )}

      {/* Success Banner */}
      {students.length > 0 && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} />
            <div>
              <strong className="font-medium">System Status: Active</strong>
              <p className="text-sm mt-1">
                Students are automatically created when admissions are approved. No manual import needed!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Students", value: students.length, color: "text-gray-800" },
          { label: "Active", value: students.filter((s) => s.status === "active").length, color: "text-green-600" },
          { label: "Pending Fees", value: students.filter((s) => (s.balanceAmount || 0) > 0).length, color: "text-orange-600" },
          { label: "Completed", value: students.filter((s) => s.status === "completed").length, color: "text-blue-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-4">
            <div className="text-gray-500 text-xs font-medium">{stat.label}</div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, student ID, admission no, or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="completed">Completed</option>
            </select>
            <button className="flex items-center gap-1.5 border px-3 py-2 rounded-lg hover:bg-gray-50 text-sm whitespace-nowrap">
              <Filter size={15} />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-500 mb-4 text-sm">
              {students.length === 0
                ? "Create an admission and approve it. Students are automatically created from approved admissions."
                : "No students match your search criteria."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Student ID", "Student Name", "Course", "Batch", "Fees", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredStudents.map((student) => {
                  const feePercentage = calculateFeePercentage(student);
                  const totalFee = student.totalCourseFee || 0;
                  const paidAmount = student.paidAmount || 0;

                  return (
                    <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                      {/* Student ID */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-mono text-xs text-blue-600 font-semibold">
                          {student.studentId || "N/A"}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <CheckCircle size={9} className="text-green-500 shrink-0" />
                          <span className="text-xs text-gray-400 truncate max-w-[100px]">
                            {student.admissionNo || "N/A"}
                          </span>
                        </div>
                      </td>

                      {/* Student Name */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <img
                            className="h-8 w-8 rounded-full object-cover shrink-0"
                            src={student.photo || "/default-avatar.png"}
                            alt={student.fullName}
                            onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-900 truncate max-w-[130px]">
                              {student.fullName || "Unknown"}
                            </div>
                            <div className="text-xs text-gray-400 truncate max-w-[130px]">
                              {student.email || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Course */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="text-xs text-gray-800 font-medium truncate max-w-[140px]">
                          {student.course || "No course"}
                        </div>
                        <div className="text-xs text-gray-400 truncate max-w-[140px]">
                          {student.specialization || "General"}
                        </div>
                      </td>

                      {/* Batch */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-700">
                        {student.batchTime || "Not set"}
                      </td>

                      {/* Fees */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5 shrink-0">
                            <div
                              className="h-1.5 rounded-full transition-all duration-300"
                              style={{
                                width: `${feePercentage}%`,
                                backgroundColor:
                                  feePercentage === 100 ? "#10b981" : feePercentage > 50 ? "#f59e0b" : "#ef4444",
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            ₹{paidAmount.toLocaleString()}/₹{totalFee.toLocaleString()}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            student.status === "active"
                              ? "bg-green-100 text-green-700"
                              : student.status === "completed"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {student.status || "unknown"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Link
                            to={`${basePath}/students/view/${student._id}`}
                            className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                            title="View Profile"
                          >
                            <Eye size={15} />
                          </Link>
                          <Link
                            to={`${basePath}/students/edit/${student._id}`}
                            className="p-1.5 rounded-md text-green-600 hover:bg-green-50 hover:text-green-800 transition-colors"
                            title="Edit"
                          >
                            <Edit size={15} />
                          </Link>
                          <Link
                            to={`${basePath}/students/fees/${student._id}`}
                            className="p-1.5 rounded-md text-purple-600 hover:bg-purple-50 hover:text-purple-800 transition-colors"
                            title="Manage Fees"
                          >
                            <DollarSign size={15} />
                          </Link>
                          <Link
                            to={`${basePath}/students/attendance/${student._id}`}
                            className="p-1.5 rounded-md text-orange-500 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                            title="Attendance"
                          >
                            <Calendar size={15} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentList;