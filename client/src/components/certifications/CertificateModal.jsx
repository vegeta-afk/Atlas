// components/certifications/CertificateModal.jsx
import React, { useEffect, useState } from "react";
import { X, Printer } from "lucide-react";
import { studentAPI } from "../../services/api";

// ─────────────────────────────────────────────────────────────
// 🎯 POSITION CONFIG
// If text drifts after a design change, only edit values here.
// top/left = % of the certificate container height/width
// fontSize = vw units so it scales with the window
// ─────────────────────────────────────────────────────────────
const CERT_POSITIONS = {
  certificateNo:  { top: "6.4%",    left: "20%",   fontSize: "1.05vw", color: "#222",    fontWeight: "600" },
  studentName:    { top: "34.5%", left: "6%",    fontSize: "1.4vw",  color: "#c62828", fontWeight: "700" },
  parentName:     { top: "39%",   left: "24%",   fontSize: "1vw",    color: "#222",    fontWeight: "400" },
  enrollmentNo:   { top: "44.3%", left: "17.5%", fontSize: "1vw",    color: "#222",    fontWeight: "400" },
  courseName:     { top: "48.6%", left: "18%",   fontSize: "1vw",    color: "#222",    fontWeight: "400" },
  trainingCenter: { top: "53.2%", left: "23.5%", fontSize: "1vw",    color: "#222",    fontWeight: "400" },
  durationMonths: { top: "57.8%", left: "13.5%", fontSize: "1vw",    color: "#222",    fontWeight: "400" },
  durationFrom:   { top: "57.8%", left: "27%",   fontSize: "1vw",    color: "#222",    fontWeight: "400" },
  durationTo:     { top: "57.8%", left: "38%",   fontSize: "1vw",    color: "#222",    fontWeight: "400" },
  gradeFirst:     { top: "62.5%", left: "22.6%",   fontSize: "1vw",    color: "#222",    fontWeight: "700" },
  gradeSecond:    { top: "62.5%", left: "46.7%", fontSize: "1vw",    color: "#222",    fontWeight: "700" },
  dateOfIssue:    { top: "67%",   left: "16.7%", fontSize: "1vw",    color: "#222",    fontWeight: "400" },
};

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-GB");
};

const calcMonths = (start, end) => {
  if (!start || !end) return 1;
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
};

// ─── Single overlay text field ────────────────────────────────
const Field = ({ pos, children }) => (
  <span
    style={{
      position:   "absolute",
      top:        pos.top,
      left:       pos.left,
      fontSize:   pos.fontSize,
      color:      pos.color,
      fontWeight: pos.fontWeight,
      fontFamily: "Arial, Helvetica, sans-serif",
      whiteSpace: "nowrap",
      lineHeight:  1,
    }}
  >
    {children}
  </span>
);

// ─── Certificate layout ────────────────────────────────────────
const CertificateLayout = ({ student }) => {
  const startDate = student.admissionDate;
  const endDate   = student.updatedAt || new Date();
  const months    = calcMonths(startDate, endDate);
  const certNo    = student.admissionNo || student.studentId || "N/A";
  const grade     = student.grade || "A";
  const center    = student.city
    ? `Branch - ${student.city}`
    : student.batchTime || "Main Center";

  return (
    // paddingBottom trick keeps the aspect ratio of your PNG (895 × 635 ≈ 70.95%)
    <div
      id="cert-print-area"
      style={{
        position:      "relative",
        width:         "100%",
        paddingBottom: "70.95%",
        overflow:      "hidden",
        background:    "#fff",
      }}
    >
      {/* ── Background template PNG ── */}
      <img
        src="/certificate-template.png"
        alt="Certificate"
        style={{
          position:   "absolute",
          top: 0, left: 0,
          width:      "100%",
          height:     "100%",
          objectFit:  "fill",
        }}
      />

      {/* ── Overlaid dynamic fields ── */}
      <Field pos={CERT_POSITIONS.certificateNo}>  {certNo}                  </Field>
      <Field pos={CERT_POSITIONS.studentName}>    {student.fullName}        </Field>
      <Field pos={CERT_POSITIONS.parentName}>     {student.fatherName || "N/A"} </Field>
      <Field pos={CERT_POSITIONS.enrollmentNo}>   {certNo}                  </Field>
      <Field pos={CERT_POSITIONS.courseName}>     {student.course}          </Field>
      <Field pos={CERT_POSITIONS.trainingCenter}> {center}                  </Field>
      <Field pos={CERT_POSITIONS.durationMonths}> {months}                  </Field>
      <Field pos={CERT_POSITIONS.durationFrom}>   {fmt(startDate)}          </Field>
      <Field pos={CERT_POSITIONS.durationTo}>     {fmt(endDate)}            </Field>
      <Field pos={CERT_POSITIONS.gradeFirst}>     "{grade}"                 </Field>
      <Field pos={CERT_POSITIONS.gradeSecond}>    "{grade}"                 </Field>
      <Field pos={CERT_POSITIONS.dateOfIssue}>    {fmt(new Date())}         </Field>
    </div>
  );
};

// ─── Modal wrapper ─────────────────────────────────────────────
const CertificateModal = ({ studentId, studentName, onClose }) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setLoading(true);
        const res  = await studentAPI.getStudent(studentId);
        const data = res.data;
        setStudent(data.student || data.data || data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to fetch student");
      } finally {
        setLoading(false);
      }
    };
    if (studentId) fetchStudent();
  }, [studentId]);

  // Close on Escape key
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // Open a new tab with just the certificate and trigger print
  const handlePrint = () => {
    const area = document.getElementById("cert-print-area");
    if (!area) return;

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Certificate — ${studentName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: #fff; }
            .wrap {
              position: relative;
              width: 100vw;
              padding-bottom: 70.95vw;
              overflow: hidden;
            }
            .wrap img {
              position: absolute; top: 0; left: 0;
              width: 100%; height: 100%; object-fit: fill;
            }
            .wrap span {
              position: absolute;
              font-family: Arial, Helvetica, sans-serif;
              white-space: nowrap;
              line-height: 1;
            }
          </style>
        </head>
        <body>
          <div class="wrap">${area.innerHTML}</div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); window.close(); }, 400);
            };
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
          background: "#f4f4f4",
          borderRadius: 10,
          padding: 20,
          width: "90vw",
          maxWidth: 960,
          maxHeight: "95vh",
          overflowY: "auto",
        }}
      >
        {/* ── Modal header ── */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 14,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#333" }}>
            🎓 Certificate — {studentName}
          </h2>
          <div style={{ display: "flex", gap: 10 }}>
            {!loading && !error && (
              <button
                onClick={handlePrint}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 20px",
                  background: "#c62828", color: "#fff",
                  border: "none", borderRadius: 6,
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}
              >
                <Printer size={15} /> Print
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

        {/* ── Content ── */}
        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "#777" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
            Loading certificate...
          </div>
        )}
        {error && !loading && (
          <div style={{ color: "#c62828", textAlign: "center", padding: 40 }}>
            ⚠️ {error}
          </div>
        )}
        {!loading && !error && student && (
          <>
            <CertificateLayout student={student} />
            <p style={{
              fontSize: 11, color: "#aaa",
              textAlign: "center", marginTop: 10,
            }}>
              💡 Text positions off? Edit <code>CERT_POSITIONS</code> at the top of CertificateModal.jsx
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default CertificateModal;