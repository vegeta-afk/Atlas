// pages/students/BatchTransferList.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ChevronDown,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  ArrowLeftRight,
  User,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { setupAPI } from "../../services/api";
import useBasePath from "../../hooks/useBasePath";

const BatchTransferList = () => {
  const basePath = useBasePath();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [batchMap, setBatchMap] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const isAdmin = basePath === "/admin";

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    status: "",
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [pagination.page, filters.status]);

  const fetchBatches = async () => {
    try {
      const response = await setupAPI.getAll();
      
      if (response.data.success) {
        const batchesData = response.data.data.batches || [];
        
        const map = {};
        batchesData.forEach(batch => {
          if (batch._id) {
            const displayName = batch.displayName || 
              (batch.startTime && batch.endTime ? `${batch.startTime} to ${batch.endTime}` : batch.batchName);
            map[batch._id] = displayName;
          }
        });
        
        setBatchMap(map);
      }
    } catch (err) {
      console.error("Error fetching batches:", err);
    }
  };

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        setError("You are not logged in. Please login first.");
        setLoading(false);
        return;
      }

      // Build URL without undefined parameters
      let url = 'http://localhost:5000/api/batch-transfers';
      const params = [];
      
      if (pagination.page) params.push(`page=${pagination.page}`);
      if (pagination.limit) params.push(`limit=${pagination.limit}`);
      if (filters.status && filters.status !== '') params.push(`status=${filters.status}`);
      if (filters.search && filters.search !== '') params.push(`search=${encodeURIComponent(filters.search)}`);
      
      if (params.length > 0) {
        url += '?' + params.join('&');
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTransfers(data.data || []);
        
        setPagination({
          ...pagination,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.pages || 1,
        });

        if (data.stats) {
          setStats(data.stats);
        } else {
          const transferData = data.data || [];
          setStats({
            total: transferData.length,
            pending: transferData.filter(t => t.status === "pending").length,
            approved: transferData.filter(t => t.status === "approved").length,
            rejected: transferData.filter(t => t.status === "rejected").length,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching transfers:", err);
      setError(err.response?.data?.message || "Failed to load batch transfers");
    } finally {
      setLoading(false);
    }
  };

const handleApprove = async (id) => {
  if (!window.confirm("Are you sure you want to approve this transfer?")) return;
  
  try {
    setLoading(true);
    const token = localStorage.getItem("token");
    
    // Get user ID from multiple sources
    let userId = null;
    const userStr = localStorage.getItem("user");
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userId = user._id || user.id || user.userId;
      } catch (e) {
        console.error("Error parsing user:", e);
      }
    }
    
    if (!userId) {
      userId = localStorage.getItem("userId");
    }
    
    // Fallback to admin ID from your logs
    if (!userId) {
      userId = "69467820905ab5150b26667a";
    }
    
    const response = await fetch(`http://localhost:5000/api/batch-transfers/${id}/approve`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        approvedBy: userId
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert("✅ Transfer approved successfully! Student batch updated.");
      fetchTransfers();
    } else {
      alert(data.message || "Failed to approve transfer");
    }
  } catch (err) {
    console.error("Error approving transfer:", err);
    alert(err.message || "Failed to approve transfer");
  } finally {
    setLoading(false);
  }
};

  const handleReject = async (id) => {
  const reason = prompt("Please enter rejection reason:");
  if (!reason) return;
  
  try {
    setLoading(true);
    const token = localStorage.getItem("token");
    
    // Get user ID
    let userId = null;
    const userStr = localStorage.getItem("user");
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userId = user._id || user.id || user.userId;
      } catch (e) {
        console.error("Error parsing user:", e);
      }
    }
    
    if (!userId) {
      userId = localStorage.getItem("userId");
    }
    
    if (!userId) {
      userId = "69467820905ab5150b26667a";
    }
    
    const response = await fetch(`http://localhost:5000/api/batch-transfers/${id}/reject`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        rejectionReason: reason,
        approvedBy: userId
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert("✅ Transfer rejected!");
      fetchTransfers();
    } else {
      alert(data.message || "Failed to reject transfer");
    }
  } catch (err) {
    console.error("Error rejecting transfer:", err);
    alert(err.message || "Failed to reject transfer");
  } finally {
    setLoading(false);
  }
};

  const handleSearch = () => {
    setPagination({ ...pagination, page: 1 });
    fetchTransfers();
  };

  const handleFilterChange = (name, value) => {
    setFilters({ ...filters, [name]: value });
    setPagination({ ...pagination, page: 1 });
  };

  const clearFilters = () => {
    setFilters({ search: "", status: "" });
    setPagination({ ...pagination, page: 1 });
    setTimeout(() => fetchTransfers(), 0);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const handleLoginRedirect = () => {
    window.location.href = "/login";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle size={14} />
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle size={14} />
            Rejected
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
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getBatchDisplayName = (transfer) => {
    if (transfer.newBatchTime) {
      return transfer.newBatchTime;
    }
    
    if (transfer.newBatch && batchMap[transfer.newBatch]) {
      return batchMap[transfer.newBatch];
    }
    
    if (transfer.newBatch && typeof transfer.newBatch === 'string' && !transfer.newBatch.match(/^[0-9a-fA-F]{24}$/)) {
      return transfer.newBatch;
    }
    
    return 'N/A';
  };

  const filteredTransfers = transfers.filter(transfer => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      transfer.studentName?.toLowerCase().includes(searchLower) ||
      transfer.rollNo?.toLowerCase().includes(searchLower) ||
      transfer.requestId?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Batch Transfer Requests
          </h1>
          <p className="text-sm text-gray-500">
            Manage student batch change requests
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchTransfers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link
            to={`${basePath}/students/batch-transfer/add`}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            New Transfer Request
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <ArrowLeftRight size={24} />
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
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{stats.approved}</h3>
            <p className="text-sm text-gray-500">Approved</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
            <XCircle size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{stats.rejected}</h3>
            <p className="text-sm text-gray-500">Rejected</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by student name, roll no, or request ID..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative min-w-[150px]">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>

          {/* Clear Filters */}
          {(filters.search || filters.status) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
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
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Request ID</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Student Details</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Previous Batch</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Previous Teacher</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">New Batch</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">New Teacher</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Request Date</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                      <p className="text-sm text-gray-500">Loading transfers...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-red-500">
                      <AlertCircle size={40} className="mb-3" />
                      <p className="text-sm font-medium mb-2">{error}</p>
                      {error.includes("login") ? (
                        <button
                          onClick={handleLoginRedirect}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                        >
                          Go to Login
                        </button>
                      ) : (
                        <button
                          onClick={fetchTransfers}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                        >
                          Try Again
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <ArrowLeftRight size={48} className="mb-3" />
                      <p className="text-sm font-medium text-gray-600 mb-1">No transfer requests found</p>
                      <p className="text-xs text-gray-400 mb-4">Get started by creating a new batch transfer request</p>
                      <Link
                        to={`${basePath}/students/batch-transfer/add`}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm flex items-center gap-2"
                      >
                        <Plus size={16} />
                        New Transfer Request
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((transfer) => (
                  <tr key={transfer._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-center">
                      <span className="font-mono text-sm font-medium text-indigo-600">
                        {transfer.requestId || `TRF${String(transfer._id).slice(-6)}`}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                          {getInitials(transfer.studentName)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{transfer.studentName}</p>
                          <p className="text-xs text-gray-500">Roll No: {transfer.rollNo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm text-gray-700">{transfer.previousBatch}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm text-gray-700">{transfer.previousTeacher}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-medium text-green-600">
                        {getBatchDisplayName(transfer)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm text-gray-700">{transfer.newTeacher}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm text-gray-700">{formatDate(transfer.requestDate)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        {getStatusBadge(transfer.status)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-2">
                        <Link
                          to={`${basePath}/students/batch-transfer/${transfer._id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </Link>
                        
                        {transfer.status === "pending" &&  isAdmin && (
                          <>
                            <button
                              onClick={() => handleApprove(transfer._id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve Transfer"
                            >
                              <ThumbsUp size={18} />
                            </button>
                            <button
                              onClick={() => handleReject(transfer._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject Transfer"
                            >
                              <ThumbsDown size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && !error && pagination.totalPages > 1 && (
        <div className="flex justify-between items-center bg-white px-6 py-4 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchTransferList;