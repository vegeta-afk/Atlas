// components/certifications/MarksheetModal.jsx
import React, { useEffect, useState } from "react";
import { X, Printer } from "lucide-react";
import api from "../../services/api";

// ── Grade color helper ────────────────────────────────────────
const gradeColor = (grade) => {
  const map = {
    "A+": "#15803d", A: "#16a34a", "B+": "#2563eb",
    B: "#3b82f6", C: "#d97706", D: "#ea580c", F: "#dc2626",
  };
  return map[grade] || "#374151";
};

const fmt = (d) => {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-GB");
};

// ── Marksheet layout ─────────────────────────────────────────
const MarksheetLayout = ({ data }) => {
  const { student, monthlyExams, semesterExams, summary } = data;

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Marksheet — ${student.fullName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #111; }
            .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 16mm; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 7px 10px; text-align: left; }
            thead th { background: #1e3a5f; color: #fff; font-weight: 600; }
            tr:nth-child(even) td { background: #f8fafc; }
            .grade-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="page">
            ${document.getElementById("marksheet-print-area").innerHTML}
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 400); };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div id="marksheet-print-area" style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#111" }}>

      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
        color: "#fff", padding: "24px 32px", borderRadius: "8px 8px 0 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>
            INTELLIGENT INSTITUTE OF TRAINING
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
            Registered Under act 21, 1860 (Govt. of U.K.) | ISO 9001-2008 Certified
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 10, color: "#fde68a" }}>
            ACADEMIC MARKSHEET
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, opacity: 0.9 }}>
          <div>Enrollment: <strong>{student.admissionNo}</strong></div>
          <div>Date of Issue: <strong>{fmt(new Date())}</strong></div>
        </div>
      </div>

      {/* ── Student Info ── */}
      <div style={{
        background: "#f0f4ff", border: "1px solid #c7d7ff",
        borderTop: "none", padding: "16px 32px",
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 12, fontSize: 13,
      }}>
        {[
          ["Student Name", student.fullName],
          ["Father's Name", student.fatherName || "N/A"],
          ["Admission No.",student.admissionNo],
          ["Course",       student.course],
          ["Training Center", student.city ? `Branch - ${student.city}` : "Main Center"],
          ["Admission Date", fmt(student.admissionDate)],
        ].map(([label, value]) => (
          <div key={label}>
            <span style={{ color: "#6b7280", fontSize: 11 }}>{label}</span>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 32px 24px", background: "#fff", border: "1px solid #e5e7eb", borderTop: "none" }}>

        {/* ── Monthly Exams ── */}
        <Section title="Monthly / Quiz Examinations" color="#2563eb">
          {monthlyExams.length === 0 ? (
            <EmptyRow cols={6} msg="No monthly exams found" />
          ) : (
            <ExamTable rows={monthlyExams} />
          )}
        </Section>

        {/* ── Semester Exams ── */}
        <Section title="Semester Examinations" color="#7c3aed">
          {semesterExams.length === 0 ? (
            <EmptyRow cols={6} msg="No semester exams found" />
          ) : (
            <ExamTable rows={semesterExams} />
          )}
        </Section>

        {/* ── Overall Summary ── */}
        <div style={{ marginTop: 24 }}>
          <div style={{
            background: "#1e3a5f", color: "#fff",
            padding: "10px 16px", fontWeight: 700, fontSize: 14,
            borderRadius: "6px 6px 0 0",
          }}>
            Overall Performance Summary
          </div>
          <div style={{
            border: "1px solid #1e3a5f", borderTop: "none",
            borderRadius: "0 0 6px 6px", overflow: "hidden",
          }}>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            }}>
              {[
                ["Total Exams",    summary.totalExams],
                ["Exams Passed",   summary.passed],
                ["Total Marks",   `${summary.totalMarksObtained} / ${summary.totalMaxMarks}`],
                ["Overall %",     `${summary.overallPercentage}%`],
              ].map(([label, value], i) => (
                <div key={label} style={{
                  padding: "14px 16px", textAlign: "center",
                  borderRight: i < 3 ? "1px solid #e5e7eb" : "none",
                  background: i % 2 === 0 ? "#f8fafc" : "#fff",
                }}>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#1e3a5f", marginTop: 4 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Grade bar */}
            <div style={{
              background: "#fff8e1", padding: "12px 16px",
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid #e5e7eb",
            }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                Overall Grade:&nbsp;
                <span style={{
                  color: gradeColor(summary.overallGrade),
                  fontSize: 22, fontWeight: 900,
                }}>
                  {summary.overallGrade}
                </span>
              </span>
              <span style={{
                background: summary.overallPercentage >= 40 ? "#dcfce7" : "#fee2e2",
                color: summary.overallPercentage >= 40 ? "#15803d" : "#dc2626",
                padding: "4px 16px", borderRadius: 20,
                fontWeight: 700, fontSize: 13,
              }}>
                {summary.overallPercentage >= 40 ? "✓ PASSED" : "✗ FAILED"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Signature section ── */}
        <div style={{
          display: "flex", justifyContent: "space-around",
          marginTop: 40, paddingTop: 16,
        }}>
          {["Class Teacher", "Study Center Director", "Authorised Signatory"].map((sig) => (
            <div key={sig} style={{ textAlign: "center", fontSize: 12 }}>
              <div style={{
                width: 150, borderTop: "1px solid #555",
                margin: "32px auto 6px",
              }} />
              <strong>{sig}</strong>
            </div>
          ))}
        </div>

        <div style={{
          textAlign: "center", fontSize: 10, color: "#9ca3af",
          marginTop: 20, borderTop: "1px solid #e5e7eb", paddingTop: 10,
        }}>
          This is a computer-generated marksheet. | iitrishikeshuk@gmail.com | www.iituk.org.in
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────
const Section = ({ title, color, children }) => (
  <div style={{ marginTop: 24 }}>
    <div style={{
      background: color, color: "#fff",
      padding: "8px 16px", fontWeight: 700, fontSize: 13,
      borderRadius: "6px 6px 0 0",
    }}>
      {title}
    </div>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr>
          {["#", "Exam Name", "Date", "Marks Obtained", "Max Marks", "Percentage", "Grade", "Status"].map((h) => (
            <th key={h} style={{
              background: "#f1f5f9", padding: "8px 10px",
              textAlign: "left", border: "1px solid #e2e8f0",
              fontWeight: 600, fontSize: 11, color: "#374151",
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const ExamTable = ({ rows }) => (
  <>
    {rows.map((exam, i) => (
      <tr key={exam._id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
        <td style={td}>{i + 1}</td>
        <td style={{ ...td, fontWeight: 600 }}>{exam.testName}</td>
        <td style={td}>{fmt(exam.submittedAt)}</td>
        <td style={{ ...td, fontWeight: 700, color: "#1e3a5f" }}>{exam.marksObtained}</td>
        <td style={td}>{exam.maxMarks}</td>
        <td style={td}>{exam.percentage}%</td>
        <td style={td}>
          <span style={{
            color: gradeColor(exam.grade), fontWeight: 700, fontSize: 13,
          }}>{exam.grade}</span>
        </td>
        <td style={td}>
          <span style={{
            background: exam.isPassed ? "#dcfce7" : "#fee2e2",
            color: exam.isPassed ? "#15803d" : "#dc2626",
            padding: "2px 8px", borderRadius: 10,
            fontWeight: 600, fontSize: 11,
          }}>
            {exam.isPassed ? "Pass" : "Fail"}
          </span>
        </td>
      </tr>
    ))}
  </>
);

const EmptyRow = ({ cols, msg }) => (
  <tr>
    <td colSpan={cols} style={{ ...td, textAlign: "center", color: "#9ca3af", padding: 20 }}>
      {msg}
    </td>
  </tr>
);

const td = {
  border: "1px solid #e2e8f0",
  padding: "7px 10px",
};

// ── Modal wrapper ─────────────────────────────────────────────
const MarksheetModal = ({ studentId, studentName, onClose }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);



  useEffect(() => {
  const fetchResults = async () => {
    try {
      setLoading(true);

      // ✅ ADD THESE DEBUG LINES
      const token = localStorage.getItem("token");
      console.log("🔑 Token exists:", !!token);
      console.log("🔑 Token value:", token?.substring(0, 30) + "...");
      console.log("👤 StudentId being sent:", studentId);

      const res = await api.get(`/exam/tests/student/${studentId}/results`);
      setData(res.data.data);
    } catch (err) {
      console.error("❌ Full error:", err.response);
      setError(err.response?.data?.message || err.message || "Failed to load marksheet");
    } finally {
      setLoading(false);
    }
  };
  if (studentId) fetchResults();
}, [studentId]);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handlePrint = () => {
    const area = document.getElementById("marksheet-print-area");
    if (!area) return;
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Marksheet — ${studentName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; background: #fff; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 7px 10px; font-size: 12px; }
          </style>
        </head>
        <body style="padding: 20px;">
          ${area.innerHTML}
          <script>
            window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 400); };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#f4f4f4", borderRadius: 10,
          padding: 20, width: "95vw", maxWidth: 1100,
          maxHeight: "95vh", overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 14,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#333" }}>
            📋 Marksheet — {studentName}
          </h2>
          <div style={{ display: "flex", gap: 10 }}>
            {!loading && !error && (
              <button
                onClick={handlePrint}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 20px",
                  background: "#1e3a5f", color: "#fff",
                  border: "none", borderRadius: 6,
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}
              >
                <Printer size={15} /> Print Marksheet
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "transparent", border: "1px solid #ccc",
                borderRadius: 6, padding: "6px 10px",
                cursor: "pointer", display: "flex", alignItems: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* States */}
        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "#777" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
            Loading marksheet...
          </div>
        )}
        {error && !loading && (
          <div style={{ color: "#c62828", textAlign: "center", padding: 40 }}>
            ⚠️ {error}
          </div>
        )}
        {!loading && !error && data && (
          <MarksheetLayout data={data} />
        )}
        {!loading && !error && !data && (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
            No exam data found for this student.
          </div>
        )}
      </div>
    </div>
  );
};

export default MarksheetModal;