import React, { useState, useEffect } from "react";
import { 
  Search, 
  DollarSign, 
  Calendar, 
  User, 
  AlertCircle,
  CheckCircle,
  Download,
  IndianRupee,
  CreditCard,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  Edit,
  Check,
  Plus,
  Minus,
  Trash2
} from "lucide-react";


const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Auth fetch helper
const authFetch = (url, options = {}) => {
  const token = localStorage.getItem("token");
  const fullUrl = url.startsWith('/') ? `${BASE_URL}${url}` : url;
  return fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
};

const SingleFeeRow = ({ fee, allCourseFeeSchedules, setAllCourseFeeSchedules, toggleFeeSelection, handleAmountChange, formatCurrency }) => {
  const courseIdx = fee.courseIndex ?? 0;

  const updateFee = (updater) => {
    setAllCourseFeeSchedules(prev => prev.map((schedule, idx) => {
      if (idx !== courseIdx) return schedule;
      return {
        ...schedule,
        fees: schedule.fees.map(f => f.id === fee.id ? updater(f) : f)
      };
    }));
  };

  return (
    <div className={`p-4 hover:bg-gray-50 ${
      fee.isAdmissionFee ? 'bg-purple-50 border-l-4 border-l-purple-400' :
      fee.isExamMonth ? 'bg-yellow-50' : ''
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={fee.selected || false}
            onChange={() => toggleFeeSelection(courseIdx, fee.id)}
            className="h-5 w-5 rounded text-blue-600 cursor-pointer"
          />
          <div>
            <div className="font-medium text-gray-900">
              {fee.month}
              {fee.courseShortName && (
                <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">{fee.courseShortName}</span>
              )}
            </div>
            <div className="text-sm text-gray-600">{fee.description}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
              <span>Type: {fee.type}</span>
              {fee.isExamMonth && (
                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Exam Month</span>
              )}
              {fee.isAdmissionFee && (
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">One-time Fee</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-gray-900">
            {formatCurrency(fee.pendingAmount || 0)}
            {fee.status === "partial" && (
              <span className="text-sm font-normal text-gray-500 ml-1">remaining</span>
            )}
          </div>
          <div className="text-sm">
            {fee.status === "partial" ? (
              <div className="text-green-600">Already paid: {formatCurrency(fee.paidAmount || 0)}</div>
            ) : (
              <div className="text-red-600">Due: {formatCurrency(fee.pendingAmount || 0)}</div>
            )}
          </div>
          {fee.status === "partial" && (
            <div className="text-xs text-gray-500 mt-1">Original: {formatCurrency(fee.totalAmount)}</div>
          )}
        </div>
      </div>

      {fee.selected && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-gray-600 mb-3">Paying for {fee.month}</div>

          {fee.isExamMonth ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Fee
                    <span className="ml-1 text-xs text-gray-400">
                      (Max: {formatCurrency(Math.max(0, (fee.pendingAmount || 0) - Math.max(0, (fee.examFee || 0) - (fee.examPaid || 0))))})
                    </span>
                  </label>
                  <input
                    type="number"
                    value={fee.monthlyPayingAmount ?? Math.max(0, (fee.pendingAmount || 0) - Math.max(0, (fee.examFee || 0) - (fee.examPaid || 0)))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const maxMonthly = Math.max(0, (fee.pendingAmount || 0) - Math.max(0, (fee.examFee || 0) - (fee.examPaid || 0)));
                      const clampedVal = Math.min(val, maxMonthly);
                      updateFee(f => {
                        const examPaying = f.examPayingAmount ?? (f.examFee || 0);
                        return { ...f, monthlyPayingAmount: clampedVal, payingAmount: clampedVal + examPaying };
                      });
                    }}
                    onWheel={(e) => e.target.blur()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max={Math.max(0, (fee.pendingAmount || 0) - Math.max(0, (fee.examFee || 0) - (fee.examPaid || 0)))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-yellow-700 mb-1">
                    Exam Fee
                    <span className="ml-1 text-xs text-gray-400">
                      (Max: {formatCurrency(Math.max(0, (fee.examFee || 0) - (fee.examPaid || 0)))})
                    </span>
                  </label>

                  {(fee.examPaid || 0) >= (fee.examFee || 0) && (fee.examFee || 0) > 0 ? (
                    <div className="w-full px-3 py-2 border border-green-300 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
                      ✅ Exam fee already paid — ₹{fee.examFee}
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={fee.examPayingAmount ?? Math.max(0, (fee.examFee || 0) - (fee.examPaid || 0))}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const maxExam = Math.max(0, (fee.examFee || 0) - (fee.examPaid || 0));
                        const clampedVal = Math.min(val, maxExam);
                        updateFee(f => {
                          const monthlyPaying = f.monthlyPayingAmount ?? ((f.pendingAmount || 0) - maxExam);
                          return { ...f, examPayingAmount: clampedVal, payingAmount: monthlyPaying + clampedVal };
                        });
                      }}
                      onWheel={(e) => e.target.blur()}
                      className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-yellow-50"
                      min="0"
                      max={Math.max(0, (fee.examFee || 0) - (fee.examPaid || 0))}
                    />
                  )}

                  {(fee.examPaid || 0) >= (fee.examFee || 0) && (fee.examFee || 0) > 0 ? (
                    <p className="text-xs text-green-600 mt-1">✅ Exam fee fully paid — eligible for exam</p>
                  ) : (fee.examPayingAmount ?? Math.max(0, (fee.examFee || 0) - (fee.examPaid || 0))) + (fee.examPaid || 0) >= (fee.examFee || 0) ? (
                    <p className="text-xs text-green-600 mt-1">✅ Will be exam eligible after this payment</p>
                  ) : (
                    <p className="text-xs text-red-500 mt-1">❌ Exam fee not fully paid</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-blue-200">
                <span className="text-sm text-gray-600">Total paying:</span>
                <span className="font-bold text-blue-700">
                  {formatCurrency(
                    (fee.monthlyPayingAmount ?? Math.max(0, (fee.pendingAmount || 0) - Math.max(0, (fee.examFee || 0) - (fee.examPaid || 0)))) +
                    (fee.examPayingAmount ?? Math.max(0, (fee.examFee || 0) - (fee.examPaid || 0)))
                  )}
                </span>
              </div>

              {fee.status === "partial" && (
                <div className="text-xs text-green-600">Already paid: {formatCurrency(fee.paidAmount || 0)}</div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Pay</label>
                <input
                  type="number"
                  value={fee.payingAmount || 0}
                  onChange={(e) => handleAmountChange(courseIdx, fee.id, parseFloat(e.target.value) || 0)}
                  onWheel={(e) => e.target.blur()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max={fee.pendingAmount || 0}
                />
                <div className="text-xs text-gray-500 mt-1">Max: {formatCurrency(fee.pendingAmount || 0)}</div>
              </div>
              <div className="text-sm">
                <div className="text-gray-600">Remaining: {formatCurrency(fee.pendingAmount)}</div>
                {fee.status === "partial" && (
                  <div className="text-green-600">Already paid: {formatCurrency(fee.paidAmount || 0)}</div>
                )}
                {fee.payingAmount > 0 && (
                  <div className="text-red-600 mt-1">
                    Will remain: {formatCurrency((fee.pendingAmount || 0) - (fee.payingAmount || 0))}
                    {(fee.pendingAmount || 0) - (fee.payingAmount || 0) > 0 && (
                      <span className="text-xs ml-1">(added to next month)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

  

const StudentFees = () => {
  const [activeTab, setActiveTab] = useState("payFees");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [receiptNo, setReceiptNo] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [remarks, setRemarks] = useState("");
  const [fineAmount, setFineAmount] = useState(0);
  const [fineReason, setFineReason] = useState("");
  const [studentFeeSchedule, setStudentFeeSchedule] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [otherFees, setOtherFees] = useState([]);
  const [otherFeesList, setOtherFeesList] = useState([]);
  const [feeRegisterData, setFeeRegisterData] = useState([]);
  const [regLoading, setRegLoading] = useState(false);
  const [regFromDate, setRegFromDate] = useState(() => {
  const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [regToDate, setRegToDate] = useState(new Date().toISOString().split('T')[0]);
  const [regSearchName, setRegSearchName] = useState('');
  const [regSearchReceipt, setRegSearchReceipt] = useState('');
  const [regPage, setRegPage] = useState(1);
  const REG_PAGE_SIZE = 15;
  const [defaulterMonthFilter, setDefaulterMonthFilter] = useState(6);


  // ✅ NEW: Course tab states
  const [selectedCourseTab, setSelectedCourseTab] = useState(0);
  const [allCourseFeeSchedules, setAllCourseFeeSchedules] = useState([]);


  const [showRegisterEditModal, setShowRegisterEditModal] = useState(false);
  const [editingRegRecord, setEditingRegRecord]           = useState(null);
  const [editRegReceiptNo, setEditRegReceiptNo]           = useState('');
  const [editRegDate, setEditRegDate]                     = useState('');
  const [paidYear, setPaidYear]                           = useState(new Date().getFullYear());
  const [paidFeeTypeFilter, setPaidFeeTypeFilter]         = useState('all');
  const [monthlyData, setMonthlyData]                     = useState([]);
  const [monthlyLoading, setMonthlyLoading]               = useState(false);
  const [overdueModal, setOverdueModal]                   = useState(null);

  // ✅ Get current tab's fees
  const getCurrentFees = () => {
    if (!allCourseFeeSchedules.length) return selectedStudent?.feeSchedule || [];
    return allCourseFeeSchedules[selectedCourseTab]?.fees || [];
  };

  // ✅ Update current tab's fees
  const updateCurrentFees = (updatedFees) => {
    const updated = [...allCourseFeeSchedules];
    updated[selectedCourseTab] = { ...updated[selectedCourseTab], fees: updatedFees };
    setAllCourseFeeSchedules(updated);
  };

 

  // Fetch other fees from setup management
  const fetchOtherFees = async () => {
    try {
      const response = await authFetch("/api/setup");
      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }
      const data = await response.json();
      if (data.success && data.data && data.data.fees) {
        const transformedFees = data.data.fees
          .filter(fee => fee.isActive !== false)
          .map(fee => ({
            id: fee._id,
            name: fee.feeName,
            amount: fee.amount || 0,
            description: fee.description || "",
            feeType: fee.feeType || "other"
          }));
        setOtherFees(transformedFees);
      } else {
        setOtherFees([]);
      }
    } catch (error) {
      console.error("Error fetching other fees:", error);
      setOtherFees([
        { id: "1", name: "Library Fee", amount: 500, description: "Annual library charges", feeType: "library" },
        { id: "2", name: "Lab Fee", amount: 1000, description: "Laboratory equipment charges", feeType: "lab" },
        { id: "3", name: "Sports Fee", amount: 300, description: "Sports facility charges", feeType: "sports" }
      ]);
    }
  };

  const fetchFeeRegister = async () => {
  try {
    setRegLoading(true);
    setRegPage(1);
    const params = new URLSearchParams();
    if (regFromDate)      params.append('from',    regFromDate);
    if (regToDate)        params.append('to',      regToDate);
    if (regSearchName.trim())   params.append('search', regSearchName.trim());
    if (regSearchReceipt.trim()) params.append('receipt', regSearchReceipt.trim());

    const response = await authFetch(`/api/students/fee-register?${params}`);
    if (response.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; return; }
    const data = await response.json();
    if (data.success) {
      setFeeRegisterData(data.data || []);
    }
  } catch (err) {
    console.error('Fee register fetch error:', err);
  } finally {
    setRegLoading(false);
  }
};

const fetchYearlyCollection = async (year) => {
  try {
    setMonthlyLoading(true);
    const params = new URLSearchParams({
      from: `${year}-01-01`,
      to:   `${year}-12-31`
    });
    const response = await authFetch(`/api/students/fee-register?${params}`);
    if (response.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; return; }
    const data = await response.json();
    if (data.success) setMonthlyData(data.data || []);
  } catch (err) {
    console.error('Yearly collection error:', err);
  } finally {
    setMonthlyLoading(false);
  }
};

const getMonthlyTotals = () => {
  return Array.from({ length: 12 }, (_, i) => {
    const monthName = new Date(paidYear, i, 1).toLocaleString('en-IN', { month: 'long' });
    const recs = monthlyData.filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === paidYear && d.getMonth() === i;
    });
    const monthlyFee    = recs.filter(r => r.feeType === 'Monthly Fee').reduce((s, r) => s + (r.amount || 0), 0);
    const admissionFee  = recs.filter(r => r.feeType === 'Admission Fee').reduce((s, r) => s + (r.amount || 0), 0);
    const examFee       = recs.filter(r => r.feeType === 'Exam Fee').reduce((s, r) => s + (r.amount || 0), 0);
    const otherFee      = recs.filter(r => !['Monthly Fee','Admission Fee','Exam Fee'].includes(r.feeType)).reduce((s, r) => s + (r.amount || 0), 0);

    const filteredRecs = paidFeeTypeFilter === 'all' ? recs
      : paidFeeTypeFilter === 'Other Fee'
        ? recs.filter(r => !['Monthly Fee','Admission Fee','Exam Fee'].includes(r.feeType))
        : recs.filter(r => r.feeType === paidFeeTypeFilter);

    const filtered = filteredRecs.reduce((s, r) => s + (r.amount || 0), 0);
    return { monthName, monthlyFee, admissionFee, examFee, otherFee, filtered, count: filteredRecs.length };
  });
};

const handleRegisterEdit = async () => {
  try {
    const response = await authFetch('/api/students/fee-register/receipt', {
      method: 'PUT',
      body: JSON.stringify({
        oldReceiptNo: editingRegRecord.receiptNo,
        newReceiptNo: editRegReceiptNo,
        newDate:      editRegDate
      })
    });
    const data = await response.json();
    if (data.success) {
      alert('Receipt updated!');
      setShowRegisterEditModal(false);
      fetchFeeRegister();
    } else {
      alert('Failed: ' + data.message);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

const handleRegisterDelete = async (receiptNo) => {
  if (!confirm(`Delete ALL entries for receipt ${receiptNo}?\nFees will be restored to pending.`)) return;
  try {
    const response = await authFetch(
      `/api/students/fee-register/receipt/${encodeURIComponent(receiptNo)}`,
      { method: 'DELETE' }
    );
    const data = await response.json();
    if (data.success) {
      alert('Receipt deleted. Fees restored to pending.');
      fetchFeeRegister();
    } else {
      alert('Failed: ' + data.message);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

  const generateReceiptNo = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RCPT${year}${month}${day}${random}`;
  };

  const getCourseShortName = (courseName) => {
  if (!courseName) return "C";
  return courseName
    .replace(/[()]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)   // ← skip "in", "of", "to", "a" etc.
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 6);
};

  useEffect(() => {
    fetchStudents();
    fetchOtherFees();
    setReceiptNo(generateReceiptNo());
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'feeRegister') fetchFeeRegister();
    if (activeTab === 'paid') fetchYearlyCollection(paidYear);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'paid') fetchYearlyCollection(paidYear);
  }, [paidYear]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await authFetch("/api/students");
      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }
      const data = await response.json();
      if (data.success) {
        const transformedStudents = (data.data || []).map(student => {
  const activeFeeSchedule = (student.feeSchedule || []).filter(
    f => f.status !== "suspended"
  );
  const scheduleFees = activeFeeSchedule.length > 0
  ? activeFeeSchedule.reduce((s, f) => s + (f.totalFee || 0), 0)
  : (student.totalCourseFee || 0);
let additionalTotalFee = 0;
let additionalPaid = 0;
if (student.additionalCourses && student.additionalCourses.length > 0) {
  student.additionalCourses.forEach(course => {
    const fees = (course.feeSchedule || []).filter(f => f.status !== "suspended");
    additionalTotalFee += fees.reduce((s, f) => s + (f.totalFee || 0), 0);
    additionalPaid += fees.reduce((s, f) => s + (f.paidAmount || 0), 0);
  });
}
const activeTotalFee = scheduleFees + (student.admissionFee || 0) + additionalTotalFee;
const schedulesPaid = activeFeeSchedule.reduce((s, f) => s + (f.paidAmount || 0), 0);
const admissionPaid = student.admissionFeePaidAmount || 0;
const totalPaid = schedulesPaid + admissionPaid + additionalPaid;
const activeBalance = activeTotalFee - totalPaid;
  return {
    _id: student._id,
    studentId: student.studentId,
    admissionNo: student.admissionNo,
    fullName: student.fullName,
    fatherName: student.fatherName || "N/A",
    dateOfJoining: student.admissionDate || student.dateOfJoining,
    course: student.course || student.courseName || "N/A",
    batch: student.batch || student.batchName || student.batchTime || student.originalData?.batch || "N/A",
    faculty: student.facultyAllot || "—",
    status: student.status || "Active",
    monthlyFee: student.monthlyFee || student.feeAmount || 0,
    paidAmount: totalPaid,
    balanceAmount: Math.max(0, activeBalance),
    originalData: student
  };
});
        setStudents(transformedStudents);
      } else {
        loadMockData();
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setStudents([
      {
        _id: "1",
        studentId: "STU20240001",
        admissionNo: "7890",
        fullName: "Meesakshi",
        fatherName: "Mr. Kamla Nand Badiyal",
        dateOfJoining: "2026-01-13",
        course: "ITDA-DPA (12 M)",
        batch: "I - 04 To 05 PM",
        status: "Active",
        monthlyFee: 1400,
        paidAmount: 0,
        balanceAmount: 3600
      }
    ]);
  };

  const calculateDueDate = (admissionDate, monthNumber) => {
    if (!admissionDate || !monthNumber) return null;
    try {
      const admission = new Date(admissionDate);
      const dueDate = new Date(admission);
      dueDate.setDate(1);
      dueDate.setMonth(admission.getMonth() + monthNumber - 1);
      dueDate.setDate(5);
      return dueDate.toISOString().split('T')[0];
    } catch (error) {
      return null;
    }
  };

  const fetchStudentFeeSchedule = async (studentId, studentData) => {
    try {
      const response = await authFetch(`/api/students/${studentId}/fees`);
      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return [];
      }
      const data = await response.json();
      if (data.success && data.data && data.data.feeSchedule) {
        const feeData = data.data;
        let feeSchedule = feeData.feeSchedule || [];

        feeSchedule = feeSchedule.filter(fee => {
  if (fee.status === "suspended") return false; // ← exclude suspended months
  const totalAmount = fee.totalFee || fee.totalAmount || 0;
  const paidAmount = fee.paidAmount || 0;
  const balanceAmount = fee.balanceAmount !== undefined ? fee.balanceAmount : totalAmount - paidAmount;
  return fee.status === "pending" || balanceAmount > 0 || paidAmount < totalAmount;
});

        if (feeSchedule.length === 0) return [];

        const processedFeeSchedule = feeSchedule.map((fee) => {
          const monthNumber = fee.monthNumber || 1;
          let monthName = fee.month;
          const totalAmount = fee.totalFee || fee.totalAmount || 0;
          const paidAmount = fee.paidAmount || 0;
          const balanceAmount = fee.balanceAmount !== undefined ? fee.balanceAmount : totalAmount - paidAmount;

          return {
            id: fee._id || `fee-${studentId}-${monthNumber}`,
            monthNumber,
            month: monthName || `Month ${monthNumber}`,
            description: fee.description || `${studentData?.course || "Course"} - ${fee.isExamMonth ? "Exam Fee" : "Monthly Fee"}`,
            type: fee.isExamMonth ? "exam" : "monthly",
            courseName: studentData?.course || "Primary Course",
            courseShortName: getCourseShortName(studentData?.course),
            courseIndex: 0,
            totalAmount,
            pendingAmount: balanceAmount,
            balanceAmount,
            paidAmount,
            status: fee.status || (paidAmount > 0 ? "partial" : "pending"),
            selected: false,
            payingAmount: balanceAmount,
            isExamMonth: fee.isExamMonth || false,
            examFee: fee.examFee || 0,
            examPaid: fee.examPaid || 0,        // ← ADD
            monthlyPaid: fee.monthlyPaid || 0,  // ← ADD
            dueDate: fee.dueDate || calculateDueDate(studentData?.admissionDate, monthNumber)
          };
        });

        const sorted = processedFeeSchedule.sort((a, b) => a.monthNumber - b.monthNumber);

// ✅ Add admission fee as first row if exists and unpaid
const admissionFee = feeData?.student?.admissionFee || data?.data?.student?.admissionFee || 0;
const admissionFeePaid = data?.data?.student?.admissionFeePaid || false;
const admissionFeePaidAmount = data?.data?.student?.admissionFeePaidAmount || 0;
const admissionFeeRemaining = admissionFee - admissionFeePaidAmount;

if (admissionFee > 0 && !admissionFeePaid && admissionFeeRemaining > 0) {
  sorted.unshift({
    id: `admission-fee-${studentId}`,
    monthNumber: 0,
    month: "Admission Fee",
    description: `${studentData?.course || "Course"} - Admission Fee`,
    type: "admission",
    totalAmount: admissionFee,
    pendingAmount: admissionFeeRemaining,      // ← remaining, not full amount
    balanceAmount: admissionFeeRemaining,
    paidAmount: admissionFeePaidAmount,        // ← already paid so far
    status: admissionFeePaidAmount > 0 ? "partial" : "pending",
    selected: false,
    payingAmount: admissionFeeRemaining,
    isExamMonth: false,
    isAdmissionFee: true,
    examFee: 0,
    examPaid: 0,
    monthlyPaid: 0,
    dueDate: null
  });
}
return sorted;
      }
      return [];
    } catch (error) {
      console.error("Error fetching fee schedule:", error);
      return [];
    }
  };

  // ✅ UPDATED: handleStudentSelect loads primary + additional course fees
  const handleStudentSelect = async (student) => {
    try {
      setSelectedCourseTab(0);

      const primaryFees = await fetchStudentFeeSchedule(student._id, student.originalData || student);

      // Fetch full student data to get additionalCourses
      const res = await authFetch(`/api/students/${student._id}`);
      const data = await res.json();
      const fullStudent = data.data || data;

      // Build all course fee schedules
      const schedules = [
        { courseName: fullStudent.course || "Primary Course", fees: primaryFees || [] }
      ];

      if (fullStudent.additionalCourses && fullStudent.additionalCourses.length > 0) {
        fullStudent.additionalCourses.forEach((ac, acIndex) => {
  const fees = (ac.feeSchedule || [])
    .filter(fee => fee.status !== "paid" && (fee.balanceAmount || 0) > 0)
    .map(fee => ({
      id: fee._id,
      monthNumber: fee.monthNumber,
      month: fee.month,
      description: `${ac.courseName} - ${fee.isExamMonth ? "Exam Fee" : "Monthly Fee"}`,
      type: fee.isExamMonth ? "exam" : "monthly",
      courseName: ac.courseName,
      courseShortName: getCourseShortName(ac.courseName),
      courseIndex: acIndex + 1,
      totalAmount: fee.totalFee || 0,
      pendingAmount: fee.balanceAmount || fee.totalFee || 0,
      paidAmount: fee.paidAmount || 0,
      balanceAmount: fee.balanceAmount || fee.totalFee || 0,
      status: fee.status || "pending",
      selected: false,
      payingAmount: fee.balanceAmount || fee.totalFee || 0,
      isExamMonth: fee.isExamMonth || false,
      examFee: fee.examFee || 0,
      examPaid: fee.examPaid || 0,
      monthlyPaid: fee.monthlyPaid || 0,
      dueDate: fee.dueDate || null,
      additionalCourseIndex: acIndex
    }));

          schedules.push({ courseName: ac.courseName, fees });
        });
      }

      setAllCourseFeeSchedules(schedules);

      // ✅ Recompute paid/balance off the FULL record, same logic as fetchStudents
      const activeFeeSchedule = (fullStudent.feeSchedule || []).filter(f => f.status !== "suspended");
      const scheduleFees = activeFeeSchedule.length > 0
        ? activeFeeSchedule.reduce((s, f) => s + (f.totalFee || 0), 0)
        : (fullStudent.totalCourseFee || 0);
      let additionalTotalFee = 0, additionalPaid = 0;
      (fullStudent.additionalCourses || []).forEach(course => {
        const fees = (course.feeSchedule || []).filter(f => f.status !== "suspended");
        additionalTotalFee += fees.reduce((s, f) => s + (f.totalFee || 0), 0);
        additionalPaid += fees.reduce((s, f) => s + (f.paidAmount || 0), 0);
      });
      const activeTotalFee = scheduleFees + (fullStudent.admissionFee || 0) + additionalTotalFee;
      const schedulesPaid = activeFeeSchedule.reduce((s, f) => s + (f.paidAmount || 0), 0);
      const admissionPaid = fullStudent.admissionFeePaidAmount || 0;
      const totalPaid = schedulesPaid + admissionPaid + additionalPaid;
      const activeBalance = Math.max(0, activeTotalFee - totalPaid);

      setSelectedStudent({
        _id: fullStudent._id,
        studentId: fullStudent.studentId,
        admissionNo: fullStudent.admissionNo,
        fullName: fullStudent.fullName,
        fatherName: fullStudent.fatherName || "N/A",
        dateOfJoining: fullStudent.admissionDate || fullStudent.dateOfJoining,
        course: fullStudent.course || fullStudent.courseName || "N/A",
        batch: fullStudent.batch || fullStudent.batchName || fullStudent.batchTime || "N/A",
        status: fullStudent.status || "Active",
        monthlyFee: fullStudent.monthlyFee || fullStudent.feeAmount || 0,
        paidAmount: totalPaid,
        balanceAmount: activeBalance,
        feeSchedule: primaryFees || [],
        originalData: fullStudent
      });
      setReceiptNo(generateReceiptNo());
    } catch (error) {
      console.error("Error selecting student:", error);
      const primaryFees = await fetchStudentFeeSchedule(student._id, student.originalData || student);
      setAllCourseFeeSchedules([{ courseName: student.course || "Primary Course", fees: primaryFees || [] }]);
      setSelectedStudent({ ...student, batch: student.batch || student.originalData?.batch || student.originalData?.batchName || "N/A", feeSchedule: primaryFees || [] });
      setReceiptNo(generateReceiptNo());
    }
  };

  // ✅ UPDATED: Uses updateCurrentFees
  const toggleFeeSelection = (courseIndex, feeId) => {
  const updated = allCourseFeeSchedules.map((schedule, idx) => {
    if (idx !== courseIndex) return schedule;
    return {
      ...schedule,
      fees: schedule.fees.map(fee => {
        if (fee.id !== feeId) return fee;
        const newSelected = !fee.selected;
        if (newSelected && fee.isExamMonth) {
          const remainingExam = Math.max(0, (fee.examFee || 0) - (fee.examPaid || 0));
          const remainingMonthly = Math.max(0, (fee.pendingAmount || 0) - remainingExam);
          return { ...fee, selected: true, monthlyPayingAmount: remainingMonthly, examPayingAmount: remainingExam, payingAmount: remainingMonthly + remainingExam };
        }
        return { ...fee, selected: newSelected, payingAmount: newSelected ? (fee.pendingAmount || 0) : 0, monthlyPayingAmount: undefined, examPayingAmount: undefined };
      })
    };
  });
  setAllCourseFeeSchedules(updated);
};
  // ✅ UPDATED: Uses updateCurrentFees
  const handleAmountChange = (courseIndex, feeId, amount) => {
  const updated = allCourseFeeSchedules.map((schedule, idx) => {
    if (idx !== courseIndex) return schedule;
    return {
      ...schedule,
      fees: schedule.fees.map(fee => {
        if (fee.id !== feeId) return fee;
        const maxAmount = fee.pendingAmount || 0;
        return { ...fee, payingAmount: Math.min(Math.max(0, amount), maxAmount) };
      })
    };
  });
  setAllCourseFeeSchedules(updated);
};

  // ✅ UPDATED: Calculates across ALL courses
  const calculateMonthlyFeesTotal = () => {
    return allCourseFeeSchedules.reduce((total, schedule) => {
      return total + schedule.fees
        .filter(fee => fee.selected && fee.payingAmount > 0)
        .reduce((sum, fee) => sum + (fee.payingAmount || 0), 0);
    }, 0);
  };

  const calculateTotal = () => {
    const selectedFeesTotal = calculateMonthlyFeesTotal();
    const otherFeeTotal = otherFeesList.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
    const fineTotal = parseFloat(fineAmount) || 0;
    return selectedFeesTotal + otherFeeTotal + fineTotal;
  };

  // ✅ UPDATED: Collects from ALL courses
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedFees = allCourseFeeSchedules.flatMap(schedule =>
        schedule.fees.filter(fee => fee.selected && fee.payingAmount > 0)
      );

      if (selectedFees.length === 0) {
        alert("Please select at least one fee to pay");
        return;
      }

      const totalAmount = calculateTotal();

      // Separate admission fee from monthly fees
const admissionFeeEntry = selectedFees.find(f => f.isAdmissionFee);
const monthlyFees = selectedFees.filter(f => !f.isAdmissionFee);

const paymentData = {
  studentId: selectedStudent._id,
  months: monthlyFees.map(fee => fee.monthNumber),
  amounts: monthlyFees.map(fee => fee.payingAmount),
  additionalCourseIndices: monthlyFees.map(fee => fee.additionalCourseIndex ?? null),
  monthlyAmounts: monthlyFees.map(fee => fee.isExamMonth ? (fee.monthlyPayingAmount ?? (fee.payingAmount - (fee.examFee || 0))) : fee.payingAmount),
  examAmounts: monthlyFees.map(fee => fee.isExamMonth ? (fee.examPayingAmount ?? 0) : 0),
  // ✅ Admission fee
  admissionFeePayment: admissionFeeEntry ? {
    amount: admissionFeeEntry.payingAmount,
    paymentDate,
    receiptNo,
    paymentMode
  } : null,
  paymentType: "multiple",
  paymentDate,
  receiptNo,
  paymentMode,
  remarks: remarks || "",
  otherFees: otherFeesList
    .filter(f => parseFloat(f.amount) > 0)
    .map(f => ({
      feeId: f.feeId,
      feeName: f.feeName || "Other Fee",
      amount: parseFloat(f.amount),
      description: f.description || ""
    })),
};

// ← ADD THIS RIGHT HERE
console.log("🔍 Payment data:", JSON.stringify({
  months: paymentData.months,
  amounts: paymentData.amounts,
  monthlyAmounts: paymentData.monthlyAmounts,
  examAmounts: paymentData.examAmounts,
  selectedFees: selectedFees.map(f => ({
    monthNumber: f.monthNumber,
    isExamMonth: f.isExamMonth,
    payingAmount: f.payingAmount,
    monthlyPayingAmount: f.monthlyPayingAmount,
    examPayingAmount: f.examPayingAmount,
    examFee: f.examFee,
    examPaid: f.examPaid
  }))
}, null, 2));

      const response = await authFetch("/api/students/payment", {
        method: "POST",
        body: JSON.stringify(paymentData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update all course schedules - remove paid fees
          const updatedSchedules = allCourseFeeSchedules.map(schedule => ({
            ...schedule,
            fees: schedule.fees
              .map(fee => {
                const selectedFee = selectedFees.find(f => f.id === fee.id);
                if (selectedFee) {
                  const newPaidAmount = (fee.paidAmount || 0) + selectedFee.payingAmount;
                  const newPendingAmount = Math.max(0, (fee.totalAmount || 0) - newPaidAmount);
                  if (newPendingAmount === 0) return null;
                  return {
                    ...fee,
                    paidAmount: newPaidAmount,
                    pendingAmount: newPendingAmount,
                    status: "partial",
                    selected: false,
                    payingAmount: 0
                  };
                }
                return fee;
              })
              .filter(fee => fee !== null)
          }));

          setAllCourseFeeSchedules(updatedSchedules);
          setOtherFeesList([]);

          alert(`Payment submitted successfully!\nReceipt: ${receiptNo}\nAmount: ₹${totalAmount}`);
          await fetchStudents();
          setReceiptNo(generateReceiptNo());
          setFineAmount(0);
          setFineReason("");
          setRemarks("");
        } else {
          alert(`Payment failed: ${result.message || "Unknown error"}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Payment failed: ${errorData.message || `Status ${response.status}`}`);
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert(`Payment error: ${error.message}`);
    }
  };

  const performSearch = async (searchQuery = searchTerm) => {
    try {
      setLoading(true);
      const response = await authFetch(`/api/students/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        const transformedStudents = (data.data || []).map(student => {
  const activeFeeSchedule = (student.feeSchedule || []).filter(
    f => f.status !== "suspended"
  );
  const scheduleFees = activeFeeSchedule.length > 0
  ? activeFeeSchedule.reduce((s, f) => s + (f.totalFee || 0), 0)
  : (student.totalCourseFee || 0);
const activeTotalFee = scheduleFees + (student.admissionFee || 0);
const schedulesPaid = activeFeeSchedule.reduce((s, f) => s + (f.paidAmount || 0), 0);
let additionalTotalFee = 0;
let additionalPaid = 0;
if (student.additionalCourses && student.additionalCourses.length > 0) {
  student.additionalCourses.forEach(course => {
    const fees = (course.feeSchedule || []).filter(f => f.status !== "suspended");
    additionalTotalFee += fees.reduce((s, f) => s + (f.totalFee || 0), 0);
    additionalPaid += fees.reduce((s, f) => s + (f.paidAmount || 0), 0);
  });
}
const admissionPaid = student.admissionFeePaidAmount || 0;
const totalPaid = schedulesPaid + admissionPaid;
const activeBalance = activeTotalFee - totalPaid;

  return {
    _id: student._id,
    studentId: student.studentId,
    admissionNo: student.admissionNo,
    fullName: student.fullName,
    fatherName: student.fatherName || "N/A",
    dateOfJoining: student.admissionDate || student.dateOfJoining,
    course: student.course || student.courseName || "N/A",
    batch: student.batch || student.batchName || student.batchTime || student.originalData?.batch || "N/A",
    faculty: student.facultyAllot || "—",
    status: student.status || "Active",
    monthlyFee: student.monthlyFee || student.feeAmount || 0,
    paidAmount: totalPaid,
    balanceAmount: Math.max(0, activeBalance),
    originalData: student
  };
});
        setStudents(transformedStudents);
      } else {
        const searchLower = searchQuery.toLowerCase().trim();
        const filtered = students.filter(student =>
          (student.admissionNo && student.admissionNo.toLowerCase().includes(searchLower)) ||
          (student.fullName && student.fullName.toLowerCase().includes(searchLower)) ||
          (student.studentId && student.studentId.toLowerCase().includes(searchLower)) ||
          (student.fatherName && student.fatherName.toLowerCase().includes(searchLower))
        );
        setStudents(filtered);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

   const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Returns array of fee entries whose calendar month has arrived but are still unpaid
  const getOverdueMonths = (student) => {
    const feeSchedule = student.originalData?.feeSchedule || [];
    if (!feeSchedule.length) return [];

    const today = new Date();
    const admissionDate =
      student.originalData?.admissionDate ||
      student.originalData?.dateOfJoining ||
      student.dateOfJoining;

    return feeSchedule.filter(fee => {
      if (fee.status === 'paid' || fee.status === 'suspended') return false;

      const balance =
        fee.balanceAmount !== undefined
          ? fee.balanceAmount
          : (fee.totalFee || 0) - (fee.paidAmount || 0);
      if (balance <= 0) return false;

      // Find the 1st of the month this fee belongs to
      let feeMonthStart = null;

      if (fee.dueDate) {
        const d = new Date(fee.dueDate);
        feeMonthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      } else if (fee.monthNumber && admissionDate) {
        const base = new Date(admissionDate);
        feeMonthStart = new Date(
          base.getFullYear(),
          base.getMonth() + fee.monthNumber - 1,
          1
        );
      }

      if (!feeMonthStart) return false;
      // If today >= 1st of that fee's month → month has come → overdue
      return today >= feeMonthStart;
    });
  };

  const getOverdueAmount = (overdueList) =>
    overdueList.reduce((sum, fee) => {
      const balance =
        fee.balanceAmount !== undefined
          ? fee.balanceAmount
          : (fee.totalFee || 0) - (fee.paidAmount || 0);
      return sum + balance;
    }, 0);

  const getDefaulterSeverity = (count) => {
    if (count <= 0) return null;
    if (count === 1) return { badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-700', rowBg: '' };
    if (count <= 3) return { badgeBg: 'bg-orange-100', badgeText: 'text-orange-700', rowBg: 'bg-orange-50' };
    return { badgeBg: 'bg-red-100', badgeText: 'text-red-700', rowBg: 'bg-red-50' };
  };

   const pendingStudents = students.filter(s => s.balanceAmount > 0);
  const paidStudents = students.filter(s => s.balanceAmount === 0);

  // Defaulter = pending student with at least 1 month whose calendar date has passed
  const defaulterStudents  = pendingStudents.filter(s => getOverdueMonths(s).length > 0);
  const criticalDefaulters = pendingStudents.filter(s => getOverdueMonths(s).length >= 3);
  const totalOverdueAmount = defaulterStudents.reduce(
    (sum, s) => sum + getOverdueAmount(getOverdueMonths(s)), 0
  );



  const totalRegPages   = Math.max(1, Math.ceil(feeRegisterData.length / REG_PAGE_SIZE));
  const paginatedRegister = feeRegisterData.slice((regPage - 1) * REG_PAGE_SIZE, regPage * REG_PAGE_SIZE);

  const displayedDefaulters = defaulterMonthFilter >= 6
  ? defaulterStudents
  : defaulterStudents.filter(s => getOverdueMonths(s).length === defaulterMonthFilter);

  

  



 return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Fee Management</h1>
        <p className="text-gray-600 mt-1">Manage student fee payments and records</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        <button
          className={`flex items-center px-4 py-3 font-medium whitespace-nowrap ${activeTab === "payFees" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("payFees")}
        >
          <CreditCard className="mr-2 h-5 w-5" />
          Collect Fees
        </button>
        <button
          className={`flex items-center px-4 py-3 font-medium whitespace-nowrap ${activeTab === "pending" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("pending")}
        >
          <AlertCircle className="mr-2 h-5 w-5" />
          Pending Fees
          {pendingStudents.length > 0 && (
            <span className="ml-2 bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded-full">
              {pendingStudents.length}
            </span>
          )}
        </button>
        <button
          className={`flex items-center px-4 py-3 font-medium whitespace-nowrap ${activeTab === "paid" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("paid")}
        >
          <CheckCircle className="mr-2 h-5 w-5" />
          Paid Fees
        </button>

        <button
          className={`flex items-center px-4 py-3 font-medium whitespace-nowrap ${activeTab === "feeRegister" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("feeRegister")}
        >
          <FileText className="mr-2 h-5 w-5" />
          Fee Register
        </button>
      </div>

      <div className="w-full">
        {/* Pay Fees Section */}
        {activeTab === "payFees" && (
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <DollarSign className="mr-3 h-6 w-6 text-green-600" />
              Collect Fee Payment
            </h2>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Column - Student Search */}
              <div className="lg:w-1/3">
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-3 text-gray-700">
                    Search for Roll No & Name
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSearchTerm(value);
                          if (searchTimeout) clearTimeout(searchTimeout);
                          if (!value.trim()) { fetchStudents(); return; }
                          const timeout = setTimeout(() => performSearch(value), 500);
                          setSearchTimeout(timeout);
                        }}
                        placeholder="Enter roll number or name"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            if (searchTimeout) clearTimeout(searchTimeout);
                            performSearch(searchTerm);
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={() => { if (searchTimeout) clearTimeout(searchTimeout); performSearch(searchTerm); }}
                      className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Student List */}
                <div className="border border-gray-200 rounded-xl h-[calc(100vh-300px)] overflow-hidden flex flex-col">
                  <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-medium text-gray-700">Select Student</h3>
                    <p className="text-sm text-gray-500">Click on student to select</p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {loading ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                      </div>
                    ) : students.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">
                        <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No students found</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {students.map((student) => (
                          <div
                            key={student._id}
                            className={`p-4 cursor-pointer transition-all ${selectedStudent?._id === student._id ? "bg-blue-50 border-r-4 border-blue-600" : "hover:bg-gray-50"}`}
                            onClick={() => handleStudentSelect(student)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-semibold text-gray-900 truncate">{student.fullName}</div>
                                  {student.balanceAmount === 0 && (
                                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">Paid</span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 truncate">
                                  Roll No: {student.admissionNo} • {student.course}
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-sm text-green-600 font-medium">Paid: {formatCurrency(student.paidAmount)}</span>
                                  {student.balanceAmount > 0 && (
                                    <span className="text-sm text-red-600 font-medium">Due: {formatCurrency(student.balanceAmount)}</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">Monthly: {formatCurrency(student.monthlyFee)}</div>
                              </div>
                              {selectedStudent?._id === student._id && (
                                <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 ml-2" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Payment Form */}
              <div className="lg:w-2/3">
                {selectedStudent ? (
                  <form onSubmit={handlePaymentSubmit} className="space-y-6">

                    {/* Student Info Card */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100">
  {/* Header row: name + status + close button */}
  <div className="flex justify-between items-center mb-4 pb-4 border-b border-blue-200/60">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
        {selectedStudent.fullName?.charAt(0).toUpperCase()}
      </div>
      <div>
        <div className="font-bold text-gray-900 text-lg leading-tight">{selectedStudent.fullName}</div>
        <div className="text-sm text-gray-500">{selectedStudent.admissionNo}</div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className={`px-3 py-1.5 text-sm font-bold rounded-full capitalize ${
  selectedStudent.status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
}`}>
  {selectedStudent.status}
</span>
      <button type="button" onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600">
        <X className="h-5 w-5" />
      </button>
    </div>
  </div>

  {/* Unified field grid */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">Batch</div>
      <div className="font-semibold text-gray-900 mt-0.5">{selectedStudent.batch}</div>
    </div>
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">D.O.J</div>
      <div className="font-semibold text-gray-900 mt-0.5">{formatDate(selectedStudent.dateOfJoining)}</div>
    </div>
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">Father</div>
      <div className="font-semibold text-gray-900 mt-0.5">{selectedStudent.fatherName}</div>
    </div>
    <div className="col-span-2 md:col-span-1">
      <div className="text-xs text-gray-500 uppercase tracking-wide">Course</div>
      <div className="font-semibold text-gray-900 mt-0.5 break-words">{selectedStudent.course}</div>
    </div>
  </div>
</div>

                    {/* Date + Receipt + Payment Mode - OUTSIDE fee box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                          <input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Receipt No</label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                          <input
                            type="text"
                            value={receiptNo}
                            onChange={(e) => setReceiptNo(e.target.value.toUpperCase())}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Payment Mode</label>
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="cash">Cash</option>
                          <option value="cheque">Cheque</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="online">Online Payment</option>
                        </select>
                      </div>
                    </div>

                    {/* Fee Table - separate bordered box */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">

                      
                      

                      {/* Header */}
                      <div className="bg-gray-50 p-4 border-b">
                        <h3 className="font-semibold text-gray-700">Select Fees to Pay</h3>
                        <p className="text-sm text-gray-500">Check the fees you want to pay. Enter amount for each selected fee.</p>
                        <p className="text-sm text-blue-600 mt-1">
                          💡 If you pay less than the full amount, remaining will be added to next month.
                        </p>
                      </div>

                      {/* Fee Rows */}
<div className="divide-y divide-gray-100 overflow-y-auto max-h-[285px]">
  {(() => {
  const allFees = allCourseFeeSchedules.flatMap(s => s.fees);
  if (allFees.length === 0) {
    return (
      <div className="p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">All Fees Paid!</h3>
        <p className="text-gray-600">No pending fees for this student.</p>
      </div>
    );
  }
  const sorted = [...allFees].sort((a, b) => {
    if (a.isAdmissionFee && !b.isAdmissionFee) return -1;
    if (!a.isAdmissionFee && b.isAdmissionFee) return 1;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    return (a.monthNumber || 0) - (b.monthNumber || 0);
  });
  return sorted.map(fee => (
    <SingleFeeRow
      key={fee.id}
      fee={fee}
      setAllCourseFeeSchedules={setAllCourseFeeSchedules}
      toggleFeeSelection={toggleFeeSelection}
      handleAmountChange={handleAmountChange}
      formatCurrency={formatCurrency}
    />
  ));
})()}
</div>

                      {/* Total */}
                      <div className="p-4 bg-gray-50 border-t">
                        <div className="flex justify-between items-center">
                          <div className="font-bold text-lg">Total Selected (All Courses)</div>
                          <div className="font-bold text-lg text-blue-600">{formatCurrency(calculateMonthlyFeesTotal())}</div>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {allCourseFeeSchedules.reduce((total, s) => total + s.fees.filter(f => f.selected && f.payingAmount > 0).length, 0)} fee(s) selected across all courses
                        </div>
                      </div>

                    </div>
                    {/* END Fee Table */}

                    {/* Other Fees - Dynamic List */}
                    <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-700 flex items-center">
                          <Plus className="mr-2 h-5 w-5 text-blue-600" />
                          Additional Other Fees
                        </h3>
                        <button
                          type="button"
                          onClick={() => setOtherFeesList(prev => [
                            ...prev,
                            { feeId: '', feeName: '', amount: 0, description: '' }
                          ])}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Add Fee
                        </button>
                      </div>

                      {otherFeesList.length === 0 ? (
                        <div className="text-center py-5 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                          Click <strong>+ Add Fee</strong> to add additional charges
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {otherFeesList.map((item, index) => (
                            <div key={index} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                              <div className="flex items-end gap-3">
                                {/* Fee Type Dropdown */}
                                <div className="flex-1 min-w-0">
                                  <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Fee Type
                                  </label>
                                  <select
                                    value={item.feeId || ''}
                                    onChange={(e) => {
                                      const feeId = e.target.value;
                                      const found = otherFees.find(f => f.id === feeId);
                                      setOtherFeesList(prev => prev.map((it, i) =>
                                        i === index ? {
                                          ...it,
                                          feeId,
                                          feeName: found?.name || '',
                                          amount: found?.amount || 0,
                                          description: found?.description || ''
                                        } : it
                                      ));
                                    }}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    <option value="">Select a fee type</option>
                                    {otherFees.map(fee => (
                                      <option key={fee.id} value={fee.id}>
                                        {fee.name} — ₹{fee.amount}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Amount */}
                                <div className="w-28 flex-shrink-0">
                                  <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Amount (₹)
                                  </label>
                                  <input
                                    type="number"
                                    value={item.amount || 0}
                                    onChange={(e) => setOtherFeesList(prev => prev.map((it, i) =>
                                      i === index ? { ...it, amount: parseFloat(e.target.value) || 0 } : it
                                    ))}
                                    onWheel={(e) => e.target.blur()}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                    min="0"
                                    placeholder="0"
                                  />
                                </div>

                                {/* Remove Button */}
                                <button
                                  type="button"
                                  onClick={() => setOtherFeesList(prev => prev.filter((_, i) => i !== index))}
                                  className="mb-0.5 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                  title="Remove this fee"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              {/* Optional Description */}
                              <input
                                type="text"
                                value={item.description || ''}
                                onChange={(e) => setOtherFeesList(prev => prev.map((it, i) =>
                                  i === index ? { ...it, description: e.target.value } : it
                                ))}
                                placeholder="Description (optional)"
                                className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                              />
                            </div>
                          ))}

                          {/* Other fees subtotal */}
                          {otherFeesList.filter(f => parseFloat(f.amount) > 0).length > 0 && (
                            <div className="flex justify-between items-center pt-2 border-t border-gray-300 mt-1">
                              <span className="text-sm font-medium text-gray-600">
                                Other Fees Total ({otherFeesList.filter(f => parseFloat(f.amount) > 0).length} item{otherFeesList.filter(f => parseFloat(f.amount) > 0).length > 1 ? 's' : ''}):
                              </span>
                              <span className="font-bold text-green-700">
                                {formatCurrency(otherFeesList.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0))}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Remarks */}
                    {/* <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Remarks (Optional)</label>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows="3"
                        placeholder="Additional notes..."
                      />
                    </div> */}

                    {/* Payment Summary */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                      <div className="flex flex-col md:flex-row justify-between items-center">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">Payment Summary</h4>
                          <p className="text-gray-600">Review before submission</p>
                          <div className="mt-3 text-sm text-gray-700">
                            <div className="flex justify-between mb-1">
                              <span>Monthly Fees (All Courses):</span>
                              <span>{formatCurrency(calculateMonthlyFeesTotal())}</span>
                            </div>
                            {otherFeesList.filter(f => parseFloat(f.amount) > 0).length > 0 && (
                              <div className="flex justify-between mb-1">
                                <span>Other Fees ({otherFeesList.filter(f => parseFloat(f.amount) > 0).length}):</span>
                                <span>{formatCurrency(otherFeesList.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0))}</span>
                              </div>
                            )}
                            <div className="border-t border-gray-300 mt-2 pt-2 font-semibold">
                              <div className="flex justify-between">
                                <span>Total Amount:</span>
                                <span>{formatCurrency(calculateTotal())}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right mt-4 md:mt-0">
                          <div className="text-3xl font-bold text-green-600">{formatCurrency(calculateTotal())}</div>
                          <div className="text-sm text-gray-500">Total payable amount</div>
                        </div>
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(null)}
                        className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Clear Selection
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-semibold">Submit Payment</span>
                      </button>
                    </div>

                  </form>
                ) : (
                  <div className="text-center py-12 md:py-20">
                    <div className="inline-flex items-center justify-center h-20 w-20 bg-blue-100 rounded-full mb-6">
                      <User className="h-10 w-10 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Select a Student</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Choose a student from the list on the left to record their fee payment
                    </p>
                    <div className="mt-6 text-sm text-gray-500">
                      <ChevronLeft className="inline h-4 w-4 mr-1" />
                      Click on a student from the list
                      <ChevronRight className="inline h-4 w-4 ml-1" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pending Fees */}
        {activeTab === "pending" && (
  <div className="space-y-4">
 
    {/* ── Summary Cards ── */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl shadow p-5 border-l-4 border-red-500">
        <div className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Total Defaulters</div>
        <div className="text-3xl font-bold text-red-600 mt-1">{defaulterStudents.length}</div>
        <div className="text-xs text-gray-400 mt-1">out of {pendingStudents.length} pending students</div>
      </div>
      <div className="bg-white rounded-xl shadow p-5 border-l-4 border-orange-500">
        <div className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Critical (3+ Months)</div>
        <div className="text-3xl font-bold text-orange-600 mt-1">{criticalDefaulters.length}</div>
        <div className="text-xs text-gray-400 mt-1">students severely overdue</div>
      </div>
      <div className="bg-white rounded-xl shadow p-5 border-l-4 border-yellow-500">
        <div className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Total Overdue Amount</div>
        <div className="text-3xl font-bold text-yellow-700 mt-1">{formatCurrency(totalOverdueAmount)}</div>
        <div className="text-xs text-gray-400 mt-1">from all defaulter students</div>
      </div>
    </div>
 
    {/* ── Main Table ── */}
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
 
      {/* Header + Filter Toggle */}
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div>
    <h2 className="text-xl font-semibold flex items-center">
      <AlertCircle className="mr-3 h-6 w-6 text-red-600" />
      Students with Pending Fees
    </h2>
    <p className="text-gray-600 mt-1">Students who have unpaid fee installments</p>
  </div>
  <div className="flex items-center gap-3 self-start sm:self-center bg-gray-100 rounded-xl px-4 py-2">
    <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Filter Months:</span>
    <input
      type="range"
      min={1}
      max={6}
      step={1}
      value={defaulterMonthFilter}
      onChange={e => setDefaulterMonthFilter(Number(e.target.value))}
      className="w-32 accent-red-600 cursor-pointer"
    />
    <span className={`text-sm font-bold min-w-[36px] text-center ${
      defaulterMonthFilter >= 6 ? 'text-gray-700' : 'text-red-600'
    }`}>
      {defaulterMonthFilter >= 6 ? 'All' : `${defaulterMonthFilter}M`}
    </span>
  </div>
</div>
 
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
 
          {/* ── HEADER — fixed consistent padding px-4 across all columns ── */}
          <thead style={{ backgroundColor: '#1e3a5f' }}>
  <tr>
    <th style={{ minWidth: '40px'  }} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">#</th>
    <th style={{ minWidth: '120px' }} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Admission No</th>
    <th style={{ minWidth: '130px' }} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Date of Admission</th>
    <th style={{ minWidth: '160px' }} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Student Name</th>
    <th style={{ minWidth: '120px' }} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Faculty</th>
    <th style={{ minWidth: '150px' }} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Batch</th>
    <th style={{ minWidth: '150px' }} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Course</th>
    <th style={{ minWidth: '100px' }} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Monthly Fee</th>
    <th style={{ minWidth: '110px' }} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Paid (Monthly)</th>
    <th style={{ minWidth: '170px' }} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Overdue Months</th>
    <th style={{ minWidth: '110px' }} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Action</th>
  </tr>
</thead>
 
          <tbody className="bg-white divide-y divide-gray-200">
            {displayedDefaulters.map((student, idx) => {
              const overdueList = getOverdueMonths(student);
              const overdueAmt  = getOverdueAmount(overdueList);
              const severity    = getDefaulterSeverity(overdueList.length);
 
              // Paid from monthly fee schedule only (excludes admission fee)
              const monthlyPaidAmount = (student.originalData?.feeSchedule || [])
                .filter(f => f.status !== 'suspended')
                .reduce((sum, f) => sum + (f.paidAmount || 0), 0);
 
              // Faculty — check every possible field name your backend might use
              const faculty = student.faculty || student.originalData?.facultyAllot || '—';
              // Batch — check every possible field name
              const batch =
                student.batch ||
                student.originalData?.batch ||
                student.originalData?.batchTime ||
                o.batchName ||
                o.batchTiming ||
                o.timing ||
                '—';
 
              return (
                <tr
                  key={student._id}
                  className={`hover:bg-gray-50 transition-colors ${severity?.rowBg || ''}`}
                >
 
                  {/* # */}
                  <td className="px-4 py-4 text-sm text-gray-400 font-medium">
                    {idx + 1}
                  </td>
 
                  {/* Admission No */}
                  <td className="px-4 py-4">
                    <span className="inline-block bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1 rounded">
                      {student.admissionNo || '—'}
                    </span>
                  </td>

                  {/* Date of Admission */}
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-700 whitespace-nowrap">
                      {formatDate(student.dateOfJoining)}
                    </div>
                  </td>
 
                  {/* Student Name */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold ${
                        overdueList.length >= 3 ? 'bg-red-100 text-red-700'
                        : overdueList.length >= 1 ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                      }`}>
                        {(student.fullName || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{student.fullName}</div>
                        <div className="text-xs text-gray-400 truncate">{student.studentId || ''}</div>
                      </div>
                    </div>
                  </td>
 
                  {/* Faculty */}
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-700 truncate">{faculty}</div>
                  </td>
 
                  {/* Batch */}
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-700 truncate">{batch}</div>
                  </td>
 
                  {/* Course */}
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 truncate" title={student.course}>
                      {student.course}
                    </div>
                  </td>
 
                  {/* Monthly Fee */}
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(student.monthlyFee)}
                    </div>
                  </td>
 
                  {/* Paid (Monthly only) */}
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-green-600">
                      {formatCurrency(monthlyPaidAmount)}
                    </div>
                  </td>
 
 
                  {/* Overdue Months — clickable badge opens modal */}
                  <td className="px-4 py-4">
                    {overdueList.length === 0 ? (
                      <span className="text-xs text-gray-400">No overdue</span>
                    ) : (
                      <button
                        onClick={() => setOverdueModal({ student, overdueList })}
                        className="inline-flex flex-col items-start gap-0.5 text-left group cursor-pointer"
                      >
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold group-hover:opacity-75 transition-opacity ${severity.badgeBg} ${severity.badgeText}`}>
                          {overdueList.length} month{overdueList.length > 1 ? 's' : ''} overdue ↗
                        </span>
                        <span className="text-xs text-gray-500 truncate max-w-[140px]">
                          {overdueList.slice(0, 2).map(f => f.month || `M${f.monthNumber}`).join(', ')}
                          {overdueList.length > 2 ? `, +${overdueList.length - 2} more` : ''}
                        </span>
                        <span className="text-xs font-semibold text-red-600">
                          {formatCurrency(overdueAmt)} due
                        </span>
                      </button>
                    )}
                  </td>
 
                  {/* Action */}
                  <td className="px-4 py-4">
                    <button
                      onClick={() => { handleStudentSelect(student); setActiveTab("payFees"); }}
                      className={`px-4 py-2 text-white rounded-lg transition-colors font-medium text-sm whitespace-nowrap ${
                        overdueList.length >= 3
                          ? 'bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900'
                          : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
                      }`}
                    >
                      Collect Now
                    </button>
                  </td>
 
                </tr>
              );
            })}
          </tbody>
        </table>
 
        {displayedDefaulters.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center h-16 w-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Defaulters!</h3>
                   <p className="text-gray-600">
                        {defaulterMonthFilter >= 6
                         ? 'All students are up to date with their payments'
                        : `No students with exactly ${defaulterMonthFilter} overdue month(s)`}
                    </p>
          </div>
        )}
      </div>
    </div>
 
    {/* ── Overdue Months Modal ── */}
    {overdueModal && (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={() => setOverdueModal(null)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
 
          {/* Modal Header */}
          <div
            className="px-6 py-4 flex justify-between items-start"
            style={{ background: 'linear-gradient(135deg, #7B1C1C 0%, #b91c1c 100%)' }}
          >
            <div>
              <h3 className="text-white font-bold text-lg">Overdue Fee Details</h3>
              <p className="text-red-200 text-sm mt-0.5">
                {overdueModal.student.fullName} &nbsp;·&nbsp; {overdueModal.student.admissionNo}
              </p>
            </div>
            <button
              onClick={() => setOverdueModal(null)}
              className="text-white/70 hover:text-white text-2xl leading-none mt-0.5"
            >
              &times;
            </button>
          </div>
 
          {/* Student info strip */}
          <div className="bg-red-50 border-b border-red-100 px-6 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
            <span><span className="font-semibold">Course:</span> {overdueModal.student.course}</span>
            <span><span className="font-semibold">Batch:</span> {overdueModal.student.batch || '—'}</span>
            <span><span className="font-semibold">Monthly Fee:</span> {formatCurrency(overdueModal.student.monthlyFee)}</span>
          </div>
 
          {/* Months Table */}
          <div className="overflow-y-auto max-h-72">
            <table className="min-w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left   text-xs font-semibold text-gray-600 uppercase">#</th>
                  <th className="px-4 py-2.5 text-left   text-xs font-semibold text-gray-600 uppercase">Month</th>
                  <th className="px-4 py-2.5 text-left   text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                  <th className="px-4 py-2.5 text-right  text-xs font-semibold text-gray-600 uppercase">Total Fee</th>
                  <th className="px-4 py-2.5 text-right  text-xs font-semibold text-gray-600 uppercase">Paid</th>
                  <th className="px-4 py-2.5 text-right  text-xs font-semibold text-red-600   uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overdueModal.overdueList.map((fee, i) => {
                  const balance = fee.balanceAmount !== undefined
                    ? fee.balanceAmount
                    : (fee.totalFee || 0) - (fee.paidAmount || 0);
                  const paid  = fee.paidAmount || 0;
                  const total = fee.totalFee || 0;
                  const dueDate = fee.dueDate
                    ? new Date(fee.dueDate).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })
                    : '—';
 
                  return (
                    <tr
                      key={fee._id || i}
                      className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-red-50 transition-colors`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900">
                          {fee.month || `Month ${fee.monthNumber}`}
                        </div>
                        {fee.isExamMonth && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                            Exam Month
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{dueDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-700   text-right font-medium">{formatCurrency(total)}</td>
                      <td className="px-4 py-3 text-sm text-green-600  text-right font-medium">{formatCurrency(paid)}</td>
                      <td className="px-4 py-3 text-sm text-red-600    text-right font-bold"  >{formatCurrency(balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
 
          {/* Modal Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-bold text-red-700 text-base">
                {formatCurrency(getOverdueAmount(overdueModal.overdueList))}
              </span>
              &nbsp;total overdue across&nbsp;
              <span className="font-semibold">{overdueModal.overdueList.length}</span> month(s)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOverdueModal(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setOverdueModal(null);
                  handleStudentSelect(overdueModal.student);
                  setActiveTab("payFees");
                }}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
              >
                Collect Now
              </button>
            </div>
          </div>
 
        </div>
      </div>
    )}
 
  </div>
)}

        {/* Paid Fees - Monthly Collection View */}
        {activeTab === "paid" && (() => {
          const monthlyTotals = getMonthlyTotals();
          const grandTotal    = monthlyTotals.reduce((s, m) => s + m.filtered, 0);
          const totalTxns     = monthlyTotals.reduce((s, m) => s + m.count, 0);
          const bestMonth     = monthlyTotals.reduce((best, m) => m.filtered > best.filtered ? m : best, monthlyTotals[0]);

          return (
            <div className="space-y-4">

              {/* ── Year + Fee Type Controls ── */}
              <div className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
                {/* Year Navigator */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPaidYear(y => y - 1)}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <div className="text-2xl font-bold text-gray-800 min-w-[72px] text-center">{paidYear}</div>
                  <button
                    onClick={() => setPaidYear(y => y + 1)}
                    disabled={paidYear >= new Date().getFullYear()}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  </button>
                </div>

                {/* Fee Type Filter */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all',           label: 'All Fees',      color: 'bg-gray-800 text-white',     inactive: 'bg-gray-100 text-gray-600' },
                    { key: 'Monthly Fee',   label: 'Monthly Fee',   color: 'bg-blue-600 text-white',     inactive: 'bg-blue-50 text-blue-700' },
                    { key: 'Admission Fee', label: 'Admission Fee', color: 'bg-purple-600 text-white',   inactive: 'bg-purple-50 text-purple-700' },
                    { key: 'Exam Fee',      label: 'Exam Fee',      color: 'bg-yellow-500 text-white',   inactive: 'bg-yellow-50 text-yellow-700' },
                    { key: 'Other Fee',     label: 'Other Fee',     color: 'bg-green-600 text-white',    inactive: 'bg-green-50 text-green-700' },
                  ].map(({ key, label, color, inactive }) => (
                    <button
                      key={key}
                      onClick={() => setPaidFeeTypeFilter(key)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                        paidFeeTypeFilter === key ? color : inactive + ' hover:opacity-80'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Summary Cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
                  <div className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Total Collection {paidYear} Yearly</div>
                  <div className="text-3xl font-bold text-green-700 mt-1">{formatCurrency(grandTotal)}</div>
                  <div className="text-xs text-gray-400 mt-1">{paidFeeTypeFilter === 'all' ? 'All fee types' : paidFeeTypeFilter}</div>
                </div>
                <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
                  <div className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Total Transactions {paidYear} Yearly</div>
                  <div className="text-3xl font-bold text-blue-700 mt-1">{totalTxns}</div>
                  <div className="text-xs text-gray-400 mt-1">payments recorded</div>
                </div>
                <div className="bg-white rounded-xl shadow p-5 border-l-4 border-purple-500">
                  <div className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Best Month {paidYear} Yearly</div>
                  <div className="text-2xl font-bold text-purple-700 mt-1">{bestMonth?.filtered > 0 ? bestMonth.monthName : '—'}</div>
                  <div className="text-xs text-gray-400 mt-1">{bestMonth?.filtered > 0 ? formatCurrency(bestMonth.filtered) : 'No data yet'}</div>
                </div>
              </div>

              {/* ── Monthly Table ── */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold flex items-center">
                    <CheckCircle className="mr-3 h-6 w-6 text-green-600" />
                    Monthly Collection — {paidYear}
                  </h2>
                  <p className="text-gray-500 mt-1 text-sm">
                    {paidFeeTypeFilter === 'all' ? 'All fee types combined' : paidFeeTypeFilter + ' only'}
                  </p>
                </div>

                {monthlyLoading ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                  </div>
                ) : (
                  <div className="overflow-auto max-h-[560px]">
  <table className="min-w-full">
    <thead className="sticky top-0 z-10">
                        <tr style={{ backgroundColor: '#1e3a5f' }}>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase">#</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase">Month</th>
                          {paidFeeTypeFilter === 'all' && (
                            <>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase">Monthly Fee</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase">Admission Fee</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase">Exam Fee</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase">Other Fee</th>
                            </>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase">
                            {paidFeeTypeFilter === 'all' ? 'Grand Total' : 'Total'}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase">Txns</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {monthlyTotals.map((month, idx) => (
                          <tr
                            key={idx}
                            className={`transition-colors ${
                              month.filtered > 0
                                ? 'hover:bg-green-50 bg-white'
                                : 'bg-white hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-6 py-4 text-sm text-gray-400 font-medium">{idx + 1}</td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-900">{month.monthName}</div>
                              <div className="text-xs text-gray-400">{paidYear}</div>
                            </td>
                            {paidFeeTypeFilter === 'all' && (
                              <>
                                <td className="px-6 py-4 text-sm font-medium text-blue-700">
                                  {month.monthlyFee > 0 ? formatCurrency(month.monthlyFee) : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-purple-700">
                                  {month.admissionFee > 0 ? formatCurrency(month.admissionFee) : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-yellow-700">
                                  {month.examFee > 0 ? formatCurrency(month.examFee) : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-green-700">
                                  {month.otherFee > 0 ? formatCurrency(month.otherFee) : <span className="text-gray-300">—</span>}
                                </td>
                              </>
                            )}
                            <td className="px-6 py-4">
                              <span className={`text-sm font-bold ${month.filtered > 0 ? 'text-green-800' : 'text-gray-300'}`}>
                                {month.filtered > 0 ? formatCurrency(month.filtered) : '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {month.count > 0
                                ? <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{month.count}</span>
                                : <span className="text-gray-300 text-xs">—</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 border-t-2 border-gray-300">
                          <td colSpan={2} className="px-6 py-4 text-sm font-bold text-gray-800 uppercase tracking-wide">
                            Total {paidYear}
                          </td>
                          {paidFeeTypeFilter === 'all' && (
                            <>
                              <td className="px-6 py-4 text-sm font-bold text-blue-800">
                                {formatCurrency(monthlyTotals.reduce((s, m) => s + m.monthlyFee, 0))}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-purple-800">
                                {formatCurrency(monthlyTotals.reduce((s, m) => s + m.admissionFee, 0))}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-yellow-800">
                                {formatCurrency(monthlyTotals.reduce((s, m) => s + m.examFee, 0))}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-green-800">
                                {formatCurrency(monthlyTotals.reduce((s, m) => s + m.otherFee, 0))}
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 text-base font-bold text-green-900">
                            {formatCurrency(grandTotal)}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-700">{totalTxns}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

            </div>
          );
        })()}
      </div>

      {/* ── Fee Register ───────────────────────────────────────────── */}
{activeTab === "feeRegister" && (
  <div className="bg-white rounded-xl shadow-lg overflow-hidden">

    {/* Header */}
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-xl font-semibold flex items-center">
        <FileText className="mr-3 h-6 w-6 text-blue-600" />
        Fee Collection Register
      </h2>
      <p className="text-gray-600 mt-1">Complete record of every fee submitted</p>
    </div>

    {/* Filters bar */}
    <div className="p-4 bg-gray-50 border-b flex flex-wrap gap-3 items-end">
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Search Name</label>
        <input
          type="text"
          value={regSearchName}
          onChange={e => setRegSearchName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchFeeRegister()}
          placeholder="Search for names.."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-44 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">From</label>
        <input
          type="date"
          value={regFromDate}
          onChange={e => setRegFromDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">To</label>
        <input
          type="date"
          value={regToDate}
          onChange={e => setRegToDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <button
        onClick={fetchFeeRegister}
        className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-semibold transition-colors"
      >
        Search
      </button>

      <div className="ml-auto">
        <label className="text-xs font-medium text-gray-500 block mb-1">Search Receipt No.</label>
        <input
          type="text"
          value={regSearchReceipt}
          onChange={e => setRegSearchReceipt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchFeeRegister()}
          placeholder="Search Receipt No.."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-44 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
    </div>

    {/* Table */}
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr style={{ backgroundColor: '#7B1C1C' }}>
            {['Date', 'Receipt No', 'Roll No', 'Student Name', 'Course', 'Batch Time', 'Faculty', 'Fee Type', 'Amount' , 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {regLoading ? (
            <tr>
              <td colSpan={9} className="py-16 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              </td>
            </tr>
          ) : paginatedRegister.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-16 text-center text-gray-400">
                <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                No fee records found for the selected filters.
              </td>
            </tr>
          ) : (
            paginatedRegister.map((record, idx) => (
              <tr key={idx} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {formatDate(record.date)}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {record.receiptNo}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {record.rollNo}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                  {record.studentName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[140px]">
                  <div className="truncate" title={record.course}>{record.course}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {record.batchTime}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {record.faculty}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    record.feeType === 'Exam Fee'      ? 'bg-yellow-100 text-yellow-800' :
                    record.feeType === 'Monthly Fee'   ? 'bg-blue-100 text-blue-800'     :
                    record.feeType === 'Admission Fee' ? 'bg-purple-100 text-purple-800' :
                                                          'bg-green-100 text-green-800'
                                                       
                  }`}>
                    {record.feeType}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-green-700 whitespace-nowrap">
                  ₹{(record.amount || 0).toLocaleString('en-IN')}
                </td>

                <td className="px-4 py-3 whitespace-nowrap">
  <div className="flex gap-1">
    <button
      onClick={() => {
        setEditingRegRecord(record);
        setEditRegReceiptNo(record.receiptNo);
        setEditRegDate(record.date ? new Date(record.date).toISOString().split('T')[0] : '');
        setShowRegisterEditModal(true);
      }}
      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
      title="Edit Date & Receipt No"
    >
      <Edit size={13} />
    </button>
    <button
      onClick={() => handleRegisterDelete(record.receiptNo)}
      className="p-1.5 text-red-500 hover:bg-red-50 rounded"
      title="Delete Receipt (restores fees)"
    >
      <Trash2 size={13} />
    </button>
  </div>
</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    {/* Footer: total + pagination */}
    <div className="p-4 border-t bg-gray-50 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-gray-600">
        <span className="font-semibold text-gray-800">{feeRegisterData.length}</span> records &nbsp;|&nbsp;
        Total collected:&nbsp;
        <span className="font-bold text-green-700">
          ₹{feeRegisterData.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString('en-IN')}
        </span>
      </div>

      {totalRegPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            disabled={regPage === 1}
            onClick={() => setRegPage(p => p - 1)}
            className="p-1.5 border rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600">
            Page {regPage} / {totalRegPages}
          </span>
          <button
            disabled={regPage === totalRegPages}
            onClick={() => setRegPage(p => p + 1)}
            className="p-1.5 border rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>

  </div>
)}

{showRegisterEditModal && editingRegRecord && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
        <div>
          <h3 className="text-white font-bold">Edit Receipt</h3>
          <p className="text-white/70 text-xs mt-0.5">{editingRegRecord.studentName}</p>
        </div>
        <button onClick={() => setShowRegisterEditModal(false)} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Receipt Number</label>
          <input
            type="text"
            value={editRegReceiptNo}
            onChange={e => setEditRegReceiptNo(e.target.value.toUpperCase())}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Payment Date</label>
          <input
            type="date"
            value={editRegDate}
            onChange={e => setEditRegDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
          ⚠ Updates <strong>all entries</strong> with receipt <strong>{editingRegRecord.receiptNo}</strong>
        </div>
      </div>
      <div className="px-6 pb-6 flex justify-end gap-3">
        <button onClick={() => setShowRegisterEditModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Cancel</button>
        <button onClick={handleRegisterEdit} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Update</button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default StudentFees;