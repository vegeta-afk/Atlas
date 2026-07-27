import React, { useState, useEffect } from "react";
import { Calendar, Send, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const RequestLeave = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ leaveType: "casual", fromDate: "", toDate: "", reason: "" });

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  const fetchMyLeaves = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/faculty-leaves/me`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setLeaves(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyLeaves(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/faculty-leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setForm({ leaveType: "casual", fromDate: "", toDate: "", reason: "" });
        fetchMyLeaves();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const badge = (status) => {
    if (status === "approved") return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle size={12} /> Approved</span>;
    if (status === "rejected") return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle size={12} /> Rejected</span>;
    return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><AlertCircle size={12} /> Pending</span>;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Request Leave</h1>
      <p className="text-sm text-gray-500 mb-6">Submit a leave request for admin approval</p>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Leave Type</label>
            <select
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="casual">Casual</option>
              <option value="sick">Sick</option>
              <option value="personal">Personal</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">From</label>
            <input type="date" required value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">To</label>
            <input type="date" required value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Reason</label>
          <textarea required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
        </div>
        <button type="submit" disabled={submitting} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
          <Send size={16} /> {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 font-bold text-gray-900 flex items-center gap-2">
          <Calendar size={18} /> My Leave History
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">From</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">To</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : leaves.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No leave requests yet</td></tr>
            ) : (
              leaves.map((l) => (
                <tr key={l._id}>
                  <td className="px-4 py-3 capitalize text-gray-700">{l.leaveType}</td>
                  <td className="px-4 py-3 text-gray-700">{new Date(l.fromDate).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3 text-gray-700">{new Date(l.toDate).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3 text-gray-700">{l.reason}</td>
                  <td className="px-4 py-3">{badge(l.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RequestLeave;