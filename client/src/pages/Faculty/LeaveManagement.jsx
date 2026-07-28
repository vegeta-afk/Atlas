import React, { useState, useEffect } from "react";
import { Calendar, CheckCircle, XCircle, AlertCircle, Copy, Check, X } from "lucide-react";

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actionLoadingId, setActionLoadingId] = useState(null);


  const [endNowTarget, setEndNowTarget] = useState(null);
const [extendTarget, setExtendTarget] = useState(null);
const [newToDate, setNewToDate] = useState("");

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Credentials modal state — shown right after a successful approve
  const [credentialsModal, setCredentialsModal] = useState(null); // { facultyName, username, password }
  const [copied, setCopied] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/faculty-leaves?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setLeaves(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const [approveTarget, setApproveTarget] = useState(null);
  const [approveBatches, setApproveBatches] = useState([]);
  const [facultyOptions, setFacultyOptions] = useState([]);
  const [assignments, setAssignments] = useState({}); // { batchId: substituteFacultyUserId }

  const handleOpenApprove = async (leave) => {
    setApproveTarget(leave);
    setAssignments({});
    try {
      const res = await fetch(`${BASE_URL}/api/faculty-leaves/${leave._id}/batches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setApproveBatches(data.data.batches);
        setFacultyOptions(data.data.facultyOptions);
      } else {
        alert(data.message);
        setApproveTarget(null);
      }
    } catch (err) {
      alert("Error: " + err.message);
      setApproveTarget(null);
    }
  };

  const handleConfirmApprove = async () => {
    const assignmentList = Object.entries(assignments)
      .filter(([, subId]) => subId)
      .map(([batchId, substituteFacultyUserId]) => ({ batchId, substituteFacultyUserId }));

    if (assignmentList.length !== approveBatches.length) {
      alert("Please assign a substitute for every batch before approving.");
      return;
    }

    setActionLoadingId(approveTarget._id);
    try {
      const res = await fetch(`${BASE_URL}/api/faculty-leaves/${approveTarget._id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assignments: assignmentList }),
      });
      const data = await res.json();
      if (data.success) {
        setApproveTarget(null);
        fetchLeaves();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoadingId(rejectTarget._id);
    try {
      const res = await fetch(`${BASE_URL}/api/faculty-leaves/${rejectTarget._id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rejectionReason }),
      });
      const data = await res.json();
      if (data.success) {
        setRejectTarget(null);
        setRejectionReason("");
        fetchLeaves();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEndNow = async (leave) => {
  if (!window.confirm(`End leave for ${leave.facultyName} now and restore their original password?`)) return;
  setActionLoadingId(leave._id);
  try {
    const res = await fetch(`${BASE_URL}/api/faculty-leaves/${leave._id}/end-now`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      fetchLeaves();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    setActionLoadingId(null);
  }
};

const handleExtend = async () => {
  if (!extendTarget || !newToDate) return;
  setActionLoadingId(extendTarget._id);
  try {
    const res = await fetch(`${BASE_URL}/api/faculty-leaves/${extendTarget._id}/extend`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ newToDate }),
    });
    const data = await res.json();
    if (data.success) {
      setExtendTarget(null);
      setNewToDate("");
      fetchLeaves();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    setActionLoadingId(null);
  }
};

  const copyCredentials = () => {
    const text = `Username: ${credentialsModal.username}\nPassword: ${credentialsModal.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const badge = (status) => {
    if (status === "approved")
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle size={12} /> Approved
        </span>
      );
    if (status === "rejected")
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle size={12} /> Rejected
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <AlertCircle size={12} /> Pending
      </span>
    );
  };

  const filters = ["pending", "approved", "rejected", "all"];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Leave Management</h1>
      <p className="text-sm text-gray-500 mb-6">Review and approve faculty leave requests</p>

      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize ${
              statusFilter === f ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 font-bold text-gray-900 flex items-center gap-2">
          <Calendar size={18} /> Leave Requests
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Faculty</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">From</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">To</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : leaves.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No {statusFilter !== "all" ? statusFilter : ""} requests</td></tr>
            ) : (
              leaves.map((l) => (
                <tr key={l._id}>
                  <td className="px-4 py-3 text-gray-800 font-medium">{l.faculty?.facultyName || l.facultyName}</td>
                  <td className="px-4 py-3 capitalize text-gray-700">{l.leaveType}</td>
                  <td className="px-4 py-3 text-gray-700">{new Date(l.fromDate).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3 text-gray-700">{new Date(l.toDate).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={l.reason}>{l.reason}</td>
                  <td className="px-4 py-3">{badge(l.status)}</td>
                  <td className="px-4 py-3">
                    {l.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(l)}
                          disabled={actionLoadingId === l._id}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectTarget(l)}
                          disabled={actionLoadingId === l._id}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : l.status === "approved" && l.tempCredentials?.isActive ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setExtendTarget(l); setNewToDate(""); }}
                          disabled={actionLoadingId === l._id}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Extend
                        </button>
                        <button
                          onClick={() => handleEndNow(l)}
                          disabled={actionLoadingId === l._id}
                          className="px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50"
                        >
                          End Now
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reject reason modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Reject Leave Request</h3>
              <button onClick={() => { setRejectTarget(null); setRejectionReason(""); }}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Rejecting request from <span className="font-medium">{rejectTarget.facultyName}</span>
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setRejectTarget(null); setRejectionReason(""); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoadingId === rejectTarget._id}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend leave modal */}
{extendTarget && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 w-full max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800">Extend Leave</h3>
        <button onClick={() => { setExtendTarget(null); setNewToDate(""); }}>
          <X size={18} className="text-gray-400" />
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-3">
        Extending leave for <span className="font-medium">{extendTarget.facultyName}</span>.
        Current end date: <span className="font-medium">{new Date(extendTarget.toDate).toLocaleDateString("en-IN")}</span>
      </p>
      <label className="block text-sm text-gray-600 mb-1">New End Date</label>
      <input
        type="date"
        value={newToDate}
        min={new Date(extendTarget.toDate).toISOString().split("T")[0]}
        onChange={(e) => setNewToDate(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-4"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={() => { setExtendTarget(null); setNewToDate(""); }}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={handleExtend}
          disabled={!newToDate || actionLoadingId === extendTarget._id}
          className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          Confirm Extend
        </button>
      </div>
    </div>
  </div>
)}

      {/* Credentials-to-share modal, shown once right after approval */}
      {approveTarget && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 w-full max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800">Assign Substitutes — {approveTarget.facultyName}</h3>
        <button onClick={() => setApproveTarget(null)}><X size={18} className="text-gray-400" /></button>
      </div>
      {approveBatches.length === 0 ? (
        <p className="text-sm text-gray-500">No active batches found for this faculty.</p>
      ) : (
        <div className="space-y-3 mb-4">
          {approveBatches.map((b) => (
            <div key={b.batchId} className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{b.batchName}</p>
                <p className="text-xs text-gray-500">{b.timing} · {b.studentCount} students</p>
              </div>
              <select
                value={assignments[b.batchId] || ""}
                onChange={(e) => setAssignments({ ...assignments, [b.batchId]: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm min-w-[160px]"
              >
                <option value="">Select substitute</option>
                {facultyOptions.map((f) => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={() => setApproveTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg">Cancel</button>
        <button
          onClick={handleConfirmApprove}
          disabled={approveBatches.length === 0 || actionLoadingId === approveTarget._id}
          className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          Confirm Approve
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default LeaveManagement;