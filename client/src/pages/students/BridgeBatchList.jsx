// pages/students/BridgeBatchList.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ChevronDown,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  GitBranch,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Ban,
  CheckSquare,
  X,
  Plus,
} from "lucide-react";
import useBasePath from "../../hooks/useBasePath";

const BridgeBatchList = () => {
  const basePath = useBasePath();
  const [bridgeBatches, setBridgeBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    merged: 0,
    rejected: 0,
  });

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const isAdmin = basePath === "/admin";

  const [filters, setFilters] = useState({ search: "", status: "" });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [viewBatch, setViewBatch] = useState(null);

  useEffect(() => {
    fetchBridgeBatches();
  }, [filters.status]);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const getToken = () => localStorage.getItem("token");

  const fetchBridgeBatches = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError("You are not logged in. Please login first.");
        setLoading(false);
        return;
      }

      let url = `${API_BASE}/api/bridge-batch`;
      if (filters.status) url += `?status=${filters.status}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await response.json();

      if (data.success) {
        const list = data.data || [];
        setBridgeBatches(list);
        setStats({
          total: list.length,
          pending: list.filter((b) => b.status === "pending").length,
          active: list.filter((b) => b.status === "active" || b.status === "ready_to_merge").length,
          merged: list.filter((b) => b.status === "merged").length,
          rejected: list.filter((b) => b.status === "rejected" || b.status === "cancelled").length,
        });
      } else {
        setError(data.message || "Failed to load bridge batches");
      }
    } catch (err) {
      console.error("Error fetching bridge batches:", err);
      setError(err.message || "Failed to load bridge batches");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this bridge batch request?")) return;
    try {
      setLoading(true);
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/bridge-batch/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.success) {
        alert("✅ Bridge batch approved! Temp faculty can now start sessions.");
        fetchBridgeBatches();
      } else {
        alert(data.message || "Failed to approve");
      }
    } catch (err) {
      console.error("Error approving bridge batch:", err);
      alert(err.message || "Failed to approve");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt("Please enter rejection reason:");
    if (!reason) return;
    try {
      setLoading(true);
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/bridge-batch/${id}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (data.success) {
        alert("Bridge batch request rejected.");
        fetchBridgeBatches();
      } else {
        alert(data.message || "Failed to reject");
      }
    } catch (err) {
      console.error("Error rejecting bridge batch:", err);
      alert(err.message || "Failed to reject");
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async (id) => {
    if (!window.confirm("Merge this student back into the main batch? This finalizes the bridge batch.")) return;
    try {
      setLoading(true);
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/bridge-batch/${id}/merge`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.success) {
        alert("✅ Student merged back into main batch!");
        fetchBridgeBatches();
      } else {
        alert(data.message || "Failed to merge");
      }
    } catch (err) {
      console.error("Error merging bridge batch:", err);
      alert(err.message || "Failed to merge");
    } finally {
      setLoading(false);
      setOpenDropdown(null);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this bridge batch? This cannot be undone.")) return;
    try {
      setLoading(true);
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/bridge-batch/${id}/cancel`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.success) {
        alert("Bridge batch cancelled.");
        fetchBridgeBatches();
      } else {
        alert(data.message || "Failed to cancel");
      }
    } catch (err) {
      console.error("Error cancelling bridge batch:", err);
      alert(err.message || "Failed to cancel");
    } finally {
      setLoading(false);
      setOpenDropdown(null);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters({ ...filters, [name]: value });
  };

  const clearFilters = () => setFilters({ search: "", status: "" });

  const handleLoginRedirect = () => {
    window.location.href = "/login";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Clock size={14} />
            Active
          </span>
        );
      case "ready_to_merge":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            <CheckSquare size={14} />
            Ready to Merge
          </span>
        );
      case "merged":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle size={14} />
            Merged
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle size={14} />
            Rejected
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <Ban size={14} />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <AlertCircle size={14} />
            Pending
          </span>
        );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const getStudentDisplay = (batch) => {
    if (!batch.studentIds || batch.studentIds.length === 0) return { name: "N/A", roll: "N/A", extra: 0 };
    const first = batch.studentIds[0];
    return {
      name: first.fullName || "N/A",
      roll: first.studentId || "N/A",
      extra: batch.studentIds.length - 1,
    };
  };

  const filteredBatches = bridgeBatches.filter((b) => {
    if (!filters.search) return true;
    const term = filters.search.toLowerCase();
    const { name, roll } = getStudentDisplay(b);
    return (
      name.toLowerCase().includes(term) ||
      roll.toLowerCase().includes(term) ||
      b.courseName?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Bridge Batch Requests</h1>
          <p className="text-sm text-gray-500">Review and manage catch-up batch requests from faculty</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchBridgeBatches}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={fetchBridgeBatches}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link
            to={`${basePath}/students/bridge-batch/add`}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            New Bridge Request
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <GitBranch size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
            <p className="text-sm text-gray-500">Total Requests</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{stats.pending}</h3>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{stats.active}</h3>
            <p className="text-sm text-gray-500">Active</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{stats.merged}</h3>
            <p className="text-sm text-gray-500">Merged</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
            <XCircle size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{stats.rejected}</h3>
            <p className="text-sm text-gray-500">Rejected/Cancelled</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by student name, roll no, or course..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="relative min-w-[170px]">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="ready_to_merge">Ready to Merge</option>
              <option value="merged">Merged</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>

          {(filters.search || filters.status) && (
            <button onClick={clearFilters} className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Requested</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Course</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Temp Faculty</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Time Slot</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Topics</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                      <p className="text-sm text-gray-500">Loading bridge batches...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-red-500">
                      <AlertCircle size={40} className="mb-3" />
                      <p className="text-sm font-medium mb-2">{error}</p>
                      {error.includes("login") ? (
                        <button onClick={handleLoginRedirect} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                          Go to Login
                        </button>
                      ) : (
                        <button onClick={fetchBridgeBatches} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm">
                          Try Again
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <GitBranch size={48} className="mb-3" />
                      <p className="text-sm font-medium text-gray-600 mb-1">No bridge batch requests found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  const { name, roll, extra } = getStudentDisplay(batch);
                  return (
                    <tr key={batch._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm text-gray-700">{formatDate(batch.createdAt)}</span>
                      </td>
                      <td className="px-4 py-4 text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                            {getInitials(name)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {name} {extra > 0 && <span className="text-xs text-gray-400">+{extra} more</span>}
                            </p>
                            <p className="text-xs text-gray-500">Roll No: {roll}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm text-gray-700">{batch.courseName || "N/A"}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm text-gray-700">{batch.tempFacultyName || "N/A"}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm text-gray-700">
                          {batch.timeSlot?.startTime && batch.timeSlot?.endTime
                            ? `${batch.timeSlot.startTime} - ${batch.timeSlot.endTime}`
                            : "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-medium text-indigo-600">
                          {batch.selectedTopics?.length || 0} topic{batch.selectedTopics?.length === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">{getStatusBadge(batch.status)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center gap-2 relative">
                          <button
                            onClick={() => setViewBatch(batch)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>

                          {batch.status === "pending" && isAdmin && (
                            <>
                              <button
                                onClick={() => handleApprove(batch._id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Approve Request"
                              >
                                <ThumbsUp size={18} />
                              </button>
                              <button
                                onClick={() => handleReject(batch._id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject Request"
                              >
                                <ThumbsDown size={18} />
                              </button>
                            </>
                          )}

                          {isAdmin && (
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDropdown(batch._id);
                                }}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                title="More options"
                              >
                                <MoreVertical size={18} />
                              </button>

                              {openDropdown === batch._id && (
                                <div
                                  className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {(batch.status === "active" || batch.status === "ready_to_merge") && (
                                    <button
                                      onClick={() => handleMerge(batch._id)}
                                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition-colors"
                                    >
                                      <CheckSquare size={14} />
                                      Merge into Main Batch
                                    </button>
                                  )}
                                  {batch.status !== "merged" && batch.status !== "cancelled" && (
                                    <button
                                      onClick={() => handleCancel(batch._id)}
                                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      <Ban size={14} />
                                      Cancel Bridge Batch
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Modal — helps admin judge if the request is genuine */}
      {viewBatch && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setViewBatch(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewBatch(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-gray-800 mb-1">Bridge Batch Request Details</h2>
            <p className="text-xs text-gray-400 mb-4">Request ID: {viewBatch._id}</p>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Requested By</span>
                <span className="font-medium text-gray-800">{viewBatch.requestedBy?.name || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Requested On</span>
                <span className="font-medium text-gray-800">{formatDate(viewBatch.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                {getStatusBadge(viewBatch.status)}
              </div>

              <hr className="my-2 border-gray-100" />

              <div className="flex justify-between">
                <span className="text-gray-500">Course</span>
                <span className="font-medium text-gray-800">{viewBatch.courseName || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Parent Batch</span>
                <span className="font-medium text-gray-800">
                  {viewBatch.parentBatchId?.displayName || viewBatch.parentBatchId?.batchName || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Temp Faculty</span>
                <span className="font-medium text-gray-800">{viewBatch.tempFacultyName || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time Slot</span>
                <span className="font-medium text-gray-800">
                  {viewBatch.timeSlot?.startTime && viewBatch.timeSlot?.endTime
                    ? `${viewBatch.timeSlot.startTime} - ${viewBatch.timeSlot.endTime}`
                    : "N/A"}
                </span>
              </div>

              <hr className="my-2 border-gray-100" />

              <div>
                <span className="text-gray-500 block mb-1">
                  Student{(viewBatch.studentIds?.length || 0) > 1 ? "s" : ""}
                </span>
                <div className="flex flex-wrap gap-2">
                  {(viewBatch.studentIds || []).map((s) => (
                    <span key={s._id} className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-700">
                      {s.fullName} ({s.studentId})
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-gray-500 block mb-1">
                  Topics Requested ({viewBatch.selectedTopics?.length || 0})
                </span>
                <div className="flex flex-wrap gap-2">
                  {(viewBatch.selectedTopics || []).map((t) => (
                    <span
                      key={t.topicKey}
                      className={`px-3 py-1 rounded-full text-xs ${
                        t.completed ? "bg-green-50 text-green-700" : "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      {t.topicName} {t.completed && "✓"}
                    </span>
                  ))}
                </div>
              </div>

              <hr className="my-2 border-gray-100" />

              <div>
                <span className="text-gray-500 block mb-1">Reason for Bridge Request</span>
                <p className="text-gray-800 bg-gray-50 rounded-lg p-3">
                  {viewBatch.reason || "No reason provided"}
                </p>
              </div>

              {viewBatch.status === "rejected" && viewBatch.rejectedReason && (
                <div>
                  <span className="text-gray-500 block mb-1">Rejection Reason</span>
                  <p className="text-red-700 bg-red-50 rounded-lg p-3">{viewBatch.rejectedReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BridgeBatchList;