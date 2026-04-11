// pages/frontoffice/enquiry/ViewEnquiry.jsx
import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Edit, Printer, Download, Mail, Phone, Calendar,
  User, BookOpen, MapPin, Globe, FileText, CheckCircle, XCircle,
  Clock, MessageSquare, UserCheck, AlertCircle,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { toast } from "react-toastify";
import "./ViewEnquiry.css";
import useBasePath from "../../../hooks/useBasePath";

const ViewEnquiry = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const basePath     = useBasePath();

  const [enquiry,    setEnquiry]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [converting, setConverting] = useState(false);

  useEffect(() => { if (id) fetchEnquiry(); }, [id]);

  const fetchEnquiry = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/enquiries/${id}`);
      if (response.data.success) {
        setEnquiry(response.data.data);
      } else {
        setError("Failed to fetch enquiry details");
        toast.error("Failed to load enquiry details");
      }
    } catch (err) {
      console.error("Error fetching enquiry:", err);
      setError(err.response?.data?.message || "Failed to fetch enquiry details");
      toast.error(err.response?.data?.message || "Error loading enquiry");
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers — defined BEFORE any early returns ─────────────────────────────

  const handlePrint = () => window.print();

  const handleConvertToAdmission = async () => {
    if (!enquiry || converting) return;

    if (enquiry.convertedToAdmission) {
      toast.info("This enquiry has already been converted to admission");
      return;
    }
    if (enquiry.status === "rejected") {
      toast.error("Cannot convert a rejected enquiry to admission");
      return;
    }
    if (!window.confirm("Are you sure you want to convert this enquiry to admission?")) return;

    try {
      setConverting(true);
      const response = await api.post(`/enquiries/${id}/convert-to-admission`);
      if (response.data.success) {
        toast.success("Enquiry converted to admission successfully!");
        setEnquiry((prev) => ({
          ...prev,
          convertedToAdmission: true,
          status: "converted",
          admissionId: response.data.data.admission._id,
        }));
        if (window.confirm("Admission created! Would you like to view it?")) {
          navigate(`${basePath}/front-office/admissions/view/${response.data.data.admission._id}`);
        }
      }
    } catch (err) {
      console.error("Error converting to admission:", err);
      toast.error(err.response?.data?.message || "Failed to convert to admission");
    } finally {
      setConverting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "converted":  return <CheckCircle className="status-icon converted" />;
      case "rejected":   return <XCircle     className="status-icon rejected"  />;
      case "follow_up":  return <Calendar    className="status-icon follow_up" />;
      case "contacted":  return <Phone       className="status-icon contacted" />;
      default:           return <Clock       className="status-icon new"       />;
    }
  };

  const getStatusLabel = (status) => ({
    new:       "New",
    contacted: "Contacted",
    follow_up: "Follow Up",
    converted: "Converted",
    rejected:  "Rejected",
  }[status] || status?.replace(/_/g, " ").toUpperCase() || "N/A");

  const formatDate = (val) => {
    if (!val) return "N/A";
    try {
      return new Date(val).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      });
    } catch { return val; }
  };

  const formatDateTime = (val) => {
    if (!val) return "N/A";
    try {
      return new Date(val).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return val; }
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

  // ── Early returns — AFTER all hooks & function definitions ─────────────────

  if (loading) return (
    <div className="view-enquiry-container">
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading enquiry details...</p>
      </div>
    </div>
  );

  if (error || !enquiry) return (
    <div className="view-enquiry-container">
      <div className="error-container">
        <AlertCircle size={48} className="error-icon" />
        <h2>Failed to Load Enquiry</h2>
        <p>{error || "Enquiry not found"}</p>
        <Link to={`${basePath}/front-office/enquiries`} className="btn-primary">
          <ArrowLeft size={18} /> Back to Enquiries
        </Link>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  // Convenience aliases so JSX stays clean
  const e = enquiry;

  return (
    <div className="view-enquiry-container">

      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <Link to={`${basePath}/front-office/enquiries`} className="back-link">
            <ArrowLeft size={20} /> Back to List
          </Link>
          <div>
            <h1>Enquiry Details</h1>
            <p>Enquiry No: {e.enquiryNo} | Created: {formatDateTime(e.createdAt)}</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="action-btn" onClick={handlePrint}>
            <Printer size={15} /> Print
          </button>
          <button
            className="btn-convert"
            onClick={handleConvertToAdmission}
            disabled={converting || e.convertedToAdmission || e.status === "rejected"}
          >
            <UserCheck size={16} />
            {converting
              ? "Converting..."
              : e.convertedToAdmission
              ? "Already Converted"
              : "Convert to Admission"}
          </button>
          <Link
            to={`${basePath}/front-office/enquiries/edit/${e._id}`}
            className="btn-primary"
          >
            <Edit size={16} /> Edit
          </Link>
        </div>
      </div>

      {/* Enquiry Summary Banner */}
      <div className="enquiry-summary">
        <div className="enquiry-avatar">
          {/* No photo for enquiry — always show letter avatar */}
          <div className="avatar-large">
            {e.applicantName?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="enquiry-basic">
            <h2>{e.applicantName}</h2>
            <div className="contact-links">
              {e.email && (
                <a href={`mailto:${e.email}`}><Mail size={14} />{e.email}</a>
              )}
              <a href={`tel:${e.contactNo}`}><Phone size={14} />{e.contactNo}</a>
              {e.whatsappNo && e.whatsappNo !== e.contactNo && (
                <span className="whatsapp-info">
                  <Phone size={14} /> WhatsApp: {e.whatsappNo}
                </span>
              )}
            </div>
            <div className="additional-info">
              {e.city && <span className="info-tag">{e.city}{e.state ? `, ${e.state}` : ""}</span>}
              {e.enquiryNo && <span className="info-tag">#{e.enquiryNo}</span>}
            </div>
          </div>
        </div>

        <div className="summary-stats">
          <div className="stat">
            <span className="stat-label">Enquiry Date</span>
            <div className="date-info"><Calendar size={14} />{formatDate(e.enquiryDate)}</div>
          </div>
          <div className="stat">
            <span className="stat-label">Enquiry Method</span>
            <div className="method-badge">
              {e.enquiryMethod?.replace(/_/g, " ") || "N/A"}
            </div>
          </div>
          <div className="stat">
            <span className="stat-label">Status</span>
            <div className="status-badge">
              {getStatusIcon(e.status)}
              <span className="status-text">{getStatusLabel(e.status)}</span>
              {e.convertedToAdmission && (
                <span className="converted-badge">Converted</span>
              )}
            </div>
          </div>
          <div className="stat">
            <span className="stat-label">Follow-up Date</span>
            <div className="date-info">
              <Calendar size={14} />
              {e.followUpDate ? formatDate(e.followUpDate) : "Not set"}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="content-grid">

        {/* LEFT */}
        <div className="left-column">

          <InfoCard title="Enquiry Details" icon={Calendar}>
            <div className="info-grid">
              <InfoItem label="Enquiry No"     value={e.enquiryNo} />
              <InfoItem label="Date of Enquiry" value={formatDate(e.enquiryDate)} />
              <InfoItem label="Enquiry By"     value={e.enquiryBy} />
              <InfoItem label="Enquiry Method" value={e.enquiryMethod?.replace(/_/g, " ")} />
            </div>
          </InfoCard>

          <InfoCard title="Personal Details" icon={User}>
            <div className="info-grid">
              <InfoItem label="Applicant Name"   value={e.applicantName} />
              <InfoItem label="Gender"           value={e.gender} />
              <InfoItem label="Date of Birth"    value={formatDate(e.dateOfBirth)} />
              <InfoItem label="Contact Number"   value={e.contactNo} />
              <InfoItem label="WhatsApp Number"  value={e.whatsappNo || "Same as contact"} />
              <InfoItem label="Email"            value={e.email} />
              <InfoItem label="Guardian Name"    value={e.guardianName} />
              <InfoItem label="Guardian Contact" value={e.guardianContact} />
            </div>
          </InfoCard>

          <InfoCard title="Location Details" icon={MapPin}>
            <div className="info-grid">
              <InfoItem label="Place"   value={e.place} />
              <InfoItem label="City"    value={e.city} />
              <InfoItem label="State"   value={e.state} />   {/* ✅ schema field */}
            </div>
          </InfoCard>

        </div>

        {/* RIGHT */}
        <div className="right-column">

          <InfoCard title="Academic Details" icon={BookOpen}>
            <div className="info-grid">
              <InfoItem label="Qualification"   value={e.qualification} />
              <InfoItem label="School / College" value={e.schoolCollege} />
              <InfoItem label="Year of Passing"  value={e.yearOfPassing ? String(e.yearOfPassing) : null} />
              <InfoItem label="Percentage"       value={e.percentage} />
            </div>
          </InfoCard>

          <InfoCard title="Course Details" icon={BookOpen}>
            <div className="info-grid">
              <InfoItem label="Course Interested" value={e.courseInterested} />
              <InfoItem label="Batch Time"         value={e.batchTime} />
            </div>
          </InfoCard>

          <InfoCard title="Reference Details" icon={Globe}>
            <div className="info-grid">
              <InfoItem label="Reference" value={e.reference} />
            </div>
          </InfoCard>

          <InfoCard title="Prospectus & Fees" icon={FileText}>
            <div className="info-grid">
              <InfoItem label="Date of Coming"   value={formatDate(e.dateOfComing)} />
              <InfoItem
                label="Prospectus Fees"
                value={
                  e.prospectusFees === "yes"
                    ? `Paid — ₹${e.prospectusAmount || 0}`
                    : "Not Paid"
                }
              />
            </div>
          </InfoCard>

        </div>
      </div>

      {/* Bottom 2-Column Grid — last cards side-by-side */}
      <div className="bottom-grid">

        <div className="bottom-left">
          <InfoCard title="Remarks" icon={MessageSquare}>
            <div className="remarks-content">
              <p>{e.remark || "No remarks provided"}</p>
            </div>
          </InfoCard>
        </div>

        <div className="bottom-right">
          {/* Show Admission link card only if converted */}
          {e.admissionId ? (
            <InfoCard title="Admission Information" icon={CheckCircle}>
              <div className="admission-info">
                <p>This enquiry has been converted to admission.</p>
                <Link
                  to={`${basePath}/front-office/admissions/view/${e.admissionId}`}
                  className="btn-primary"
                  style={{ marginTop: 12, display: "inline-flex" }}
                >
                  View Admission
                </Link>
              </div>
            </InfoCard>
          ) : (
            <InfoCard title="Admission Information" icon={CheckCircle}>
              <div className="admission-info">
                <p className="empty-text">Not yet converted to admission.</p>
              </div>
            </InfoCard>
          )}
        </div>

      </div>

      {/* Metadata Footer */}
      <div className="metadata-footer">
        <div className="metadata-item">
          <span className="metadata-label">Created:</span>
          <span className="metadata-value">{formatDateTime(e.createdAt)}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Last Updated:</span>
          <span className="metadata-value">{formatDateTime(e.updatedAt)}</span>
        </div>
      </div>

    </div>
  );
};

export default ViewEnquiry;