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
  const [paymentData, setPaymentData] = useState({
    monthNumber: "",
    amount: "",
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
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showReceiptTable, setShowReceiptTable] = useState(false); // STEP 1
  const [monthManagementData, setMonthManagementData] = useState({
    action: "add", // 'add' or 'edit'
    monthNumber: "",
    monthName: "",
    baseFee: "",
    isExamMonth: false,
    examFee: "",
    dueDate: "",
    count: 1,
  });

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  paymentMode: fee.paymentMode || "",
  remarks: fee.remarks || ""
});

const calcTotals = (schedule) => ({
  totalCourseFee: schedule.reduce((s, f) => s + ((f.baseFee || 0) + (f.isExamMonth ? (f.examFee || 0) : 0)), 0),
  paidAmount:     schedule.reduce((s, f) => s + (f.paidAmount   || 0), 0),
  balanceAmount:  schedule.reduce((s, f) => s + (f.balanceAmount|| 0), 0),
});

  useEffect(() => {
    if (studentId) {
      fetchStudentFees();
    }
  }, [studentId, student?.admissionDate]);

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
  
  const totalCourseFee = processedSchedule.reduce((s, f) => 
    s + (f.baseFee || 0) + (f.isExamMonth ? (f.examFee || 0) : 0), 0);
  const paidAmount = processedSchedule.reduce((s, f) => s + (f.paidAmount || 0), 0);

  const processedData = {
    ...data.data,
    feeSchedule: processedSchedule,
    summary: {
      ...data.data.summary,
      totalCourseFee,
      paidAmount,
      balanceAmount: totalCourseFee - paidAmount,
      totalMonthlyFees: processedSchedule.reduce((s, f) => s + (f.baseFee || 0), 0),
      totalExamFees: processedSchedule.reduce((s, f) => s + (f.isExamMonth ? (f.examFee || 0) : 0), 0),
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
      dueDate: nextDueDate,
      count: 1,
    });
    setShowMonthModal(true);
  }
};
  

 const handleAddMonth = async () => {
  const { action, monthNumber, baseFee, isExamMonth, examFee, dueDate, count } = monthManagementData;
  
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
      const totalFee = parseFloat(baseFee) + (isExamMonth ? parseFloat(examFee || 0) : 0);
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
        const totalFee = parseFloat(baseFee) + (isExam ? parseFloat(examFee || 0) : 0);
        
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

  const updateFeeSchedule = (updatedFeeSchedule) => {
  // Sort by month number first
  const sortedSchedule = [...updatedFeeSchedule].sort((a, b) => a.monthNumber - b.monthNumber);
  
  const totalCourseFee = sortedSchedule.reduce((sum, fee) => sum + (fee.totalFee || 0), 0);
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
      totalMonthlyFees: sortedSchedule.reduce((sum, fee) => sum + (fee.baseFee || 0), 0),
      totalExamFees: sortedSchedule.reduce((sum, fee) => sum + (fee.examFee || 0), 0),
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

  if (action === "edit" && (fee.status === "paid" || fee.status === "partial")) {
    // ✅ Pre-fill with the CURRENT paid amount (not adding on top)
    setPaymentData({
      monthNumber: fee.monthNumber,
      amount: fee.paidAmount || "",         // show what was already entered
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
            onClick={() => setRefreshing(true) || fetchStudentFees()}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          {/* STEP 2 — Updated More Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMoreActions(!showMoreActions)}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
            >
              <MoreVertical size={16} />
              {showMoreActions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showMoreActions && (
              <div className="absolute right-0 mt-1 w-52 bg-white border rounded-lg shadow-lg z-10 py-1">
                {/* Toggle between fee table and receipt table */}
                <button
                  onClick={() => {
                    setShowReceiptTable(!showReceiptTable);
                    setShowMoreActions(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-indigo-600 font-medium"
                >
                  <Receipt size={14} />
                  {showReceiptTable ? "Fee Schedule View" : "Receipt Table View"}
                </button>

                <div className="border-t my-1" />

                <button
                  onClick={() => {
                    openMonthModal(null, "add");
                    setShowMoreActions(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Plus size={14} />
                  Add Month(s)
                </button>
                <button
                  onClick={() => {
                    saveChangesToBackend();
                    setShowMoreActions(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileText size={14} />
                  Save Changes
                </button>

                <div className="border-t my-1" />

                <button
                  onClick={() => {
                    const pendingMonth = feeData.feeSchedule.find(f => f.status === "pending");
                    if (pendingMonth) {
                      openPaymentModal(pendingMonth, "add");
                    } else {
                      alert("All months are already paid!");
                    }
                    setShowMoreActions(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-green-600"
                >
                  <Plus size={14} />
                  Add Payment
                </button>
              </div>
            )}
          </div>
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
          <div className="text-xl font-bold">
            {formatCurrency(feeData.summary.paidAmount)}
          </div>
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

      {/* STEP 3 — Fee Schedule / Receipt Table Toggle */}
      <div className="overflow-x-auto border rounded-lg">
        {showReceiptTable ? (
          // ── RECEIPT TABLE VIEW ────────────────────────────────────
          <>
            {/* View label */}
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
                      className={`hover:bg-gray-50 ${
                        !hasPaid ? "opacity-40" : ""
                      } ${fee.status === "paid" ? "bg-green-50" : fee.status === "partial" ? "bg-blue-50" : ""}`}
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

              {/* Footer totals */}
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
          // ── ORIGINAL FEE SCHEDULE TABLE ───────────────────────────
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Month
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Monthly Fee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Exam Fee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Total Fee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Received Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Actions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipt
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {feeData.feeSchedule?.map((fee, index) => (
                <tr
                  key={index}
                  className={`hover:bg-gray-50 ${
                    fee.isExamMonth ? "bg-yellow-50" : ""
                  } ${fee.status === "paid" ? "bg-green-50" : ""} ${
                    fee.status === "partial" ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap border-r">
                    <div className="font-medium">{fee.month}</div>
                    {fee.isExamMonth && (
                      <div className="text-xs text-yellow-600">
                        {fee.examType || "Exam Month"}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Month {fee.monthNumber}
                      <button
                        onClick={() => openMonthModal(fee, "edit")}
                        className="ml-2 text-blue-600 hover:text-blue-900"
                        title="Edit Monthly Fee"
                      >
                        <Edit size={10} />
                      </button>
                      <button
                        onClick={() => deleteMonth(fee.monthNumber)}
                        className="ml-1 text-red-400 hover:text-red-700"
                        title="Delete Month"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap border-r">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString("en-IN") : "N/A"}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap border-r">
                    <div className="font-medium">
                      {formatCurrency(fee.monthlyFee || fee.amount || 0)}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap border-r">
                    <div
                      className={`font-medium ${
                        fee.isExamMonth ? "text-red-600" : "text-gray-400"
                      }`}
                    >
                      {fee.isExamMonth ? formatCurrency(fee.examFee || 0) : "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap border-r">
                    <div className="font-bold">
                      {formatCurrency(
                        fee.totalFee ||
                          fee.totalAmount ||
                          (fee.amount || 0) +
                            (fee.isExamMonth ? fee.examFee || 0 : 0)
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap border-r">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        fee.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : fee.status === "overdue"
                          ? "bg-red-100 text-red-800"
                          : fee.status === "partial"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {fee.status === "paid" && (
                        <CheckCircle size={12} className="mr-1" />
                      )}
                      {fee.status === "overdue" && (
                        <AlertCircle size={12} className="mr-1" />
                      )}
                      {fee.status === "partial" && (
                        <AlertCircle size={12} className="mr-1" />
                      )}
                      {fee.status?.charAt(0).toUpperCase() + fee.status?.slice(1)}
                      {fee.status === "partial" && fee.balanceAmount > 0 && (
                        <span className="ml-1">({formatCurrency(fee.balanceAmount)} due)</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap border-r">
                    <div className={`font-medium ${fee.paidAmount > 0 ? "text-green-600" : "text-gray-400"}`}>
                      {fee.paidAmount > 0
                        ? formatCurrency(fee.paidAmount)
                        : "₹0"}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap border-r">
                    <div className="flex gap-2">
                      {fee.status === "paid" || fee.status === "partial" ? (
                        <>
                          <button
                            onClick={() => openPaymentModal(fee, "edit")}
                            className="p-1 text-blue-600 hover:text-blue-900 rounded hover:bg-blue-50"
                            title="Edit Payment"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => deletePayment(fee)}
                            className="p-1 text-red-600 hover:text-red-900 rounded hover:bg-red-50"
                            title="Delete Payment"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => openPaymentModal(fee, "add")}
                          className="p-1 text-green-600 hover:text-green-900 rounded hover:bg-green-50"
                          title="Add Payment"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {fee.receiptNo ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedReceipt({
                              receiptNo: fee.receiptNo,
                              date: fee.paymentDate || fee.dueDate,
                              studentId: feeData.student.studentId,
                              studentName: feeData.student.fullName,
                              course:
                                feeData.course?.courseFullName ||
                                feeData.student.course,
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
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">-</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Footer with Totals */}
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan="2" className="px-4 py-3 font-bold text-right">
                  TOTALS:
                </td>
                <td className="px-4 py-3 font-bold border-r">
                  {formatCurrency(feeData.summary.totalMonthlyFees || 0)}
                </td>
                <td className="px-4 py-3 font-bold border-r">
                  {formatCurrency(feeData.summary.totalExamFees || 0)}
                </td>
                <td className="px-4 py-3 font-bold border-r">
                  {formatCurrency(feeData.summary.totalCourseFee || 0)}
                </td>
                <td className="px-4 py-3 border-r"></td>
                <td className="px-4 py-3 font-bold border-r">
                  {formatCurrency(feeData.summary.paidAmount || 0)}
                </td>
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

              {/* Total fee preview pill */}
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
                <span className="text-sm text-blue-700 font-medium">Total per month</span>
                <span className="text-lg font-bold text-blue-800">
                  ₹{(parseFloat(monthManagementData.baseFee) || 0) + (monthManagementData.isExamMonth ? (parseFloat(monthManagementData.examFee) || 0) : 0)}
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
                  !paymentData.amount ||
                  parseFloat(paymentData.amount || 0) <= 0 ||
                  parseFloat(paymentData.amount || 0) > getMaxPaymentAllowed() ||
                  checkOverpayment(paymentData.amount)
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
    </div>
  );
};

export default FeeManagement;