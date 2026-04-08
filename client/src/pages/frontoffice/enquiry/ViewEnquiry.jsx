// pages/frontoffice/enquiry/ViewEnquiry.jsx
import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Edit,
  Printer,
  Download,
  Mail,
  Phone,
  Calendar,
  User,
  BookOpen,
  MapPin,
  Globe,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { toast } from "react-toastify";
import "./ViewEnquiry.css";
import useBasePath from "../../../hooks/useBasePath";

const ViewEnquiry = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(false);

  // Fetch enquiry data from backend
  useEffect(() => {
    if (id) {
      fetchEnquiry();
    }
  }, [id]);

  const fetchEnquiry = async () => {
    try {
      setLoading(true);
      setError("");

      // Get token from localStorage (adjust based on your auth implementation)
      const token = localStorage.getItem("token");

      const response = await api.get(`/enquiries/${id}`);

      if (response.data.success) {
        setEnquiry(response.data.data);
      } else {
        setError("Failed to fetch enquiry details");
        toast.error("Failed to load enquiry details");
      }
    } catch (err) {
      console.error("Error fetching enquiry:", err);
      setError(
        err.response?.data?.message || "Failed to fetch enquiry details"
      );
      toast.error(err.response?.data?.message || "Error loading enquiry");
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToAdmission = async () => {
    if (!enquiry || converting) return;

    // Check if already converted
    if (enquiry.convertedToAdmission) {
      toast.info("This enquiry has already been converted to admission");
      return;
    }

    if (enquiry.status === "rejected") {
      toast.error("Cannot convert a rejected enquiry to admission");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to convert this enquiry to admission?"
      )
    ) {
      return;
    }

    try {
      setConverting(true);
      const token = localStorage.getItem("token");

      const response = await api.post(`/enquiries/${id}/convert-to-admission`);

      if (response.data.success) {
        toast.success("Enquiry converted to admission successfully!");

        // Update local enquiry state
        setEnquiry((prev) => ({
          ...prev,
          convertedToAdmission: true,
          status: "converted",
          admissionId: response.data.data.admission._id,
        }));

        // Optional: Navigate to the created admission
        // navigate(`/admin/admissions/view/${response.data.data.admission._id}`);

        // Or show success message with option to view
        if (
          window.confirm(
            "Admission created successfully! Would you like to view the admission?"
          )
        ) {
          navigate(
            `${basePath}/front-office/admissions/view/${response.data.data.admission._id}`
          );
        }
      }
    } catch (err) {
      console.error("Error converting to admission:", err);
      toast.error(
        err.response?.data?.message || "Failed to convert to admission"
      );
    } finally {
      setConverting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "new":
        return <Clock className="status-icon new" />;
      case "contacted":
        return <Phone className="status-icon contacted" />;
      case "follow_up":
        return <Calendar className="status-icon follow_up" />;
      case "converted":
        return <CheckCircle className="status-icon converted" />;
      case "rejected":
        return <XCircle className="status-icon rejected" />;
      default:
        return <Clock className="status-icon" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const InfoCard = ({ title, icon: Icon, children }) => (
    <div className="info-card">
      <div className="info-card-header">
        <Icon size={20} />
        <h3>{title}</h3>
      </div>
      <div className="info-card-content">{children}</div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="view-enquiry-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading enquiry details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !enquiry) {
    return (
      <div className="view-enquiry-container">
        <div className="error-container">
          <AlertCircle size={48} className="error-icon" />
          <h2>Failed to Load Enquiry</h2>
          <p>{error || "Enquiry not found"}</p>
          <Link to={`${basePath}/front-office/enquiries`} className="btn-primary">
            <ArrowLeft size={18} />
            Back to Enquiries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="view-enquiry-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <Link to={`${basePath}/front-office/enquiries`} className="back-link">
            <ArrowLeft size={20} />
            Back to List
          </Link>
          <div>
            <h1>Enquiry Details</h1>
            <p>
              Enquiry No: {enquiry.enquiryNo} | Created:{" "}
              {formatDateTime(enquiry.createdAt)}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button className="action-btn">
            <Printer size={12} />
            Print
          </button>
          <button className="action-btn">
            <Download size={12} />
            Export
          </button>
          <button
            className="btn-convert"
            onClick={handleConvertToAdmission}
            disabled={
              converting ||
              enquiry.convertedToAdmission ||
              enquiry.status === "rejected"
            }
          >
            {converting ? (
              "Converting..."
            ) : (
              <>
                <UserCheck size={18} />
                {enquiry.convertedToAdmission
                  ? "Converted to Admission"
                  : "Convert to Admission"}
              </>
            )}
          </button>
          <Link
            to={`${basePath}/front-office/enquiries/edit/${enquiry._id}`}
            className="btn-primary"
          >
            <Edit size={18} />
            Edit
          </Link>
        </div>
      </div>

      {/* Enquiry Summary */}
      <div className="enquiry-summary">
        <div className="enquiry-avatar">
          <div className="avatar-large">
            {enquiry.applicantName?.charAt(0) || "?"}
          </div>
          <div className="enquiry-basic">
            <h2>{enquiry.applicantName}</h2>
            <div className="contact-links">
              {enquiry.email && (
                <a href={`mailto:${enquiry.email}`}>
                  <Mail size={16} />
                  {enquiry.email}
                </a>
              )}
              <a href={`tel:${enquiry.contactNo}`}>
                <Phone size={16} />
                {enquiry.contactNo}
              </a>
              {enquiry.whatsappNo &&
                enquiry.whatsappNo !== enquiry.contactNo && (
                  <span className="whatsapp-info">
                    <Phone size={16} />
                    WhatsApp: {enquiry.whatsappNo}
                  </span>
                )}
            </div>
          </div>
        </div>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-label">Enquiry Date</span>
            <div className="date-info">
              <Calendar size={16} />
              {formatDate(enquiry.enquiryDate)}
            </div>
          </div>
          <div className="stat">
            <span className="stat-label">Enquiry Method</span>
            <div className="method-badge">
              {enquiry.enquiryMethod?.replace("_", " ")}
            </div>
          </div>
          <div className="stat">
            <span className="stat-label">Status</span>
            <div className="status-badge">
              {getStatusIcon(enquiry.status)}
              <span className="status-text">
                {enquiry.status?.replace("_", " ")}
              </span>
              {enquiry.convertedToAdmission && (
                <span className="converted-badge">Converted</span>
              )}
            </div>
          </div>
          <div className="stat">
            <span className="stat-label">Follow-up Date</span>
            <div className="date-info">
              <Calendar size={16} />
              {formatDate(enquiry.followUpDate)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="content-grid">
        {/* Left Column */}
        <div className="left-column">
          <InfoCard title="Enquiry Details" icon={Calendar}>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Enquiry No</span>
                <span className="info-value">{enquiry.enquiryNo}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Date of Enquiry</span>
                <span className="info-value">
                  {formatDate(enquiry.enquiryDate)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Enquiry By</span>
                <span className="info-value">{enquiry.enquiryBy}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Enquiry Method</span>
                <span className="info-value">
                  {enquiry.enquiryMethod?.replace("_", " ")}
                </span>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Personal Details" icon={User}>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Applicant Name</span>
                <span className="info-value">{enquiry.applicantName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Contact Number</span>
                <span className="info-value">{enquiry.contactNo}</span>
              </div>
              <div className="info-item">
                <span className="info-label">WhatsApp Number</span>
                <span className="info-value">
                  {enquiry.whatsappNo || "Same as contact"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Gender</span>
                <span className="info-value">
                  {enquiry.gender || "Not specified"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Date of Birth</span>
                <span className="info-value">
                  {formatDate(enquiry.dateOfBirth)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Guardian Name</span>
                <span className="info-value">
                  {enquiry.guardianName || "Not provided"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Guardian Contact</span>
                <span className="info-value">
                  {enquiry.guardianContact || "Not provided"}
                </span>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Location Details" icon={MapPin}>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Place</span>
                <span className="info-value">
                  {enquiry.place || "Not provided"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">City</span>
                <span className="info-value">
                  {enquiry.city || "Not provided"}
                </span>
              </div>
            </div>
          </InfoCard>
        </div>

        {/* Right Column */}
        <div className="right-column">
          <InfoCard title="Academic Details" icon={BookOpen}>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Qualification</span>
                <span className="info-value">
                  {enquiry.qualification || "Not specified"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">School/College</span>
                <span className="info-value">
                  {enquiry.schoolCollege || "Not specified"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Year of Passing</span>
                <span className="info-value">
                  {enquiry.yearOfPassing || "Not specified"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Percentage</span>
                <span className="info-value">
                  {enquiry.percentage || "Not specified"}
                </span>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Course Details" icon={BookOpen}>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Course Interested</span>
                <span className="info-value course-name">
                  {enquiry.courseInterested}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Batch Time</span>
                <span className="info-value">
                  {enquiry.batchTime || "Not specified"}
                </span>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Reference Details" icon={Globe}>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Reference</span>
                <span className="info-value">
                  {enquiry.reference || "Not provided"}
                </span>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Additional Details" icon={MessageSquare}>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Date of Coming</span>
                <span className="info-value">
                  {formatDate(enquiry.dateOfComing)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Prospectus Fees</span>
                <span className="info-value">
                  {enquiry.prospectusFees === "yes"
                    ? `Paid - ₹${enquiry.prospectusAmount || 0}`
                    : "Not Paid"}
                </span>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Remarks" icon={FileText}>
            <div className="remarks-content">
              <p>{enquiry.remark || "No remarks provided"}</p>
            </div>
          </InfoCard>

          {enquiry.admissionId && (
            <InfoCard title="Admission Information" icon={CheckCircle}>
              <div className="admission-info">
                <p>This enquiry has been converted to admission.</p>
                <Link
                  to={`${basePath}/front-office/admissions/view/${enquiry.admissionId}`}
                  className="btn-primary"
                >
                  View Admission
                </Link>
              </div>
            </InfoCard>
          )}
        </div>
      </div>

      {/* Metadata Footer */}
      <div className="metadata-footer">
        <div className="metadata-item">
          <span className="metadata-label">Created:</span>
          <span className="metadata-value">
            {formatDateTime(enquiry.createdAt)}
          </span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Last Updated:</span>
          <span className="metadata-value">
            {formatDateTime(enquiry.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ViewEnquiry;
