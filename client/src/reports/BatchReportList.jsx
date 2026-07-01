import React, { useState, useEffect } from "react";
import { batchReportAPI, templateAPI } from "../services/api";
import {
  Clock,
  Users,
  BookOpen,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Briefcase,
  Eye,
  X,
  CreditCard,
} from "lucide-react";
import DynamicCardModal from "../components/certifications/dynamic-templates/DynamicCardModal";

const BatchReportList = () => {
  const [batches, setBatches] = useState([]);
  const [stats, setStats] = useState({
    totalBatches: 0,
    totalStudents: 0,
    maxBatch: "N/A",
    maxBatchCount: 0,
    avgStudentsPerBatch: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingBatch, setViewingBatch] = useState(null); // batch object whose students are shown
  const [idCardStudent, setIdCardStudent] = useState(null); // student selected for ID card
  const [idCardTemplateId, setIdCardTemplateId] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await batchReportAPI.getBatchReport();
      if (res.data.success) {
        setBatches(res.data.batches || []);
        setStats(res.data.stats || stats);
      } else {
        throw new Error(res.data.message || "Failed to fetch batch report");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to load batch report"
      );
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // Load the saved ID Card template (same pattern as birthday template lookup)
  useEffect(() => {
    templateAPI
      .getAll("idcard")
      .then((res) => {
        const templates = res.data.templates || [];
        if (templates.length > 0) setIdCardTemplateId(templates[0]._id);
      })
      .catch((err) => console.error("Failed to load ID card template:", err));
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Batch Report</h1>
          <p className="text-sm text-gray-500 mt-1">
            Student enrollment by batch time
          </p>
        </div>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60 transition"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading batch report...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <AlertCircle size={20} className="text-red-500 mt-0.5" />
          <div className="flex-1">
            <strong className="text-red-700 text-sm">Error loading report:</strong>
            <p className="text-red-600 text-sm mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchReport}
            className="text-sm font-medium text-red-700 hover:underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stat cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{stats.totalBatches}</h3>
              <p className="text-sm text-gray-500">Total Batches</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{stats.totalStudents}</h3>
              <p className="text-sm text-gray-500">Total Students</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                {stats.avgStudentsPerBatch}
              </h3>
              <p className="text-sm text-gray-500">Avg per Batch</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
              <Briefcase size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{stats.maxBatchCount}</h3>
              <p className="text-sm text-gray-500">
                Busiest: {stats.maxBatch}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">
                  Batch Time
                </th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">
                  Students Enrolled
                </th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {batches.length > 0 ? (
                batches.map((b) => (
                  <tr
                    key={b.batchTime}
                    className="border-b border-gray-50 hover:bg-gray-50 transition"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 text-gray-700 font-medium">
                        <Clock size={14} className="text-gray-400" />
                        {b.batchTime}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-gray-800">
                        {b.studentCount}
                      </span>{" "}
                      <span className="text-gray-500">
                        student{b.studentCount !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setViewingBatch(b)}
                        disabled={b.studentCount === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-50"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <BookOpen size={48} />
                      <h3 className="text-gray-600 font-medium">
                        No batch data found
                      </h3>
                      <p className="text-sm">
                        No batches configured yet.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Student list modal for a given batch ===== */}
      {viewingBatch && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[900] p-4"
          onClick={() => setViewingBatch(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">
                  {viewingBatch.batchTime}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {viewingBatch.studentCount} student
                  {viewingBatch.studentCount !== 1 ? "s" : ""}
                </p>
              </div>
              <button onClick={() => setViewingBatch(null)}>
                <X size={18} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="overflow-y-auto p-3 flex-1">
              {viewingBatch.students?.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {s.photo ? (
                        <img
                          src={s.photo}
                          alt={s.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-400 text-sm font-medium">
                          {s.name?.charAt(0) || "?"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {s.name || "N/A"}
                      </p>
                      <p className="text-xs text-gray-500">{s.studentId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!idCardTemplateId) {
                        alert("No ID card template saved yet — create one in Template Designer first.");
                        return;
                      }
                      setIdCardStudent(s);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition flex-shrink-0"
                  >
                    <CreditCard size={14} />
                    ID Card
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== ID Card overlay (now dynamic) ===== */}
      {idCardStudent && idCardTemplateId && (
        <DynamicCardModal
  templateId={idCardTemplateId}
  data={{
    fullName: idCardStudent.name,
    admissionNo: idCardStudent.studentId,
    course: idCardStudent.course,
    batchTime: idCardStudent.batch,
    mobileNumber: idCardStudent.mobileNumber,
    issueDate: idCardStudent.admissionDate,
    photo: idCardStudent.photo,
  }}
  fileName={`IDCard-${idCardStudent.name}`}
  onClose={() => setIdCardStudent(null)}
/>
      )}
    </div>
  );
};

export default BatchReportList;