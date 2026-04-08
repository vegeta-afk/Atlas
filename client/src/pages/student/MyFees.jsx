import React, { useState, useEffect } from "react";
import {
  CreditCard, CheckCircle, AlertCircle,
  Calendar, DollarSign, Layers, Clock
} from "lucide-react";

const MyFees = () => {
  const [feeData, setFeeData] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const getUser = () => {
    const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!userStr) return null;
    try { return JSON.parse(userStr); } catch { return null; }
  };

  const getToken = () =>
    sessionStorage.getItem("token") || localStorage.getItem("token");

  useEffect(() => {
    const user = getUser();
    if (!user) { window.location.href = "/login"; return; }
    fetchData(user.studentId);
  }, []);

  const fetchData = async (studentId) => {
    setLoading(true);
    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Get student by studentId
      const studentRes = await fetch(`${import.meta.env.VITE_API_URL}/api/students`, { headers });
      const studentData = await studentRes.json();
      const matched = (studentData.data || []).find(s => s.studentId === studentId);
      if (!matched) { setLoading(false); return; }
      setStudent(matched);

      // Get fee data
      const feeRes = await fetch(`${import.meta.env.VITE_API_URL}/api/students/${matched._id}/fees`, { headers });
      const feeJson = await feeRes.json();
      if (feeJson.success) setFeeData(feeJson.data);
    } catch (error) {
      console.error("Error fetching fees:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", minimumFractionDigits: 0
    }).format(amount || 0);

  const getStatusBadge = (status) => {
    const config = {
      paid:    { bg: "bg-green-100",  text: "text-green-800",  label: "Paid"    },
      partial: { bg: "bg-blue-100",   text: "text-blue-800",   label: "Partial" },
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
      overdue: { bg: "bg-red-100",    text: "text-red-800",    label: "Overdue" },
    };
    const s = config[status] || config.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  // Build all course tabs
  const getCourseTabs = () => {
    if (!feeData || !student) return [];
    const tabs = [{
      name: student.course || "Primary Course",
      feeSchedule: feeData.feeSchedule || [],
      summary: feeData.summary || {}
    }];

    if (student.additionalCourses?.length > 0) {
      student.additionalCourses.forEach(ac => {
        const schedule = ac.feeSchedule || [];
        const totalFee = schedule.reduce((s, f) => s + (f.totalFee || 0), 0);
        const paidAmount = schedule.reduce((s, f) => s + (f.paidAmount || 0), 0);
        tabs.push({
          name: ac.courseName,
          feeSchedule: schedule,
          summary: {
            totalCourseFee: totalFee,
            paidAmount,
            balanceAmount: totalFee - paidAmount,
            paidInstallments: schedule.filter(f => f.status === "paid").length,
            pendingInstallments: schedule.filter(f => f.status === "pending").length,
            totalInstallments: schedule.length,
          }
        });
      });
    }
    return tabs;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = getCourseTabs();
  const currentTab = tabs[activeTab] || {};
  const summary = currentTab.summary || {};
  const schedule = currentTab.feeSchedule || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Fees</h1>
        <p className="text-gray-500">View your fee schedule and payment status</p>
      </div>

      {/* Course Tabs */}
      {tabs.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-2 ${
                activeTab === idx
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {idx === 0 ? <CreditCard size={16} /> : <Layers size={16} />}
              {tab.name}
            </button>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(summary.totalCourseFee)}
          </p>
          <p className="text-sm text-blue-600 mt-1">Total Fee</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.paidAmount)}
          </p>
          <p className="text-sm text-green-600 mt-1">Paid</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(summary.balanceAmount)}
          </p>
          <p className="text-sm text-orange-600 mt-1">Balance</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">
            {summary.paidInstallments || 0}/{summary.totalInstallments || 0}
          </p>
          <p className="text-sm text-purple-600 mt-1">Installments</p>
        </div>
      </div>

      {/* Fee Schedule Table */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-bold text-gray-900">Fee Schedule</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Month</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Monthly Fee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Exam Fee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Paid</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedule.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No fee records found
                  </td>
                </tr>
              ) : (
                schedule.map((fee, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-gray-50 ${
                      fee.isExamMonth ? "bg-yellow-50" :
                      fee.status === "paid" ? "bg-green-50" :
                      fee.status === "overdue" ? "bg-red-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{fee.month}</p>
                      {fee.isExamMonth && (
                        <span className="text-xs text-yellow-600">📝 Exam Month</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {fee.dueDate
                          ? new Date(fee.dueDate).toLocaleDateString("en-IN")
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {formatCurrency(fee.baseFee || fee.monthlyFee || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {fee.isExamMonth
                        ? <span className="text-orange-600">{formatCurrency(fee.examFee || 0)}</span>
                        : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold">
                      {formatCurrency(fee.totalFee || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">
                      {formatCurrency(fee.paidAmount || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600">
                      {formatCurrency(fee.balanceAmount || 0)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(fee.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Next Due Alert */}
      {feeData?.summary?.nextDue && (
        <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="text-orange-500 flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold text-orange-800">Next Payment Due</p>
            <p className="text-sm text-orange-600">
              {feeData.summary.nextDue.month} — {formatCurrency(feeData.summary.nextDue.amount)} due on{" "}
              {new Date(feeData.summary.nextDue.dueDate).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyFees;