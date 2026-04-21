// components/faculty/EditFaculty.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { facultyAPI } from "../../services/api";
import { courseAPI } from "../../services/api";
import {
  Save,
  X,
  Calendar,
  User,
  Phone,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import "./AddFaculty.css";

const EditFaculty = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { facultyId } = useParams();

  const basePath = location.pathname.startsWith("/admin") ? "/admin" : "/faculty";

  // ✅ Updated formData — split shift & lunch into start/end, removed dateOfLeaving
  const [formData, setFormData] = useState({
    dateOfJoining: "",
    facultyName: "",
    fathersName: "",
    shiftStart: "",
    shiftEnd: "",
    lunchStart: "",
    lunchEnd: "",
    dateOfBirth: "",
    email: "",
    basicStipend: "",
    mobileNo: "",
    whatsappNo: "",
    address: "",
    fatherContactNo: "",
    motherContactNo: "",
    courseAllotted: "",
  });

  const [facultyNo, setFacultyNo] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [courseError, setCourseError] = useState(null);

  // ─── Format helpers ────────────────────────────────────────────────────────
  const formatName = (name) => {
    if (!name) return "";
    return name
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return "";
    return phone.replace(/\D/g, "").slice(0, 10);
  };

  // ✅ Helper to convert "HH:MM" 24hr to "H:MM AM/PM"
  const formatTo12Hour = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
  };

  // ✅ Helper to split stored "HH:MM-HH:MM" string back into [start, end]
  const parseTimeRange = (timeRange) => {
    if (!timeRange || !timeRange.includes("-")) return ["", ""];
    const parts = timeRange.split("-");
    // Handle case where stored value might be old format like "Morning"
    if (parts.length !== 2 || !parts[0].includes(":")) return ["", ""];
    return [parts[0].trim(), parts[1].trim()];
  };

  // ─── Fetch existing faculty data ───────────────────────────────────────────
  useEffect(() => {
    const fetchFacultyById = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const response = await facultyAPI.getFacultyById(facultyId);
        if (response.data.success) {
          const f = response.data.data;
          setFacultyNo(f.facultyNo || "");

          // ✅ Parse shift and lunchTime back into start/end pairs
          const [shiftStart, shiftEnd] = parseTimeRange(f.shift);
          const [lunchStart, lunchEnd] = parseTimeRange(f.lunchTime);

          setFormData({
            dateOfJoining: f.dateOfJoining
              ? new Date(f.dateOfJoining).toISOString().split("T")[0]
              : "",
            facultyName: f.facultyName || "",
            fathersName: f.fathersName || "",
            shiftStart,
            shiftEnd,
            lunchStart,
            lunchEnd,
            dateOfBirth: f.dateOfBirth
              ? new Date(f.dateOfBirth).toISOString().split("T")[0]
              : "",
            email: f.email || "",
            basicStipend: f.basicStipend ? String(f.basicStipend) : "",
            mobileNo: f.mobileNo || "",
            whatsappNo: f.whatsappNo || "",
            address: f.address || "",
            fatherContactNo: f.fatherContactNo || "",
            motherContactNo: f.motherContactNo || "",
            courseAllotted: f.courseAssigned || f.courseAllotted || "",
          });
        } else {
          throw new Error(response.data.message || "Failed to fetch faculty");
        }
      } catch (err) {
        console.error("Error fetching faculty:", err);
        setFetchError(
          err.response?.data?.message || err.message || "Failed to load faculty data"
        );
      } finally {
        setLoading(false);
      }
    };

    if (facultyId) fetchFacultyById();
  }, [facultyId]);

  // ─── Fetch courses ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        setCourseError(null);
        const response = await courseAPI.getActiveCourses();
        if (response.data.success) {
          setCourses(response.data.data || []);
        } else {
          throw new Error(response.data.message || "Failed to load courses");
        }
      } catch (err) {
        console.error("Error fetching courses:", err);
        setCourseError(err.message || "Failed to load courses. Using default options.");
        setCourses([
          { _id: "1", courseFullName: "B.Tech Computer Science", courseShortName: "BTech CS" },
          { _id: "2", courseFullName: "MBA", courseShortName: "MBA" },
          { _id: "3", courseFullName: "BBA", courseShortName: "BBA" },
          { _id: "4", courseFullName: "BCA", courseShortName: "BCA" },
          { _id: "5", courseFullName: "M.Tech", courseShortName: "MTech" },
        ]);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  // ─── Input handler ─────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === "facultyName" || name === "fathersName") {
      formattedValue = formatName(value);
    } else if (
      name === "mobileNo" ||
      name === "whatsappNo" ||
      name === "fatherContactNo" ||
      name === "motherContactNo"
    ) {
      formattedValue = formatPhoneNumber(value);
    } else if (name === "basicStipend") {
      formattedValue = value.replace(/[^0-9]/g, "");
    } else if (name === "address") {
      formattedValue = value.charAt(0).toUpperCase() + value.slice(1);
    }

    setFormData({ ...formData, [name]: formattedValue });

    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  // ─── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const form = e.target.form;
      const focusableElements = form.querySelectorAll(
        'input:not([type="radio"]):not([type="checkbox"]), select, textarea, button'
      );
      const currentIndex = Array.from(focusableElements).indexOf(e.target);
      if (currentIndex < focusableElements.length - 1) {
        const nextElement = focusableElements[currentIndex + 1];
        if (
          nextElement.tagName !== "BUTTON" ||
          currentIndex === focusableElements.length - 2
        ) {
          nextElement.focus();
        }
      }
    }
  };

  // ─── Validation ────────────────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    // ✅ Updated required fields
    const requiredFields = [
      "dateOfJoining",
      "facultyName",
      "fathersName",
      "shiftStart",
      "shiftEnd",
      "lunchStart",
      "lunchEnd",
      "dateOfBirth",
      "email",
      "basicStipend",
      "mobileNo",
      "address",
      "fatherContactNo",
      "motherContactNo",
      "courseAllotted",
    ];

    requiredFields.forEach((field) => {
      if (!formData[field] || !formData[field].toString().trim()) {
        newErrors[field] = "This field is required";
      }
    });

    // ✅ Time range validations
    if (formData.shiftStart && formData.shiftEnd && formData.shiftStart >= formData.shiftEnd) {
      newErrors.shiftEnd = "End time must be after start time";
    }
    if (formData.lunchStart && formData.lunchEnd && formData.lunchStart >= formData.lunchEnd) {
      newErrors.lunchEnd = "Lunch end time must be after start time";
    }

    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    const phoneFields = ["mobileNo", "fatherContactNo", "motherContactNo"];
    phoneFields.forEach((field) => {
      if (formData[field] && !phoneRegex.test(formData[field])) {
        newErrors[field] = "Phone number must be exactly 10 digits";
      }
    });

    if (formData.whatsappNo && !phoneRegex.test(formData.whatsappNo)) {
      newErrors.whatsappNo = "WhatsApp number must be exactly 10 digits";
    }

    if (formData.basicStipend && parseInt(formData.basicStipend) <= 0) {
      newErrors.basicStipend = "Stipend must be greater than 0";
    }

    if (formData.dateOfJoining && formData.dateOfBirth) {
      const joinDate = new Date(formData.dateOfJoining);
      const birthDate = new Date(formData.dateOfBirth);
      if (joinDate < birthDate) {
        newErrors.dateOfJoining = "Date of joining cannot be before date of birth";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      alert("Please fill all required fields before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const facultyData = {
        facultyName: formData.facultyName,
        fathersName: formData.fathersName,
        dateOfJoining: formData.dateOfJoining,
        dateOfBirth: formData.dateOfBirth,
        // ✅ Combine back into "HH:MM-HH:MM" for the backend
        shift: `${formData.shiftStart}-${formData.shiftEnd}`,
        lunchTime: `${formData.lunchStart}-${formData.lunchEnd}`,
        email: formData.email,
        mobileNo: formData.mobileNo,
        whatsappNo: formData.whatsappNo || formData.mobileNo,
        address: formData.address,
        fatherContactNo: formData.fatherContactNo,
        motherContactNo: formData.motherContactNo,
        basicStipend: parseFloat(formData.basicStipend) || 0,
        courseAssigned: formData.courseAllotted,
        // ✅ dateOfLeaving removed
      };

      const response = await facultyAPI.updateFaculty(facultyId, facultyData);

      if (response.data.success) {
        alert("Faculty updated successfully!");
        navigate(`${basePath}/faculty`);
      } else {
        throw new Error(response.data.message || "Failed to update faculty");
      }
    } catch (err) {
      console.error("Error updating faculty:", err);
      alert(
        err.response?.data?.message || "Failed to update faculty. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel? All unsaved changes will be lost.")) {
      navigate(`${basePath}/faculty`);
    }
  };

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="new-enquiry-container">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "16px" }}>
          <RefreshCw size={32} style={{ animation: "spin 1s linear infinite", color: "#4f46e5" }} />
          <p style={{ color: "#64748b", fontSize: "16px" }}>Loading faculty data...</p>
        </div>
      </div>
    );
  }

  // ─── Fetch error state ─────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="new-enquiry-container">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "16px" }}>
          <AlertCircle size={48} style={{ color: "#ef4444" }} />
          <h3 style={{ color: "#1e293b" }}>Failed to load faculty</h3>
          <p style={{ color: "#64748b" }}>{fetchError}</p>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <RefreshCw size={16} /> Retry
            </button>
            <Link to={`${basePath}/faculty`} className="btn-secondary">
              Back to List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="new-enquiry-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <Link to={`${basePath}/faculty`} className="back-link">
            <ArrowLeft size={20} />
            Back to Faculty List
          </Link>
          <div>
            <h1>Edit Faculty</h1>
            <p>Update details for {formData.facultyName || "faculty member"}</p>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={handleCancel} className="btn-secondary">
            <X size={18} />
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary"
          >
            <Save size={18} />
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="enquiry-form">
        {/* Section 1: Faculty Details */}
        <div className="form-card">
          <div className="card-header">
            <User size={20} />
            <h3>Faculty Details</h3>
          </div>
          <div className="card-content">
            <div className="form-grid">
              <div className="form-group">
                <label>Faculty No</label>
                <input type="text" value={facultyNo} readOnly className="enquiry-no" />
              </div>

              <div className="form-group">
                <label>Date of Joining <span className="required-star">*</span></label>
                <input
                  type="date"
                  name="dateOfJoining"
                  value={formData.dateOfJoining}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  max={new Date().toISOString().split("T")[0]}
                  className={errors.dateOfJoining ? "error-field" : ""}
                />
                {errors.dateOfJoining && <span className="error-text">{errors.dateOfJoining}</span>}
              </div>

              <div className="form-group">
                <label>Faculty Name <span className="required-star">*</span></label>
                <input
                  type="text"
                  name="facultyName"
                  value={formData.facultyName}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Full name of faculty"
                  className={errors.facultyName ? "error-field" : ""}
                />
                {errors.facultyName && <span className="error-text">{errors.facultyName}</span>}
              </div>

              <div className="form-group">
                <label>Father's Name <span className="required-star">*</span></label>
                <input
                  type="text"
                  name="fathersName"
                  value={formData.fathersName}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Father's name"
                  className={errors.fathersName ? "error-field" : ""}
                />
                {errors.fathersName && <span className="error-text">{errors.fathersName}</span>}
              </div>

              <div className="form-group">
                <label>Date of Birth <span className="required-star">*</span></label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  max={new Date().toISOString().split("T")[0]}
                  className={errors.dateOfBirth ? "error-field" : ""}
                />
                {errors.dateOfBirth && <span className="error-text">{errors.dateOfBirth}</span>}
              </div>

              <div className="form-group">
                <label>Course Allotted <span className="required-star">*</span></label>
                <select
                  name="courseAllotted"
                  value={formData.courseAllotted}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className={errors.courseAllotted ? "error-field" : ""}
                  disabled={loadingCourses}
                >
                  <option value="">
                    {loadingCourses ? "Loading courses..." : "Select Course"}
                  </option>
                  {courses.map((course) => (
                    <option key={course._id} value={course.courseFullName}>
                      {course.courseFullName}
                      {course.courseShortName ? ` (${course.courseShortName})` : ""}
                    </option>
                  ))}
                  <option value="general_subjects">General Subjects</option>
                  <option value="not_allotted">Not Allotted</option>
                </select>
                {loadingCourses && <span className="loading-text">Loading courses...</span>}
                {courseError && !loadingCourses && (
                  <span className="error-text" style={{ color: "orange", fontSize: "12px" }}>
                    ⚠️ {courseError}
                  </span>
                )}
                {errors.courseAllotted && <span className="error-text">{errors.courseAllotted}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Work Details */}
        <div className="form-card">
          <div className="card-header">
            <Calendar size={20} />
            <h3>Work Details</h3>
          </div>
          <div className="card-content">
            <div className="form-grid">

              {/* ✅ Shift time range */}
              <div className="form-group full-width">
                <label>Faculty Timing Shift <span className="required-star">*</span></label>
                <div className="time-range-wrapper">
                  <div className="time-range-inputs">
                    <input
                      type="time"
                      name="shiftStart"
                      value={formData.shiftStart}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      className={errors.shiftStart ? "error-field" : ""}
                    />
                    <span className="time-range-separator">to</span>
                    <input
                      type="time"
                      name="shiftEnd"
                      value={formData.shiftEnd}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      className={errors.shiftEnd ? "error-field" : ""}
                    />
                  </div>
                  {formData.shiftStart && formData.shiftEnd && (
                    <span className="time-range-display">
                      {formatTo12Hour(formData.shiftStart)} to {formatTo12Hour(formData.shiftEnd)}
                    </span>
                  )}
                </div>
                {errors.shiftStart && <span className="error-text">{errors.shiftStart}</span>}
                {errors.shiftEnd && <span className="error-text">{errors.shiftEnd}</span>}
              </div>

              {/* ✅ Lunch time range */}
              <div className="form-group full-width">
                <label>Faculty Lunch Time <span className="required-star">*</span></label>
                <div className="time-range-wrapper">
                  <div className="time-range-inputs">
                    <input
                      type="time"
                      name="lunchStart"
                      value={formData.lunchStart}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      className={errors.lunchStart ? "error-field" : ""}
                    />
                    <span className="time-range-separator">to</span>
                    <input
                      type="time"
                      name="lunchEnd"
                      value={formData.lunchEnd}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      className={errors.lunchEnd ? "error-field" : ""}
                    />
                  </div>
                  {formData.lunchStart && formData.lunchEnd && (
                    <span className="time-range-display">
                      {formatTo12Hour(formData.lunchStart)} to {formatTo12Hour(formData.lunchEnd)}
                    </span>
                  )}
                </div>
                {errors.lunchStart && <span className="error-text">{errors.lunchStart}</span>}
                {errors.lunchEnd && <span className="error-text">{errors.lunchEnd}</span>}
              </div>

              <div className="form-group">
                <label>Basic Stipend (₹) <span className="required-star">*</span></label>
                <input
                  type="text"
                  name="basicStipend"
                  value={formData.basicStipend}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Monthly stipend amount"
                  className={errors.basicStipend ? "error-field" : ""}
                />
                {errors.basicStipend && <span className="error-text">{errors.basicStipend}</span>}
              </div>

            </div>
          </div>
        </div>

        {/* Section 3: Contact Information + Parent Contact */}
        <div className="form-sections-row">
          <div className="form-column">
            <div className="form-card">
              <div className="card-header">
                <Phone size={20} />
                <h3>Contact Information</h3>
              </div>
              <div className="card-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Mobile No <span className="required-star">*</span></label>
                    <input
                      type="tel"
                      name="mobileNo"
                      value={formData.mobileNo}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="10 digit mobile number"
                      maxLength="10"
                      className={errors.mobileNo ? "error-field" : ""}
                    />
                    {errors.mobileNo && <span className="error-text">{errors.mobileNo}</span>}
                  </div>

                  <div className="form-group">
                    <label>WhatsApp No</label>
                    <input
                      type="tel"
                      name="whatsappNo"
                      value={formData.whatsappNo}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="10 digit WhatsApp number"
                      maxLength="10"
                      className={errors.whatsappNo ? "error-field" : ""}
                    />
                    {errors.whatsappNo && <span className="error-text">{errors.whatsappNo}</span>}
                  </div>

                  <div className="form-group">
                    <label>Email ID <span className="required-star">*</span></label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="email@example.com"
                      className={errors.email ? "error-field" : ""}
                    />
                    {errors.email && <span className="error-text">{errors.email}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-column">
            <div className="form-card">
              <div className="card-header">
                <User size={20} />
                <h3>Parent Contact Details</h3>
              </div>
              <div className="card-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Father Contact No <span className="required-star">*</span></label>
                    <input
                      type="tel"
                      name="fatherContactNo"
                      value={formData.fatherContactNo}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="10 digit contact number"
                      maxLength="10"
                      className={errors.fatherContactNo ? "error-field" : ""}
                    />
                    {errors.fatherContactNo && <span className="error-text">{errors.fatherContactNo}</span>}
                  </div>

                  <div className="form-group">
                    <label>Mother Contact No <span className="required-star">*</span></label>
                    <input
                      type="tel"
                      name="motherContactNo"
                      value={formData.motherContactNo}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="10 digit contact number"
                      maxLength="10"
                      className={errors.motherContactNo ? "error-field" : ""}
                    />
                    {errors.motherContactNo && <span className="error-text">{errors.motherContactNo}</span>}
                  </div>

                  <div className="form-group full-width">
                    <label>Address <span className="required-star">*</span></label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Complete address"
                      className={errors.address ? "error-field" : ""}
                    />
                    {errors.address && <span className="error-text">{errors.address}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" onClick={handleCancel} className="btn-reset">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-submit">
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditFaculty;