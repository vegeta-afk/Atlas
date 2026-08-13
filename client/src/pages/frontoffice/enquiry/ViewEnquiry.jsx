// pages/frontoffice/enquiry/ViewEnquiry.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../../../services/api";
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
  FileText,
  CheckCircle,
  XCircle,
  DollarSign,
} from "lucide-react";
import "./ViewEnquiry.css";

const ViewEnquiry = () => {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const basePath  = useBasePath();

  const [enquiry,    setEnquiry]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => { if (id) fetchEnquiry(); }, [id]);

  const fetchEnquiry = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/enquiries/${id}`);
      if (response.data.success) {
        setEnquiry(response.data.data);
      } else {
        throw new Error(response.data.message || "Failed to fetch enquiry");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load enquiry");
    } finally {
      setLoading(false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (val) => {
    if (!val) return "N/A";
    return new Date(val).toLocaleDateString("en-IN", {
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

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  };

  const getStatusConfig = (status) => {
    const map = {
      new:       { label: "New",        className: "status-on-leave",  Icon: Clock       },
      contacted: { label: "Contacted",  className: "status-on-leave",  Icon: Phone       },
      follow_up: { label: "Follow Up",  className: "status-on-leave",  Icon: Calendar    },
      converted: { label: "Converted",  className: "status-active",    Icon: UserCheck   },
      rejected:  { label: "Rejected",   className: "status-inactive",  Icon: UserX       },
    };
    return map[status] || { label: status || "N/A", className: "status-on-leave", Icon: Clock };
  };

  const openWhatsApp = (phone) => {
    if (!phone) return;
    window.open(`https://wa.me/91${phone.replace(/\D/g, "")}`, "_blank");
  };

  const handleConvertToAdmission = async () => {
    if (!enquiry || converting) return;
    if (enquiry.convertedToAdmission) { alert("Already converted to admission"); return; }
    if (enquiry.status === "rejected") { alert("Cannot convert a rejected enquiry"); return; }
    if (!window.confirm("Convert this enquiry to admission?")) return;

    try {
      setConverting(true);
      const response = await api.post(`/enquiries/${id}/convert-to-admission`);
      if (response.data.success) {
        alert("✅ Enquiry converted to admission successfully!");
        setEnquiry((prev) => ({
          ...prev,
          convertedToAdmission: true,
          status: "converted",
          admissionId: response.data.data.admission._id,
        }));
        if (window.confirm("Would you like to view the admission?")) {
          navigate(`${basePath}/front-office/admissions/view/${response.data.data.admission._id}`);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to convert to admission");
    } finally {
      setConverting(false);
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="va-container">
      <div className="va-center-state">
        <RefreshCw size={32} className="va-spinning" />
        <p>Loading enquiry details...</p>
      </div>
    </div>
  );

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (error || !enquiry) return (
    <div className="va-container">
      <div className="va-center-state">
        <AlertCircle size={48} className="va-error-icon" />
        <h3>Failed to load enquiry</h3>
        <p>{error}</p>
        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button onClick={fetchEnquiry} className="va-btn-primary">
            <RefreshCw size={16} /> Retry
          </button>
          <Link to={`${basePath}/front-office/enquiries`} className="va-btn-secondary">
            Back to List
          </Link>
        </div>
      </div>
    </div>
  );

  const e = enquiry;
  const statusConfig = getStatusConfig(e.status);
  const StatusIcon   = statusConfig.Icon;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="va-container">

      {/* Page Header */}
      <div className="va-page-header">
        <div className="va-header-left">
          <Link to={`${basePath}/front-office/enquiries`} className="va-back-link">
            <ArrowLeft size={20} />
            Back to Enquiries List
          </Link>
          <div>
            <h1>Enquiry Details</h1>
            <p>Viewing enquiry of {e.applicantName}</p>
          </div>
        </div>
        <div className="va-header-actions">
          {!e.convertedToAdmission && e.status !== "rejected" && (
            <button
              onClick={handleConvertToAdmission}
              disabled={converting}
              className="va-btn-secondary"
            >
              <UserCheck size={18} />
              {converting ? "Converting..." : "Convert to Admission"}
            </button>
          )}
          <button
            onClick={() => navigate(`${basePath}/front-office/enquiries/edit/${id}`)}
            className="va-btn-primary"
          >
            <Edit size={18} />
            Edit Enquiry
          </button>
        </div>
      </div>

      {/* Hero Card */}
      <div className="va-hero-card">
        <div className="va-avatar-large">
          {getInitials(e.applicantName)}
        </div>

        <div className="va-hero-info">
          <h2>{e.applicantName}</h2>
          <p className="va-sub">{e.courseInterested || "Course not specified"}</p>
          <div className="va-hero-meta">
            <span className={`va-status-badge ${statusConfig.className}`}>
              <StatusIcon size={13} />
              {statusConfig.label}
            </span>
            <span className="va-meta-chip">
              <Hash size={14} />
              {e.enquiryNo || "N/A"}
            </span>
            {e.batchTime && (
              <span className="va-meta-chip">
                <Clock size={14} />
                {e.batchTime} Batch
              </span>
            )}
            {e.convertedToAdmission && (
              <span className="va-meta-chip va-chip-scholarship">
                <CheckCircle size={14} />
                Converted to Admission
              </span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="va-quick-actions">
          {/* {e.contactNo && (
            <a href={`tel:${e.contactNo}`} className="va-quick-btn va-quick-call">
              <Phone size={18} />
              <span>Call</span>
            </a>
          )} */}
          {e.email && (
            <a href={`mailto:${e.email}`} className="va-quick-btn va-quick-mail">
              <Mail size={18} />
              <span>Email</span>
            </a>
          )}
          {(e.whatsappNo || e.contactNo) && (
            <button
              onClick={() => openWhatsApp(e.whatsappNo || e.contactNo)}
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
              <span className="va-field-value">{e.applicantName || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Gender</span>
              <span className="va-field-value va-capitalize">{e.gender || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Guardian Name</span>
              <span className="va-field-value">{e.guardianName || e.fatherName || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Guardian Contact</span>
              <span className="va-field-value">
                {e.guardianContact ? (
                  <a href={`tel:${e.guardianContact}`} className="va-link">
                    <Phone size={14} />
                    {formatPhone(e.guardianContact)}
                  </a>
                ) : "N/A"}
              </span>
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
              <span className="va-field-value">{e.qualification || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Year of Passing</span>
              <span className="va-field-value">{e.yearOfPassing || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Course Interested</span>
              <span className="va-field-value va-highlight">{e.courseInterested || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Batch Time</span>
              <span className="va-field-value">
                <Clock size={14} style={{ marginRight: 6, opacity: 0.6 }} />
                {e.batchTime || "N/A"}
              </span>
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
              <span className="va-field-label">Mobile Number</span>
              <span className="va-field-value">
                <a href={`tel:${e.contactNo}`} className="va-link">
                  <Phone size={14} />
                  {formatPhone(e.contactNo)}
                </a>
              </span>
            </div>
            {e.whatsappNo && (
              <div className="va-field-row">
                <span className="va-field-label">WhatsApp Number</span>
                <span className="va-field-value">
                  <a href={`tel:${e.whatsappNo}`} className="va-link">
                    <Phone size={14} />
                    {formatPhone(e.whatsappNo)}
                  </a>
                </span>
              </div>
            )}
            <div className="va-field-row">
              <span className="va-field-label">Email</span>
              <span className="va-field-value">
                {e.email ? (
                  <a href={`mailto:${e.email}`} className="va-link">
                    <Mail size={14} />
                    {e.email}
                  </a>
                ) : "N/A"}
              </span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Place / Area</span>
              <span className="va-field-value">
                <MapPin size={14} style={{ marginRight: 6, opacity: 0.6 }} />
                {e.place || "N/A"}
              </span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">City</span>
              <span className="va-field-value">{e.city || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">State</span>
              <span className="va-field-value">{e.state || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Enquiry Information */}
        <div className="va-card">
          <div className="va-card-header">
            <Hash size={18} />
            <h3>Enquiry Information</h3>
          </div>
          <div className="va-card-body">
            <div className="va-field-row">
              <span className="va-field-label">Enquiry No</span>
              <span className="va-field-value">{e.enquiryNo || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Enquiry Date</span>
              <span className="va-field-value">
                <Calendar size={14} style={{ marginRight: 6, opacity: 0.6 }} />
                {formatDate(e.enquiryDate || e.createdAt)}
              </span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Enquiry By</span>
              <span className="va-field-value">{e.enquiryBy || "N/A"}</span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Enquiry Method</span>
              <span className="va-field-value va-capitalize">
                {e.enquiryMethod?.replace(/_/g, " ") || "N/A"}
              </span>
            </div>
            {/* <div className="va-field-row">
              <span className="va-field-label">Follow-up Date</span>
              <span className="va-field-value">
                <Calendar size={14} style={{ marginRight: 6, opacity: 0.6 }} />
                {formatDate(e.followUpDate)}
              </span>
            </div>
            <div className="va-field-row">
              <span className="va-field-label">Date of Coming</span>
              <span className="va-field-value">
                {formatDate(e.dateOfComing)}
              </span>
            </div> */}

            {/* Prospectus */}
            {e.prospectusFees && (
              <>
                {/* <div className="va-divider" /> */}
                {/* <div className="va-field-row">
                  <span className="va-field-label">Prospectus Fees</span>
                  <span className="va-field-value" style={{ color: e.prospectusFees === "yes" ? "#15803d" : "#dc2626", fontWeight: 600 }}>
                    {e.prospectusFees === "yes"
                      ? `Paid — ₹${e.prospectusAmount || 0}`
                      : "Not Paid"}
                  </span>
                </div> */}
              </>
            )}

            {/* Reference */}
            {e.reference && (
              <div className="va-field-row">
                <span className="va-field-label">Reference</span>
                <span className="va-field-value">{e.reference}</span>
              </div>
            )}
          </div>
        </div>

        {/* Remarks — only if present */}
        {e.remark && (
          <div className="va-card va-card-full">
            <div className="va-card-header">
              <FileText size={18} />
              <h3>Remarks</h3>
            </div>
            <div className="va-card-body">
              <p className="va-remarks">{e.remark}</p>
            </div>
          </div>
        )}

        {/* Enquiry Timeline — full width */}
        <div className="va-card va-card-full">
          <div className="va-card-header">
            <Calendar size={18} />
            <h3>Enquiry Timeline</h3>
          </div>
          <div className="va-card-body va-timeline">
            <div className="va-timeline-item va-timeline-join">
              <div className="va-timeline-dot" />
              <div>
                <p className="va-timeline-label">Enquiry Date</p>
                <p className="va-timeline-date">{formatDate(e.enquiryDate || e.createdAt)}</p>
                <p className="va-timeline-sub">Enquired by {e.enquiryBy || "Staff"}</p>
              </div>
            </div>

            <div className="va-timeline-line" />

            <div className={`va-timeline-item ${e.convertedToAdmission ? "va-timeline-present" : "va-timeline-join"}`}>
              <div className="va-timeline-dot" />
              <div>
                <p className="va-timeline-label">
                  {e.convertedToAdmission ? "Converted to Admission" : "Current Status"}
                </p>
                <p className="va-timeline-date">
                  {e.convertedToAdmission
                    ? "Admission Created"
                    : statusConfig.label}
                </p>
                {e.followUpDate && !e.convertedToAdmission && (
                  <p className="va-timeline-sub">Follow-up: {formatDate(e.followUpDate)}</p>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Actions */}
      <div className="va-footer-actions">
        <Link to={`${basePath}/front-office/enquiries`} className="va-btn-secondary">
          Back to List
        </Link>
        {!e.convertedToAdmission && e.status !== "rejected" && (
          <button
            onClick={handleConvertToAdmission}
            disabled={converting}
            className="va-btn-secondary"
          >
            <UserCheck size={18} />
            {converting ? "Converting..." : "Convert to Admission"}
          </button>
        )}
        {e.convertedToAdmission && e.admissionId && (
          <Link
            to={`${basePath}/front-office/admissions/view/${e.admissionId}`}
            className="va-btn-secondary"
          >
            <CheckCircle size={18} />
            View Admission
          </Link>
        )}
        <button
          onClick={() => navigate(`${basePath}/front-office/enquiries/edit/${id}`)}
          className="va-btn-primary"
        >
          <Edit size={18} />
          Edit Enquiry
        </button>
      </div>

    </div>
  );
};

export default ViewEnquiry;