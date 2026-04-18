// components/faculty/ViewFaculty.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { facultyAPI } from "../../services/api";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Briefcase,
  Clock,
  DollarSign,
  RefreshCw,
  AlertCircle,
  MessageCircle,
  UserCheck,
  UserX,
  Sun,
  Moon,
  Coffee,
} from "lucide-react";
import "./ViewFaculty.css";

const ViewFaculty = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { facultyId } = useParams();

  const basePath = location.pathname.startsWith("/admin") ? "/admin" : "/faculty";

  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Fetch faculty ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchFaculty = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await facultyAPI.getFacultyById(facultyId);
        if (response.data.success) {
          setFaculty(response.data.data);
        } else {
          throw new Error(response.data.message || "Failed to fetch faculty");
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load faculty");
      } finally {
        setLoading(false);
      }
    };

    if (facultyId) fetchFaculty();
  }, [facultyId]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatPhone = (phone) => {
    if (!phone) return "N/A";
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length === 10
      ? `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
      : phone;
  };

  const getStatusConfig = (status) => {
    const map = {
      active:   { label: "Active",   className: "status-active",   Icon: UserCheck },
      inactive: { label: "Inactive", className: "status-inactive", Icon: UserX },
      "on-leave": { label: "On Leave", className: "status-on-leave", Icon: Clock },
    };
    return map[status] || map.active;
  };

  const getShiftIcon = (shift) => {
    const map = {
      Morning:  <Sun size={16} />,
      Afternoon:<Sun size={16} />,
      Evening:  <Moon size={16} />,
      "Full-day": <Clock size={16} />,
    };
    return map[shift] || <Clock size={16} />;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  };

  const openWhatsApp = (phone) => {
    if (!phone) return;
    window.open(`https://wa.me/91${phone}`, "_blank");
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="view-faculty-container">
        <div className="vf-center-state">
          <RefreshCw size={32} className="spinning" />
          <p>Loading faculty details...</p>
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (error || !faculty) {
    return (
      <div className="view-faculty-container">
        <div className="vf-center-state">
          <AlertCircle size={48} className="error-icon" />
          <h3>Failed to load faculty</h3>
          <p>{error}</p>
          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <button onClick={() => window.location.reload()} className="vf-btn-primary">
              <RefreshCw size={16} /> Retry
            </button>
            <Link to={`${basePath}/faculty`} className="vf-btn-secondary">
              Back to List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(faculty.status);
  const StatusIcon = statusConfig.Icon;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="view-faculty-container">
      {/* Page Header */}
      <div className="vf-page-header">
        <div className="vf-header-left">
          <Link to={`${basePath}/faculty`} className="vf-back-link">
            <ArrowLeft size={20} />
            Back to Faculty List
          </Link>
          <div>
            <h1>Faculty Details</h1>
            <p>Viewing profile of {faculty.facultyName}</p>
          </div>
        </div>
        <div className="vf-header-actions">
          <button
            onClick={() => navigate(`${basePath}/faculty/edit/${facultyId}`)}
            className="vf-btn-primary"
          >
            <Edit size={18} />
            Edit Faculty
          </button>
        </div>
      </div>

      {/* Profile Hero Card */}
      <div className="vf-hero-card">
        <div className="vf-avatar-large">{getInitials(faculty.facultyName)}</div>
        <div className="vf-hero-info">
          <h2>{faculty.facultyName}</h2>
          <p className="vf-sub">{faculty.courseAssigned || "Course not assigned"}</p>
          <div className="vf-hero-meta">
            <span className={`vf-status-badge ${statusConfig.className}`}>
              <StatusIcon size={13} />
              {statusConfig.label}
            </span>
            <span className="vf-meta-chip">
              <Briefcase size={14} />
              {faculty.facultyNo}
            </span>
            <span className="vf-meta-chip">
              {getShiftIcon(faculty.shift)}
              {faculty.shift || "N/A"} Shift
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="vf-quick-actions">
          {faculty.mobileNo && (
            <a href={`tel:${faculty.mobileNo}`} className="vf-quick-btn vf-quick-call">
              <Phone size={18} />
              <span>Call</span>
            </a>
          )}
          {faculty.email && (
            <a href={`mailto:${faculty.email}`} className="vf-quick-btn vf-quick-mail">
              <Mail size={18} />
              <span>Email</span>
            </a>
          )}
          {faculty.whatsappNo && (
            <button
              onClick={() => openWhatsApp(faculty.whatsappNo)}
              className="vf-quick-btn vf-quick-whatsapp"
            >
              <MessageCircle size={18} />
              <span>WhatsApp</span>
            </button>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="vf-details-grid">

        {/* Personal Information */}
        <div className="vf-card">
          <div className="vf-card-header">
            <User size={18} />
            <h3>Personal Information</h3>
          </div>
          <div className="vf-card-body">
            <div className="vf-field-row">
              <span className="vf-field-label">Full Name</span>
              <span className="vf-field-value">{faculty.facultyName || "N/A"}</span>
            </div>
            <div className="vf-field-row">
              <span className="vf-field-label">Father's Name</span>
              <span className="vf-field-value">{faculty.fathersName || "N/A"}</span>
            </div>
            <div className="vf-field-row">
              <span className="vf-field-label">Date of Birth</span>
              <span className="vf-field-value">
                <Calendar size={14} style={{ marginRight: 6, opacity: 0.6 }} />
                {formatDate(faculty.dateOfBirth)}
              </span>
            </div>
            <div className="vf-field-row">
              <span className="vf-field-label">Address</span>
              <span className="vf-field-value">
                <MapPin size={14} style={{ marginRight: 6, opacity: 0.6 }} />
                {faculty.address || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Work Information */}
        <div className="vf-card">
          <div className="vf-card-header">
            <Briefcase size={18} />
            <h3>Work Information</h3>
          </div>
          <div className="vf-card-body">
            <div className="vf-field-row">
              <span className="vf-field-label">Faculty No</span>
              <span className="vf-field-value vf-highlight">{faculty.facultyNo || "N/A"}</span>
            </div>
            <div className="vf-field-row">
              <span className="vf-field-label">Course Assigned</span>
              <span className="vf-field-value">{faculty.courseAssigned || "Not assigned"}</span>
            </div>
            <div className="vf-field-row">
              <span className="vf-field-label">Shift</span>
              <span className="vf-field-value">
                {getShiftIcon(faculty.shift)}
                <span style={{ marginLeft: 6 }}>{faculty.shift || "N/A"}</span>
              </span>
            </div>
            <div className="vf-field-row">
              <span className="vf-field-label">Lunch Time</span>
              <span className="vf-field-value">
                <Coffee size={14} style={{ marginRight: 6, opacity: 0.6 }} />
                {faculty.lunchTime || "N/A"}
              </span>
            </div>
            <div className="vf-field-row">
              <span className="vf-field-label">Basic Stipend</span>
              <span className="vf-field-value vf-stipend">
                <DollarSign size={14} />
                ₹{faculty.basicStipend?.toLocaleString("en-IN") || "0"}
                <span className="vf-stipend-label">/ month</span>
              </span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="vf-card">
          <div className="vf-card-header">
            <Phone size={18} />
            <h3>Contact Information</h3>
          </div>
          <div className="vf-card-body">
            <div className="vf-field-row">
              <span className="vf-field-label">Mobile No</span>
              <span className="vf-field-value">
                <a href={`tel:${faculty.mobileNo}`} className="vf-link">
                  <Phone size={14} />
                  {formatPhone(faculty.mobileNo)}
                </a>
              </span>
            </div>
            <div className="vf-field-row">
              <span className="vf-field-label">WhatsApp No</span>
              <span className="vf-field-value">
                <button
                  onClick={() => openWhatsApp(faculty.whatsappNo)}
                  className="vf-link-btn"
                  disabled={!faculty.whatsappNo}
                >
                  <MessageCircle size={14} />
                  {formatPhone(faculty.whatsappNo)}
                </button>
              </span>
            </div>
            <div className="vf-field-row">
              <span className="vf-field-label">Email</span>
              <span className="vf-field-value">
                <a href={`mailto:${faculty.email}`} className="vf-link">
                  <Mail size={14} />
                  {faculty.email || "N/A"}
                </a>
              </span>
            </div>
          </div>
        </div>

        {/* Parent Contact */}
        <div className="vf-card">
          <div className="vf-card-header">
            <User size={18} />
            <h3>Parent Contact Details</h3>
          </div>
          <div className="vf-card-body">
            <div className="vf-field-row">
              <span className="vf-field-label">Father's Contact</span>
              <span className="vf-field-value">
                <a href={`tel:${faculty.fatherContactNo}`} className="vf-link">
                  <Phone size={14} />
                  {formatPhone(faculty.fatherContactNo)}
                </a>
              </span>
            </div>
            <div className="vf-field-row">
              <span className="vf-field-label">Mother's Contact</span>
              <span className="vf-field-value">
                <a href={`tel:${faculty.motherContactNo}`} className="vf-link">
                  <Phone size={14} />
                  {formatPhone(faculty.motherContactNo)}
                </a>
              </span>
            </div>
          </div>
        </div>

        {/* Joining / Leaving Dates */}
        <div className="vf-card vf-card-full">
          <div className="vf-card-header">
            <Calendar size={18} />
            <h3>Employment Timeline</h3>
          </div>
          <div className="vf-card-body vf-timeline">
            <div className="vf-timeline-item vf-timeline-join">
              <div className="vf-timeline-dot"></div>
              <div>
                <p className="vf-timeline-label">Date of Joining</p>
                <p className="vf-timeline-date">{formatDate(faculty.dateOfJoining)}</p>
              </div>
            </div>

            <div className="vf-timeline-line"></div>

            <div className={`vf-timeline-item ${faculty.dateOfLeaving ? "vf-timeline-leave" : "vf-timeline-present"}`}>
              <div className="vf-timeline-dot"></div>
              <div>
                <p className="vf-timeline-label">
                  {faculty.dateOfLeaving ? "Date of Leaving" : "Currently Working"}
                </p>
                <p className="vf-timeline-date">
                  {faculty.dateOfLeaving ? formatDate(faculty.dateOfLeaving) : "Present"}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Actions */}
      <div className="vf-footer-actions">
        <Link to={`${basePath}/faculty`} className="vf-btn-secondary">
          Back to List
        </Link>
        <button
          onClick={() => navigate(`${basePath}/faculty/edit/${facultyId}`)}
          className="vf-btn-primary"
        >
          <Edit size={18} />
          Edit Faculty
        </button>
      </div>
    </div>
  );
};

export default ViewFaculty;