import React, { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle,
  Plus,
  FileText,
  Printer,
  CreditCard,
  CalendarDays,
  RefreshCw,
  Download,
  Receipt,
  Edit,
  Trash2,
  MoreVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const FeeManagement = ({ studentId, student, course, additionalCourseIndex }) => {
  const isAdditionalCourse = additionalCourseIndex !== undefined && additionalCourseIndex !== null;
  const additionalCourseData = isAdditionalCourse ? student?.additionalCourses?.[additionalCourseIndex] : null;
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(false);
    const [courseShortNames, setCourseShortNames] = useState({});
  const [otherFeesOptions, setOtherFeesOptions] = useState([]);
    const [paymentData, setPaymentData] = useState({
    monthNumber: "",
    amount: "",
    monthlyAmount: "",
    examAmount: "",
    otherAmount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    receiptNo: "",
    paymentMode: "cash",
    remarks: "",
    action: "add", // 'add' or 'edit'
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendData, setSuspendData] = useState({ monthNumber: null, month: "", reason: "" });
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showReceiptTable, setShowReceiptTable] = useState(false); // STEP 1
    const [monthManagementData, setMonthManagementData] = useState({
    action: "add", // 'add' or 'edit'
    monthNumber: "",
    monthName: "",
    baseFee: "",
    isExamMonth: false,
    examFee: "",
    hasOtherFee: false,
    otherFeeId: "",
    otherFeeName: "",
    otherFeeAmount: "",
    dueDate: "",
    count: 1,
  });

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [showFeeRegister, setShowFeeRegister] = useState(false);

  const [verifiedPayments, setVerifiedPayments] = useState({});
  const [showOtherFeeDateModal, setShowOtherFeeDateModal] = useState(false);
  const [otherFeeDateEdit, setOtherFeeDateEdit] = useState({ monthNumber: null, date: "", label: "" });

    useEffect(() => {
  if (studentId) {
    fetchStudentFees();
    fetchCourseShortNames();
    fetchOtherFeesOptions();
  }
}, [studentId, student?.admissionDate]);

const fetchCourseShortNames = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/api/courses`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      const map = {};
      (data.data || []).forEach(course => {
        map[course.courseFullName] = course.courseShortName || 
          course.courseFullName.split(' ').map(w => w[0]).join('');
      });
      setCourseShortNames(map);
    }
  } catch (err) {
    console.error("Error fetching course short names:", err);
  }
};

const fetchOtherFeesOptions = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/api/setup`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success && data.data && data.data.fees) {
      const transformed = data.data.fees
        .filter(fee => fee.isActive !== false)
        .map(fee => ({ id: fee._id, name: fee.feeName, amount: fee.amount || 0 }));
      setOtherFeesOptions(transformed);
    }
  } catch (err) {
    console.error("Error fetching other fees options:", err);
  }
};

  const processAdditionalCourseFeeSchedule = (feeSchedule) => {
  if (!feeSchedule || !Array.isArray(feeSchedule)) return [];
  return feeSchedule.map((fee, index) => {
    const monthNum = fee.monthNumber || index + 1;
    const examFee = fee.examFee || 0;
    const totalFee = fee.totalFee || 0;
    const baseFee = fee.baseFee || (totalFee - examFee);
    const paidAmount = fee.paidAmount || 0;
    const balanceAmount = fee.balanceAmount !== undefined ? fee.balanceAmount : totalFee - paidAmount;
    return {
      ...fee,
      month: fee.month || `Month ${monthNum}`,
      monthNumber: monthNum,
      baseFee, monthlyFee: baseFee, amount: baseFee,
      examFee, isExamMonth: fee.isExamMonth || false,
      totalFee, paidAmount, balanceAmount, pendingAmount: balanceAmount,
      dueDate: fee.dueDate || calculateDueDate(monthNum - 1),
      status: fee.status || (paidAmount === 0 ? "pending" : paidAmount >= totalFee ? "paid" : "partial"),
    };
  });
};

  // Function to calculate month names based on admission date (FIXED)
const calculateMonthNames = useMemo(() => {
  if (!student?.admissionDate) return [];
  
  const admissionDate = new Date(student.admissionDate);
  const courseDuration = course?.duration || 12;
  const monthNames = [];
  
  // Validate admission date
  if (isNaN(admissionDate.getTime())) {
    console.error("Invalid admission date:", student.admissionDate);
    return [];
  }
  
  // For 15 or 18 month courses, if admission is after 16th, start from next month
  const shouldStartFromNextMonth = 
    (course?.duration === 15 || course?.duration === 18) && 
    admissionDate.getDate() > 16;
  
  let startDate = new Date(admissionDate);
  if (shouldStartFromNextMonth) {
    startDate.setMonth(startDate.getMonth() + 1);
    startDate.setDate(1); // Start from 1st of next month
  }
  
  for (let i = 0; i < courseDuration; i++) {
    const monthDate = new Date(startDate);
    monthDate.setMonth(startDate.getMonth() + i);
    
    // Validate month date
    if (isNaN(monthDate.getTime())) {
      console.error(`Invalid month date calculation for month ${i}`);
      monthNames.push(`Month ${i + 1}`);
    } else {
      const monthName = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      monthNames.push(monthName);
    }
  }
  
  return monthNames;
}, [student?.admissionDate, course?.duration]);




// ============================================
// PROCESSOR FOR NEW STUDENTS (regular course)
// ============================================
const processNewStudentFeeSchedule = (feeSchedule) => {
  if (!feeSchedule || !Array.isArray(feeSchedule)) return [];
  
  return feeSchedule.map((fee, index) => {
    const monthNum = fee.monthNumber || index + 1;
    
    let monthName = fee.month;
    if (!monthName && student?.admissionDate) {
      try {
        const admissionDate = new Date(student.admissionDate);
        const monthDate = new Date(admissionDate);
        monthDate.setMonth(admissionDate.getMonth() + (monthNum - 1));
        monthName = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      } catch (error) {
        monthName = `Month ${monthNum}`;
      }
    }
    
    // For new students, we CAN use course defaults if needed
    const baseFee = fee.baseFee ?? fee.monthlyFee ?? fee.amount ?? course?.monthlyFee ?? 0;
    const shouldBeExamMonth = checkExamMonth(monthNum);
    const isExamMonth = fee.isExamMonth ?? shouldBeExamMonth;
    const examFee = fee.examFee ?? (isExamMonth ? (course?.examFee || 0) : 0);
    const totalFee = fee.totalFee ?? (baseFee + examFee);
    
    return {
      ...fee,
      month: monthName || `Month ${monthNum}`,
      monthNumber: monthNum,
      dueDate: fee.dueDate || calculateDueDate(monthNum - 1),
      isExamMonth,
      baseFee,
      monthlyFee: baseFee,
      amount: baseFee,
      examFee,
      totalFee,
      paidAmount: fee.paidAmount ?? 0,
      balanceAmount: fee.balanceAmount ?? (totalFee - (fee.paidAmount ?? 0)),
      pendingAmount: fee.pendingAmount ?? (totalFee - (fee.paidAmount ?? 0)),
      status: fee.status || ((fee.paidAmount ?? 0) === 0 ? "pending" : 
                           (fee.paidAmount ?? 0) >= totalFee ? "paid" : "partial")
    };
  });
};

// ============================================
// PROCESSOR FOR CONVERTED STUDENTS
// ============================================
const processConvertedStudentFeeSchedule = (feeSchedule) => {
  if (!feeSchedule || !Array.isArray(feeSchedule)) return [];

  return feeSchedule.map((fee, index) => {
    const monthNum = fee.monthNumber || index + 1;

    let monthName = fee.month;
    if (!monthName && student?.admissionDate) {
      try {
        const admissionDate = new Date(student.admissionDate);
        const monthDate = new Date(admissionDate);
        monthDate.setDate(1);
        monthDate.setMonth(admissionDate.getMonth() + (monthNum - 1));
        monthName = monthDate.toLocaleString("en-US", { month: "long", year: "numeric" });
      } catch {
        monthName = `Month ${monthNum}`;
      }
    }

    // ✅ DB is now correct — trust these fields directly
    const examFee    = fee.examFee    || 0;
    const totalFee   = fee.totalFee   || 0;
    const isExamMonth = fee.isExamMonth || false;
    const baseFee    = totalFee - examFee; // always correct derivation

    const paidAmount    = fee.paidAmount    || 0;
    const balanceAmount = fee.balanceAmount !== undefined ? fee.balanceAmount : totalFee - paidAmount;

    return {
      ...fee,
      month:         monthName || `Month ${monthNum}`,
      monthNumber:   monthNum,
      dueDate:       fee.dueDate || calculateDueDate(monthNum - 1),
      baseFee,
      monthlyFee:    baseFee,
      amount:        baseFee,
      examFee,
      isExamMonth,
      totalFee,
      paidAmount,
      balanceAmount,
      pendingAmount: balanceAmount,
      status: fee.status || (paidAmount === 0 ? "pending" : paidAmount >= totalFee ? "paid" : "partial"),
    };
  });
};


// ============================================
// PROCESSOR FOR SCHOLARSHIP STUDENTS
// ============================================
const processScholarshipStudentFeeSchedule = (feeSchedule, studentData) => {
  if (!feeSchedule || !Array.isArray(feeSchedule)) return [];

  return feeSchedule.map((fee, index) => {
    const monthNum = fee.monthNumber || index + 1;

    // ✅ Trust baseFee/monthlyFee stored in DB (now correctly set by fixed feeGenerator)
    // Only fall back to scholarship data, NEVER fall back to course.monthlyFee
    const baseFee = fee.baseFee ?? 
                    fee.monthlyFee ?? 
                    fee.amount ?? 
                    studentData?.scholarship?.finalMonthlyFee ?? 
                    studentData?.monthlyFee ?? 
                    0;   // ← No more course?.monthlyFee fallback!

    let monthName = fee.month;
    if (!monthName && student?.admissionDate) {
      try {
        const admissionDate = new Date(student.admissionDate);
        const monthDate = new Date(admissionDate);
        monthDate.setMonth(admissionDate.getMonth() + (monthNum - 1));
        monthName = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      } catch { monthName = `Month ${monthNum}`; }
    }

    const isExamMonth = fee.isExamMonth ?? checkExamMonth(monthNum);
    const examFee = fee.examFee ?? (isExamMonth ? (course?.examFee || 0) : 0);
    const totalFee = fee.totalFee ?? (baseFee + examFee);
    const paidAmount = fee.paidAmount ?? 0;
    const balanceAmount = fee.balanceAmount ?? (totalFee - paidAmount);

    return {
      ...fee,
      month: monthName || `Month ${monthNum}`,
      monthNumber: monthNum,
      dueDate: fee.dueDate || calculateDueDate(monthNum - 1),
      isExamMonth,
      baseFee,
      monthlyFee: baseFee,   // ✅ Correct discounted value
      amount: baseFee,
      examFee,
      totalFee,
      paidAmount,
      balanceAmount,
      pendingAmount: balanceAmount,
      status: fee.status || (paidAmount === 0 ? "pending" : paidAmount >= totalFee ? "paid" : "partial")
    };
  });
};
// ============================================
// MAIN PROCESSOR (AUTO-DETECTS STUDENT TYPE)
// ============================================
const processFeeSchedule = (feeSchedule, apiStudent = null) => {
  if (!feeSchedule || !Array.isArray(feeSchedule)) return [];

  const studentData = apiStudent || student;
  
  // Check for scholarship FIRST
  const hasScholarship = studentData?.hasScholarship || studentData?.scholarship?.applied || false;
  const hasConversionHistory = studentData?.conversionHistory?.length > 0;
  const hasConvertedMonths = feeSchedule.some(f => f.remarks?.includes("Converted"));

  console.log("🔍 Detection:", { 
    hasScholarship, 
    hasConversionHistory, 
    hasConvertedMonths,
    scholarshipData: studentData?.scholarship
  });

  // Priority order:
  // 1. Scholarship students
  if (hasScholarship) {
    return processScholarshipStudentFeeSchedule(feeSchedule, studentData);
  }
  // 2. Converted students
  else if (hasConversionHistory || hasConvertedMonths) {
    return processConvertedStudentFeeSchedule(feeSchedule);
  } 
  // 3. Regular new students
  else {
    return processNewStudentFeeSchedule(feeSchedule);
  }
};


// Helper function to calculate due date (15th of the month) - FIXED
const calculateDueDate = (monthsFromAdmission) => {
  if (!student?.admissionDate) {
    // If no admission date, use today's month and set to 15th
    const defaultDate = new Date();
    defaultDate.setDate(15);
    return defaultDate.toISOString().split('T')[0];
  }
  
  try {
    const admissionDate = new Date(student.admissionDate);
    
    // Validate admission date
    if (isNaN(admissionDate.getTime())) {
      throw new Error("Invalid admission date");
    }
    
    const dueDate = new Date(admissionDate);
    
    // Add months safely
    dueDate.setMonth(admissionDate.getMonth() + monthsFromAdmission);
    
    // Set to 15th of the month
    dueDate.setDate(15);
    
    // Validate the result
    if (isNaN(dueDate.getTime())) {
      throw new Error("Invalid date calculation");
    }
    
    return dueDate.toISOString().split('T')[0];
  } catch (error) {
    console.error("Error calculating due date:", error);
    // Fallback: 15th of next month
    const fallbackDate = new Date();
    fallbackDate.setMonth(fallbackDate.getMonth() + monthsFromAdmission + 1);
    fallbackDate.setDate(15);
    return fallbackDate.toISOString().split('T')[0];
  }
};

  // Helper function to determine if month is an exam month
  const isExamMonth = (monthNumber) => {
  if (!course?.examMonths) return false;
  
  try {
    // Handle different formats: "1,3,5" or "[1,3,5]" or "1, 3, 5"
    let examMonthsStr = course.examMonths.toString().trim();
    
    // Remove brackets if present
    examMonthsStr = examMonthsStr.replace(/[\[\]]/g, '');
    
    // Split and parse
    const examMonths = examMonthsStr
      .split(',')
      .map(num => parseInt(num.trim()))
      .filter(num => !isNaN(num));
    
    return examMonths.includes(parseInt(monthNumber));
  } catch (error) {
    console.error("Error checking exam month:", error);
    return false;
  }
};

// Helper function to check if a month should be an exam month based on course
const checkExamMonth = (monthNumber) => {
  if (!course?.examMonths) return false;
  
  try {
    const examMonthsStr = course.examMonths.toString().trim();
    // Remove brackets if present
    const cleanStr = examMonthsStr.replace(/[\[\]]/g, '');
    
    const examMonths = cleanStr
      .split(',')
      .map(num => parseInt(num.trim()))
      .filter(num => !isNaN(num));
    
    return examMonths.includes(parseInt(monthNumber));
  } catch (error) {
    console.error("Error checking exam month:", error);
    return false;
  }
};
  

const cleanFeeForBackend = (fee) => ({
  ...(fee._id && { _id: fee._id }),
  month: fee.month || "",
  monthNumber: fee.monthNumber || 0,
  baseFee: fee.baseFee || fee.monthlyFee || fee.amount || 0,
  additionalFees: fee.additionalFees || [],
  totalFee: fee.totalFee || 0,
  paidAmount: fee.paidAmount || 0,
  monthlyPaid: fee.monthlyPaid || 0,
  examPaid: fee.examPaid || 0, 
  balanceAmount: fee.balanceAmount || 0,
  status: fee.status || "pending",
  carryForwardAmount: fee.carryForwardAmount || 0,
  dueDate: fee.dueDate || null,
  promisedDate: fee.promisedDate || null,
  finesPaused: fee.finesPaused || false,
  fines: fee.fines || { amount: 0, reason: "", waived: false },
  paymentDate: fee.paymentDate || null,
  receiptNo: fee.receiptNo || "",
  isExamMonth: fee.isExamMonth || false,
  examFee: fee.examFee || 0,
  otherFeeId: fee.otherFeeId || "",
  otherFeeName: fee.otherFeeName || "",
  otherFeeAmount: fee.otherFeeAmount || 0,
  otherFeePaid: fee.otherFeePaid || 0,
  otherFeeDate: fee.otherFeeDate || null,
  paymentMode: fee.paymentMode || "",
  paymentId: fee.paymentId || "",
  submittedByName: fee.submittedByName || "",
  remarks: fee.remarks || ""
});

const calcTotals = (schedule) => ({
  totalCourseFee: schedule
    .filter(f => f.status !== "suspended")
    .reduce((s, f) => s + ((f.baseFee || 0) + (f.isExamMonth ? (f.examFee || 0) : 0)), 0),
  paidAmount:     schedule.reduce((s, f) => s + (f.paidAmount   || 0), 0),
  balanceAmount:  schedule
    .filter(f => f.status !== "suspended")
    .reduce((s, f) => s + (f.balanceAmount || 0), 0),
});

  useEffect(() => {
    if (studentId) {
      fetchStudentFees();
    }
  }, [studentId, student?.admissionDate]);

    useEffect(() => {
  if (studentId) {
    try {
      const saved = localStorage.getItem(`verifiedPayments_${studentId}`);
      if (saved) setVerifiedPayments(JSON.parse(saved));
    } catch {}
  }
}, [studentId]);



 const fetchStudentFees = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/api/students/${studentId}/fees`, {
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
    });

    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return;
    }

    if (isAdditionalCourse && additionalCourseData) {
      const feeSchedule = processAdditionalCourseFeeSchedule(additionalCourseData.feeSchedule || []);
      const totalCourseFee = feeSchedule.reduce((s, f) => s + (f.totalFee || 0), 0);
      const paidAmount = feeSchedule.reduce((s, f) => s + (f.paidAmount || 0), 0);
      setFeeData({
        student: { studentId: student.studentId, fullName: student.fullName, course: additionalCourseData.courseName, admissionDate: student.admissionDate },
        course: { courseFullName: additionalCourseData.courseName, monthlyFee: additionalCourseData.monthlyFee, examFee: additionalCourseData.examFee, duration: additionalCourseData.duration },
        summary: {
          totalCourseFee, paidAmount, balanceAmount: totalCourseFee - paidAmount,
          admissionFee: 0, monthlyFee: additionalCourseData.monthlyFee, examFee: additionalCourseData.examFee,
          totalInstallments: feeSchedule.length,
          paidInstallments: feeSchedule.filter(f => f.status === "paid").length,
          partialInstallments: feeSchedule.filter(f => f.status === "partial").length,
          pendingInstallments: feeSchedule.filter(f => f.status === "pending").length,
          overdueInstallments: feeSchedule.filter(f => f.status === "overdue").length,
          totalMonthlyFees: feeSchedule.reduce((s, f) => s + (f.baseFee || 0), 0),
          totalExamFees: feeSchedule.reduce((s, f) => s + (f.examFee || 0), 0),
        },
        feeSchedule,
      });
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const data = await response.json();

    if (data.success) {
  const apiStudent = data.data.student;
  const processedSchedule = processFeeSchedule(data.data.feeSchedule || [], apiStudent);
  
  const totalCourseFee = processedSchedule
  .filter(f => f.status !== "suspended")
  .reduce((s, f) => s + (f.baseFee || 0) + (f.isExamMonth ? (f.examFee || 0) : 0), 0);
  const paidAmount = processedSchedule.reduce((s, f) => s + (f.paidAmount || 0), 0);

    const processedData = {
    ...data.data,
    feeSchedule: processedSchedule,
    summary: {
      ...data.data.summary,
      totalCourseFee,
      paidAmount,
      balanceAmount: totalCourseFee - paidAmount,
      totalMonthlyFees: processedSchedule
  .filter(f => f.status !== "suspended")
  .reduce((s, f) => s + (f.baseFee || 0), 0),
totalExamFees: processedSchedule
  .filter(f => f.status !== "suspended")
  .reduce((s, f) => s + (f.isExamMonth ? (f.examFee || 0) : 0), 0),
monthlyPaidTotal: processedSchedule
  .reduce((s, f) => s + (f.isExamMonth ? (f.monthlyPaid || 0) : Math.max(0, (f.paidAmount || 0) - (f.otherFeePaid || 0))), 0),
otherFeePaidTotal: processedSchedule
  .reduce((s, f) => s + (f.otherFeePaid || 0), 0),
    }
  };
  setFeeData(processedData);
}
  } catch (error) {
    console.error("Error fetching fees:", error);
    createFeeDataFromProps();
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

 const createFeeDataFromProps = () => {
  if (student && course) {
    // Use the student's feeSchedule directly - this should have the updated values
    const rawFeeSchedule = student.feeSchedule || [];
    
    // Process fee schedule with month names
    const processedFeeSchedule = processFeeSchedule(rawFeeSchedule);
    
    // Calculate totals from the processed schedule
    const totalCourseFee = processedFeeSchedule.reduce(
      (sum, fee) => sum + (fee.totalFee || 0), 0
    );
    
    const paidAmount = processedFeeSchedule.reduce(
      (sum, fee) => sum + (fee.paidAmount || 0), 0
    );

    const summary = {
      totalCourseFee: totalCourseFee,
      paidAmount: paidAmount,
      balanceAmount: totalCourseFee - paidAmount,
      admissionFee: student.admissionFee || 0,
      monthlyFee: course.monthlyFee || 0,
      examFee: course.examFee || 0,
      totalInstallments: processedFeeSchedule.length,
      paidInstallments: processedFeeSchedule.filter((f) => f.status === "paid").length,
      partialInstallments: processedFeeSchedule.filter((f) => f.status === "partial").length,
      pendingInstallments: processedFeeSchedule.filter((f) => f.status === "pending").length,
      overdueInstallments: processedFeeSchedule.filter((f) => f.status === "overdue").length,
      totalMonthlyFees: processedFeeSchedule.reduce(
        (sum, fee) => sum + (fee.baseFee || 0), 0
      ),
      totalExamFees: processedFeeSchedule.reduce(
        (sum, fee) => sum + (fee.examFee || 0), 0
      ),
    };

    setFeeData({
      student: {
        studentId: student.studentId,
        fullName: student.fullName,
        course: student.course,
        admissionDate: student.admissionDate,
      },
      course: course,
      summary,
      feeSchedule: processedFeeSchedule,
    });
  }
};



 // Open month management modal - FIXED with proper defaults
const openMonthModal = (fee = null, action = "add") => {
  console.log("Opening month modal:", { fee, action }); // Debug log
  
  if (action === "edit" && fee) {
    // Editing a month's fee - FIXED data extraction
    setMonthManagementData({
      action: "edit",
      monthNumber: fee.monthNumber || 1,
      monthName: fee.month || `Month ${fee.monthNumber || 1}`,
      baseFee: fee.baseFee || fee.monthlyFee || fee.amount || 0,
      isExamMonth: fee.isExamMonth || fee.hasExam || false,
      examFee: fee.examFee || 0,
      hasOtherFee: !!(fee.otherFeeAmount > 0),
      otherFeeId: fee.otherFeeId || "",
      otherFeeName: fee.otherFeeName || "",
      otherFeeAmount: fee.otherFeeAmount || "",
      dueDate: fee.dueDate ? 
        (() => {
          try {
            const date = new Date(fee.dueDate);
            return isNaN(date.getTime()) ? calculateDueDate(fee.monthNumber - 1) : date.toISOString().split('T')[0];
          } catch {
            return calculateDueDate(fee.monthNumber - 1);
          }
        })() : calculateDueDate(fee.monthNumber - 1),
      count: 1,
    });
    setShowMonthModal(true);
  } else {
    // Adding new month(s) - CONTINUE SEQUENCE FROM HIGHEST
    const existingMonths = feeData?.feeSchedule || [];
    const existingMonthNumbers = existingMonths
      .map(f => f.monthNumber)
      .filter(num => !isNaN(num) && num > 0);
    
    // Find NEXT month number (max + 1)
    let nextMonthNumber = 1;
    if (existingMonthNumbers.length > 0) {
      nextMonthNumber = Math.max(...existingMonthNumbers) + 1;
    }
    
    console.log("Next month number (max + 1):", nextMonthNumber);
    
    // Calculate due date
    let nextDueDate;
    try {
      nextDueDate = calculateDueDate(nextMonthNumber - 1);
    } catch (error) {
      // Fallback: 15th of next month from today
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + 1);
      defaultDate.setDate(15);
      nextDueDate = defaultDate.toISOString().split('T')[0];
    }
    
    const shouldBeExamMonth = isExamMonth(nextMonthNumber);
    const defaultExamFee = student?.examFee || course?.examFee || 0;
    
        setMonthManagementData({
      action: "add",
      monthNumber: nextMonthNumber,
      monthName: "",
      baseFee: student?.monthlyFee || course?.monthlyFee || 0,
      isExamMonth: shouldBeExamMonth,
      examFee: shouldBeExamMonth ? defaultExamFee : 0,
      hasOtherFee: false,
      otherFeeId: "",
      otherFeeName: "",
      otherFeeAmount: "",
      dueDate: nextDueDate,
      count: 1,
    });
    setShowMonthModal(true);
  }
};
  

  const handleAddMonth = async () => {
  const { action, monthNumber, baseFee, isExamMonth, examFee, hasOtherFee, otherFeeId, otherFeeName, otherFeeAmount, dueDate, count } = monthManagementData;
  
  // Validate inputs
  if (!validateMonthData()) {
    return;
  }
  
  if (action === "edit") {
    // Edit existing month - SIMPLIFIED AND FIXED
    try {
      const token = localStorage.getItem("token");
      
      // Find the original month to preserve paid amount
      const originalMonth = feeData.feeSchedule.find(f => f.monthNumber === monthNumber);
      const paidAmount = originalMonth?.paidAmount || 0;
      
            // Calculate new totals
      const otherFeeAmt = hasOtherFee ? (parseFloat(otherFeeAmount) || 0) : 0;
      const totalFee = parseFloat(baseFee) + (isExamMonth ? parseFloat(examFee || 0) : 0) + otherFeeAmt;
      const newBalance = totalFee - paidAmount;
      const newStatus = paidAmount === 0 ? "pending" : 
                       paidAmount >= totalFee ? "paid" : 
                       "partial";
      
      // Update the month in the schedule
      const updatedFeeSchedule = feeData.feeSchedule.map(fee => {
        if (fee.monthNumber === monthNumber) {
          return {
            ...fee,
            baseFee: parseFloat(baseFee) || 0,
            monthlyFee: parseFloat(baseFee) || 0,
            amount: parseFloat(baseFee) || 0,
            isExamMonth: isExamMonth,
            hasExam: isExamMonth,
            examFee: isExamMonth ? parseFloat(examFee || 0) : 0,
            otherFeeId: hasOtherFee ? otherFeeId : "",
            otherFeeName: hasOtherFee ? otherFeeName : "",
            otherFeeAmount: otherFeeAmt,
            totalFee: totalFee,
            balanceAmount: newBalance,
            pendingAmount: newBalance,
            status: newStatus,
            dueDate: dueDate,
            // Preserve payment details
            paymentDate: fee.paymentDate,
            receiptNo: fee.receiptNo,
            paymentMode: fee.paymentMode,
            remarks: fee.remarks
          };
        }
        return fee;
      });
      
      // Save to backend using schedule endpoint (more reliable)
      const saveResponse = await fetch(`${BASE_URL}/api/students/${studentId}/fees/schedule`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          feeSchedule: updatedFeeSchedule,
          totalCourseFee: updatedFeeSchedule.reduce((sum, fee) => sum + fee.totalFee, 0),
          paidAmount: updatedFeeSchedule.reduce((sum, fee) => sum + fee.paidAmount, 0),
          balanceAmount: updatedFeeSchedule.reduce((sum, fee) => sum + fee.balanceAmount, 0),
        }),
      });
      
      if (saveResponse.ok) {
        updateFeeSchedule(updatedFeeSchedule);
        alert("Month updated successfully!");
      } else {
        // Fallback: Update locally
        updateFeeSchedule(updatedFeeSchedule);
        alert("Month updated locally (backend save failed)");
      }
      
      setShowMonthModal(false);
    } catch (error) {
      console.error("Error updating month:", error);
      alert("Error updating month. Please try again.");
    }
  } else {
    // Add new month(s) - FIXED AND STABLE
    try {
      const newMonths = [];
      
      // Get existing months
      const existingMonths = feeData?.feeSchedule || [];
      const existingMonthNumbers = existingMonths
        .map(f => f.monthNumber)
        .filter(num => !isNaN(num) && num > 0);
      
      // Find the next month number (max + 1)
      let startMonth = 1;
      if (existingMonthNumbers.length > 0) {
        startMonth = Math.max(...existingMonthNumbers) + 1;
      }
      
      console.log(`Adding ${count} months starting from month ${startMonth}`);
      
      const token = localStorage.getItem("token");
      
      for (let i = 0; i < count; i++) {
        const monthNum = startMonth + i;
        
        // Calculate month name - FIXED LOGIC
        let monthName;
        if (student?.admissionDate) {
          try {
            const admission = new Date(student.admissionDate);
            if (!isNaN(admission.getTime())) {
              const monthDate = new Date(admission);
              // CORRECT: Month calculation should be relative to admission
              monthDate.setMonth(admission.getMonth() + (monthNum - 1));
              
              if (!isNaN(monthDate.getTime())) {
                monthName = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
              } else {
                monthName = `Month ${monthNum}`;
              }
            } else {
              monthName = `Month ${monthNum}`;
            }
          } catch (error) {
            monthName = `Month ${monthNum}`;
          }
        } else {
          monthName = `Month ${monthNum}`;
        }
        
        // Check exam month
        const isExam = checkExamMonth(monthNum);
        const otherFeeAmt = hasOtherFee ? (parseFloat(otherFeeAmount) || 0) : 0;
        const totalFee = parseFloat(baseFee) + (isExam ? parseFloat(examFee || 0) : 0) + otherFeeAmt;
        
        // Calculate due date - FIXED
        let monthDueDate;
        try {
          // If we have admission date, calculate from it
          if (student?.admissionDate) {
            const admission = new Date(student.admissionDate);
            if (!isNaN(admission.getTime())) {
              const dueDateObj = new Date(admission);
              dueDateObj.setMonth(admission.getMonth() + (monthNum - 1));
              dueDateObj.setDate(15);
              monthDueDate = dueDateObj.toISOString().split('T')[0];
            } else {
              throw new Error("Invalid admission date");
            }
          } else {
            // Use the due date from modal and add months
            const baseDate = new Date(dueDate);
            baseDate.setMonth(baseDate.getMonth() + i);
            baseDate.setDate(15);
            monthDueDate = baseDate.toISOString().split('T')[0];
          }
        } catch (error) {
          // Simple fallback
          const fallbackDate = new Date();
          fallbackDate.setMonth(fallbackDate.getMonth() + monthNum);
          fallbackDate.setDate(15);
          monthDueDate = fallbackDate.toISOString().split('T')[0];
        }
        
                newMonths.push({
          month: monthName,
          monthNumber: monthNum,
          baseFee: parseFloat(baseFee) || 0,
          monthlyFee: parseFloat(baseFee) || 0,
          amount: parseFloat(baseFee) || 0,
          hasExam: isExam,
          isExamMonth: isExam,
          examFee: isExam ? parseFloat(examFee || 0) : 0,
          otherFeeId: hasOtherFee ? otherFeeId : "",
          otherFeeName: hasOtherFee ? otherFeeName : "",
          otherFeeAmount: otherFeeAmt,
          totalFee: totalFee,
          paidAmount: 0,
          pendingAmount: totalFee,
          balanceAmount: totalFee,
          status: "pending",
          dueDate: monthDueDate,
        });
      }
      
      const updatedFeeSchedule = [...existingMonths, ...newMonths];
      
      // Sort by month number
      updatedFeeSchedule.sort((a, b) => a.monthNumber - b.monthNumber);
      
      // Save to backend
      const saveResponse = await fetch(`${BASE_URL}/api/students/${studentId}/fees/schedule`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          feeSchedule: updatedFeeSchedule,
          totalCourseFee: updatedFeeSchedule.reduce((sum, fee) => sum + fee.totalFee, 0),
          paidAmount: updatedFeeSchedule.reduce((sum, fee) => sum + fee.paidAmount, 0),
          balanceAmount: updatedFeeSchedule.reduce((sum, fee) => sum + fee.balanceAmount, 0),
        }),
      });
      
      if (saveResponse.ok) {
        updateFeeSchedule(updatedFeeSchedule);
        alert(`${count} month(s) added successfully!`);
      } else {
        updateFeeSchedule(updatedFeeSchedule);
        alert(`${count} month(s) added locally (backend save failed)`);
      }
      
      setShowMonthModal(false);
    } catch (error) {
      console.error("Error adding months:", error);
      alert(`Error: ${error.message}`);
    }
  }
};

// Helper function to update via schedule endpoint
const updateMonthViaSchedule = async (monthNumber, updateData) => {
  try {
    const token = localStorage.getItem("token");
    
    // Update the specific month in the schedule
    const updatedFeeSchedule = feeData.feeSchedule.map(fee => {
      if (fee.monthNumber === monthNumber) {
        return {
          ...fee,
          ...updateData,
          // Preserve payment info
          paymentDate: fee.paymentDate,
          receiptNo: fee.receiptNo,
          paymentMode: fee.paymentMode,
          remarks: fee.remarks
        };
      }
      return fee;
    });
    
    // Calculate totals
    const totalCourseFee = updatedFeeSchedule.reduce((sum, fee) => sum + fee.totalFee, 0);
    const totalPaid = updatedFeeSchedule.reduce((sum, fee) => sum + fee.paidAmount, 0);
    const balanceAmount = Math.max(0, totalCourseFee - totalPaid);
    
    // Save entire schedule
    const response = await fetch(`${BASE_URL}/api/students/${studentId}/fees/schedule`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        feeSchedule: updatedFeeSchedule,
        totalCourseFee: totalCourseFee,
        paidAmount: totalPaid,
        balanceAmount: balanceAmount,
      }),
    });
    
    if (response.ok) {
      updateFeeSchedule(updatedFeeSchedule);
      alert("Month updated via schedule!");
      setShowMonthModal(false);
    } else {
      throw new Error("Schedule update failed");
    }
  } catch (error) {
    console.error("Schedule update error:", error);
    throw error;
  }
};

// Fallback: Update locally only
const updateMonthLocally = (monthNumber) => {
  const { baseFee, isExamMonth, examFee, dueDate } = monthManagementData;
  
  const originalFee = feeData.feeSchedule.find(f => f.monthNumber === monthNumber);
  const paidAmount = originalFee?.paidAmount || 0;
  const totalFee = parseFloat(baseFee) + (isExamMonth ? parseFloat(examFee || 0) : 0);
  const newBalance = totalFee - paidAmount;
  
  const updatedFeeSchedule = feeData.feeSchedule.map(fee => {
    if (fee.monthNumber === monthNumber) {
      return {
        ...fee,
        baseFee: parseFloat(baseFee) || 0,
        monthlyFee: parseFloat(baseFee) || 0,
        amount: parseFloat(baseFee) || 0,
        isExamMonth: isExamMonth,
        hasExam: isExamMonth,
        examFee: isExamMonth ? parseFloat(examFee || 0) : 0,
        totalFee: totalFee,
        balanceAmount: newBalance,
        pendingAmount: newBalance,
        status: paidAmount === 0 ? "pending" : paidAmount >= totalFee ? "paid" : "partial",
        dueDate: dueDate,
        // Preserve payment info
        paymentDate: fee.paymentDate,
        receiptNo: fee.receiptNo,
        paymentMode: fee.paymentMode,
        remarks: fee.remarks
      };
    }
    return fee;
  });
  
  updateFeeSchedule(updatedFeeSchedule);
  alert("Month updated locally!");
  setShowMonthModal(false);
};

// Add this validation function near your other helper functions
const validateMonthData = () => {
  const { action, baseFee, isExamMonth, examFee, dueDate, count } = monthManagementData;
  
  console.log("Validating month data:", monthManagementData);
  
  // Validate base fee
  const baseFeeNum = parseFloat(baseFee);
  if (isNaN(baseFeeNum) || baseFeeNum <= 0) {
    alert("Please enter a valid monthly fee (greater than 0)");
    return false;
  }
  
  // Validate exam fee if exam month is checked
  if (isExamMonth) {
    const examFeeNum = parseFloat(examFee);
    if (isNaN(examFeeNum) || examFeeNum < 0) {
      alert("Please enter a valid exam fee (0 or greater)");
      return false;
    }
  }
  
  // Validate due date
  if (!dueDate) {
    alert("Please select a due date");
    return false;
  }
  
  const dueDateObj = new Date(dueDate);
  if (isNaN(dueDateObj.getTime())) {
    alert("Please select a valid due date");
    return false;
  }
  
  // For adding months, validate count
  if (action === "add") {
    const countNum = parseInt(count);
    if (isNaN(countNum) || countNum < 1 || countNum > 12) {
      alert("Please enter a valid number of months to add (1-12)");
      return false;
    }
  }
  
  // Additional validation for admission date when adding months
  if (action === "add" && !student?.admissionDate) {
    console.warn("No admission date found for student");
    // Don't block, just warn in console
  }
  
  return true;
};

// Delete a month from fee schedule - FIXED to keep original month names
const deleteMonth = async (monthNumber) => {
  if (!confirm(`Are you sure you want to delete Month ${monthNumber}?`)) return;

  try {
    const updatedSchedule = feeData.feeSchedule
      .filter(fee => fee.monthNumber !== monthNumber);

    const totals  = calcTotals(updatedSchedule);
    const token   = localStorage.getItem("token");

    const response = await fetch(`${BASE_URL}/api/students/${studentId}/fees/schedule`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        feeSchedule: updatedSchedule.map(cleanFeeForBackend), // ← FIX
        ...totals,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      setFeeData({
        ...feeData,
        feeSchedule: updatedSchedule,
        summary: {
          ...feeData.summary,
          ...totals,
          totalInstallments:   updatedSchedule.length,
          paidInstallments:    updatedSchedule.filter(f => f.status === "paid").length,
          partialInstallments: updatedSchedule.filter(f => f.status === "partial").length,
          pendingInstallments: updatedSchedule.filter(f => f.status === "pending" || f.status === "overdue").length,
          totalMonthlyFees:    updatedSchedule.reduce((s, f) => s + (f.baseFee || 0), 0),
          totalExamFees:       updatedSchedule.reduce((s, f) => s + (f.examFee  || 0), 0),
        },
      });
      alert("Month deleted successfully!");
    } else {
      throw new Error(data.message || "Backend error");
    }
  } catch (error) {
    console.error("Delete error:", error);
    alert(`Delete failed: ${error.message}`);
  }
};

const handleSuspend = async () => {
  if (!suspendData.reason.trim()) {
    alert("Please enter a reason for suspension");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const existingSchedule = feeData.feeSchedule;

    // 1. Mark the month as suspended
    const updatedSchedule = existingSchedule.map(fee => {
      if (fee.monthNumber === suspendData.monthNumber) {
        return {
          ...fee,
          status: "suspended",
          remarks: `Suspended: ${suspendData.reason}`,
        };
      }
      return fee;
    });

    // 2. Get last month's fee for the new appended month
    const lastMonth = existingSchedule[existingSchedule.length - 1];
const newMonthNumber = lastMonth.monthNumber + 1;

// Find last non-exam month to get the base monthly fee
const lastNonExamMonth = [...existingSchedule]
  .reverse()
  .find(m => !m.isExamMonth);

const lastFee = lastNonExamMonth?.baseFee || lastNonExamMonth?.monthlyFee || lastNonExamMonth?.amount || 0;

// New appended month is never an exam month
const lastExamFee = 0;
const lastIsExam = false;

    // 3. Calculate new month date from admission date
    let newMonthName = `Month ${newMonthNumber}`;
    let newDueDate = new Date();
    if (student?.admissionDate) {
      const admission = new Date(student.admissionDate);
      const monthDate = new Date(admission);
      monthDate.setDate(1);
      monthDate.setMonth(admission.getMonth() + (newMonthNumber - 1));
      newMonthName = monthDate.toLocaleString("en-US", { month: "long", year: "numeric" });
      newDueDate = new Date(monthDate);
      newDueDate.setDate(5);
    }

    // 4. Append new month at end
    const newMonth = {
      month: newMonthName,
      monthNumber: newMonthNumber,
      baseFee: lastFee,
      monthlyFee: lastFee,
      amount: lastFee,
      additionalFees: [],
      examFee: lastExamFee,
      isExamMonth: lastIsExam,
      totalFee: lastFee + lastExamFee,
      paidAmount: 0,
      balanceAmount: lastFee + lastExamFee,
      status: "pending",
      carryForwardAmount: 0,
      dueDate: newDueDate,
      promisedDate: null,
      finesPaused: false,
      fines: { amount: 0, reason: "", waived: false },
      paymentDate: null,
      receiptNo: "",
      paymentMode: "",
      remarks: `Auto-added: replacing suspended Month ${suspendData.monthNumber}`,
    };

    const finalSchedule = [...updatedSchedule, newMonth];

    // 5. Save to backend
    // 5. Save to backend
    const endpoint = isAdditionalCourse
      ? `${BASE_URL}/api/students/${studentId}/additional-course-fees/schedule`
      : `${BASE_URL}/api/students/${studentId}/fees/schedule`;

    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        feeSchedule: finalSchedule.map(cleanFeeForBackend),
        totalCourseFee: finalSchedule.reduce((s, f) => s + (f.totalFee || 0), 0),
        paidAmount: finalSchedule.reduce((s, f) => s + (f.paidAmount || 0), 0),
        balanceAmount: finalSchedule.reduce((s, f) => s + (f.balanceAmount || 0), 0),
        ...(isAdditionalCourse && { additionalCourseIndex }),
      }),
    });

    if (response.ok) {
      updateFeeSchedule(finalSchedule);
      alert(`Month ${suspendData.monthNumber} suspended. New month ${newMonthNumber} added at end.`);
    } else {
      updateFeeSchedule(finalSchedule);
      alert("Saved locally (backend failed)");
    }

    setShowSuspendModal(false);
    setSuspendData({ monthNumber: null, month: "", reason: "" });

  } catch (error) {
    console.error("Suspend error:", error);
    alert(`Error: ${error.message}`);
  }
};

const handleUnsuspend = async (fee) => {
  if (!confirm(`Unsuspend ${fee.month}? The auto-added replacement month will also be removed.`)) return;

  try {
    const token = localStorage.getItem("token");
    const existingSchedule = feeData.feeSchedule;

    // 1. Find the auto-added month for this suspended month
    const autoAddedRemark = `Auto-added: replacing suspended Month ${fee.monthNumber}`;
    
    // 2. Remove the auto-added month + restore suspended month to pending
    const updatedSchedule = existingSchedule
      .filter(m => m.remarks !== autoAddedRemark) // remove auto-added
      .map(m => {
        if (m.monthNumber === fee.monthNumber) {
          return {
            ...m,
            status: "pending",
            remarks: "",
          };
        }
        return m;
      });

    // 3. Save to backend
    const endpoint = isAdditionalCourse
      ? `${BASE_URL}/api/students/${studentId}/additional-course-fees/schedule`
      : `${BASE_URL}/api/students/${studentId}/fees/schedule`;

    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        feeSchedule: updatedSchedule.map(cleanFeeForBackend),
        totalCourseFee: updatedSchedule.reduce((s, f) => s + (f.totalFee || 0), 0),
        paidAmount: updatedSchedule.reduce((s, f) => s + (f.paidAmount || 0), 0),
        balanceAmount: updatedSchedule.reduce((s, f) => s + (f.balanceAmount || 0), 0),
        ...(isAdditionalCourse && { additionalCourseIndex }),
      }),
    });

    if (response.ok) {
      updateFeeSchedule(updatedSchedule);
      alert(`Month ${fee.monthNumber} unsuspended successfully.`);
    } else {
      const errData = await response.json().catch(() => ({}));
      alert("Failed to unsuspend: " + (errData.message || "Backend error"));
    }
  } catch (error) {
    console.error("Unsuspend error:", error);
    alert(`Error: ${error.message}`);
  }
};

  const updateFeeSchedule = (updatedFeeSchedule) => {
  // Sort by month number first
  const sortedSchedule = [...updatedFeeSchedule].sort((a, b) => a.monthNumber - b.monthNumber);
  
  const totalCourseFee = sortedSchedule
  .filter(f => f.status !== "suspended")
  .reduce((sum, fee) => sum + (fee.totalFee || 0), 0);
  const totalPaid = sortedSchedule.reduce((sum, fee) => sum + (fee.paidAmount || 0), 0);
  const balanceAmount = Math.max(0, totalCourseFee - totalPaid);
  
  // Count installments by status
  const paidInstallments = sortedSchedule.filter(f => f.status === "paid").length;
  const partialInstallments = sortedSchedule.filter(f => f.status === "partial").length;
  const pendingInstallments = sortedSchedule.filter(f => f.status === "pending" || f.status === "overdue").length;
  
    setFeeData({
    ...feeData,
    feeSchedule: sortedSchedule, // Store sorted
    summary: {
      ...feeData.summary,
      totalCourseFee,
      paidAmount: totalPaid,
      balanceAmount,
      totalInstallments: sortedSchedule.length,
      paidInstallments,
      partialInstallments,
      pendingInstallments,
      totalMonthlyFees: sortedSchedule.filter(f => f.status !== "suspended").reduce((sum, fee) => sum + (fee.baseFee || 0), 0),
      totalExamFees: sortedSchedule.filter(f => f.status !== "suspended").reduce((sum, fee) => sum + (fee.examFee || 0), 0),
      monthlyPaidTotal: sortedSchedule.reduce((s, f) => s + (f.isExamMonth ? (f.monthlyPaid || 0) : Math.max(0, (f.paidAmount || 0) - (f.otherFeePaid || 0))), 0),
      otherFeePaidTotal: sortedSchedule.reduce((s, f) => s + (f.otherFeePaid || 0), 0),
    },
  });
};

  // Save changes to backend - IMPROVED
const saveChangesToBackend = async () => {
  try {
    const token  = localStorage.getItem("token");
    const totals = calcTotals(feeData.feeSchedule);

    const endpoint = isAdditionalCourse
  ? `/api/students/${studentId}/additional-course-fees/schedule`
  : `/api/students/${studentId}/fees/schedule`;
const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        feeSchedule: feeData.feeSchedule.map(cleanFeeForBackend),
  ...totals,
  ...(isAdditionalCourse && { additionalCourseIndex }),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        alert("Fee schedule saved successfully!");
        fetchStudentFees();
      } else {
        alert("Failed to save: " + (data.message || "Unknown error"));
      }
    } else {
      const err = await response.json().catch(() => ({}));
      alert("Failed to save: " + (err.message || `Status ${response.status}`));
    }
  } catch (error) {
    console.error("Error saving schedule:", error);
    alert("Network error. Changes not saved.");
  }
};
  // Open payment modal for add/edit
 const openPaymentModal = (fee, action = "add") => {
  if (!fee) return;

  setSelectedMonth(fee);

    const hasSplit = fee.isExamMonth || (fee.otherFeeAmount || 0) > 0;

  if (action === "edit" && (fee.status === "paid" || fee.status === "partial")) {
    // ✅ Pre-fill with the CURRENT paid amount (not adding on top)
    setPaymentData({
      monthNumber: fee.monthNumber,
      amount: fee.paidAmount || "",         // show what was already entered
      monthlyAmount: hasSplit ? (fee.monthlyPaid || (fee.paidAmount || 0) - (fee.examPaid || 0) - (fee.otherFeePaid || 0)) : "",
      examAmount: fee.isExamMonth ? (fee.examPaid || 0) : "",
      otherAmount: (fee.otherFeeAmount || 0) > 0 ? (fee.otherFeePaid || 0) : "",
      paymentDate: fee.paymentDate
        ? new Date(fee.paymentDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      receiptNo: fee.receiptNo || "",
      paymentMode: fee.paymentMode || "cash",
      remarks: fee.remarks || "",
      action: "edit",
    });
  } else {
    setPaymentData({
      monthNumber: fee.monthNumber,
      amount: "",
      monthlyAmount: "",
      examAmount: "",
      otherAmount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      receiptNo: generateReceiptNo(),
      paymentMode: "cash",
      remarks: "",
      action: "add",
    });
  }

  setShowPaymentModal(true);
};
  // Generate receipt number
  const generateReceiptNo = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RC${year}${month}${random}`;
  };

  // Get maximum allowed payment for a month
  const getMaxPaymentAllowed = () => {
  if (!selectedMonth || !feeData) return 0;

  const monthFee =
    selectedMonth.totalFee ||
    selectedMonth.totalAmount ||
    (selectedMonth.monthlyFee || selectedMonth.amount || 0) +
      (selectedMonth.isExamMonth ? selectedMonth.examFee || 0 : 0);

  if (paymentData.action === "edit") {
    return monthFee;                        // ✅ full fee — user is replacing, not adding
  }

  const alreadyPaid = selectedMonth.paidAmount || 0;
  return monthFee - alreadyPaid;            // remaining balance for new payments
};

  // Max monthly-portion payment for exam months
  const getMaxMonthlyPaymentAllowed = () => {
    if (!selectedMonth) return 0;
    const monthlyFeeAmt = selectedMonth.monthlyFee || selectedMonth.baseFee || selectedMonth.amount || 0;
    if (paymentData.action === "edit") return monthlyFeeAmt;
    return monthlyFeeAmt - (selectedMonth.monthlyPaid || 0);
  };

    // Max exam-portion payment for exam months
  const getMaxExamPaymentAllowed = () => {
    if (!selectedMonth) return 0;
    const examFeeAmt = selectedMonth.examFee || 0;
    if (paymentData.action === "edit") return examFeeAmt;
    return examFeeAmt - (selectedMonth.examPaid || 0);
  };

  // Max other-fee-portion payment for months with an other fee attached
  const getMaxOtherPaymentAllowed = () => {
    if (!selectedMonth) return 0;
    const otherFeeAmt = selectedMonth.otherFeeAmount || 0;
    if (paymentData.action === "edit") return otherFeeAmt;
    return otherFeeAmt - (selectedMonth.otherFeePaid || 0);
  };

  // Check if payment exceeds total course fee - FIXED OVERPAYMENT VALIDATION
  const checkOverpayment = (amount) => {
    if (!feeData) return false;
    
    const paymentAmount = parseFloat(amount) || 0;
    
    // Calculate what the new total paid would be
    let newTotalPaid = feeData.summary.paidAmount;
    
    // If editing, subtract the existing payment first
    if (paymentData.action === "edit" && selectedMonth) {
      const existingPayment = selectedMonth.paidAmount || 0;
      newTotalPaid = feeData.summary.paidAmount - existingPayment + paymentAmount;
    } else if (paymentData.action === "add") {
      newTotalPaid = feeData.summary.paidAmount + paymentAmount;
    }
    
    // Check if new total would exceed total course fee
    return newTotalPaid > feeData.summary.totalCourseFee;
  };

 const handlePayment = async () => {
  try {
    const token = localStorage.getItem("token");

        // ─── SPLIT MONTHS: exam and/or other-fee months, handled per-portion ───
    if (selectedMonth?.isExamMonth || (selectedMonth?.otherFeeAmount || 0) > 0) {
      const monthlyAmt = parseFloat(paymentData.monthlyAmount) || 0;
      const examAmt = selectedMonth.isExamMonth ? (parseFloat(paymentData.examAmount) || 0) : 0;
      const otherAmt = (selectedMonth.otherFeeAmount || 0) > 0 ? (parseFloat(paymentData.otherAmount) || 0) : 0;
      const totalAmt = monthlyAmt + examAmt + otherAmt;

      if (totalAmt <= 0) {
        alert("Please enter an amount for at least one portion");
        return;
      }

      const maxMonthly = getMaxMonthlyPaymentAllowed();
      const maxExam = getMaxExamPaymentAllowed();
      const maxOther = getMaxOtherPaymentAllowed();

      if (monthlyAmt > maxMonthly) {
        alert(`Monthly fee payment cannot exceed ${formatCurrency(maxMonthly)}`);
        return;
      }
      if (selectedMonth.isExamMonth && examAmt > maxExam) {
        alert(`Exam fee payment cannot exceed ${formatCurrency(maxExam)}`);
        return;
      }
      if ((selectedMonth.otherFeeAmount || 0) > 0 && otherAmt > maxOther) {
        alert(`${selectedMonth.otherFeeName || "Other"} fee payment cannot exceed ${formatCurrency(maxOther)}`);
        return;
      }
      if (checkOverpayment(totalAmt)) {
        alert("Payment cannot exceed total course fee");
        return;
      }

      const updatedFeeSchedule = feeData.feeSchedule.map((fee) => {
        if (fee.monthNumber === paymentData.monthNumber) {
          const totalFee = fee.totalFee || 0;
          const newMonthlyPaid = paymentData.action === "edit"
            ? monthlyAmt
            : (fee.monthlyPaid || 0) + monthlyAmt;
          const newExamPaid = paymentData.action === "edit"
            ? examAmt
            : (fee.examPaid || 0) + examAmt;
          const newOtherPaid = paymentData.action === "edit"
            ? otherAmt
            : (fee.otherFeePaid || 0) + otherAmt;
          const newPaidAmount = newMonthlyPaid + newExamPaid + newOtherPaid;
          const newBalance = totalFee - newPaidAmount;
          return {
            ...fee,
            monthlyPaid: newMonthlyPaid,
            examPaid: newExamPaid,
            otherFeePaid: newOtherPaid,
            paidAmount: newPaidAmount,
            balanceAmount: newBalance,
            pendingAmount: newBalance,
            status: newPaidAmount === 0 ? "pending" : newPaidAmount >= totalFee ? "paid" : "partial",
            paymentDate: new Date(paymentData.paymentDate),
            receiptNo: paymentData.receiptNo,
            paymentMode: paymentData.paymentMode,
            paymentId: paymentData.paymentId,
            remarks: paymentData.remarks,
          };
        }
        return fee;
      });

      const totalPaid = updatedFeeSchedule.reduce((s, f) => s + (f.paidAmount || 0), 0);
      const balanceAmount = Math.max(0, feeData.summary.totalCourseFee - totalPaid);

      const examEndpoint = isAdditionalCourse
        ? `${BASE_URL}/api/students/${studentId}/additional-course-fees/schedule`
        : `${BASE_URL}/api/students/${studentId}/fees/schedule`;

      const examResponse = await fetch(examEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          feeSchedule: updatedFeeSchedule.map(cleanFeeForBackend),
          totalCourseFee: feeData.summary.totalCourseFee,
          paidAmount: totalPaid,
          balanceAmount,
          ...(isAdditionalCourse && { additionalCourseIndex }),
        }),
      });

      if (examResponse.ok) {
        updateFeeSchedule(updatedFeeSchedule);
        alert(paymentData.action === "edit" ? "Payment updated successfully!" : "Payment recorded successfully!");
        setShowPaymentModal(false);

        setSelectedReceipt({
          receiptNo: paymentData.receiptNo,
          date: new Date(paymentData.paymentDate),
          studentId: feeData.student.studentId,
          studentName: feeData.student.fullName,
          course: feeData.course?.courseFullName || feeData.student.course,
          month: feeData.feeSchedule.find(f => f.monthNumber === paymentData.monthNumber)?.month,
          amount: totalAmt,
          paymentMode: paymentData.paymentMode,
          balance: balanceAmount,
          action: paymentData.action,
        });
        setShowReceiptModal(true);
      } else {
        updateFeeLocally();
      }
      return;
    }

    // ─── NON-EXAM MONTHS: unchanged single-amount flow ───
    const paymentAmount = parseFloat(paymentData.amount) || 0;

    if (!paymentAmount || paymentAmount <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }

    const maxAllowed = getMaxPaymentAllowed();
    if (paymentAmount > maxAllowed) {
      alert(`Payment cannot exceed ${formatCurrency(maxAllowed)} for this month`);
      return;
    }

    if (checkOverpayment(paymentAmount)) {
      alert("Payment cannot exceed total course fee");
      return;
    }



    // ─── EDIT: Replace the amount via schedule PUT (never adds on top) ───
    if (paymentData.action === "edit") {
      const updatedFeeSchedule = feeData.feeSchedule.map((fee) => {
        if (fee.monthNumber === paymentData.monthNumber) {
          const totalFee = fee.totalFee || 0;
          const newBalance = totalFee - paymentAmount;
          return {
            ...fee,
            paidAmount: paymentAmount,                          // ✅ SET, not add
            balanceAmount: newBalance,
            pendingAmount: newBalance,
            status: paymentAmount === 0 ? "pending"
                  : paymentAmount >= totalFee ? "paid"
                  : "partial",
            paymentDate: new Date(paymentData.paymentDate),
            receiptNo: paymentData.receiptNo,
            paymentMode: paymentData.paymentMode,
            paymentId: paymentData.paymentId,
            remarks: paymentData.remarks,
          };
        }
        return fee;
      });

      const totalPaid = updatedFeeSchedule.reduce((s, f) => s + (f.paidAmount || 0), 0);
      const balanceAmount = Math.max(0, feeData.summary.totalCourseFee - totalPaid);

      const response = await fetch(
        `${BASE_URL}/api/students/${studentId}/fees/schedule`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            feeSchedule: updatedFeeSchedule.map(cleanFeeForBackend),
            totalCourseFee: feeData.summary.totalCourseFee,
            paidAmount: totalPaid,
            balanceAmount,
          }),
        }
      );

      if (response.ok) {
        updateFeeSchedule(updatedFeeSchedule);
        alert("Payment updated successfully!");
        setShowPaymentModal(false);

        const receipt = {
          receiptNo: paymentData.receiptNo,
          date: new Date(paymentData.paymentDate),
          studentId: feeData.student.studentId,
          studentName: feeData.student.fullName,
          course: feeData.course?.courseFullName || feeData.student.course,
          month: feeData.feeSchedule.find(f => f.monthNumber === paymentData.monthNumber)?.month,
          amount: paymentAmount,
          paymentMode: paymentData.paymentMode,
          balance: balanceAmount,
          action: "edit",
        };
        setSelectedReceipt(receipt);
        setShowReceiptModal(true);
      } else {
        // Fallback: update locally if backend fails
        updateFeeLocally();
      }
      return;
    }

    // ─── ADD: Use the existing /fees/pay endpoint as before ───
    const response = await fetch(`${BASE_URL}/api/students/${studentId}/fees/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(paymentData),
    });

    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return;
    }

    if (response.ok) {
      const data = await response.json();
      alert("Payment recorded successfully!");
      setShowPaymentModal(false);
      if (data.data?.receipt) {
        setSelectedReceipt(data.data.receipt);
        setShowReceiptModal(true);
      }
      fetchStudentFees();
    } else {
      updateFeeLocally();
    }
  } catch (error) {
    console.error("Payment error, updating locally:", error);
    updateFeeLocally();
  }
};

  const updateFeeLocally = () => {
    const paymentAmount = parseFloat(paymentData.amount) || 0;
    
    // Find and update the fee entry
    const updatedFeeSchedule = feeData.feeSchedule.map((fee) => {
      if (fee.monthNumber === paymentData.monthNumber) {
        const monthFee = fee.totalFee || fee.totalAmount || 
                        (fee.monthlyFee || fee.amount || 0) + 
                        (fee.isExamMonth ? fee.examFee || 0 : 0);
        
        // Determine if fully paid
        const isFullyPaid = paymentAmount >= monthFee;
        
        return {
          ...fee,
          status: isFullyPaid ? "paid" : "partial",
          paymentDate: new Date(paymentData.paymentDate),
          receiptNo: paymentData.receiptNo,
          paymentMode: paymentData.paymentMode,
          paymentId: paymentData.paymentId,
          remarks: paymentData.remarks,
          paidAmount: paymentAmount,
          balanceAmount: monthFee - paymentAmount,
        };
      }
      return fee;
    });

    // Calculate new totals
    const totalPaid = updatedFeeSchedule.reduce((sum, fee) => sum + (fee.paidAmount || 0), 0);
    const balanceAmount = Math.max(0, feeData.summary.totalCourseFee - totalPaid);
    const paidInstallments = updatedFeeSchedule.filter(f => f.status === "paid").length;
    const partialInstallments = updatedFeeSchedule.filter(f => f.status === "partial").length;
    const pendingInstallments = updatedFeeSchedule.filter(f => f.status === "pending" || f.status === "overdue").length;

    setFeeData({
      ...feeData,
      feeSchedule: updatedFeeSchedule,
      summary: {
        ...feeData.summary,
        paidAmount: totalPaid,
        balanceAmount,
        paidInstallments,
        partialInstallments,
        pendingInstallments,
      },
    });

    alert(`Payment ${paymentData.action === 'edit' ? 'updated' : 'recorded'} locally!`);
    setShowPaymentModal(false);

    // Create receipt locally
    const receipt = {
      receiptNo: paymentData.receiptNo,
      date: new Date(paymentData.paymentDate),
      studentId: feeData.student.studentId,
      studentName: feeData.student.fullName,
      course: feeData.course?.courseFullName || feeData.student.course,
      month: feeData.feeSchedule.find(
        (f) => f.monthNumber === paymentData.monthNumber
      )?.month,
      amount: paymentData.amount,
      paymentMode: paymentData.paymentMode,
      balance: balanceAmount,
      action: paymentData.action
    };

    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  // Delete a payment
 const deletePayment = async (fee) => {
  if (!confirm(`Are you sure you want to delete payment for ${fee.month}?`)) return;

  try {
    const updatedSchedule = feeData.feeSchedule.map(f => {
      if (f.monthNumber === fee.monthNumber) {
        const totalAmount = f.totalFee || 0;
        return {
          ...f,
          status:       "pending",
          paymentDate:  null,
          receiptNo:    "",
          paymentMode:  "",
          remarks:      "",
          paidAmount:   0,
          monthlyPaid:  0,  // ← ADD
          examPaid:     0,  // ← ADD
          balanceAmount: totalAmount,
          pendingAmount: totalAmount,
        };
      }
      return f;
    });

    const totals = calcTotals(updatedSchedule);
    const token  = localStorage.getItem("token");

    const response = await fetch(`${BASE_URL}/api/students/${studentId}/fees/schedule`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        feeSchedule: updatedSchedule.map(cleanFeeForBackend), // ← FIX
        totalCourseFee: feeData.summary.totalCourseFee,       // keep original total
        paidAmount:     totals.paidAmount,
        balanceAmount:  feeData.summary.totalCourseFee - totals.paidAmount,
      }),
    });

    if (response.ok) {
      const paidInstallments    = updatedSchedule.filter(f => f.status === "paid").length;
      const partialInstallments = updatedSchedule.filter(f => f.status === "partial").length;
      const pendingInstallments = updatedSchedule.filter(f => f.status === "pending" || f.status === "overdue").length;

      setFeeData({
        ...feeData,
        feeSchedule: updatedSchedule,
        summary: {
          ...feeData.summary,
          paidAmount:           totals.paidAmount,
          balanceAmount:        feeData.summary.totalCourseFee - totals.paidAmount,
          paidInstallments,
          partialInstallments,
          pendingInstallments,
        },
      });
      alert("Payment deleted successfully!");
    } else {
      const err = await response.json();
      throw new Error(err.message || "Backend save failed");
    }
  } catch (error) {
    console.error("Delete payment error:", error);
    alert(`Error: ${error.message}`);
  }
};


const deleteMonthlyFee = async (fee) => {
  if (!confirm(`Delete only monthly fee payment for ${fee.month}?`)) return;

  try {
    const token = localStorage.getItem("token");
    const updatedSchedule = feeData.feeSchedule.map(f => {
      if (f.monthNumber === fee.monthNumber) {
        const newPaidAmount = f.examPaid || 0; // only exam paid remains
        const newBalance = (f.totalFee || 0) - newPaidAmount;
        return {
          ...f,
          paidAmount: newPaidAmount,
          monthlyPaid: 0,
          balanceAmount: newBalance,
          status: newPaidAmount === 0 ? "pending" : "partial",
          paymentDate: newPaidAmount === 0 ? null : f.paymentDate,
          receiptNo: newPaidAmount === 0 ? "" : f.receiptNo,
        };
      }
      return f;
    });

    const response = await fetch(`${BASE_URL}/api/students/${studentId}/fees/schedule`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        feeSchedule: updatedSchedule.map(cleanFeeForBackend),
        totalCourseFee: feeData.summary.totalCourseFee,
        paidAmount: updatedSchedule.reduce((s, f) => s + (f.paidAmount || 0), 0),
        balanceAmount: updatedSchedule.reduce((s, f) => s + (f.balanceAmount || 0), 0),
      }),
    });

    if (response.ok) {
      updateFeeSchedule(updatedSchedule);
      alert(`Monthly fee payment deleted for ${fee.month}.`);
    } else {
      const err = await response.json().catch(() => ({}));
      alert("Failed: " + (err.message || "Backend error"));
    }
  } catch (error) {
    console.error("Delete monthly fee error:", error);
    alert(`Error: ${error.message}`);
  }
};

const deleteExamFee = async (fee) => {
  if (!confirm(`Delete only exam fee payment for ${fee.month}?`)) return;

  try {
    const token = localStorage.getItem("token");
    const updatedSchedule = feeData.feeSchedule.map(f => {
      if (f.monthNumber === fee.monthNumber) {
        const newPaidAmount = f.monthlyPaid || 0; // only monthly paid remains
        const newBalance = (f.totalFee || 0) - newPaidAmount;
        return {
          ...f,
          paidAmount: newPaidAmount,
          examPaid: 0,
          balanceAmount: newBalance,
          status: newPaidAmount === 0 ? "pending" : "partial",
          paymentDate: newPaidAmount === 0 ? null : f.paymentDate,
          receiptNo: newPaidAmount === 0 ? "" : f.receiptNo,
        };
      }
      return f;
    });

    const response = await fetch(`${BASE_URL}/api/students/${studentId}/fees/schedule`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        feeSchedule: updatedSchedule.map(cleanFeeForBackend),
        totalCourseFee: feeData.summary.totalCourseFee,
        paidAmount: updatedSchedule.reduce((s, f) => s + (f.paidAmount || 0), 0),
        balanceAmount: updatedSchedule.reduce((s, f) => s + (f.balanceAmount || 0), 0),
      }),
    });

    if (response.ok) {
      updateFeeSchedule(updatedSchedule);
      alert(`Exam fee payment deleted for ${fee.month}.`);
    } else {
      const err = await response.json().catch(() => ({}));
      alert("Failed: " + (err.message || "Backend error"));
    }
  } catch (error) {
    console.error("Delete exam fee error:", error);
    alert(`Error: ${error.message}`);
  }
};

// Alternative method if DELETE endpoint doesn't exist
const deletePaymentViaUpdate = async (fee) => {
  try {
    // Update the entire fee schedule to backend
    const updatedFeeSchedule = feeData.feeSchedule.map((f) => {
      if (f.monthNumber === fee.monthNumber) {
        return {
          ...f,
          status: "pending",
          paymentDate: null,
          receiptNo: "",
          paymentMode: "",
          remarks: "",
          paidAmount: 0,
          balanceAmount: f.totalFee || f.totalAmount || 
                       (f.monthlyFee || f.amount || 0) + 
                       (f.isExamMonth ? f.examFee || 0 : 0)
        };
      }
      return f;
    });

    // Calculate new totals
    const totalPaid = updatedFeeSchedule.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
    const balanceAmount = Math.max(0, feeData.summary.totalCourseFee - totalPaid);

    // Save updated schedule to backend
    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/api/students/${studentId}/fees/schedule`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        feeSchedule: updatedFeeSchedule,
        totalCourseFee: feeData.summary.totalCourseFee,
        paidAmount: totalPaid,
        balanceAmount: balanceAmount,
      }),
    });

    if (response.ok) {
      // Update local state
      const paidInstallments = updatedFeeSchedule.filter(f => f.status === "paid").length;
      const partialInstallments = updatedFeeSchedule.filter(f => f.status === "partial").length;
      const pendingInstallments = updatedFeeSchedule.filter(f => f.status === "pending" || f.status === "overdue").length;

      setFeeData({
        ...feeData,
        feeSchedule: updatedFeeSchedule,
        summary: {
          ...feeData.summary,
          paidAmount: totalPaid,
          balanceAmount,
          paidInstallments,
          partialInstallments,
          pendingInstallments,
        },
      });

      alert("Payment deleted via schedule update! It will now show in fee collection list.");
    } else {
      throw new Error("Failed to save to backend");
    }
  } catch (error) {
    console.error("Alternative delete error:", error);
    // Last resort: update only locally
    deletePaymentLocally(fee);
  }
};

// Last resort: local only update
const deletePaymentLocally = (fee) => {
  const updatedFeeSchedule = feeData.feeSchedule.map((f) => {
    if (f.monthNumber === fee.monthNumber) {
      return {
        ...f,
        status: "pending",
        paymentDate: null,
        receiptNo: "",
        paymentMode: "",
        remarks: "",
        paidAmount: 0,
        balanceAmount: f.totalFee || f.totalAmount || 
                     (f.monthlyFee || f.amount || 0) + 
                     (f.isExamMonth ? f.examFee || 0 : 0)
      };
    }
    return f;
  });

  // Recalculate totals
  const totalPaid = updatedFeeSchedule.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
  const balanceAmount = Math.max(0, feeData.summary.totalCourseFee - totalPaid);
  const paidInstallments = updatedFeeSchedule.filter(f => f.status === "paid").length;
  const partialInstallments = updatedFeeSchedule.filter(f => f.status === "partial").length;
  const pendingInstallments = updatedFeeSchedule.filter(f => f.status === "pending" || f.status === "overdue").length;

  setFeeData({
    ...feeData,
    feeSchedule: updatedFeeSchedule,
    summary: {
      ...feeData.summary,
      paidAmount: totalPaid,
      balanceAmount,
      paidInstallments,
      partialInstallments,
      pendingInstallments,
    },
  });

  alert("Payment deleted locally only. Changes may not persist on refresh. Please save changes manually.");
};

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPaymentMode = (mode) => {
    switch (mode) {
      case "cash": return "Cash";
      case "cheque": return "Cheque";
      case "bank_transfer": return "Bank Transfer";
      case "online": return "Online";
      default: return mode || "—";
    }
  };

    const toggleVerified = (key) => {
  setVerifiedPayments(prev => {
    const updated = { ...prev, [key]: !prev[key] };
    try {
      localStorage.setItem(`verifiedPayments_${studentId}`, JSON.stringify(updated));
    } catch {}
    return updated;
  });
};

    const saveOtherFeeDate = async (monthNumber, date) => {
  const updatedFeeSchedule = feeData.feeSchedule.map(f =>
    f.monthNumber === monthNumber ? { ...f, otherFeeDate: date || null } : f
  );

  // Optimistic UI update so it feels instant
  updateFeeSchedule(updatedFeeSchedule);

  try {
    const token = localStorage.getItem("token");
    const endpoint = isAdditionalCourse
      ? `${BASE_URL}/api/students/${studentId}/additional-course-fees/schedule`
      : `${BASE_URL}/api/students/${studentId}/fees/schedule`;

    await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        feeSchedule: updatedFeeSchedule.map(cleanFeeForBackend),
        totalCourseFee: feeData.summary.totalCourseFee,
        paidAmount: feeData.summary.paidAmount,
        balanceAmount: feeData.summary.balanceAmount,
        ...(isAdditionalCourse && { additionalCourseIndex }),
      }),
    });
  } catch (err) {
    console.error("Error saving other fee date:", err);
    alert("Saved on screen, but failed to sync to server. Please refresh to confirm.");
  }
};

  const getCourseShortName = (fee) => {
  const conversionHistory = feeData?.student?.conversionHistory || [];
  
  if (conversionHistory.length === 0) {
    return courseShortNames[feeData?.student?.course] || "—";
  }

  const sortedHistory = [...conversionHistory].sort((a, b) => a.conversionMonth - b.conversionMonth);
  
  let courseName = sortedHistory[0].fromCourse;
  
  for (const conversion of sortedHistory) {
    if (fee.monthNumber >= conversion.conversionMonth) {
      courseName = conversion.toCourse;
    } else {
      break;
    }
  }

  return courseShortNames[courseName] || 
         courseName?.split(' ').map(w => w[0]).join('') || "—";
};

const feeRegisterRows = useMemo(() => {
  if (!feeData) return [];
  const rows = [];

  const getShortName = (fee) => {
    const conversionHistory = feeData?.student?.conversionHistory || [];
    if (conversionHistory.length === 0) {
      return courseShortNames[feeData?.student?.course] ||
             feeData?.student?.course?.split(' ').map(w => w[0]).join('') || '—';
    }
    const sortedHistory = [...conversionHistory].sort((a, b) => a.conversionMonth - b.conversionMonth);
    let courseName = sortedHistory[0].fromCourse;
    for (const conversion of sortedHistory) {
      if (fee.monthNumber >= conversion.conversionMonth) {
        courseName = conversion.toCourse;
      } else {
        break;
      }
    }
    return courseShortNames[courseName] ||
           courseName?.split(' ').map(w => w[0]).join('') || '—';
  };

  // ── 1. Primary feeSchedule ─────────────────────────────
  for (const fee of (feeData.feeSchedule || [])) {
    if (!fee.receiptNo || !(fee.paidAmount > 0)) continue;

    if (fee.isExamMonth && (fee.monthlyPaid || fee.examPaid)) {
      if ((fee.monthlyPaid || 0) > 0) {
        rows.push({
          date:        fee.paymentDate,
          receiptNo:   fee.receiptNo,
          rollNo:      student?.admissionNo || feeData.student?.admissionNo || '—',
          studentName: feeData.student?.fullName,
          course:      getShortName(fee),
          batchTime:   student?.batchTime || '—',
          faculty:     student?.facultyAllot || '—',
          feeType:     'Monthly Fee',
          amount:      fee.monthlyPaid,
          paymentMode: fee.paymentMode,
          paymentId:   fee.paymentId,
          submittedBy: fee.submittedByName,
        });
      }
      if ((fee.examPaid || 0) > 0) {
        rows.push({
          date:        fee.paymentDate,
          receiptNo:   fee.receiptNo,
          rollNo:      student?.admissionNo || feeData.student?.admissionNo || '—',
          studentName: feeData.student?.fullName,
          course:      getShortName(fee),
          batchTime:   student?.batchTime || '—',
          faculty:     student?.facultyAllot || '—',
          feeType:     'Exam Fee',
          amount:      fee.examPaid,
          paymentMode: fee.paymentMode,
          paymentId:   fee.paymentId,
          submittedBy: fee.submittedByName,
        });
      }
    } else {
      rows.push({
        date:        fee.paymentDate,
        receiptNo:   fee.receiptNo,
        rollNo:      student?.admissionNo || feeData.student?.admissionNo || '—',
        studentName: feeData.student?.fullName,
        course:      getShortName(fee),
        batchTime:   student?.batchTime || '—',
        faculty:     student?.facultyAllot || '—',
        feeType:     fee.isExamMonth ? 'Exam Fee' : 'Monthly Fee',
        amount:      fee.paidAmount,
        paymentMode: fee.paymentMode,
        paymentId:   fee.paymentId,
        submittedBy: fee.submittedByName,
      });
    }
  }

  // ── 2. paymentHistory → otherFees (Late Fee, Convert Fee, etc.) ──
  for (const ph of (feeData.student?.paymentHistory || [])) {
    if (!ph.receiptNo || !Array.isArray(ph.otherFees)) continue;
    for (const of_ of ph.otherFees) {
      if (!of_.amount || of_.amount <= 0) continue;
      rows.push({
        date:        ph.date,
        receiptNo:   ph.receiptNo,
        rollNo:      student?.admissionNo || feeData.student?.admissionNo || '—',
        studentName: feeData.student?.fullName,
        course:      getShortName({ monthNumber: 0 }),
        batchTime:   student?.batchTime || '—',
        faculty:     student?.facultyAllot || '—',
        feeType:     of_.feeName || 'Other Fee',
        amount:      of_.amount,
        submittedBy: ph.collectedByName,
      });
    }
  }

  // ── 3. Admission Fee ───────────────────────────────────────
const admStudent = feeData.student;
for (const ph of (admStudent?.paymentHistory || [])) {
  if (!ph.receiptNo)                       continue;
  if ((ph.admissionFeeAmount || 0) <= 0)   continue;
  rows.push({
    date:        ph.date,
    receiptNo:   ph.receiptNo,
    rollNo:      student?.admissionNo || admStudent?.admissionNo || '—',
    studentName: admStudent?.fullName,
    course:      getShortName({ monthNumber: 0 }),
    batchTime:   student?.batchTime || '—',
    faculty:     student?.facultyAllot || '—',
    feeType:     'Admission Fee',
    amount:      ph.admissionFeeAmount,
    submittedBy: ph.collectedByName,
  });
}

  return rows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}, [feeData, student, courseShortNames]);


  const printReceipt = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${selectedReceipt.receiptNo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .receipt-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .receipt-no { font-size: 18px; color: #666; margin-bottom: 30px; }
            .details { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .details td { padding: 10px; border-bottom: 1px solid #ddd; }
            .details td:first-child { font-weight: bold; width: 30%; }
            .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 14px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="receipt-title">FEE PAYMENT RECEIPT</div>
            <div class="receipt-no">Receipt No: ${
              selectedReceipt.receiptNo
            }</div>
          </div>
          
          <table class="details">
            <tr><td>Date:</td><td>${new Date(
              selectedReceipt.date
            ).toLocaleDateString()}</td></tr>
            <tr><td>Student ID:</td><td>${selectedReceipt.studentId}</td></tr>
            <tr><td>Student Name:</td><td>${
              selectedReceipt.studentName
            }</td></tr>
            <tr><td>Course:</td><td>${selectedReceipt.course}</td></tr>
            <tr><td>Month:</td><td>${selectedReceipt.month}</td></tr>
            <tr><td>Payment Mode:</td><td>${selectedReceipt.paymentMode.toUpperCase()}</td></tr>
            <tr><td>Type:</td><td>${selectedReceipt.action === 'edit' ? 'Payment Update' : 'New Payment'}</td></tr>
          </table>
          
          <div style="border: 2px solid #000; padding: 20px; margin: 20px 0;">
            <div style="font-size: 24px; font-weight: bold; text-align: center;">
              AMOUNT PAID: ${formatCurrency(selectedReceipt.amount)}
            </div>
          </div>
          
          <div class="footer">
            <p>This is a computer generated receipt. No signature required.</p>
            <p>Thank you for your payment!</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!feeData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No fee data available</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header and Controls */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold">Fee Management</h3>
          <p className="text-gray-600 text-sm">
            Manage fee payments and view schedule
          </p>
        </div>
                <div className="flex gap-2">
          <button
            onClick={() => {
              setShowFeeRegister(!showFeeRegister);
              setShowReceiptTable(false);
            }}
            className="flex items-center justify-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-blue-600 font-medium w-40"
            title="Toggle Fee View"
          >
            <FileText size={16} />
            {showFeeRegister ? "Fee Schedule" : "Fee Register"}
          </button>

          <button
            onClick={() => openMonthModal(null, "add")}
            className="flex items-center justify-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 w-40"
            title="Add Month(s)"
          >
            <Plus size={16} />
            Add Month(s)
          </button>

          <button
            onClick={() => setRefreshing(true) || fetchStudentFees()}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 w-40"
            title="Refresh"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Fee Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <div className="flex items-center gap-2 text-blue-600 font-semibold mb-2">
            <DollarSign size={16} />
            Total Course Fee
          </div>
          <div className="text-xl font-bold">
            {formatCurrency(feeData.summary.totalCourseFee)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {feeData.summary.totalInstallments} months
          </div>
        </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <div className="flex items-center gap-2 text-green-600 font-semibold mb-2">
            <CheckCircle size={16} />
            Paid Amount
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold">{formatCurrency(feeData.summary.monthlyPaidTotal || 0)}</span>
            <span className="text-xs text-gray-400">Monthly</span>
          </div>
          {(feeData.summary.otherFeePaidTotal || 0) > 0 && (
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-sm font-semibold text-green-700">
                {formatCurrency((feeData.summary.monthlyPaidTotal || 0) + (feeData.summary.otherFeePaidTotal || 0))}
              </span>
              <span className="text-xs text-gray-400">Monthly + Other</span>
            </div>
          )}
          <div className="text-xs text-gray-500 mt-1">
            {feeData.summary.paidInstallments} installments paid
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
          <div className="flex items-center gap-2 text-red-600 font-semibold mb-2">
            <AlertCircle size={16} />
            Balance Amount
          </div>
          <div className="text-xl font-bold">
            {formatCurrency(feeData.summary.balanceAmount)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {feeData.summary.pendingInstallments} pending
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
          <div className="flex items-center gap-2 text-purple-600 font-semibold mb-2">
            <CalendarDays size={16} />
            Status
          </div>
          <div className="text-xl font-bold">
            {feeData.summary.balanceAmount === 0 ? "Paid" : "Pending"}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {feeData.summary.paidInstallments}/
            {feeData.summary.totalInstallments} paid
          </div>
        </div>
      </div>

      {/* Fee Schedule / Receipt Table / Fee Register Toggle */}
<div className="overflow-x-auto border rounded-lg">
  {showFeeRegister ? (
    // ── FEE REGISTER VIEW ──────────────────────────────────
    <>
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b">
        <FileText size={14} className="text-blue-600" />
        <span className="text-sm font-medium text-blue-700">Fee Register</span>
        <span className="text-xs text-blue-400 ml-1">— all payments for this student</span>
      </div>
      <table className="min-w-full">
        <thead>
          <tr style={{ backgroundColor: '#7B1C1C' }}>
            {['Date', 'Receipt No', 'Roll No', 'Student Name', 'Course', 'Batch Time', 'Submitted By', 'Fee Type', 'Amount'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {feeRegisterRows.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-16 text-center text-gray-400">
                <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                No fee payments recorded yet.
              </td>
            </tr>
          ) : (
            feeRegisterRows.map((record, idx) => (
              <tr key={idx} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {record.date ? new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
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
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
  {(() => {
    const key = `${record.receiptNo}_${record.feeType}`;
    const isVerified = verifiedPayments[key];
    const hasId = record.paymentMode && record.paymentMode !== 'cash' && record.paymentId;
    return (
      <div
        onClick={() => hasId && toggleVerified(key)}
        className={hasId ? "inline-flex flex-col items-start gap-0.5 cursor-pointer" : "inline-flex flex-col items-start gap-0.5"}
        title={hasId ? (isVerified ? "Click to mark as unverified" : "Click to confirm amount credited") : ""}
      >
        <span className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${
          isVerified
            ? "bg-green-100 text-green-700 border-green-300"
            : "bg-purple-100 text-purple-700 border-purple-200"
        }`}>
          {formatPaymentMode(record.paymentMode)}
          {isVerified && " ✓"}
        </span>
        {hasId && (
          <span className="text-[11px] text-gray-500 truncate max-w-[120px]" title={record.paymentId}>
            {record.paymentId}
          </span>
        )}
      </div>
    );
  })()}
</td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {record.batchTime}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
  {record.submittedBy || '—'}
</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    record.feeType === 'Exam Fee'    ? 'bg-yellow-100 text-yellow-800' :
                    record.feeType === 'Monthly Fee' ? 'bg-blue-100 text-blue-800'    :
                                                       'bg-green-100 text-green-800'
                  }`}>
                    {record.feeType}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-green-700 whitespace-nowrap">
                  ₹{(record.amount || 0).toLocaleString('en-IN')}
                </td>
              </tr>
            ))
          )}
        </tbody>
        {feeRegisterRows.length > 0 && (
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td colSpan={8} className="px-4 py-3 font-bold text-right text-sm">
                Total Collected ({feeRegisterRows.length} entries):
              </td>
              <td className="px-4 py-3 font-bold text-green-700 text-sm">
                ₹{feeRegisterRows.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString('en-IN')}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </>

  ) : showReceiptTable ? (
    // ── RECEIPT TABLE VIEW ──────────────────────────────────
    <>
      <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b">
        <Receipt size={14} className="text-indigo-600" />
        <span className="text-sm font-medium text-indigo-700">Receipt Table View</span>
        <span className="text-xs text-indigo-500 ml-1">— showing months with payments</span>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Month</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Receipt No</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Payment Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Mode</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Total Fee</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Amount Paid</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Balance</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {feeData.feeSchedule.map((fee, index) => {
            const hasPaid = fee.status === "paid" || fee.status === "partial";
            return (
              <tr
                key={index}
                className={`hover:bg-gray-50 ${!hasPaid ? "opacity-40" : ""} ${
                  fee.status === "paid" ? "bg-green-50" :
                  fee.status === "partial" ? "bg-blue-50" : ""
                }`}
              >
                <td className="px-4 py-3 whitespace-nowrap border-r">
                  <div className="font-medium text-sm">{fee.month}</div>
                  <div className="text-xs text-gray-400">Month {fee.monthNumber}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap border-r">
                  {fee.receiptNo ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-mono font-semibold">
                      <Receipt size={10} />
                      {fee.receiptNo}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap border-r">
                  {fee.paymentDate ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar size={13} className="text-gray-400" />
                      {new Date(fee.paymentDate).toLocaleDateString("en-IN")}
                    </div>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap border-r">
                  {fee.paymentMode ? (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 uppercase">
                      {fee.paymentMode}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap border-r text-sm font-medium">
                  {formatCurrency(fee.totalFee || 0)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap border-r">
                  <span className={`text-sm font-semibold ${hasPaid ? "text-green-600" : "text-gray-300"}`}>
                    {fee.paidAmount > 0 ? formatCurrency(fee.paidAmount) : "₹0"}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap border-r">
                  <span className={`text-sm font-medium ${fee.balanceAmount > 0 ? "text-red-500" : "text-green-600"}`}>
                    {formatCurrency(fee.balanceAmount || 0)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {fee.receiptNo ? (
                    <button
                      onClick={() => {
                        setSelectedReceipt({
                          receiptNo: fee.receiptNo,
                          date: fee.paymentDate || fee.dueDate,
                          studentId: feeData.student.studentId,
                          studentName: feeData.student.fullName,
                          course: feeData.course?.courseFullName || feeData.student.course,
                          month: fee.month,
                          amount: fee.paidAmount || 0,
                          paymentMode: fee.paymentMode || "cash",
                          balance: feeData.summary.balanceAmount,
                        });
                        setShowReceiptModal(true);
                      }}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium"
                    >
                      <Receipt size={12} /> View
                    </button>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
          <tr>
            <td colSpan="4" className="px-4 py-3 font-bold text-right text-sm">TOTALS:</td>
            <td className="px-4 py-3 font-bold border-r text-sm">{formatCurrency(feeData.summary.totalCourseFee || 0)}</td>
            <td className="px-4 py-3 font-bold text-green-600 border-r text-sm">{formatCurrency(feeData.summary.paidAmount || 0)}</td>
            <td className="px-4 py-3 font-bold text-red-500 border-r text-sm">{formatCurrency(feeData.summary.balanceAmount || 0)}</td>
            <td className="px-4 py-3" />
          </tr>
        </tfoot>
      </table>
    </>

  ) : (
    // ── DEFAULT FEE SCHEDULE TABLE ──────────────────────────
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Month</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Course</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Due Date</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Monthly Fee</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Exam Fee</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Total Fee</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Status</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Received Amount</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Actions</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {feeData.feeSchedule?.map((fee, index) => (
          <tr
            key={index}
            className={`hover:bg-gray-50 ${
              fee.status === "suspended" ? "bg-red-50 border-l-4 border-l-red-400" :
              fee.isExamMonth ? "bg-yellow-50" : ""
            } ${fee.status === "paid" ? "bg-green-50" : ""} ${
              fee.status === "partial" ? "bg-blue-50" : ""
            }`}
          >
            <td className="px-4 py-3 whitespace-nowrap border-r">
              <div className="font-medium">{fee.month}</div>
              {fee.isExamMonth && (
                <div className="text-xs text-yellow-600">{fee.examType || "Exam Month"}</div>
              )}
              <div className="text-xs text-gray-500">
                Month {fee.monthNumber}
                <button onClick={() => openMonthModal(fee, "edit")} className="ml-2 text-blue-600 hover:text-blue-900" title="Edit Monthly Fee">
                  <Edit size={10} />
                </button>
                <button onClick={() => deleteMonth(fee.monthNumber)} className="ml-1 text-red-400 hover:text-red-700" title="Delete Month">
                  <Trash2 size={10} />
                </button>
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap border-r">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                feeData?.student?.conversionHistory?.length > 0 &&
                feeData.student.conversionHistory.some(c => fee.monthNumber < c.conversionMonth)
                  ? "bg-blue-100 text-blue-700"
                  : "bg-purple-100 text-purple-700"
              }`}>
                {getCourseShortName(fee)}
              </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap border-r">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString("en-IN") : "N/A"}
              </div>
            </td>
                        <td className="px-4 py-3 whitespace-nowrap border-r">
              <div className="font-medium">{formatCurrency(fee.monthlyFee || fee.amount || 0)}</div>
              {fee.isExamMonth && (
                <div className="text-xs mt-1">
                  {(fee.monthlyPaid || 0) >= (fee.monthlyFee || fee.amount || 0) ? (
                    <span className="text-green-600">✅ Monthly paid</span>
                  ) : (fee.monthlyPaid || 0) > 0 ? (
                    <span className="text-orange-500">⚡ Partial: {formatCurrency(fee.monthlyPaid || 0)}</span>
                  ) : (
                    <span className="text-gray-400">⏳ Unpaid</span>
                  )}
                </div>
              )}
                                                                                    {(fee.otherFeeAmount || 0) > 0 && (() => {
                const savedDate = fee.otherFeeDate;
                return (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOtherFeeDateEdit({ monthNumber: fee.monthNumber, date: savedDate ? new Date(savedDate).toISOString().split("T")[0] : "", label: fee.otherFeeName || "Other Fee" });
                        setShowOtherFeeDateModal(true);
                      }}
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                        (fee.otherFeePaid || 0) >= (fee.otherFeeAmount || 0)
                          ? "bg-blue-100 text-blue-700"
                          : "bg-red-100 text-red-700"
                      }`}
                      title="Click to set the date this fee was added"
                    >
                      {fee.otherFeeName || "Other Fee"} — ₹{fee.otherFeeAmount}
                      {(fee.otherFeePaid || 0) >= (fee.otherFeeAmount || 0) ? " ✓" : ""}
                      {savedDate && (
                        <span className="ml-1 opacity-70">
                          ({new Date(savedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
                        </span>
                      )}
                    </button>
                  </div>
                );
              })()}
            </td>
            <td className="px-4 py-3 whitespace-nowrap border-r">
              <div className={`font-medium ${fee.isExamMonth ? "text-red-600" : "text-gray-400"}`}>
                {fee.isExamMonth ? formatCurrency(fee.examFee || 0) : "-"}
              </div>
              {fee.isExamMonth && (
                <div className="text-xs mt-1">
                  {(fee.examPaid || 0) >= (fee.examFee || 0) && (fee.examFee || 0) > 0 ? (
                    <span className="text-green-600">✅ Exam eligible</span>
                  ) : (fee.examPaid || 0) > 0 ? (
                    <span className="text-orange-500">⚡ {formatCurrency(fee.examPaid || 0)} paid</span>
                  ) : (
                    <span className="text-red-400">❌ Not eligible</span>
                  )}
                </div>
              )}
            </td>
            <td className="px-4 py-3 whitespace-nowrap border-r">
              <div className="font-bold">
                {formatCurrency(fee.totalFee || fee.totalAmount || (fee.amount || 0) + (fee.isExamMonth ? fee.examFee || 0 : 0))}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap border-r">
              {fee.status === "suspended" ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <AlertCircle size={12} className="mr-1" />
                  Suspended
                  {fee.remarks && (
                    <span className="ml-1 text-red-600 truncate max-w-[100px]" title={fee.remarks}>
                      — {fee.remarks.replace("Suspended: ", "")}
                    </span>
                  )}
                </span>
              ) : (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  fee.status === "paid"    ? "bg-green-100 text-green-800" :
                  fee.status === "overdue" ? "bg-red-100 text-red-800"    :
                  fee.status === "partial" ? "bg-blue-100 text-blue-800"  :
                                             "bg-yellow-100 text-yellow-800"
                }`}>
                  {fee.status === "paid"    && <CheckCircle size={12} className="mr-1" />}
                  {fee.status === "overdue" && <AlertCircle size={12} className="mr-1" />}
                  {fee.status === "partial" && <AlertCircle size={12} className="mr-1" />}
                  {fee.status?.charAt(0).toUpperCase() + fee.status?.slice(1)}
                  {fee.status === "partial" && fee.balanceAmount > 0 && (
                    <span className="ml-1">({formatCurrency(fee.balanceAmount)} due)</span>
                  )}
                </span>
              )}
            </td>
            <td className="px-4 py-3 whitespace-nowrap border-r">
              <div className={`font-medium ${fee.paidAmount > 0 ? "text-green-600" : "text-gray-400"}`}>
                {fee.paidAmount > 0 ? formatCurrency(fee.paidAmount) : "₹0"}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap border-r">
              <div className="flex gap-2">
                {fee.status === "paid" || fee.status === "partial" ? (
                  <>
                    <button onClick={() => openPaymentModal(fee, "edit")} className="p-1 text-blue-600 hover:text-blue-900 rounded hover:bg-blue-50" title="Edit Payment">
                      <Edit size={16} />
                    </button>
                    {fee.isExamMonth ? (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => deleteMonthlyFee(fee)}
                          disabled={(fee.monthlyPaid || 0) === 0}
                          className="px-1.5 py-0.5 text-xs text-orange-600 border border-orange-300 rounded hover:bg-orange-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Delete Monthly Fee Only"
                        >
                          -Monthly
                        </button>
                        <button
                          onClick={() => deleteExamFee(fee)}
                          disabled={(fee.examPaid || 0) === 0}
                          className="px-1.5 py-0.5 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Delete Exam Fee Only"
                        >
                          -Exam
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => deletePayment(fee)} className="p-1 text-red-600 hover:text-red-900 rounded hover:bg-red-50" title="Delete Payment">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </>
                ) : fee.status === "suspended" ? (
                  <button
                    type="button"
                    onClick={() => handleUnsuspend(fee)}
                    className="px-2 py-1 text-xs text-red-500 border border-red-300 rounded hover:bg-red-50 hover:text-red-700 transition-colors"
                    title="Unsuspend Month"
                  >
                    Unsuspend
                  </button>
                ) : (
                  <>
                    <button onClick={() => openPaymentModal(fee, "add")} className="p-1 text-green-600 hover:text-green-900 rounded hover:bg-green-50" title="Add Payment">
                      <Plus size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSuspendData({ monthNumber: fee.monthNumber, month: fee.month, reason: "" });
                        setShowSuspendModal(true);
                      }}
                      className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                      title="Suspend Month"
                    >
                      <AlertCircle size={16} />
                    </button>
                  </>
                )}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              {fee.receiptNo ? (
                <button
                  onClick={() => {
                    setSelectedReceipt({
                      receiptNo: fee.receiptNo,
                      date: fee.paymentDate || fee.dueDate,
                      studentId: feeData.student.studentId,
                      studentName: feeData.student.fullName,
                      course: feeData.course?.courseFullName || feeData.student.course,
                      month: fee.month,
                      amount: fee.paidAmount || 0,
                      paymentMode: fee.paymentMode || "cash",
                      balance: feeData.summary.balanceAmount,
                    });
                    setShowReceiptModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-900"
                  title="View Receipt"
                >
                  <Receipt size={16} />
                </button>
              ) : (
                <div className="text-gray-400 text-sm">-</div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot className="bg-gray-50">
        <tr>
          <td colSpan="3" className="px-4 py-3 font-bold text-right">TOTALS:</td>
          <td className="px-4 py-3 font-bold border-r">{formatCurrency(feeData.summary.totalMonthlyFees || 0)}</td>
          <td className="px-4 py-3 font-bold border-r">{formatCurrency(feeData.summary.totalExamFees || 0)}</td>
          <td className="px-4 py-3 font-bold border-r">{formatCurrency(feeData.summary.totalCourseFee || 0)}</td>
          <td className="px-4 py-3 border-r"></td>
          <td className="px-4 py-3 font-bold border-r">{formatCurrency(feeData.summary.paidAmount || 0)}</td>
          <td className="px-4 py-3 border-r"></td>
          <td className="px-4 py-3"></td>
        </tr>
      </tfoot>
    </table>
  )}
</div>
      {/* Course Fee Breakdown */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold mb-2">Fee Breakdown</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Monthly Fee</div>
            <div className="font-medium">
              {formatCurrency(feeData.summary.monthlyFee)} ×{" "}
              {feeData.summary.totalInstallments} months
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Exam Fees</div>
            <div className="font-medium">
              {formatCurrency(feeData.summary.examFee)} ×{" "}
              {feeData.feeSchedule?.filter(f => f.isExamMonth).length || 0} exams
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Admission Fee</div>
            <div className="font-medium">
              {formatCurrency(feeData.summary.admissionFee)}
            </div>
          </div>
        </div>
      </div>

      {/* STEP 4 — Add/Edit Month Modal (redesigned) */}
      {showMonthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Colored header */}
            <div className={`px-6 py-4 ${monthManagementData.action === "edit" ? "bg-gradient-to-r from-blue-600 to-blue-700" : "bg-gradient-to-r from-violet-600 to-violet-700"}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-white font-bold text-lg">
                    {monthManagementData.action === "edit" ? "Edit Monthly Fee" : "Add Month(s)"}
                  </h3>
                  <p className="text-white/70 text-xs mt-0.5">
                    {monthManagementData.action === "edit"
                      ? `Updating Month ${monthManagementData.monthNumber} — ${monthManagementData.monthName}`
                      : `Starting from Month ${monthManagementData.monthNumber}`}
                  </p>
                </div>
                <button onClick={() => setShowMonthModal(false)} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
              </div>
            </div>

            <div className="p-6 space-y-4">

              {/* Count input — only for add */}
              {monthManagementData.action === "add" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Number of Months to Add</label>
                  <input
                    type="number" min="1" max="12"
                    value={monthManagementData.count}
                    onChange={(e) => setMonthManagementData({ ...monthManagementData, count: parseInt(e.target.value) || 1 })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              )}

              {/* Monthly base fee + due date side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Monthly Base Fee (₹)</label>
                  <input
                    type="number"
                    value={monthManagementData.baseFee}
                    onChange={(e) => setMonthManagementData({ ...monthManagementData, baseFee: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={monthManagementData.dueDate}
                    onChange={(e) => setMonthManagementData({ ...monthManagementData, dueDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              {/* Exam fee toggle */}
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <div
                    onClick={() => {
                      const isChecked = !monthManagementData.isExamMonth;
                      setMonthManagementData({
                        ...monthManagementData,
                        isExamMonth: isChecked,
                        examFee: isChecked ? (monthManagementData.examFee || course?.examFee || student?.examFee || 0) : 0,
                      });
                    }}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${monthManagementData.isExamMonth ? "bg-amber-500" : "bg-gray-300"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${monthManagementData.isExamMonth ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Include Exam Fee</span>
                  {monthManagementData.isExamMonth && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Exam Month</span>}
                </label>

                {monthManagementData.isExamMonth && (
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Exam Fee (₹)</label>
                    <input
                      type="number" min="0"
                      value={monthManagementData.examFee}
                      onChange={(e) => setMonthManagementData({ ...monthManagementData, examFee: e.target.value })}
                      className="w-full border border-amber-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

                            {/* Other fee toggle */}
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <div
                    onClick={() => {
                      const isChecked = !monthManagementData.hasOtherFee;
                      setMonthManagementData({
                        ...monthManagementData,
                        hasOtherFee: isChecked,
                        otherFeeId: isChecked ? monthManagementData.otherFeeId : "",
                        otherFeeName: isChecked ? monthManagementData.otherFeeName : "",
                        otherFeeAmount: isChecked ? monthManagementData.otherFeeAmount : "",
                      });
                    }}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${monthManagementData.hasOtherFee ? "bg-purple-500" : "bg-gray-300"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${monthManagementData.hasOtherFee ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Include Other Fee</span>
                  {monthManagementData.hasOtherFee && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Other Fee</span>}
                </label>

                {monthManagementData.hasOtherFee && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Fee Type</label>
                      <select
                        value={monthManagementData.otherFeeId}
                        onChange={(e) => {
                          const found = otherFeesOptions.find(f => f.id === e.target.value);
                          setMonthManagementData({
                            ...monthManagementData,
                            otherFeeId: e.target.value,
                            otherFeeName: found?.name || "",
                            otherFeeAmount: found?.amount ?? monthManagementData.otherFeeAmount,
                          });
                        }}
                        className="w-full border border-purple-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                      >
                        <option value="">Select a fee type</option>
                        {otherFeesOptions.map(f => (
                          <option key={f.id} value={f.id}>{f.name} — ₹{f.amount}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Other Fee Amount (₹)</label>
                      <input
                        type="number" min="0"
                        value={monthManagementData.otherFeeAmount}
                        onChange={(e) => setMonthManagementData({ ...monthManagementData, otherFeeAmount: e.target.value })}
                        className="w-full border border-purple-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Total fee preview pill */}
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
                <span className="text-sm text-blue-700 font-medium">Total per month</span>
                <span className="text-lg font-bold text-blue-800">
                  ₹{(parseFloat(monthManagementData.baseFee) || 0)
                    + (monthManagementData.isExamMonth ? (parseFloat(monthManagementData.examFee) || 0) : 0)
                    + (monthManagementData.hasOtherFee ? (parseFloat(monthManagementData.otherFeeAmount) || 0) : 0)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button onClick={() => setShowMonthModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                Cancel
              </button>
              <button
                onClick={handleAddMonth}
                className={`px-5 py-2 text-sm text-white rounded-lg font-medium ${monthManagementData.action === "edit" ? "bg-blue-600 hover:bg-blue-700" : "bg-violet-600 hover:bg-violet-700"}`}
              >
                {monthManagementData.action === "edit" ? "Update Fee" : `Add ${monthManagementData.count} Month(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5 — Payment Modal (redesigned) */}
      {showPaymentModal && selectedMonth && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Colored header with fee summary */}
            <div className={`px-6 py-5 ${paymentData.action === "edit" ? "bg-gradient-to-r from-blue-600 to-blue-700" : "bg-gradient-to-r from-emerald-500 to-emerald-600"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/70 text-xs uppercase tracking-wider font-semibold mb-0.5">
                    {paymentData.action === "edit" ? "Update Payment" : "Record Payment"}
                  </p>
                  <h3 className="text-white font-bold text-xl">{selectedMonth.month}</h3>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
              </div>

              {/* Fee summary chips */}
              <div className="flex gap-2 mt-4 flex-wrap">
                <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                  <div className="text-white/70 text-xs">Total Fee</div>
                  <div className="text-white font-bold text-sm">
                    {formatCurrency(selectedMonth.totalFee || (selectedMonth.monthlyFee || 0) + (selectedMonth.isExamMonth ? selectedMonth.examFee || 0 : 0))}
                  </div>
                </div>
                {selectedMonth.paidAmount > 0 && (
                  <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                    <div className="text-white/70 text-xs">Already Paid</div>
                    <div className="text-white font-bold text-sm">{formatCurrency(selectedMonth.paidAmount)}</div>
                  </div>
                )}
                <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                  <div className="text-white/70 text-xs">Balance</div>
                  <div className="text-white font-bold text-sm">{formatCurrency(selectedMonth.balanceAmount || 0)}</div>
                </div>
                <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                  <div className="text-white/70 text-xs">Due</div>
                  <div className="text-white font-bold text-sm">
                    {selectedMonth.dueDate ? new Date(selectedMonth.dueDate).toLocaleDateString("en-IN") : "N/A"}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Amount */}
                            {selectedMonth.isExamMonth || (selectedMonth.otherFeeAmount || 0) > 0 ? (
                <div className="space-y-3">
                  <div className={`grid gap-3 ${selectedMonth.isExamMonth && (selectedMonth.otherFeeAmount || 0) > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monthly Fee (₹)</label>
                        <span className="text-xs text-gray-400">Max: {formatCurrency(getMaxMonthlyPaymentAllowed())}</span>
                      </div>
                      <input
                        type="number"
                        value={paymentData.monthlyAmount}
                        onChange={(e) => setPaymentData({ ...paymentData, monthlyAmount: e.target.value })}
                        className={`w-full border rounded-lg px-3 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 ${
                          parseFloat(paymentData.monthlyAmount || 0) > getMaxMonthlyPaymentAllowed()
                            ? "border-red-300 focus:ring-red-300"
                            : "border-gray-200 focus:ring-blue-400"
                        }`}
                        placeholder="0"
                      />
                      {parseFloat(paymentData.monthlyAmount || 0) > getMaxMonthlyPaymentAllowed() && (
                        <p className="text-red-500 text-xs mt-1">⚠ Exceeds monthly fee remaining</p>
                      )}
                    </div>
                    {selectedMonth.isExamMonth && (
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-xs font-semibold text-yellow-700 uppercase tracking-wider">Exam Fee (₹)</label>
                          <span className="text-xs text-gray-400">Max: {formatCurrency(getMaxExamPaymentAllowed())}</span>
                        </div>
                        <input
                          type="number"
                          value={paymentData.examAmount}
                          onChange={(e) => setPaymentData({ ...paymentData, examAmount: e.target.value })}
                          className={`w-full border rounded-lg px-3 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 bg-yellow-50 ${
                            parseFloat(paymentData.examAmount || 0) > getMaxExamPaymentAllowed()
                              ? "border-red-300 focus:ring-red-300"
                              : "border-yellow-300 focus:ring-yellow-400"
                          }`}
                          placeholder="0"
                        />
                        {parseFloat(paymentData.examAmount || 0) > getMaxExamPaymentAllowed() && (
                          <p className="text-red-500 text-xs mt-1">⚠ Exceeds exam fee remaining</p>
                        )}
                      </div>
                    )}
                    {(selectedMonth.otherFeeAmount || 0) > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                            {selectedMonth.otherFeeName || "Other Fee"} (₹)
                          </label>
                          <span className="text-xs text-gray-400">Max: {formatCurrency(getMaxOtherPaymentAllowed())}</span>
                        </div>
                        <input
                          type="number"
                          value={paymentData.otherAmount}
                          onChange={(e) => setPaymentData({ ...paymentData, otherAmount: e.target.value })}
                          className={`w-full border rounded-lg px-3 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 bg-purple-50 ${
                            parseFloat(paymentData.otherAmount || 0) > getMaxOtherPaymentAllowed()
                              ? "border-red-300 focus:ring-red-300"
                              : "border-purple-300 focus:ring-purple-400"
                          }`}
                          placeholder="0"
                        />
                        {parseFloat(paymentData.otherAmount || 0) > getMaxOtherPaymentAllowed() && (
                          <p className="text-red-500 text-xs mt-1">⚠ Exceeds other fee remaining</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    <span className="text-sm text-gray-600">Total paying:</span>
                    <span className="font-bold text-gray-800">
                      {formatCurrency((parseFloat(paymentData.monthlyAmount) || 0) + (parseFloat(paymentData.examAmount) || 0) + (parseFloat(paymentData.otherAmount) || 0))}
                    </span>
                  </div>
                  {checkOverpayment((parseFloat(paymentData.monthlyAmount) || 0) + (parseFloat(paymentData.examAmount) || 0) + (parseFloat(paymentData.otherAmount) || 0)) && (
                    <p className="text-red-500 text-xs">⚠ Payment would exceed total course fee</p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount (₹)</label>
                    <span className="text-xs text-gray-400">Max: {formatCurrency(getMaxPaymentAllowed())}</span>
                  </div>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2.5 text-lg font-semibold focus:outline-none focus:ring-2 ${
                      parseFloat(paymentData.amount || 0) > getMaxPaymentAllowed() || checkOverpayment(paymentData.amount)
                        ? "border-red-300 focus:ring-red-300"
                        : "border-gray-200 focus:ring-emerald-400"
                    }`}
                    placeholder="Enter amount"
                  />
                  {parseFloat(paymentData.amount || 0) > getMaxPaymentAllowed() && (
                    <p className="text-red-500 text-xs mt-1">⚠ Amount exceeds maximum allowed for this month</p>
                  )}
                  {checkOverpayment(paymentData.amount) && (
                    <p className="text-red-500 text-xs mt-1">⚠ Payment would exceed total course fee</p>
                  )}
                </div>
              )}

              {/* Date + Receipt side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Payment Date</label>
                  <input
                    type="date"
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Receipt No</label>
                  <input
                    type="text"
                    value={paymentData.receiptNo}
                    onChange={(e) => setPaymentData({ ...paymentData, receiptNo: e.target.value.toUpperCase() })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="RC2600..."
                  />
                </div>
              </div>

              {/* Payment mode */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Payment Mode</label>
                <div className="grid grid-cols-4 gap-2">
                  {["cash", "cheque", "bank_transfer", "online"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPaymentData({ ...paymentData, paymentMode: mode })}
                      className={`py-2 px-1 rounded-lg text-xs font-medium border transition-all ${
                        paymentData.paymentMode === mode
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-200 text-gray-600 hover:border-blue-300"
                      }`}
                    >
                      {mode === "bank_transfer" ? "Bank" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {paymentData.paymentMode !== "cash" && (
  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
      {paymentData.paymentMode === "cheque" ? "Cheque No" : paymentData.paymentMode === "bank_transfer" ? "Bank Transaction No" : "UPI / Transaction ID"}
    </label>
    <input
      type="text"
      value={paymentData.paymentId}
      onChange={(e) => setPaymentData({ ...paymentData, paymentId: e.target.value })}
      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      placeholder="Enter reference / UPI ID"
    />
  </div>
)}

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Remarks <span className="font-normal normal-case text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={paymentData.remarks}
                  onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows="2"
                  placeholder="Any notes..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                Cancel
              </button>
              <button
                onClick={handlePayment}
                                disabled={
                  selectedMonth.isExamMonth || (selectedMonth.otherFeeAmount || 0) > 0
                    ? (
                        ((parseFloat(paymentData.monthlyAmount) || 0) + (parseFloat(paymentData.examAmount) || 0) + (parseFloat(paymentData.otherAmount) || 0)) <= 0 ||
                        parseFloat(paymentData.monthlyAmount || 0) > getMaxMonthlyPaymentAllowed() ||
                        parseFloat(paymentData.examAmount || 0) > getMaxExamPaymentAllowed() ||
                        parseFloat(paymentData.otherAmount || 0) > getMaxOtherPaymentAllowed() ||
                        checkOverpayment((parseFloat(paymentData.monthlyAmount) || 0) + (parseFloat(paymentData.examAmount) || 0) + (parseFloat(paymentData.otherAmount) || 0))
                      )
                    : (
                        !paymentData.amount ||
                        parseFloat(paymentData.amount || 0) <= 0 ||
                        parseFloat(paymentData.amount || 0) > getMaxPaymentAllowed() ||
                        checkOverpayment(paymentData.amount)
                      )
                }
                className={`px-5 py-2 text-sm text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                  paymentData.action === "edit" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-500 hover:bg-emerald-600"
                }`}
              >
                <CheckCircle size={15} />
                {paymentData.action === "edit" ? "Update Payment" : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6 — Receipt Modal (redesigned) */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">

            {/* Top accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-blue-500 to-violet-500" />

            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-5">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
                    {selectedReceipt.action === "edit" ? "Updated Receipt" : "Payment Receipt"}
                  </p>
                  <h3 className="text-xl font-black text-gray-800 mt-0.5">
                    {formatCurrency(selectedReceipt.amount)}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">{selectedReceipt.action === "edit" ? "Updated Amount" : "Amount Received"}</p>
                </div>
                <button onClick={() => setShowReceiptModal(false)} className="text-gray-300 hover:text-gray-500 text-2xl leading-none">&times;</button>
              </div>

              {/* Receipt number badge */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 mb-5 border border-dashed border-gray-200">
                <Receipt size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500">Receipt No:</span>
                <span className="text-sm font-mono font-bold text-gray-800">{selectedReceipt.receiptNo}</span>
              </div>

              {/* Details */}
              <div className="space-y-2.5 text-sm">
                {[
                  ["Date", new Date(selectedReceipt.date).toLocaleDateString("en-IN")],
                  ["Student ID", selectedReceipt.studentId],
                  ["Student Name", selectedReceipt.studentName],
                  ["Course", selectedReceipt.course],
                  ["Month", selectedReceipt.month],
                  ["Payment Mode", selectedReceipt.paymentMode?.toUpperCase()],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center border-b border-gray-50 pb-2">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium text-gray-800 text-right max-w-[55%]">{value}</span>
                  </div>
                ))}
              </div>

              {/* Balance */}
              {selectedReceipt.balance !== undefined && (
                <div className="mt-4 flex justify-between items-center bg-gray-50 rounded-lg px-4 py-3">
                  <span className="text-sm text-gray-500">Remaining Balance</span>
                  <span className={`font-bold text-base ${selectedReceipt.balance === 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {formatCurrency(selectedReceipt.balance)}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                >
                  Close
                </button>
                <button
                  onClick={printReceipt}
                  className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1.5"
                >
                  <Printer size={14} /> Print
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(selectedReceipt, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `receipt-${selectedReceipt.receiptNo}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="flex-1 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center gap-1.5"
                >
                  <Download size={14} /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showSuspendModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
      
      <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold text-lg">Suspend Month</h3>
            <p className="text-white/70 text-xs mt-0.5">
              {suspendData.month} — Month {suspendData.monthNumber}
            </p>
          </div>
          <button 
            onClick={() => setShowSuspendModal(false)} 
            className="text-white/70 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="p-4 bg-red-50 rounded-lg border border-red-100">
          <p className="text-sm text-red-700 font-medium">⚠ What will happen:</p>
          <ul className="text-sm text-red-600 mt-2 space-y-1 list-disc list-inside">
            <li>Month {suspendData.monthNumber} will be marked as <strong>Suspended</strong></li>
            <li>A new month will be <strong>auto-added at the end</strong> with the same fee</li>
            <li>This action can be undone by deleting the suspended month</li>
          </ul>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Reason for Suspension <span className="text-red-500">*</span>
          </label>
          <textarea
            value={suspendData.reason}
            onChange={(e) => setSuspendData({ ...suspendData, reason: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            rows="3"
            placeholder="e.g. Student was absent the entire month..."
          />
        </div>
      </div>

      <div className="px-6 pb-6 flex justify-end gap-3">
        <button 
          onClick={() => setShowSuspendModal(false)} 
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          Cancel
        </button>
                <button
          onClick={handleSuspend}
          disabled={!suspendData.reason.trim()}
          className="px-5 py-2 text-sm text-white rounded-lg font-medium bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <AlertCircle size={15} />
          Suspend & Add New Month
        </button>
      </div>
    </div>
  </div>
)}

      {showOtherFeeDateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold">Other Fee Added On</h3>
                <p className="text-white/70 text-xs mt-0.5">{otherFeeDateEdit.label}</p>
              </div>
              <button onClick={() => setShowOtherFeeDateModal(false)} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date requested / added</label>
                <input
                  type="date"
                  value={otherFeeDateEdit.date}
                  onChange={(e) => setOtherFeeDateEdit({ ...otherFeeDateEdit, date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700">
                Visible to anyone who opens this student's fee page. It's just a note — doesn't affect fees, receipts, or reports.
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
                            {otherFeeDateEdit.date && (
                <button
                  onClick={() => {
                    saveOtherFeeDate(otherFeeDateEdit.monthNumber, "");
                    setShowOtherFeeDateModal(false);
                  }}
                  className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  Clear
                </button>
              )}
              <button onClick={() => setShowOtherFeeDateModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                Cancel
              </button>
              <button
                onClick={() => {
                  saveOtherFeeDate(otherFeeDateEdit.monthNumber, otherFeeDateEdit.date);
                  setShowOtherFeeDateModal(false);
                }}
                className="px-5 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeManagement;