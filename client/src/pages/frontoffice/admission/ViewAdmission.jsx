// pages/frontoffice/admission/ViewAdmission.jsx
import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Edit, Printer, Download, Mail, Phone, Calendar,
  User, BookOpen, MapPin, Globe, FileText, CheckCircle, XCircle,
  Clock, MessageSquare, AlertCircle, Loader2,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import "./ViewAdmission.css";
import { admissionAPI } from "../../../services/api";
import useBasePath from "../../../hooks/useBasePath";

const ViewAdmission = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useBasePath();

  const [admission, setAdmission]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => { fetchAdmissionDetails(); }, [id]);

  const fetchAdmissionDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await admissionAPI.getAdmission(id);

      if (response.data.success) {
        const d = response.data.data; // short alias

        const transformedData = {
          id:           d._id,
          studentId:    d.admissionNo || `ADM${d._id.substring(0, 8)}`,
          fullName:     d.fullName || "N/A",
          photo:        d.photo || null,

          // ── Personal ──────────────────────────────────────
          dateOfBirth:    d.dateOfBirth  || null,
          gender:         d.gender       || "N/A",
          fatherName:     d.fatherName   || "N/A",
          fatherNumber:   d.fatherNumber || "N/A",   // ✅ schema field
          motherName:     d.motherName   || "N/A",
          motherNumber:   d.motherNumber || "N/A",   // ✅ schema field
          cast:           d.cast         || "N/A",   // ✅ schema field
          speciallyAbled: d.speciallyAbled ? "Yes" : "No", // ✅ schema field

          // ── Contact ───────────────────────────────────────
          email:           d.email           || "N/A",
          mobileNumber:    d.mobileNumber    || "N/A",
          alternateNumber: d.alternateNumber || "N/A",
          aadharNumber:    d.aadharNumber    || "N/A",
          address:         d.address         || "N/A",
          city:            d.city            || "N/A",
          state:           d.state           || "N/A",
          pincode:         d.pincode         || "N/A",

          // ── Academic ──────────────────────────────────────
          lastQualification: d.lastQualification || "N/A",
          percentage:        d.percentage        || "N/A",
          yearOfPassing:     d.yearOfPassing     || "N/A",
          schoolCollege:     d.schoolCollege     || "N/A",

          // ── Course ────────────────────────────────────────
          interestedCourse: d.course         || "N/A",  // ✅ schema: course
          specialization:   d.specialization || "N/A",
          preferredBatch:   d.batchTime      || "N/A",  // ✅ schema: batchTime
          admissionYear:    d.admissionYear  || "N/A",  // ✅ FIXED: was admissionForYear
          courseType:       d.courseType     || "N/A",  // ✅ schema field
          facultyAllot:     d.facultyAllot   || "Not Allotted",

          // ── Source ────────────────────────────────────────
          source:            d.source            || "N/A",
          referenceName:     d.referenceName     || "N/A",
          referenceContact:  d.referenceContact  || "N/A",
          referenceRelation: d.referenceRelation || "N/A", // ✅ schema field

          // ── Fees ──────────────────────────────────────────
          totalFees:           d.totalFees           ?? "N/A", // ✅ schema: totalFees
          paidFees:            d.paidFees            ?? 0,     // ✅ FIXED: was paidAmount
          balanceFees:         d.balanceFees         ?? 0,     // ✅ FIXED: was remainingAmount
          nextInstallmentDate: d.nextInstallmentDate || null,

          // ── Scholarship ───────────────────────────────────
          hasScholarship: d.hasScholarship || false,
          scholarship:    d.scholarship    || null,

          // ── Status / Meta ─────────────────────────────────
          status:        d.status      || "admitted",
          priority:      d.priority    || "medium",
          remarks:       d.remarks     || "No remarks available.",
          admissionDate: d.admissionDate || d.createdAt,
          admissionBy:   d.admissionBy  || "N/A",   // ✅ FIXED: was assignedTo (doesn't exist)
          enquiryNo:     d.enquiryNo    || "N/A",
          createdAt:     d.createdAt,

          // ── Documents & Activity ──────────────────────────
          documents: d.documents || [],
          activities: d.activities || [
            {
              id: 1,
              action: "Admission Created",
              by:    d.admissionBy || "System",
              date:  d.createdAt ? new Date(d.createdAt).toLocaleString("en-GB") : "N/A",
              notes: "Admission record created successfully.",
            },
          ],
        };

        setAdmission(transformedData);
      } else {
        throw new Error(response.data.message || "Failed to fetch admission details");
      }
    } catch (err) {
      console.error("Error fetching admission:", err);
      setError(err.response?.data?.message || err.message || "Failed to load admission details");
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getStatusIcon = (status) => {
    switch (status) {
      case "admitted":
      case "approved":
      case "completed":  return <CheckCircle className="status-icon converted" />;
      case "rejected":
      case "cancelled":  return <XCircle className="status-icon rejected" />;
      case "under_process": return <Clock className="status-icon follow_up" />;
      default:           return <Clock className="status-icon new" />;
    }
  };

  const getStatusLabel = (status) => ({
    new:          "New",
    under_process:"Under Process",
    approved:     "Approved",
    rejected:     "Rejected",
    admitted:     "Admitted",
    completed:    "Completed",
    cancelled:    "Cancelled",
  }[status] || status.replace(/_/g, " ").toUpperCase());

  const getPriorityBadge = (priority) => {
    const cls = { low: "priority-low", medium: "priority-medium", high: "priority-high", urgent: "priority-urgent" };
    return (
      <span className={`priority-badge ${cls[priority] || "priority-medium"}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const formatDate = (val) => {
    if (!val || val === "N/A") return "N/A";
    try { return new Date(val).toLocaleDateString("en-GB"); } catch { return val; }
  };

  const formatCurrency = (amount) => {
    if (amount === "N/A" || amount === undefined || amount === null) return "N/A";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  // ── Sub-components ─────────────────────────────────────────────────────────

  const InfoCard = ({ title, icon: Icon, children }) => (
    <div className="info-card">
      <div className="info-card-header"><Icon size={20} /><h3>{title}</h3></div>
      <div className="info-card-content">{children}</div>
    </div>
  );

  const InfoItem = ({ label, value, fullWidth = false }) => (
    <div className={`info-item${fullWidth ? " full-width" : ""}`}>
      <span className="info-label">{label}</span>
      <span className="info-value">{value || "N/A"}</span>
    </div>
  );

  // ── States ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="loading-container">
      <Loader2 className="animate-spin" size={48} /><p>Loading admission details...</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <AlertCircle size={48} /><h3>Error Loading Admission</h3><p>{error}</p>
      <button onClick={() => navigate(`${basePath}/front-office/admissions`)} className="btn-primary mt-4">
        Back to List
      </button>
    </div>
  );

  if (!admission) return (
    <div className="not-found-container">
      <AlertCircle size={48} /><h3>Admission Not Found</h3>
      <button onClick={() => navigate(`${basePath}/front-office/admissions`)} className="btn-primary mt-4">
        Back to List
      </button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="view-admission-container">

      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <Link to={`${basePath}/front-office/admissions`} className="back-link">
            <ArrowLeft size={20} /> Back to List
          </Link>
          <div>
            <h1>Admission Details</h1>
            <p>Admission ID: {admission.studentId}</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="action-btn" onClick={handlePrint}><Printer size={18} /> Print</button>
          <button className="action-btn" onClick={handleExport}><Download size={18} /> Export</button>
          <Link to={`${basePath}/front-office/admissions/edit/${admission.id}`} className="btn-primary">
            <Edit size={18} /> Edit
          </Link>
        </div>
      </div>

      {/* Student Summary Banner */}
      <div className="student-summary">
        <div className="student-avatar">
          {admission.photo && !photoError ? (
            <img
              src={admission.photo}
              alt={admission.fullName}
              className="avatar-photo"
              onError={() => setPhotoError(true)}
            />
          ) : (
            <div className="avatar-large">
              {admission.fullName !== "N/A" ? admission.fullName.charAt(0).toUpperCase() : "?"}
            </div>
          )}
          <div className="student-basic">
            <h2>{admission.fullName}</h2>
            <div className="contact-links">
              {admission.email !== "N/A" && (
                <a href={`mailto:${admission.email}`}><Mail size={14} />{admission.email}</a>
              )}
              {admission.mobileNumber !== "N/A" && (
                <a href={`tel:${admission.mobileNumber}`}><Phone size={14} />{admission.mobileNumber}</a>
              )}
            </div>
            <div className="additional-info">
              {admission.aadharNumber !== "N/A" && (
                <span className="info-tag">Aadhar: {admission.aadharNumber}</span>
              )}
              <span className="info-tag">Faculty: {admission.facultyAllot}</span>
              {admission.enquiryNo !== "N/A" && (
                <span className="info-tag">Enquiry: {admission.enquiryNo}</span>
              )}
            </div>
          </div>
        </div>

        <div className="summary-stats">
          <div className="stat">
            <span className="stat-label">Status</span>
            <div className="status-badge">
              {getStatusIcon(admission.status)}
              {getStatusLabel(admission.status)}
            </div>
          </div>
          <div className="stat">
            <span className="stat-label">Priority</span>
            {getPriorityBadge(admission.priority)}
          </div>
          <div className="stat">
            <span className="stat-label">Admission Date</span>
            <div className="date-info">
              <Calendar size={14} />{formatDate(admission.admissionDate)}
            </div>
          </div>
          <div className="stat">
            <span className="stat-label">Admitted By</span>
            <div className="assigned-info">
              <div className="avatar-small">
                {admission.admissionBy !== "N/A"
                  ? admission.admissionBy.charAt(0).toUpperCase() : "A"}
              </div>
              {admission.admissionBy}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="content-grid">

        {/* LEFT */}
        <div className="left-column">

          <InfoCard title="Personal Information" icon={User}>
            <div className="info-grid">
              <InfoItem label="Date of Birth"    value={formatDate(admission.dateOfBirth)} />
              <InfoItem label="Gender"           value={admission.gender} />
              <InfoItem label="Father's Name"    value={admission.fatherName} />
              <InfoItem label="Father's Number"  value={admission.fatherNumber} />
              <InfoItem label="Mother's Name"    value={admission.motherName} />
              <InfoItem label="Mother's Number"  value={admission.motherNumber} />
              <InfoItem label="Caste"            value={admission.cast} />
              <InfoItem label="Specially Abled"  value={admission.speciallyAbled} />
            </div>
          </InfoCard>

          <InfoCard title="Academic Information" icon={BookOpen}>
            <div className="info-grid">
              <InfoItem label="Last Qualification" value={admission.lastQualification} />
              <InfoItem label="Percentage / CGPA"  value={admission.percentage} />
              <InfoItem label="Year of Passing"    value={String(admission.yearOfPassing)} />
              <InfoItem label="School / College"   value={admission.schoolCollege} fullWidth />
            </div>
          </InfoCard>

          <InfoCard title="Contact Information" icon={MapPin}>
            <div className="info-grid">
              <InfoItem label="Mobile Number"    value={admission.mobileNumber} />
              <InfoItem label="Alternate Number" value={admission.alternateNumber} />
              <InfoItem label="Email"            value={admission.email} />
              <InfoItem label="Address"          value={admission.address} fullWidth />
              <InfoItem label="City"             value={admission.city} />
              <InfoItem label="State"            value={admission.state} />
              <InfoItem label="Pincode"          value={admission.pincode} />
            </div>
          </InfoCard>

        </div>

        {/* RIGHT */}
        <div className="right-column">

          <InfoCard title="Course & Batch Information" icon={BookOpen}>
            <div className="info-grid">
              <InfoItem label="Course"         value={admission.interestedCourse} />
              <InfoItem label="Specialization" value={admission.specialization} />
              <InfoItem label="Batch Time"     value={admission.preferredBatch} />
              <InfoItem label="Admission Year" value={String(admission.admissionYear)} />
              <InfoItem label="Course Type"    value={admission.courseType} />
              <InfoItem label="Faculty"        value={admission.facultyAllot} />
            </div>
          </InfoCard>

          <InfoCard title="Fee Information" icon={FileText}>
            <div className="info-grid">
              <InfoItem label="Total Fees"       value={formatCurrency(admission.totalFees)} />
              <InfoItem label="Paid Amount"      value={formatCurrency(admission.paidFees)} />
              <InfoItem label="Balance Amount"   value={formatCurrency(admission.balanceFees)} />
              <InfoItem label="Next Installment" value={formatDate(admission.nextInstallmentDate)} />
            </div>
            {admission.hasScholarship && admission.scholarship && (
              <div className="scholarship-banner">
                <span className="scholarship-label">🎓 Scholarship Applied</span>
                <div className="info-grid" style={{ marginTop: 10 }}>
                  <InfoItem label="Scholarship"  value={admission.scholarship.scholarshipName} />
                  <InfoItem label="Discount"     value={`${admission.scholarship.percent}%`} />
                  <InfoItem label="Original Fee" value={formatCurrency(admission.scholarship.originalTotalFee)} />
                  <InfoItem label="Final Fee"    value={formatCurrency(admission.scholarship.finalTotalFee)} />
                </div>
              </div>
            )}
          </InfoCard>

          <InfoCard title="Source Information" icon={Globe}>
            <div className="info-grid">
              <InfoItem label="Source"             value={admission.source} />
              <InfoItem label="Reference Name"     value={admission.referenceName} />
              <InfoItem label="Reference Contact"  value={admission.referenceContact} />
              <InfoItem label="Reference Relation" value={admission.referenceRelation} />
            </div>
          </InfoCard>

        </div>
      </div>

      {/* Bottom 2-Column Grid — last 4 cards side-by-side */}
      <div className="bottom-grid">

        <div className="bottom-left">
          <InfoCard title="Remarks" icon={MessageSquare}>
            <div className="remarks-content"><p>{admission.remarks}</p></div>
          </InfoCard>

          <InfoCard title="Documents" icon={FileText}>
            {admission.documents.length > 0 ? (
              <div className="documents-list">
                {admission.documents.map((doc, i) => (
                  <div key={i} className="document-item">
                    <FileText size={15} />
                    <span>{doc.name || doc}</span>
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="document-download">
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">No documents uploaded</p>
            )}
          </InfoCard>
        </div>

        <div className="bottom-right">
          <InfoCard title="Activity Log" icon={Clock}>
            <div className="activity-timeline">
              {admission.activities.map((activity, i) => (
                <div key={activity.id || i} className="activity-item">
                  <div className="activity-dot" />
                  <div className="activity-content">
                    <div className="activity-header">
                      <strong>{activity.action}</strong>
                      <span className="activity-date">{activity.date}</span>
                    </div>
                    <div className="activity-details">
                      <span className="activity-by">By: {activity.by}</span>
                      {activity.notes && <p className="activity-notes">{activity.notes}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </InfoCard>
        </div>

      </div>
    </div>
  );
};

export default ViewAdmission;