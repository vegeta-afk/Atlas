import React, { useState, useEffect } from "react";
import { Users, RefreshCw, Calendar } from "lucide-react";

const LeaveBatchReport = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/faculty-leaves/batch-report?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setRows(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [statusFilter]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Leave Batch Coverage Report</h1>
          <p className="text-sm text-gray-500">Which substitute is covering which batch, and for whom</p>
        </div>
        <button onClick={fetchReport} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {["active", "ended", "all"].map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize ${statusFilter === f ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 font-bold text-gray-900 flex items-center gap-2">
          <Users size={18} /> Batch Substitutions
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Batch</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">On Leave</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Substitute</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">From</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">To</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No records found</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r._id}>
                  <td className="px-4 py-3 text-gray-800">{r.batch?.displayName || r.batch?.batchName}</td>
                  <td className="px-4 py-3 text-gray-700">{r.onLeaveFacultyUser?.name}</td>
                  <td className="px-4 py-3 text-gray-700">{r.substituteFacultyUser?.name}</td>
                  <td className="px-4 py-3 text-gray-700">{new Date(r.fromDate).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3 text-gray-700">{new Date(r.toDate).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${r.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      <Calendar size={12} /> {r.isActive ? "Active" : "Ended"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaveBatchReport;