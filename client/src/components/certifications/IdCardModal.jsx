import React from "react";
import { X, Printer } from "lucide-react";
// Image now lives in /public, referenced by path directly
// (same pattern as certificate-template.png) — no import needed.
const idCardFront = "/id-card-template.png";

// ============================================================
// ID CARD MODAL — overlays student data on the real card image
// ------------------------------------------------------------
// The image itself is the design. We only position text/photo
// on top using percentage-based coordinates (so it scales with
// the image regardless of rendered size).
//
// To reposition any field later: just tweak the `top`/`left`
// percentages below — no need to touch the image.
// ============================================================

const formatIssueDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB");
};

const IdCardModal = ({ student, onClose }) => {
  if (!student) return null;

  const handlePrint = () => window.print();

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4"
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============== THE ID CARD (image + overlay) ============== */}
        <div className="relative w-[600px] max-w-full shadow-2xl rounded-xl overflow-hidden print:shadow-none">
          <img
            src={idCardFront}
            alt="ID Card"
            className="w-full h-auto block select-none"
            draggable={false}
          />

          {/* Student photo — positioned over the empty photo box on the card */}
          <div
            className="absolute overflow-hidden rounded-md bg-gray-100"
            style={{
              top: "39%",
              left: "6%",
              width: "18%",
              height: "38%",
            }}
          >
            {student.photo && (
              <img
                src={student.photo}
                alt={student.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Text fields — positioned over the ":" labels on the card */}
          <div
            className="absolute text-gray-900 font-semibold"
            style={{ top: "44.5%", left: "41%", fontSize: "1.3vw" }}
          >
            {student.name || "N/A"}
          </div>
          <div
            className="absolute text-gray-900 font-semibold"
            style={{ top: "51.5%", left: "41%", fontSize: "1.3vw" }}
          >
            {student.studentId || "N/A"}
          </div>
          <div
            className="absolute text-gray-900 font-semibold"
            style={{ top: "58.5%", left: "41%", fontSize: "1.3vw" }}
          >
            {student.course || "N/A"}
          </div>
          <div
            className="absolute text-gray-900 font-semibold"
            style={{ top: "65.5%", left: "41%", fontSize: "1.3vw" }}
          >
            {student.batch || "N/A"}
          </div>
          <div
            className="absolute text-gray-900 font-semibold"
            style={{ top: "72.5%", left: "41%", fontSize: "1.3vw" }}
          >
            {student.mobileNumber || "N/A"}
          </div>
          <div
            className="absolute text-gray-900 font-semibold"
            style={{ top: "79.5%", left: "41%", fontSize: "1.3vw" }}
          >
            {formatIssueDate(student.admissionDate)}
          </div>
        </div>
        {/* ============== END CARD ============== */}

        <div className="flex gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition shadow"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition shadow"
          >
            <X size={16} />
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdCardModal;