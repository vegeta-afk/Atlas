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
  Minus
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
  const [selectedOtherFee, setSelectedOtherFee] = useState(null);
  const [otherFeeAmount, setOtherFeeAmount] = useState(0);
  const [otherFeeDescription, setOtherFeeDescription] = useState("");

  // ✅ NEW: Course tab states
  const [selectedCourseTab, setSelectedCourseTab] = useState(0);
  const [allCourseFeeSchedules, setAllCourseFeeSchedules] = useState([]);

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

  const generateReceiptNo = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RCPT${year}${month}${day}${random}`;
  };

  useEffect(() => {
    fetchStudents();
    fetchOtherFees();
    setReceiptNo(generateReceiptNo());
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, []);

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
        const transformedStudents = (data.data || []).map(student => ({
          _id: student._id,
          studentId: student.studentId,
          admissionNo: student.admissionNo,
          fullName: student.fullName,
          fatherName: student.fatherName || "N/A",
          dateOfJoining: student.admissionDate || student.dateOfJoining,
          course: student.course || student.courseName || "N/A",
          batch: student.batch || "N/A",
          status: student.status || "Active",
          monthlyFee: student.monthlyFee || student.feeAmount || 0,
          paidAmount: student.paidAmount || 0,
          balanceAmount: student.balanceAmount || student.pendingAmount || 0,
          originalData: student
        }));
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
            totalAmount,
            pendingAmount: balanceAmount,
            balanceAmount,
            paidAmount,
            status: fee.status || (paidAmount > 0 ? "partial" : "pending"),
            selected: false,
            payingAmount: balanceAmount,
            isExamMonth: fee.isExamMonth || false,
            examFee: fee.examFee || 0,
            dueDate: fee.dueDate || calculateDueDate(studentData?.admissionDate, monthNumber)
          };
        });

        return processedFeeSchedule.sort((a, b) => a.monthNumber - b.monthNumber);
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
              totalAmount: fee.totalFee || 0,
              pendingAmount: fee.balanceAmount || fee.totalFee || 0,
              paidAmount: fee.paidAmount || 0,
              balanceAmount: fee.balanceAmount || fee.totalFee || 0,
              status: fee.status || "pending",
              selected: false,
              payingAmount: fee.balanceAmount || fee.totalFee || 0,
              isExamMonth: fee.isExamMonth || false,
              examFee: fee.examFee || 0,
              dueDate: fee.dueDate || null,
              additionalCourseIndex: acIndex
            }));

          schedules.push({ courseName: ac.courseName, fees });
        });
      }

      setAllCourseFeeSchedules(schedules);
      setSelectedStudent({ ...student, feeSchedule: primaryFees || [] });
      setReceiptNo(generateReceiptNo());
    } catch (error) {
      console.error("Error selecting student:", error);
      const primaryFees = await fetchStudentFeeSchedule(student._id, student.originalData || student);
      setAllCourseFeeSchedules([{ courseName: student.course || "Primary Course", fees: primaryFees || [] }]);
      setSelectedStudent({ ...student, feeSchedule: primaryFees || [] });
      setReceiptNo(generateReceiptNo());
    }
  };

  // ✅ UPDATED: Uses updateCurrentFees
  const toggleFeeSelection = (feeId) => {
    const updatedFees = getCurrentFees().map(fee => {
      if (fee.id === feeId) {
        const newSelected = !fee.selected;
        return { ...fee, selected: newSelected, payingAmount: newSelected ? (fee.pendingAmount || 0) : 0 };
      }
      return fee;
    });
    updateCurrentFees(updatedFees);
  };

  // ✅ UPDATED: Uses updateCurrentFees
  const handleAmountChange = (feeId, amount) => {
    const updatedFees = getCurrentFees().map(fee => {
      if (fee.id === feeId) {
        const maxAmount = fee.pendingAmount || 0;
        return { ...fee, payingAmount: Math.min(Math.max(0, amount), maxAmount) };
      }
      return fee;
    });
    updateCurrentFees(updatedFees);
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
    const otherFeeTotal = parseFloat(otherFeeAmount) || 0;
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

      const paymentData = {
        studentId: selectedStudent._id,
        months: selectedFees.map(fee => fee.monthNumber),
        amounts: selectedFees.map(fee => fee.payingAmount),
        additionalCourseIndices: selectedFees.map(fee => fee.additionalCourseIndex ?? null),
        paymentType: "multiple",
        paymentDate,
        receiptNo,
        paymentMode,
        remarks: remarks || "",
        otherFees: otherFeeAmount > 0 ? [{
          feeId: selectedOtherFee,
          feeName: otherFees.find(f => f.id === selectedOtherFee)?.name || "Other Fee",
          amount: otherFeeAmount,
          description: otherFeeDescription
        }] : [],
        fineAmount: parseFloat(fineAmount || 0),
        fineReason: fineAmount > 0 ? fineReason : ""
      };

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
          setSelectedOtherFee(null);
          setOtherFeeAmount(0);
          setOtherFeeDescription("");

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
        const transformedStudents = (data.data || []).map(student => ({
          _id: student._id,
          studentId: student.studentId,
          admissionNo: student.admissionNo,
          fullName: student.fullName,
          fatherName: student.fatherName || "N/A",
          dateOfJoining: student.admissionDate || student.dateOfJoining,
          course: student.course || "N/A",
          batch: student.batch || "N/A",
          status: student.status || "Active",
          monthlyFee: student.monthlyFee || 0,
          paidAmount: student.paidAmount || 0,
          balanceAmount: student.balanceAmount || 0,
          originalData: student
        }));
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

  const pendingStudents = students.filter(s => s.balanceAmount > 0);
  const paidStudents = students.filter(s => s.balanceAmount === 0);

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
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <div className="text-sm text-gray-500">Roll No</div>
                              <div className="font-bold text-gray-900">{selectedStudent.admissionNo}</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">Student Name</div>
                              <div className="font-bold text-gray-900">{selectedStudent.fullName}</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">Batch</div>
                              <div className="font-medium">{selectedStudent.batch}</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">Status</div>
                              <span className={`px-2 py-1 text-xs rounded-full ${selectedStudent.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {selectedStudent.status}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <div className="text-sm text-gray-500">D.O.J</div>
                              <div className="font-medium">{formatDate(selectedStudent.dateOfJoining)}</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">Father</div>
                              <div className="font-medium">{selectedStudent.fatherName}</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">Course</div>
                              <div className="font-medium">{selectedStudent.course}</div>
                            </div>
                          </div>
                        </div>
                        <button type="button" onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600 ml-4">
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* ✅ Fee List with Course Tabs */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">

                      {/* ✅ Course Tabs - only show if multiple courses */}
                      {allCourseFeeSchedules.length > 1 && (
                        <div className="flex border-b bg-gray-50 overflow-x-auto">
                          {allCourseFeeSchedules.map((schedule, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedCourseTab(idx)}
                              className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                                selectedCourseTab === idx
                                  ? "border-blue-600 text-blue-600 bg-white"
                                  : "border-transparent text-gray-500 hover:text-gray-700"
                              }`}
                            >
                              <span>{idx === 0 ? "📚" : "➕"}</span>
                              <span>{schedule.courseName}</span>
                              {schedule.fees.filter(f => f.selected).length > 0 && (
                                <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                                  {schedule.fees.filter(f => f.selected).length}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="bg-gray-50 p-4 border-b">
                        <h3 className="font-semibold text-gray-700">Select Fees to Pay</h3>
                        <p className="text-sm text-gray-500">Check the fees you want to pay. Enter amount for each selected fee.</p>
                        <p className="text-sm text-blue-600 mt-1">
                          💡 If you pay less than the full amount, remaining will be added to next month.
                        </p>
                      </div>

                      <div className="divide-y divide-gray-100">
                        {getCurrentFees().length === 0 ? (
                          <div className="p-8 text-center">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900">All Fees Paid!</h3>
                            <p className="text-gray-600">No pending fees for this course.</p>
                          </div>
                        ) : (
                          getCurrentFees().map((fee) => (
                            <div key={fee.id} className={`p-4 hover:bg-gray-50 ${fee.isExamMonth ? 'bg-yellow-50' : ''}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <input
                                    type="checkbox"
                                    checked={fee.selected || false}
                                    onChange={() => toggleFeeSelection(fee.id)}
                                    className="h-5 w-5 rounded text-blue-600 cursor-pointer"
                                  />
                                  <div>
                                    <div className="font-medium text-gray-900">{fee.month}</div>
                                    <div className="text-sm text-gray-600">{fee.description}</div>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                      <span>Type: {fee.type}</span>
                                      {fee.isExamMonth && (
                                        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Exam Month</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
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
                              </div>

                              {/* Amount Input - shows when checked */}
                              {fee.selected && (
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                  <div className="flex items-center space-x-4">
                                    <div className="flex-1">
                                      <div className="text-sm text-gray-600 mb-2">Paying for {fee.month}</div>
                                      <div className="flex items-center space-x-4">
                                        <div className="flex-1">
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Pay</label>
                                          <input
                                            type="number"
                                            value={fee.payingAmount || 0}
                                            onChange={(e) => handleAmountChange(fee.id, parseFloat(e.target.value) || 0)}
                                            onWheel={(e) => e.target.blur()}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
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

                    {/* Payment Details */}
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
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Fine Amount (₹)</label>
                        <div className="relative">
                          <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                          <input
                            type="number"
                            value={fineAmount}
                            onChange={(e) => setFineAmount(parseFloat(e.target.value) || 0)}
                            onWheel={(e) => e.target.blur()}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            placeholder="0"
                          />
                        </div>
                        {fineAmount > 0 && (
                          <div className="mt-2">
                            <input
                              type="text"
                              value={fineReason}
                              onChange={(e) => setFineReason(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                              placeholder="Reason for fine"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Other Fees */}
                    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                      <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
                        <Plus className="mr-2 h-5 w-5 text-blue-600" />
                        Additional Other Fees
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700">Select Other Fee</label>
                          <select
                            value={selectedOtherFee || ""}
                            onChange={(e) => {
                              const feeId = e.target.value;
                              const selectedFee = otherFees.find(fee => fee.id === feeId);
                              setSelectedOtherFee(feeId);
                              if (selectedFee) {
                                setOtherFeeAmount(selectedFee.amount);
                                setOtherFeeDescription(selectedFee.description);
                              } else {
                                setOtherFeeAmount(0);
                                setOtherFeeDescription("");
                              }
                            }}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select a fee type</option>
                            {otherFees.map(fee => (
                              <option key={fee.id} value={fee.id}>{fee.name} - ₹{fee.amount}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700">Amount (₹)</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                            <input
                              type="number"
                              value={otherFeeAmount}
                              onChange={(e) => setOtherFeeAmount(parseFloat(e.target.value) || 0)}
                              onWheel={(e) => e.target.blur()}
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="Enter amount"
                              min="0"
                            />
                          </div>
                          <div className="mt-2">
                            <input
                              type="text"
                              value={otherFeeDescription}
                              onChange={(e) => setOtherFeeDescription(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              placeholder="Optional description"
                            />
                          </div>
                        </div>
                      </div>
                      {otherFeeAmount > 0 && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-gray-900">
                                {otherFees.find(f => f.id === selectedOtherFee)?.name || "Other Fee"}
                              </div>
                              <div className="text-sm text-gray-600">{otherFeeDescription || "Additional charge"}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600 text-lg">₹{otherFeeAmount}</div>
                              <button
                                type="button"
                                onClick={() => { setSelectedOtherFee(null); setOtherFeeAmount(0); setOtherFeeDescription(""); }}
                                className="text-sm text-red-600 hover:text-red-800 mt-1"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Remarks (Optional)</label>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows="3"
                        placeholder="Additional notes..."
                      />
                    </div>

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
                            {otherFeeAmount > 0 && (
                              <div className="flex justify-between mb-1">
                                <span>Other Fee:</span>
                                <span>{formatCurrency(otherFeeAmount)}</span>
                              </div>
                            )}
                            {fineAmount > 0 && (
                              <div className="flex justify-between mb-1">
                                <span>Fine:</span>
                                <span className="text-red-600">{formatCurrency(fineAmount)}</span>
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
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold flex items-center">
                <AlertCircle className="mr-3 h-6 w-6 text-red-600" />
                Students with Pending Fees
              </h2>
              <p className="text-gray-600 mt-1">Students who have unpaid fee installments</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Student Details</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Course</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Monthly Fee</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Paid Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Balance Due</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingStudents.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                            <User className="h-6 w-6 text-red-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{student.fullName}</div>
                            <div className="text-sm text-gray-500">{student.admissionNo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 max-w-xs truncate">{student.course}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(student.monthlyFee)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">{formatCurrency(student.paidAmount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-red-600">{formatCurrency(student.balanceAmount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => { handleStudentSelect(student); setActiveTab("payFees"); }}
                          className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-colors font-medium"
                        >
                          Collect Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pendingStudents.length === 0 && (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center h-16 w-16 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Fees</h3>
                  <p className="text-gray-600">All students have cleared their fee payments</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Paid Fees */}
        {activeTab === "paid" && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold flex items-center">
                <CheckCircle className="mr-3 h-6 w-6 text-green-600" />
                Students with Paid Fees
              </h2>
              <p className="text-gray-600 mt-1">Students who have completed their fee payments</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Student Details</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Course</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Monthly Fee</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Total Paid</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paidStudents.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <User className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{student.fullName}</div>
                            <div className="text-sm text-gray-500">{student.admissionNo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 max-w-xs truncate">{student.course}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(student.monthlyFee)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-green-600">{formatCurrency(student.paidAmount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Fully Paid</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paidStudents.length === 0 && (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center h-16 w-16 bg-yellow-100 rounded-full mb-4">
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Paid Records</h3>
                  <p className="text-gray-600">No students have completed their fee payments yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentFees;