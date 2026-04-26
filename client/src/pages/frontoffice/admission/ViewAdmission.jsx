// pages/frontoffice/admission/ViewAdmission.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { admissionAPI } from "../../../services/api";
import useBasePath from "../../../hooks/useBasePath";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  User,
  BookOpen,
  MapPin,
  Hash,
  RefreshCw,
  AlertCircle,
  UserCheck,
  UserX,
  Clock,
  DollarSign,
  Award,
  FileText,
  Users,
} from "lucide-react";
import "./ViewAdmission.css";

const ViewAdmission = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const basePath = useBasePath();

  const [admission, setAdmission] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    if (id) fetchAdmission();
  }, [id]);

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAdmission = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await admissionAPI.getAdmission(id);
      if (response.data.success) {
        setAdmission(response.data.data);
      } else {
        throw new Error(response.data.message || "Failed to fetch admission");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load admission");
    } finally {
      setLoading(false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit", month: "long", year: "numeric",
    });
  };

  const formatPhone = (phone) => {
    if (!phone) return "N/A";
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length === 10
      ? `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
      : phone;
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || amount === "") return "N/A";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  };

  const getStatusConfig = (status) => {
    const map = {
      admitted:      { label: "Admitted",      className: "status-active",    Icon: UserCheck },
      approved:      { label: "Approved",      className: "status-active",    Icon: UserCheck },
      completed:     { label: "Completed",     className: "status-active",    Icon: UserCheck },
      rejected:      { label: "Rejected",      className: "status-inactive",  Icon: UserX },
      cancelled:     { label: "Cancelled",     className: "status-inactive",  Icon: UserX },
      under_process: { label: "Under Process", className: "status-on-leave",  Icon: Clock },
    };
    return map[status] || { label: status || "Admitted", className: "status-on-leave", Icon: Clock };
  };

  const openWhatsApp = (phone) => {
    if (!phone) return;
    const cleaned = phone.replace(/\D/g, "");
    window.open(`https://wa.me/91${cleaned}`, "_blank");
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="va-container">
        <div className="va-center-state">
          <RefreshCw size={32} className="va-spinning" />
          <p>Loading admission details...</p>
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (error || !admission) {
    return (
      <div className="va-container">
        <div className="va-center-state">
          <AlertCircle size={48} className="va-error-icon" />
          <h3>Failed to load admission</h3>
          <p>{error}</p>
          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <button onClick={fetchAdmission} className="va-btn-primary">
              <RefreshCw size={16} /> Retry
            </button>
            <Link to={`${basePath}/front-office/admissions`} className="va-btn-secondary">
              Back to List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const d = admission;
  const statusConfig = getStatusConfig(d.status);
  const StatusIcon = statusConfig.Icon;
  const hasReference = d.referenceName || d.referenceContact || d.referenceRelation;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="va-container">

      {/* Page Header */}
      <div className="va-page-header">
        <div className="va-header-left">
          <Link to={`${basePath}/front-office/admissions`} className="va-back-link">
            <ArrowLeft size={20} />
            Back to Admissions List
          </Link>
          <div>
            <h1>Admission Details</h1>
            <p>Viewing profile of {d.fullName}</p>
          </div>
        </div>
        <div className="va-header-actions">
          <button
            onClick={() => navigate(`${basePath}/front-office/admissions/edit/${id}`)}
            className="va-btn-primary"
          >
            <Edit size={18} />
            Edit Admission
          </button>
        </div>
      </div>

      {/* Profile Hero Card */}
      <div className="va-hero-card">
        <div className="va-avatar-large">
          {d.photo && !photoError ? (
            <img
              src={d.photo}
              alt={d.fullName}
              className="va-avatar-photo"
              onError={() => setPhotoError(true)}
            />
          ) : (
            getInitials(d.fullName)
          )}
        </div>

        <div className="va-hero-info">
          <h2>{d.fullName}</h2>
          <p className="va-sub">{d.course || "Course not assigned"}</p>
          <div className="va-hero-meta">
            <span className={`va-status-badge ${statusConfig.className}`}>
              <StatusIcon size={13} />
              {statusConfig.label}
            </span>
            <span className="va-meta-chip">
              <Hash size={14} />
              {d.admissionNo || "N/A"}
            </span>
            <span className="va-meta-chip">
              <Clock size={14} />
              {d.batchTime || "N/A"} Batch
            </span>
            {d.hasScholarship && (
              <span className="va-meta-chip va-chip-scholarship">
                <Award size={14} />
                Scholarship Applied
              </span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="va-quick-actions">
          {d.mobileNumber && (
            <a href={`tel:${d.mobileNumber}`} className="va-quick-btn va-quick-call">
              <Phone size={18} />
              <span>Call</span>
            </a>
          )}
          {d.email && (
            <a href={`mailto:${d.email}`} className="va-quick-btn va-quick-mail">
              <Mail size={18} />
              <span>Email</span>
            </a>
          )}
          {d.mobileNumber && (
            <button
              onClick={() => openWhatsApp(d.mobileNumber)}
              className="va-quick-btn va-quick-whatsapp"
            >
              <MessageCircle size={18} />
              <span>WhatsApp</span>
            </button>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="va-details-grid">

        {/* Personal Information */}
        <div className="va-card">
          <div className="va-card-header">
            <User size={18} />
            <h3>Personal Information</h3>
          </div>
          <div className="va-card-body">
            <div className="va-field-row">
              <span className="va-field-label">Full Name</span>
              <span className="va-field-value">{d.fullName || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Date of Birth</span>
              <span className="va-field-value">
                <Calendar size={14} style={{ marginRight: 6, opacity: 0.6 }} />
                {formatDate(d.dateOfBirth)}
              </span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Gender</span>
              <span className="va-field-value va-capitalize">{d.gender || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Father's Name</span>
              <span className="va-field-value">{d.fatherName || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Mother's Name</span>
              <span className="va-field-value">{d.motherName || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Caste</span>
              <span className="va-field-value va-uppercase">{d.cast || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Category</span>
              <span className="va-field-value">{d.category || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Specially Abled</span>
              <span className="va-field-value">{d.speciallyAbled ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>

        {/* Academic & Course Information */}
        <div className="va-card">
          <div className="va-card-header">
            <BookOpen size={18} />
            <h3>Academic & Course Information</h3>
          </div>
          <div className="va-card-body">
            <div className="va-field-row">
              <span className="va-field-label">Last Qualification</span>
              <span className="va-field-value">{d.lastQualification || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Year of Passing</span>
              <span className="va-field-value">{d.yearOfPassing || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Course</span>
              <span className="va-field-value va-highlight">{d.course || "N/A"}</span>
            </div>
            {d.specialization && (
              <div className="va-field-row">
                <span className="va-field-label">Specialization</span>
                <span className="va-field-value">{d.specialization}</span>
              </div>
            )}
            <div className="va-field-row">
              <span className="va-field-label">Batch Time</span>
              <span className="va-field-value">
                <Clock size={14} style={{ marginRight: 6, opacity: 0.6 }} />
                {d.batchTime || "N/A"}
              </span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Faculty Allotted</span>
              <span className="va-field-value">{d.facultyAllot || "Not Allotted"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Admission Year</span>
              <span className="va-field-value">{d.admissionYear || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="va-card">
          <div className="va-card-header">
            <Phone size={18} />
            <h3>Contact Information</h3>
          </div>
          <div className="va-card-body">
            <div className="va-field-row">
              <span className="va-field-label">Mobile No</span>
              <span className="va-field-value">
                <a href={`tel:${d.mobileNumber}`} className="va-link">
                  <Phone size={14} />
                  {formatPhone(d.mobileNumber)}
                </a>
              </span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Father's Mobile</span>
              <span className="va-field-value">
                <a href={`tel:${d.fatherNumber}`} className="va-link">
                  <Phone size={14} />
                  {formatPhone(d.fatherNumber)}
                </a>
              </span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Mother's Mobile</span>
              <span className="va-field-value">
                <a href={`tel:${d.motherNumber}`} className="va-link">
                  <Phone size={14} />
                  {formatPhone(d.motherNumber)}
                </a>
              </span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Email</span>
              <span className="va-field-value">
                {d.email ? (
                  <a href={`mailto:${d.email}`} className="va-link">
                    <Mail size={14} />
                    {d.email}
                  </a>
                ) : (
                  "N/A"
                )}
              </span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Aadhar Number</span>
              <span className="va-field-value">{d.aadharNumber || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Place / Area</span>
              <span className="va-field-value">
                <MapPin size={14} style={{ marginRight: 6, opacity: 0.6 }} />
                {d.place || "N/A"}
              </span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Address</span>
              <span className="va-field-value va-address">{d.address || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">City</span>
              <span className="va-field-value">{d.city || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">State</span>
              <span className="va-field-value">{d.state || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Pincode</span>
              <span className="va-field-value">{d.pincode || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Fee Information */}
        <div className="va-card">
          <div className="va-card-header">
            <DollarSign size={18} />
            <h3>Fee Information</h3>
          </div>
          <div className="va-card-body">
            <div className="va-field-row">
              <span className="va-field-label">Total Fees</span>
              <span className="va-field-value va-fee-total">{formatCurrency(d.totalFees)}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Paid Amount</span>
              <span className="va-field-value va-fee-paid">{formatCurrency(d.paidFees)}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Balance Amount</span>
              <span className="va-field-value va-fee-balance">{formatCurrency(d.balanceFees)}</span>
            </div>

            {/* Scholarship section inside fee card */}
            {d.hasScholarship && d.scholarship && (
              <>
                <div className="va-divider" />
                <div className="va-scholarship-block">
                  <div className="va-scholarship-title">
                    <Award size={14} />
                    <span>Scholarship Details</span>
                  </div>
                  <div className="va-field-row">
                    <span className="va-field-label">Scholarship</span>
                    <span className="va-field-value">{d.scholarship.scholarshipName || "N/A"}</span>
                  </div>
                  <div className="va-field-row">
                    <span className="va-field-label">Discount</span>
                    <span className="va-field-value va-saving">{d.scholarship.percent}%</span>
                  </div>
                  <div className="va-field-row">
                    <span className="va-field-label">Original Fee</span>
                    <span className="va-field-value">{formatCurrency(d.scholarship.originalTotalFee)}</span>
                  </div>
                  <div className="va-field-row">
                    <span className="va-field-label">You Save</span>
                    <span className="va-field-value va-saving">- {formatCurrency(d.scholarship.scholarshipValue)}</span>
                  </div>
                  <div className="va-field-row">
                    <span className="va-field-label">Final Fee</span>
                    <span className="va-field-value va-fee-total">{formatCurrency(d.scholarship.finalTotalFee)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Reference Details — only if provided */}
        {hasReference && (
          <div className="va-card">
            <div className="va-card-header">
              <Users size={18} />
              <h3>Reference Details</h3>
            </div>
            <div className="va-card-body">
              {d.referenceName && (
                <div className="va-field-row">
                  <span className="va-field-label">Reference Name</span>
                  <span className="va-field-value">{d.referenceName}</span>
                </div>
              )}
              {d.referenceContact && (
                <div className="va-field-row">
                  <span className="va-field-label">Reference Contact</span>
                  <span className="va-field-value">
                    <a href={`tel:${d.referenceContact}`} className="va-link">
                      <Phone size={14} />
                      {formatPhone(d.referenceContact)}
                    </a>
                  </span>
                </div>
              )}
              {d.referenceRelation && (
                <div className="va-field-row">
                  <span className="va-field-label">Relation</span>
                  <span className="va-field-value va-capitalize">{d.referenceRelation}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Remarks — only if provided */}
        {d.remarks && (
          <div className={`va-card ${!hasReference ? "va-card-full" : ""}`}>
            <div className="va-card-header">
              <FileText size={18} />
              <h3>Remarks</h3>
            </div>
            <div className="va-card-body">
              <p className="va-remarks">{d.remarks}</p>
            </div>
          </div>
        )}

        {/* Admission Timeline — full width */}
        <div className="va-card va-card-full">
          <div className="va-card-header">
            <Calendar size={18} />
            <h3>Admission Timeline</h3>
          </div>
          <div className="va-card-body va-timeline">
            <div className="va-timeline-item va-timeline-join">
              <div className="va-timeline-dot" />
              <div>
                <p className="va-timeline-label">Admission Date</p>
                <p className="va-timeline-date">{formatDate(d.admissionDate || d.createdAt)}</p>
                <p className="va-timeline-sub">Admitted by {d.admissionBy || "Admin"}</p>
              </div>
            </div>

            <div className="va-timeline-line" />

            <div className="va-timeline-item va-timeline-present">
              <div className="va-timeline-dot" />
              <div>
                <p className="va-timeline-label">
                  {d.enquiryNo ? "Converted from Enquiry" : "Source"}
                </p>
                <p className="va-timeline-date">
                  {d.enquiryNo || "Direct Admission"}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Actions */}
      <div className="va-footer-actions">
        <Link to={`${basePath}/front-office/admissions`} className="va-btn-secondary">
          Back to List
        </Link>
        <button
          onClick={() => navigate(`${basePath}/front-office/admissions/edit/${id}`)}
          className="va-btn-primary"
        >
          <Edit size={18} />
          Edit Admission
        </button>
      </div>

    </div>
  );
};

export default ViewAdmission;