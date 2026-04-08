// pages/frontoffice/admission/ViewAdmission.jsx
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
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import "./ViewAdmission.css";
import { admissionAPI } from "../../../services/api";
import useBasePath from "../../../hooks/useBasePath";

const ViewAdmission = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useBasePath();

  const [admission, setAdmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAdmissionDetails();
  }, [id]);

  const fetchAdmissionDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await admissionAPI.getAdmission(id);

      if (response.data.success) {
        const admissionData = response.data.data;

        // Transform API data to match frontend structure
        const transformedData = {
          id: admissionData._id,
          studentId:
            admissionData.admissionNo ||
            `ADM${admissionData._id.substring(0, 8)}`,
          fullName: admissionData.fullName || admissionData.applicantName,
          dateOfBirth: admissionData.dateOfBirth || "N/A",
          gender: admissionData.gender || "N/A",
          fatherName: admissionData.fatherName || "N/A",
          motherName: admissionData.motherName || "N/A",
          email: admissionData.email || "N/A",
          mobileNumber:
            admissionData.mobileNumber || admissionData.contactNo || "N/A",
          alternateNumber: admissionData.alternateNumber || "N/A",
          address: admissionData.address || "N/A",
          city: admissionData.city || "N/A",
          state: admissionData.state || "N/A",
          pincode: admissionData.pincode || "N/A",
          aadharNumber: admissionData.aadharNumber || "N/A",
          lastQualification: admissionData.lastQualification || "N/A",
          percentage: admissionData.percentage || "N/A",
          yearOfPassing: admissionData.yearOfPassing || "N/A",
          schoolCollege: admissionData.schoolCollege || "N/A",
          interestedCourse:
            admissionData.course || admissionData.courseInterested || "N/A",
          specialization: admissionData.specialization || "N/A",
          preferredBatch:
            admissionData.batchTime || admissionData.batch || "N/A",
          admissionForYear: admissionData.admissionForYear || "N/A",
          source: admissionData.source || "N/A",
          referenceName: admissionData.referenceName || "N/A",
          referenceContact: admissionData.referenceContact || "N/A",
          status: admissionData.status || "new",
          priority: admissionData.priority || "medium",
          remarks: admissionData.remarks || "No remarks available.",
          inquiryDate:
            admissionData.inquiryDate || admissionData.createdAt || "N/A",
          followUpDate: admissionData.followUpDate || "N/A",
          assignedTo: admissionData.assignedTo || "N/A",
          facultyAllot: admissionData.facultyAllot || "Not Allotted",
          admissionDate: admissionData.admissionDate || "N/A",
          // New fields from admission form
          guardianName: admissionData.guardianName || "N/A",
          guardianRelation: admissionData.guardianRelation || "N/A",
          guardianContact: admissionData.guardianContact || "N/A",
          guardianEmail: admissionData.guardianEmail || "N/A",
          guardianOccupation: admissionData.guardianOccupation || "N/A",
          guardianIncome: admissionData.guardianIncome || "N/A",
          paymentMode: admissionData.paymentMode || "N/A",
          totalFees: admissionData.totalFees || "N/A",
          paidAmount: admissionData.paidAmount || "N/A",
          remainingAmount: admissionData.remainingAmount || "N/A",
          nextInstallmentDate: admissionData.nextInstallmentDate || "N/A",
          documents: admissionData.documents || [],
          activities: admissionData.activities || [
            {
              id: 1,
              action: "Admission Created",
              by: admissionData.createdBy || "System",
              date: admissionData.createdAt
                ? new Date(admissionData.createdAt).toLocaleString()
                : "N/A",
              notes: "Admission record created",
            },
          ],
        };

        setAdmission(transformedData);
      } else {
        throw new Error(
          response.data.message || "Failed to fetch admission details"
        );
      }
    } catch (err) {
      console.error("Error fetching admission:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load admission details"
      );
    } finally {
      setLoading(false);
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
      case "confirmed":
      case "admitted":
        return <CheckCircle className="status-icon converted" />;
      case "rejected":
      case "cancelled":
        return <XCircle className="status-icon rejected" />;
      default:
        return <Clock className="status-icon" />;
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      new: "New",
      contacted: "Contacted",
      follow_up: "Follow Up",
      converted: "Converted",
      confirmed: "Confirmed",
      admitted: "Admitted",
      rejected: "Rejected",
      cancelled: "Cancelled",
      completed: "Completed",
      provisional: "Provisional",
      under_process: "Under Process",
      approved: "Approved",
    };
    return statusMap[status] || status.replace("_", " ").toUpperCase();
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };
    return (
      <span className={`priority-badge ${colors[priority] || colors.medium}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async () => {
    try {
      const response = await admissionAPI.exportAdmission(id);
      if (response.data) {
        // Create download link for PDF
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `admission-${admission.studentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export admission details");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === "N/A") return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB");
    } catch (e) {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString || dateString === "N/A") return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-GB");
    } catch (e) {
      return dateString;
    }
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

  if (loading) {
    return (
      <div className="loading-container">
        <Loader2 className="animate-spin" size={48} />
        <p>Loading admission details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <AlertCircle size={48} />
        <h3>Error Loading Admission</h3>
        <p>{error}</p>
        <button
          onClick={() => navigate(`${basePath}/front-office/admissions`)}
          className="btn-primary mt-4"
        >
          Back to List
        </button>
      </div>
    );
  }

  if (!admission) {
    return (
      <div className="not-found-container">
        <AlertCircle size={48} />
        <h3>Admission Not Found</h3>
        <p>The admission you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate(`${basePath}/front-office/admissions`)}
          className="btn-primary mt-4"
        >
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div className="view-admission-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <Link to={`${basePath}/front-office/admissions`} className="back-link">
            <ArrowLeft size={20} />
            Back to List
          </Link>
          <div>
            <h1>Admission Details</h1>
            <p>Admission ID: {admission.studentId}</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="action-btn" onClick={handlePrint}>
            <Printer size={18} />
            Print
          </button>
          <button className="action-btn" onClick={handleExport}>
            <Download size={18} />
            Export
          </button>
          <Link
            to={`${basePath}/front-office/admissions/edit/${admission.id}`}
            className="btn-primary"
          >
            <Edit size={18} />
            Edit
          </Link>
        </div>
      </div>

      {/* Student Summary */}
      <div className="student-summary">
        <div className="student-avatar">
          <div className="avatar-large">{admission.fullName.charAt(0)}</div>
          <div className="student-basic">
            <h2>{admission.fullName}</h2>
            <div className="contact-links">
              {admission.email !== "N/A" && (
                <a href={`mailto:${admission.email}`}>
                  <Mail size={16} />
                  {admission.email}
                </a>
              )}
              {admission.mobileNumber !== "N/A" && (
                <a href={`tel:${admission.mobileNumber}`}>
                  <Phone size={16} />
                  {admission.mobileNumber}
                </a>
              )}
            </div>
            <div className="additional-info">
              <span className="info-tag">Aadhar: {admission.aadharNumber}</span>
              <span className="info-tag">
                Faculty: {admission.facultyAllot}
              </span>
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
              <Calendar size={16} />
              {formatDate(admission.admissionDate)}
            </div>
          </div>
          <div className="stat">
            <span className="stat-label">Assigned To</span>
            <div className="assigned-info">
              <div className="avatar-small">
                {admission.assignedTo.charAt(0)}
              </div>
              {admission.assignedTo}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="content-grid">
        {/* Left Column */}
        <div className="left-column">
          <InfoCard title="Personal Information" icon={User}>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Date of Birth</span>
                <span className="info-value">
                  {formatDate(admission.dateOfBirth)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Gender</span>
                <span className="info-value">{admission.gender}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Father's Name</span>
                <span className="info-value">{admission.fatherName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Mother's Name</span>
                <span className="info-value">{admission.motherName}</span>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Guardian Information" icon={User}>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Guardian Name</span>
                <span className="info-value">{admission.guardianName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Relationship</span>
                <span className="info-value">{admission.guardianRelation}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Contact</span>
                <span className="info-value">{admission.guardianContact}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{admission.guardianEmail}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Occupation</span>
                <span className="info-value">
                  {admission.guardianOccupation}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Annual Income</span>
                <span className="info-value">₹{admission.guardianIncome}</span>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Academic Information" icon={BookOpen}>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Last Qualification</span>
                <span className="info-value">
                  {admission.lastQualification}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Percentage/CGPA</span>
                <span className="info-value">{admission.percentage}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Year of Passing</span>
                <span className="info-value">{admission.yearOfPassing}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">School/College</span>
                <span className="info-value">{admission.schoolCollege}</span>
              </div>
            </div>
          </InfoCard>
        </div>

        {/* Right Column */}
        <div className="right-column">
          <InfoCard title="Course & Batch Information" icon={BookOpen}>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Course</span>
                <span className="info-value course-name">
                  {admission.interestedCourse}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Specialization</span>
                <span className="info-value">{admission.specialization}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Batch</span>
                <span className="info-value">{admission.preferredBatch}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Admission Year</span>
                <span className="info-value">{admission.admissionForYear}</span>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Fee Information" icon={FileText}>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Total Fees</span>
                <span className="info-value">₹{admission.totalFees}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Paid Amount</span>
                <span className="info-value">₹{admission.paidAmount}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Remaining Amount</span>
                <span className="info-value">₹{admission.remainingAmount}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Payment Mode</span>
                <span className="info-value">{admission.paymentMode}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Next Installment</span>
                <span className="info-value">
                  {formatDate(admission.nextInstallmentDate)}
                </span>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Contact Information" icon={MapPin}>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Address</span>
                <span className="info-value">{admission.address}</span>
              </div>
              <div className="info-item">
                <span className="info-label">City</span>
                <span className="info-value">{admission.city}</span>
              </div>
              <div className="info-item">
                <span className="info-label">State</span>
                <span className="info-value">{admission.state}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Pincode</span>
                <span className="info-value">{admission.pincode}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Alternate Contact</span>
                <span className="info-value">{admission.alternateNumber}</span>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Inquiry Details" icon={Globe}>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Source</span>
                <span className="info-value">{admission.source}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Inquiry Date</span>
                <span className="info-value">
                  {formatDateTime(admission.inquiryDate)}
                </span>
              </div>
              {admission.referenceName !== "N/A" && (
                <div className="info-item">
                  <span className="info-label">Reference</span>
                  <span className="info-value">
                    {admission.referenceName} ({admission.referenceContact})
                  </span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Follow-up Date</span>
                <span className="info-value">
                  {formatDate(admission.followUpDate)}
                </span>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Remarks" icon={MessageSquare}>
            <div className="remarks-content">
              <p>{admission.remarks}</p>
            </div>
          </InfoCard>

          <InfoCard title="Documents" icon={FileText}>
            {admission.documents && admission.documents.length > 0 ? (
              <div className="documents-list">
                {admission.documents.map((doc, index) => (
                  <div key={index} className="document-item">
                    <FileText size={16} />
                    <span>{doc.name || doc}</span>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="document-download"
                      >
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No documents uploaded</p>
            )}
          </InfoCard>

          <InfoCard title="Activity Log" icon={Clock}>
            <div className="activity-timeline">
              {admission.activities.map((activity, index) => (
                <div key={activity.id || index} className="activity-item">
                  <div className="activity-dot"></div>
                  <div className="activity-content">
                    <div className="activity-header">
                      <strong>{activity.action}</strong>
                      <span className="activity-date">{activity.date}</span>
                    </div>
                    <div className="activity-details">
                      <span className="activity-by">By: {activity.by}</span>
                      {activity.notes && (
                        <p className="activity-notes">{activity.notes}</p>
                      )}
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
