// pages/admin/courses/CourseList.jsx
import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  BookOpen,
} from "lucide-react";
import { Link } from "react-router-dom";
import { courseAPI } from "../../../../services/api";
import toast from "react-hot-toast";

const CourseList = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await courseAPI.getCourses({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });

      if (response.data.success) {
        setCourses(response.data.data);
        setPagination({
          ...pagination,
          total: response.data.total,
          totalPages: response.data.totalPages,
        });
      }
    } catch (error) {
      toast.error("Failed to fetch courses");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [pagination.page, statusFilter]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCourses();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await courseAPI.deleteCourse(id);
      toast.success("Course deleted successfully");
      fetchCourses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete course");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await courseAPI.toggleStatus(id);
      toast.success(
        `Course ${currentStatus ? "deactivated" : "activated"} successfully`
      );
      fetchCourses();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  // Helper function to parse exam months
  const formatExamMonths = (examMonths) => {
    if (!examMonths) return "Not set";
    return examMonths.split(',').map(m => `Month ${m.trim()}`).join(', ');
  };

  // Calculate completion percentage for seats
  const getSeatPercentage = (filled, total) => {
    if (!total || total === 0) return 0;
    return Math.round((filled / total) * 100);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Course Management
          </h1>
          <p className="text-gray-600">
            Manage all courses offered by the institute
          </p>
        </div>
        <Link
          to="/admin/setup/courses/add"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} />
          Add New Course
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search courses by name, code, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter size={20} />
            More Filters
          </button>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-lg mb-2">No courses found</p>
            <p className="text-gray-600 mb-4">
              {searchTerm ? "Try a different search term" : "Start by adding your first course"}
            </p>
            <Link
              to="/admin/setup/courses/add"
              className="text-blue-600 hover:underline font-medium"
            >
              Add your first course
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course Name
                    </th>
                    <th className="px6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fees
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exams
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courses.map((course) => (
                    <tr key={course._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {course.courseCode || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {course.courseFullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {course.courseShortName}
                          {course.courseType && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              {course.courseType}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {course.duration}
                        </div>
                        <div className="text-sm text-gray-500">
                          {course.totalSemesters || 0} semesters
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">Total: </span>
                            {formatCurrency(course.totalFee || 0)}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Net: </span>
                            {formatCurrency(course.netFee || 0)}
                          </div>
                          {course.discount > 0 && (
                            <div className="text-xs text-green-600">
                              {course.discount}% discount
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm flex items-center gap-1">
                            <Calendar size={14} />
                            <span>{course.numberOfExams || 0} exams</span>
                          </div>
                          {course.examMonths && (
                            <div className="text-xs text-gray-500">
                              {formatExamMonths(course.examMonths)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="text-sm text-gray-900">
                            {course.seatsFilled || 0} / {course.seatsAvailable || 0}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${getSeatPercentage(course.seatsFilled || 0, course.seatsAvailable || 0)}%`,
                              }}
                            />
                          </div>
                          <div className="text-xs text-gray-500">
                            {getSeatPercentage(course.seatsFilled || 0, course.seatsAvailable || 0)}% filled
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            course.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {course.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/setup/courses/view/${course._id}`}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </Link>
                          <Link
                            to={`/admin/setup/courses/edit/${course._id}`}
                            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                            title="Edit Course"
                          >
                            <Edit size={18} />
                          </Link>
                          <button
                            onClick={() =>
                              handleToggleStatus(course._id, course.isActive)
                            }
                            className={`p-1.5 rounded ${
                              course.isActive
                                ? "text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50"
                                : "text-green-600 hover:text-green-800 hover:bg-green-50"
                            }`}
                            title={course.isActive ? "Deactivate" : "Activate"}
                          >
                            {course.isActive ? (
                              <XCircle size={18} />
                            ) : (
                              <CheckCircle size={18} />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(course._id, course.courseFullName)
                            }
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            title="Delete Course"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{courses.length}</span> of{" "}
                <span className="font-medium">{pagination.total}</span> courses
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page - 1 })
                  }
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page + 1 })
                  }
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Courses</p>
              <p className="text-2xl font-bold text-gray-800">{pagination.total}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <BookOpen className="text-blue-600" size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Courses</p>
              <p className="text-2xl font-bold text-gray-800">
                {courses.filter(c => c.isActive).length}
              </p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="text-green-600" size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average Seats Filled</p>
              <p className="text-2xl font-bold text-gray-800">
                {courses.length > 0
                  ? Math.round(
                      courses.reduce((acc, course) => {
                        const percentage = getSeatPercentage(course.seatsFilled || 0, course.seatsAvailable || 0);
                        return acc + percentage;
                      }, 0) / courses.length
                    )
                  : 0}%
              </p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <div className="text-purple-600 font-bold">%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseList;