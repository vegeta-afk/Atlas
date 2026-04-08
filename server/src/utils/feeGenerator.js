// utils/feeGenerator.js

// ─── HELPER: Add months without day overflow ──────────────────
// Problem: new Date("2026-01-31").setMonth(1) = March 3 (skips Feb!)
// Fix: anchor to day 1 first, THEN shift the month
function addMonthsSafe(baseDate, months) {
  const d = new Date(baseDate);
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ─── HELPER: Parse "6,14" or "6, 14" → [6, 14] ───────────────
// Filters out any month numbers beyond course duration
function parseExamMonths(examMonthsStr, durationMonths) {
  if (!examMonthsStr || examMonthsStr.trim() === "") return [];
  return examMonthsStr
    .split(",")
    .map(m => parseInt(m.trim(), 10))
    .filter(m => !isNaN(m) && m > 0 && m <= durationMonths);
}

const generateFeeSchedule = (course, startDate) => {
  try {
    console.log("💰 Generating fee schedule for course:", {
      courseName: course.courseFullName,
      monthlyFee: course.monthlyFee,
      examFee:    course.examFee,
      examMonths: course.examMonths,
      duration:   course.duration,
    });

    const feeSchedule = [];
    const start = new Date(startDate || new Date());

    // ── Parse duration ─────────────────────────────────────────
    // Handles: "15", "15 months", "1 year", "2 years"
    const durationMatch = course.duration?.toString().match(/\d+/);
    let durationMonths  = durationMatch ? parseInt(durationMatch[0], 10) : 12;

    if (course.duration?.toString().toLowerCase().includes("year")) {
      durationMonths = durationMonths * 12;
    }

    console.log(`📅 Duration: ${durationMonths} months`);

    // ── Parse fees ─────────────────────────────────────────────
    const monthlyFee = parseFloat(course.monthlyFee) || 0;
    const examFee    = parseFloat(course.examFee)    || 0;

    // ── Parse exam months ONCE before the loop ─────────────────
    // Scoped to durationMonths so no out-of-range exam months ever appear
    const examMonths = parseExamMonths(course.examMonths, durationMonths);
    console.log(`📝 Exam months: [${examMonths.join(", ") || "none"}]`);

    // ── Generate one entry per month ───────────────────────────
    for (let month = 1; month <= durationMonths; month++) {
      // FIX: addMonthsSafe prevents Jan31 → March skipping February
      const monthDate = addMonthsSafe(start, month - 1);

      // Due date = 5th of that month
      const dueDate = new Date(monthDate);
      dueDate.setDate(5);

      const isExamMonth  = examMonths.includes(month);
      const thisExamFee  = isExamMonth ? examFee : 0;
      const totalFee     = monthlyFee + thisExamFee;

      const monthName = monthDate.toLocaleString("en-US", {
        month: "long",
        year:  "numeric",
      });

      feeSchedule.push({
        month:              monthName,
        monthNumber:        month,
        amount:             monthlyFee,   // alias used in some places
        baseFee:            monthlyFee,
        monthlyFee,                       // explicit field for fee table column
        additionalFees:     [],
        examFee:            thisExamFee,
        totalFee,
        paidAmount:         0,
        balanceAmount:      totalFee,
        status:             "pending",
        isExamMonth,
        carryForwardAmount: 0,
        dueDate,
        promisedDate:       null,
        finesPaused:        false,
        fines:              { amount: 0, reason: "", waived: false },
        paymentDate:        null,
        receiptNo:          "",
        paymentMode:        "",
        remarks:            "",
      });
    }

    console.log(`✅ Generated ${feeSchedule.length} fee entries`);
    console.log(`📋 Exam months in schedule: ${
      feeSchedule
        .filter(m => m.isExamMonth)
        .map(m => `Month ${m.monthNumber} (${m.month}) = ₹${m.totalFee}`)
        .join(" | ") || "None"
    }`);

    return feeSchedule;
  } catch (error) {
    console.error("❌ Error generating fee schedule:", error);
    return [];
  }
};

const generateConvertedFeeSchedule = (student, newCourse, conversionMonth) => {
  try {
    console.log("🔄 GENERATING CONVERTED FEE SCHEDULE - OLD COURSE IS GONE");
    console.log("   Student:", student.fullName);
    console.log("   New Course:", newCourse.courseFullName);
    console.log("   Conversion Month:", conversionMonth);

    const feeSchedule = [];
    const startDate = new Date(student.admissionDate);
    const newMonthlyFee = parseFloat(newCourse.monthlyFee) || 0;
    const newExamFee = parseFloat(newCourse.examFee) || 0;
    const newDuration = parseInt(newCourse.duration) || 0;

    // Parse exam months for NEW COURSE ONLY
    const examMonths = newCourse.examMonths
      ? newCourse.examMonths.split(',').map(m => parseInt(m.trim()))
      : [];

    console.log("📅 New course exam months:", examMonths);
    console.log("💰 New monthly fee:", newMonthlyFee);
    console.log("💰 New exam fee:", newExamFee);
    console.log("📊 New duration:", newDuration);

    // ✅ KEEP ONLY PAID MONTHS from old course (months before conversion)
    const existingFeeSchedule = student.feeSchedule || [];
    let paidAmount = 0;
    
    for (let i = 0; i < existingFeeSchedule.length; i++) {
      const month = existingFeeSchedule[i];
      if (month.monthNumber < conversionMonth && month.paidAmount > 0) {
        // Keep paid months EXACTLY as they were
        feeSchedule.push({
          month: month.month,
          monthNumber: month.monthNumber,
          baseFee: month.baseFee || month.monthlyFee || month.amount || 0,
          monthlyFee: month.baseFee || month.monthlyFee || month.amount || 0,
          amount: month.baseFee || month.monthlyFee || month.amount || 0,
          additionalFees: month.additionalFees || [],
          examFee: month.examFee || 0,
          totalFee: month.totalFee || month.paidAmount,
          paidAmount: month.paidAmount || 0,
          balanceAmount: 0,
          status: "paid",
          isExamMonth: month.isExamMonth || false,
          carryForwardAmount: month.carryForwardAmount || 0,
          dueDate: month.dueDate,
          promisedDate: month.promisedDate || null,
          finesPaused: month.finesPaused || false,
          fines: month.fines || { amount: 0, reason: "", waived: false },
          paymentDate: month.paymentDate || null,
          receiptNo: month.receiptNo || "",
          paymentMode: month.paymentMode || "",
          remarks: month.remarks || ""
        });
        
        paidAmount += month.paidAmount;
      }
    }

    console.log(`✅ Preserved ${feeSchedule.length} paid months (₹${paidAmount})`);

    // ✅ GENERATE NEW MONTHS from conversionMonth onwards using NEW COURSE RULES
    for (let monthNum = conversionMonth; monthNum <= newDuration; monthNum++) {
      const monthDate = new Date(startDate);
      monthDate.setMonth(startDate.getMonth() + monthNum - 1);

      // Check exam months based on NEW COURSE ONLY
      const isExamMonth = examMonths.includes(monthNum);
      const monthlyFee = newMonthlyFee;
      const examFee = isExamMonth ? newExamFee : 0;
      const totalFee = monthlyFee + examFee;

      console.log(`   Month ${monthNum} | exam=${isExamMonth} | ₹${monthlyFee} + ₹${examFee} = ₹${totalFee}`);

      const dueDate = new Date(monthDate);
      dueDate.setDate(5);

      feeSchedule.push({
        month: monthDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        monthNumber: monthNum,
        baseFee: monthlyFee,
        monthlyFee: monthlyFee,
        amount: monthlyFee,
        additionalFees: [],
        examFee: examFee,
        totalFee: totalFee,
        paidAmount: 0,
        balanceAmount: totalFee,
        status: "pending",
        isExamMonth: isExamMonth,
        carryForwardAmount: 0,
        dueDate: dueDate,
        promisedDate: null,
        finesPaused: false,
        fines: { amount: 0, reason: "", waived: false },
        paymentDate: null,
        receiptNo: "",
        paymentMode: "",
        remarks: `Converted to ${newCourse.courseFullName} at month ${conversionMonth}`
      });
    }

    console.log(`✅ Generated ${feeSchedule.length - (feeSchedule.filter(m => m.paidAmount > 0).length)} new months`);

    return feeSchedule;
  } catch (error) {
    console.error("❌ Error generating converted fee schedule:", error);
    return [];
  }
};

const generateFeeScheduleWithScholarship = (course, scholarship, startDate) => {
  try {
    // ── 1. Parse duration (handles "15", "15 months", "1 year") ──
    const durationMatch = course.duration?.toString().match(/\d+/);
    let durationMonths = durationMatch ? parseInt(durationMatch[0], 10) : 12;
    if (course.duration?.toString().toLowerCase().includes("year")) {
      durationMonths *= 12;
    }

    // ── 2. Parse fees ──
    const originalMonthlyFee = parseFloat(course.monthlyFee) || 0;
    const examFee = parseFloat(course.examFee) || 0;
    const examMonths = parseExamMonths(course.examMonths, durationMonths);

    // ── 3. Apply scholarship discount to monthly fee ──
   // ── 3. Apply scholarship discount correctly ──
let discountedMonthlyFee = originalMonthlyFee;

if (scholarship) {
  // ✅ THE FIX: Trust the pre-calculated value from frontend
  // scholarshipData.finalMonthlyFee is already correctly computed as:
  // (totalFee * (1 - percent/100)) / durationMonths = ₹1250
  if (scholarship.finalMonthlyFee && scholarship.finalMonthlyFee > 0) {
    discountedMonthlyFee = scholarship.finalMonthlyFee;
  } else {
    // Fallback: recalculate only if finalMonthlyFee is missing
    const percent = scholarship.percent || scholarship.value || 0;
    const type = scholarship.type || "percentage";

    if (type === "percentage") {
      const originalTotalFee = originalMonthlyFee * durationMonths;
      const discountedTotal = originalTotalFee * (1 - percent / 100);
      discountedMonthlyFee = discountedTotal / durationMonths;
    } else if (type === "fixed_amount") {
      const originalTotalFee = originalMonthlyFee * durationMonths;
      const discountedTotal = Math.max(0, originalTotalFee - (scholarship.value || 0));
      discountedMonthlyFee = discountedTotal / durationMonths;
    }
  }
}

discountedMonthlyFee = Math.max(0, Math.round(discountedMonthlyFee * 100) / 100);

console.log(`🎓 Scholarship Fee Schedule:`);
console.log(`   Original Monthly: ₹${originalMonthlyFee}`);
console.log(`   Discounted Monthly: ₹${discountedMonthlyFee}`);

    // ── 4. Generate schedule ──
    const start = new Date(startDate || new Date());
    const feeSchedule = [];

    for (let month = 1; month <= durationMonths; month++) {
      const monthDate = addMonthsSafe(start, month - 1);
      const dueDate = new Date(monthDate);
      dueDate.setDate(5);

      const isExamMonth = examMonths.includes(month);
      const thisExamFee = isExamMonth ? examFee : 0;
      const totalFee = discountedMonthlyFee + thisExamFee;

      const monthName = monthDate.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      });

      feeSchedule.push({
        month: monthName,
        monthNumber: month,
        amount: discountedMonthlyFee,
        baseFee: discountedMonthlyFee,
        monthlyFee: discountedMonthlyFee,        // ✅ Discounted fee stored here
        additionalFees: [],
        examFee: thisExamFee,
        totalFee,
        paidAmount: 0,
        balanceAmount: totalFee,
        status: "pending",
        isExamMonth,
        carryForwardAmount: 0,
        dueDate,
        promisedDate: null,
        finesPaused: false,
        fines: { amount: 0, reason: "", waived: false },
        paymentDate: null,
        receiptNo: "",
        paymentMode: "",
        remarks: "",
      });
    }

    console.log(`✅ Generated ${feeSchedule.length} scholarship fee entries`);
    return feeSchedule;

  } catch (error) {
    console.error("❌ Error generating scholarship fee schedule:", error);
    return [];
  }
};

module.exports = { generateFeeSchedule, generateConvertedFeeSchedule , generateFeeScheduleWithScholarship };

