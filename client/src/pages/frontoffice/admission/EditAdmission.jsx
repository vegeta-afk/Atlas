// pages/frontoffice/admission/EditAdmission.jsx
import React, { useState, useEffect } from "react";
import { admissionAPI, setupAPI, courseAPI } from "../../../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { facultyAPI } from "../../../services/api";
import {
  User, Phone, BookOpen, Camera, AlertCircle, Save,
  X, Upload, FileDigit, Hash, Gift, Award,
} from "lucide-react";
import { Link } from "react-router-dom";
import "./AddAdmission.css";

const FormSection = ({ title, icon: Icon, children }) => (
  <div className="form-section">
    <div className="section-header">
      <Icon size={20} />
      <h3>{title}</h3>
    </div>
    <div className="section-content">{children}</div>
  </div>
);

const EditAdmission = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ── basePath from logged-in user ─────────────────────────────
  const user = JSON.parse(localStorage.getItem("user"));
  const basePath =
    user?.role === "faculty" || user?.role === "instructor"
      ? "/faculty"
      : "/admin";

  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState(null);
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [qualifications, setQualifications] = useState([]);
  const [batches, setBatches]               = useState([]);
  const [areas, setAreas]                   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingSetup, setLoadingSetup]     = useState(false);
  const [setupError, setSetupError]         = useState(null);

  const [facultyMembers, setFacultyMembers]   = useState([]);
  const [loadingFaculty, setLoadingFaculty]   = useState(false);
  const [facultyError, setFacultyError]       = useState(null);

  const [courses, setCourses]               = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [selectedCourseDetails, setSelectedCourseDetails] = useState(null);
  const [showScholarshipModal, setShowScholarshipModal]   = useState(false);
  const [calculatedFees, setCalculatedFees]               = useState(null);
  const [scholarshipPercent, setScholarshipPercent]       = useState("");

  const [errors, setErrors]         = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    admissionNo: "", admissionBy: "", admissionDate: "", enquiryNo: "",
    fullName: "", dateOfBirth: "", gender: "",
    fatherName: "", motherName: "",
    email: "", mobileNumber: "", fatherNumber: "", motherNumber: "",
    aadharNumber: "", place: "", address: "",
    city: "", state: "", pincode: "",
    lastQualification: "", yearOfPassing: "",
    interestedCourse: "", courseId: "",
    specialization: "", preferredBatch: "", facultyAllot: "",
    category: "",
    referenceName: "", referenceContact: "", referenceRelation: "",
    remarks: "",
    hasScholarship: false, scholarshipApplied: false,
    scholarshipId: "", scholarshipName: "", scholarshipCode: "",
    originalTotalFee: 0, originalMonthlyFee: 0,
    scholarshipValue: 0, finalTotalFee: 0, finalMonthlyFee: 0,
    scholarshipPercent: 0, scholarshipDocuments: [],
  });

  // ════════════════════════════════════════════════════════════
  // Fetch all on mount
  // ════════════════════════════════════════════════════════════
  useEffect(() => {
    fetchSetupData();
    fetchCourses();
    fetchFaculty();
    fetchAdmission();
  }, []);

  // ════════════════════════════════════════════════════════════
  // KEY FIX: Watch BOTH courseId AND courses together.
  // Fires when either changes — solves the race condition.
  // ════════════════════════════════════════════════════════════
  useEffect(() => {
    if (formData.courseId && courses.length > 0) {
      fetchCourseDetails(formData.courseId);
    }
  }, [formData.courseId, courses]);

  // ─── Fetch existing admission ─────────────────────────────────────────────
  const fetchAdmission = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const response = await admissionAPI.getAdmission(id);

      if (response.data.success) {
        const d = response.data.data;

        // ── FIX: MongoDB may return courseId as a populated object ──
        // { _id: "abc123", courseFullName: "BCA" } — extract just the _id string
        const rawCourseId = d.courseId;
        const resolvedCourseId =
          rawCourseId && typeof rawCourseId === "object"
            ? rawCourseId._id?.toString() || ""
            : rawCourseId?.toString() || "";

        const formatDate = (val) => {
          if (!val) return "";
          try {
            const dt = new Date(val);
            return isNaN(dt.getTime()) ? "" : dt.toISOString().split("T")[0];
          } catch { return ""; }
        };

        setFormData({
          admissionNo:       d.admissionNo || "",
          admissionBy:       d.admissionBy || "Admin",
          admissionDate:     formatDate(d.admissionDate),
          enquiryNo:         d.enquiryNo || "",
          fullName:          d.fullName || "",
          dateOfBirth:       formatDate(d.dateOfBirth),
          gender:            d.gender || "",
          fatherName:        d.fatherName || "",
          motherName:        d.motherName || "",
          email:             d.email || "",
          mobileNumber:      d.mobileNumber || "",
          fatherNumber:      d.fatherNumber || "",
          motherNumber:      d.motherNumber || "",
          aadharNumber:      d.aadharNumber || "",
          place:             d.place || "",
          address:           d.address || "",
          city:              d.city || "",
          state:             d.state || "",
          pincode:           d.pincode || "",
          lastQualification: d.lastQualification || "",
          yearOfPassing:     d.yearOfPassing || "",
          interestedCourse:  d.course || d.interestedCourse || "",
          courseId:          resolvedCourseId,   // ← plain string _id
          specialization:    d.specialization || "",
          preferredBatch:    d.batchTime || d.preferredBatch || "",
          facultyAllot:      d.facultyAllot || "",
          cast:              d.cast || "",
          category:      d.category || "",
          referenceName:     d.referenceName || "",
          referenceContact:  d.referenceContact || "",
          referenceRelation: d.referenceRelation || "",
          remarks:           d.remarks || "",
          hasScholarship:       d.hasScholarship || false,
          scholarshipApplied:   d.scholarship?.applied || false,
          scholarshipId:        d.scholarship?.scholarshipId || "",
          scholarshipName:      d.scholarship?.scholarshipName || "",
          scholarshipCode:      d.scholarship?.scholarshipCode || "",
          originalTotalFee:     d.scholarship?.originalTotalFee || 0,
          originalMonthlyFee:   d.scholarship?.originalMonthlyFee || 0,
          scholarshipValue:     d.scholarship?.scholarshipValue || 0,
          finalTotalFee:        d.scholarship?.finalTotalFee || d.totalFees || 0,
          finalMonthlyFee:      d.scholarship?.finalMonthlyFee || 0,
          scholarshipPercent:   d.scholarship?.percent || 0,
          scholarshipDocuments: d.scholarship?.documents || [],
        });

        if (d.photo) setPhotoPreview(d.photo);
      } else {
        throw new Error(response.data.message || "Failed to load admission");
      }
    } catch (err) {
      console.error("Error fetching admission:", err);
      setFetchError(err.message || "Failed to load admission details");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseDetails = async (courseId) => {
    if (!courseId) return;
    try {
      const response = await courseAPI.getCourse(courseId);
      if (response.data.success) setSelectedCourseDetails(response.data.data);
    } catch (err) {
      console.error("Failed to fetch course details:", err);
    }
  };

  const fetchFaculty = async () => {
    try {
      setLoadingFaculty(true);
      const response = await facultyAPI.getFaculty({ limit: 100, status: "active" });
      if (response.data.success) setFacultyMembers(response.data.data || []);
      else throw new Error(response.data.message);
    } catch (err) {
      setFacultyError(err.message || "Failed to load faculty");
    } finally {
      setLoadingFaculty(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const response = await courseAPI.getActiveCourses();
      if (response.data.success) setCourses(response.data.data || []);
    } catch (err) {
      console.error("Course fetch failed", err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchSetupData = async () => {
    try {
      setLoadingSetup(true);
      const response = await setupAPI.getAll();
      if (response.data.success) {
        const { qualifications, areas, batches } = response.data.data;
        setQualifications(qualifications || []);
        setAreas(areas || []);
        setBatches(batches || []);
        setCategories(categories || []);
      } else throw new Error(response.data.message);
    } catch (err) {
      setSetupError(err.message || "Failed to load setup data");
    } finally {
      setLoadingSetup(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024) { alert("Photo size must be less than 100KB"); return; }
    if (!file.type.match("image/jpeg") && !file.type.match("image/jpg")) {
      alert("Only JPEG/JPG images are allowed"); return;
    }
    setStudentPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const castOptions = [
    { value: "general",  label: "General" },
    { value: "sc",       label: "SC" },
    { value: "st",       label: "ST" },
    { value: "obc",      label: "OBC" },
    { value: "minority", label: "Minority" },
  ];

  const relationOptions = [
    { value: "",         label: "Select Relation" },
    { value: "parent",   label: "Parent" },
    { value: "relative", label: "Relative" },
    { value: "friend",   label: "Friend" },
    { value: "teacher",  label: "Teacher" },
    { value: "other",    label: "Other" },
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));

    if (type === "checkbox") { setFormData((p) => ({ ...p, [name]: checked })); return; }
    if (["mobileNumber","fatherNumber","motherNumber","referenceContact"].includes(name)) {
      setFormData((p) => ({ ...p, [name]: value.replace(/\D/g, "").slice(0, 10) })); return;
    }
    if (name === "aadharNumber") { setFormData((p) => ({ ...p, [name]: value.replace(/\D/g, "").slice(0, 12) })); return; }
    if (name === "pincode")      { setFormData((p) => ({ ...p, [name]: value.replace(/\D/g, "").slice(0, 6) }));  return; }
    if (name === "courseId") {
      const selected = courses.find((c) => c._id === value);
      setFormData((p) => ({ ...p, courseId: value, interestedCourse: selected ? selected.courseFullName : "" }));
      return;
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const capitalize = ["fullName","fatherName","motherName","place","city","state","referenceName","admissionBy"];
    if (capitalize.includes(name) && value.trim()) {
      const cap = value.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      if (cap !== value) setFormData((p) => ({ ...p, [name]: cap }));
    }
  };

  const removeScholarship = () => {
    if (window.confirm("Remove the scholarship?")) {
      setFormData((p) => ({
        ...p,
        hasScholarship: false, scholarshipApplied: false,
        scholarshipId: "", scholarshipName: "", scholarshipCode: "",
        finalTotalFee: p.originalTotalFee, finalMonthlyFee: p.originalMonthlyFee,
        scholarshipDocuments: [], scholarshipPercent: 0,
      }));
      setCalculatedFees(null);
    }
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    // ── FIX 1: ALWAYS prevent default — without this the page reloads ──
    if (e && e.preventDefault) e.preventDefault();

    // ── FIX 2: Inline validation — never call validateForm() here ──
    // (setState is async; reading errors state right after setErrors is stale)
    const formErrors = {};
    const required = [
      "fullName","dateOfBirth","gender","fatherName","motherName",
      "mobileNumber","fatherNumber","motherNumber","aadharNumber",
      "place","address","city","state","pincode",
      "lastQualification","yearOfPassing","interestedCourse",
      "preferredBatch","facultyAllot","cast",
    ];
    required.forEach((f) => {
      if (!formData[f] || formData[f].toString().trim() === "")
        formErrors[f] = `${f.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())} is required`;
    });
    if (!formData.admissionDate) formErrors.admissionDate = "Admission date is required";
    if (formData.email?.trim() && !/\S+@\S+\.\S+/.test(formData.email)) formErrors.email = "Please enter a valid email";
    if (formData.mobileNumber?.length !== 10) formErrors.mobileNumber = "Must be 10 digits";
    if (formData.fatherNumber?.length !== 10) formErrors.fatherNumber = "Must be 10 digits";
    if (formData.motherNumber?.length !== 10) formErrors.motherNumber = "Must be 10 digits";
    if (formData.aadharNumber?.length !== 12) formErrors.aadharNumber = "Must be 12 digits";
    if (formData.pincode?.length !== 6)       formErrors.pincode = "Must be 6 digits";

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      const firstField = Object.keys(formErrors)[0];
      const el = document.querySelector(`[name="${firstField}"]`);
      if (el) { el.focus(); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
      return;
    }

    setIsSubmitting(true);
    try {
     // EditAdmission.jsx — handleSubmit → updateData object

const updateData = {
  fullName: formData.fullName, dateOfBirth: formData.dateOfBirth,
  gender: formData.gender, fatherName: formData.fatherName, motherName: formData.motherName,
  email: formData.email || "", mobileNumber: formData.mobileNumber,
  fatherNumber: formData.fatherNumber, motherNumber: formData.motherNumber,
  aadharNumber: formData.aadharNumber,
  place: formData.place,          // ← FIX 1: was missing entirely
  address: formData.address, city: formData.city, state: formData.state, pincode: formData.pincode,
  lastQualification: formData.lastQualification, yearOfPassing: formData.yearOfPassing,
  course: formData.interestedCourse, courseId: formData.courseId,
  specialization: formData.specialization || "",
  batchTime: formData.preferredBatch, facultyAllot: formData.facultyAllot,
  cast: formData.cast, speciallyAbled: formData.speciallyAbled,
  category: formData.category || "",
  referenceName: formData.referenceName || "",
  referenceContact: formData.referenceContact || "",
  referenceRelation: formData.referenceRelation || "",
  remarks: formData.remarks || "",
  admissionBy: formData.admissionBy, admissionDate: formData.admissionDate,
  hasScholarship: formData.hasScholarship,
  totalFees: formData.finalTotalFee || 0,
  // ← FIX 3: Never send scholarship: null — omit key entirely when not applicable.
  // Sending null triggers Mongoose subdocument validation → 500 error.
  ...(formData.hasScholarship && {
    scholarship: {
      applied: true,
      scholarshipName: formData.scholarshipName,
      scholarshipCode: formData.scholarshipCode,
      percent: formData.scholarshipPercent || 0,
      type: "percentage",
      originalTotalFee: formData.originalTotalFee,
      originalMonthlyFee: formData.originalMonthlyFee,
      scholarshipValue: formData.scholarshipValue,
      finalTotalFee: formData.finalTotalFee,
      finalMonthlyFee: formData.finalMonthlyFee,
      documents: formData.scholarshipDocuments,
    },
  }),
};

      let payload;
      if (studentPhoto) {
        payload = new FormData();
        Object.entries(updateData).forEach(([key, val]) => {
          if (val !== null && val !== undefined)
            payload.append(key, typeof val === "object" ? JSON.stringify(val) : val);
        });
        payload.append("photo", studentPhoto);
      } else {
        payload = updateData;
      }

      const response = await admissionAPI.updateAdmission(id, payload);

      if (response.data.success) {
        alert("✅ Admission updated successfully!");
        navigate(`${basePath}/front-office/admissions`);
      } else {
        throw new Error(response.data.message || "Failed to update admission");
      }
    } catch (err) {
      console.error("Update error:", err);
      if (err.response?.data?.errors) {
        const be = err.response.data.errors;
        alert(`Server validation failed:\n${Object.keys(be).map(f => `• ${f}: ${be[f].message || be[f]}`).join("\n")}`);
        const newErrors = {};
        Object.keys(be).forEach((f) => { newErrors[f] = be[f].message || "Invalid value"; });
        setErrors(newErrors);
      } else {
        alert(err.response?.data?.message || "Failed to update admission.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="add-admission-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading admission details...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="add-admission-container">
        <div className="error-alert">
          <AlertCircle size={20} />
          <div><strong>Failed to load admission</strong><p>{fetchError}</p></div>
          <button onClick={fetchAdmission} className="btn-retry">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="add-admission-container">
      <div className="page-header">
        <div>
          <h1>Edit Admission</h1>
          <p>Editing <strong>{formData.admissionNo}</strong> — <strong>{formData.fullName}</strong></p>
        </div>
        <div className="header-actions">
          <Link to={`${basePath}/front-office/admissions`} className="btn-secondary">
            <X size={18} /> Cancel
          </Link>
          <button onClick={handleSubmit} disabled={isSubmitting || loadingSetup} className="btn-primary">
            <Save size={18} />{isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {setupError && (
        <div className="setup-error-alert">
          <p>⚠️ {setupError}</p>
          <button onClick={fetchSetupData} className="retry-btn">Retry</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="admission-form">

        <FormSection title="Admission Details" icon={FileDigit}>
          <div className="admission-details-grid">
            <div className="student-photo-section">
              <div className="photo-upload-container">
                <div className="photo-preview">
                  {photoPreview
                    ? <img src={photoPreview} alt="Student Preview" />
                    : <div className="photo-placeholder"><Camera size={48} /><span>Student Photo</span></div>
                  }
                </div>
                <div className="photo-upload-controls">
                  <label className="photo-upload-btn">
                    <input type="file" accept=".jpg,.jpeg" onChange={handlePhotoUpload} className="file-input" />
                    <Upload size={16} /> Upload Photo
                  </label>
                  <p className="photo-note">Max 100KB, JPEG/JPG only</p>
                </div>
              </div>
            </div>
            <div className="admission-info-section">
              <div className="form-grid">
                <div className="form-group">
                  <label>Admission No</label>
                  <input type="text" value={formData.admissionNo} readOnly className="readonly-input" />
                </div>
                <div className="form-group">
                  <label>Enquiry No</label>
                  <input type="text" value={formData.enquiryNo} readOnly className="readonly-input" />
                </div>
                <div className="form-group">
                  <label>Admission By *</label>
                  <input type="text" name="admissionBy" value={formData.admissionBy} onChange={handleChange} onBlur={handleBlur} />
                </div>
                <div className="form-group">
                  <label>Admission Date *</label>
                  <input type="date" name="admissionDate" value={formData.admissionDate} onChange={handleChange} className={errors.admissionDate ? "error-field" : ""} />
                  {errors.admissionDate && <span className="error-text">{errors.admissionDate}</span>}
                </div>
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection title="Personal Information" icon={User}>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} onBlur={handleBlur} className={errors.fullName ? "error-field" : ""} />
              {errors.fullName && <span className="error-text">{errors.fullName}</span>}
            </div>
            <div className="form-group">
              <label>Date of Birth *</label>
              <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={errors.dateOfBirth ? "error-field" : ""} />
              {errors.dateOfBirth && <span className="error-text">{errors.dateOfBirth}</span>}
            </div>
            <div className="form-group">
              <label>Gender *</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className={errors.gender ? "error-field" : ""}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <span className="error-text">{errors.gender}</span>}
            </div>
            <div className="form-group">
              <label>Father's Name *</label>
              <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} onBlur={handleBlur} className={errors.fatherName ? "error-field" : ""} />
              {errors.fatherName && <span className="error-text">{errors.fatherName}</span>}
            </div>
            <div className="form-group">
              <label>Mother's Name *</label>
              <input type="text" name="motherName" value={formData.motherName} onChange={handleChange} onBlur={handleBlur} className={errors.motherName ? "error-field" : ""} />
              {errors.motherName && <span className="error-text">{errors.motherName}</span>}
            </div>
          </div>
        </FormSection>

        <FormSection title="Contact Information" icon={Phone}>
          <div className="form-grid">
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Optional" className={errors.email ? "error-field" : ""} />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label>Student Mobile Number *</label>
              <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} onBlur={handleBlur} maxLength="10" className={errors.mobileNumber ? "error-field" : ""} />
              {errors.mobileNumber && <span className="error-text">{errors.mobileNumber}</span>}
            </div>
            <div className="form-group">
              <label>Father's Mobile Number *</label>
              <input type="tel" name="fatherNumber" value={formData.fatherNumber} onChange={handleChange} onBlur={handleBlur} maxLength="10" className={errors.fatherNumber ? "error-field" : ""} />
              {errors.fatherNumber && <span className="error-text">{errors.fatherNumber}</span>}
            </div>
            <div className="form-group">
              <label>Mother's Mobile Number *</label>
              <input type="tel" name="motherNumber" value={formData.motherNumber} onChange={handleChange} onBlur={handleBlur} maxLength="10" className={errors.motherNumber ? "error-field" : ""} />
              {errors.motherNumber && <span className="error-text">{errors.motherNumber}</span>}
            </div>
            <div className="form-group">
              <label>Aadhar Number *</label>
              <input type="tel" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} maxLength="12" className={errors.aadharNumber ? "error-field" : ""} />
              {errors.aadharNumber && <span className="error-text">{errors.aadharNumber}</span>}
            </div>
            <div className="form-group">
              <label>Place *</label>
              <select name="place" value={formData.place} onChange={handleChange} className={errors.place ? "error-field" : ""} disabled={loadingSetup}>
                <option value="">{loadingSetup ? "Loading..." : "Select Place/Area"}</option>
                {/* Fallback: if saved value isn't in the list yet, show it anyway */}
                {formData.place && !areas.find(a => a.areaName === formData.place) && (
                  <option value={formData.place}>{formData.place}</option>
                )}
                {areas.map((area) => (
                  <option key={area._id} value={area.areaName}>
                    {area.areaName}{area.city ? ` (${area.city})` : ""}
                  </option>
                ))}
              </select>
              {errors.place && <span className="error-text">{errors.place}</span>}
            </div>
            <div className="form-group full-width">
              <label>Address *</label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows="3" className={errors.address ? "error-field" : ""} />
              {errors.address && <span className="error-text">{errors.address}</span>}
            </div>
            <div className="form-group">
              <label>City *</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} onBlur={handleBlur} className={errors.city ? "error-field" : ""} />
              {errors.city && <span className="error-text">{errors.city}</span>}
            </div>
            <div className="form-group">
              <label>State *</label>
              <input type="text" name="state" value={formData.state} onChange={handleChange} onBlur={handleBlur} className={errors.state ? "error-field" : ""} />
              {errors.state && <span className="error-text">{errors.state}</span>}
            </div>
            <div className="form-group">
              <label>Pincode *</label>
              <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} maxLength="6" className={errors.pincode ? "error-field" : ""} />
              {errors.pincode && <span className="error-text">{errors.pincode}</span>}
            </div>
          </div>
        </FormSection>

        <FormSection title="Academic Information" icon={BookOpen}>
          <div className="form-grid">
            <div className="form-group">
              <label>Last Qualification *</label>
              <select name="lastQualification" value={formData.lastQualification} onChange={handleChange} className={errors.lastQualification ? "error-field" : ""} disabled={loadingSetup}>
                <option value="">{loadingSetup ? "Loading..." : "Select Qualification"}</option>
                {/* Fallback for saved value */}
                {formData.lastQualification && !qualifications.find(q => q.qualificationName === formData.lastQualification) && (
                  <option value={formData.lastQualification}>{formData.lastQualification}</option>
                )}
                {qualifications.map((q) => (
                  <option key={q._id} value={q.qualificationName}>{q.qualificationName}</option>
                ))}
              </select>
              {errors.lastQualification && <span className="error-text">{errors.lastQualification}</span>}
            </div>
            <div className="form-group">
              <label>Year of Passing *</label>
              <input type="number" name="yearOfPassing" value={formData.yearOfPassing} onChange={handleChange} min="2000" max={new Date().getFullYear()} className={errors.yearOfPassing ? "error-field" : ""} />
              {errors.yearOfPassing && <span className="error-text">{errors.yearOfPassing}</span>}
            </div>
          </div>
        </FormSection>

        <FormSection title="Course Information" icon={BookOpen}>
          <div className="form-grid">
            <div className="form-group">
  <label>Course *</label>
  <select
    name="courseId"
    value={formData.courseId}
    onChange={handleChange}
    className={errors.interestedCourse ? "error-field" : ""}
  >
    <option value="">Select Course</option>

    {/* Fallback: show saved course even if it's inactive or missing from active list */}
    {formData.courseId && !courses.find((c) => c._id === formData.courseId) && (
      <option value={formData.courseId}>
        {formData.interestedCourse || formData.courseId}
      </option>
    )}

    {courses.map((c) => (
      <option key={c._id} value={c._id}>
        {c.courseFullName} ({c.courseShortName})
      </option>
    ))}
  </select>
  {errors.interestedCourse && <span className="error-text">{errors.interestedCourse}</span>}
</div>

            {formData.courseId && (
              <div className="form-group scholarship-action">
                {!formData.hasScholarship ? (
                  <button type="button" onClick={() => setShowScholarshipModal(true)} className="btn-scholarship">
                    <Gift size={16} /> Apply Scholarship
                  </button>
                ) : (
                  <div className="scholarship-applied">
                    <div className="scholarship-badge">
                      <Award size={16} />
                      <span>{formData.scholarshipName} Applied</span>
                    </div>
                    <button type="button" onClick={removeScholarship} className="btn-remove-scholarship">
                      <X size={14} /> Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label>Batch *</label>
              <select name="preferredBatch" value={formData.preferredBatch} onChange={handleChange} className={errors.preferredBatch ? "error-field" : ""} disabled={loadingSetup}>
                <option value="">{loadingSetup ? "Loading..." : "Select Batch"}</option>
                {/* Fallback for saved batch */}
                {formData.preferredBatch && !batches.find(b => (b.displayName || `${b.startTime} to ${b.endTime}`) === formData.preferredBatch) && (
                  <option value={formData.preferredBatch}>{formData.preferredBatch}</option>
                )}
                {batches.map((b) => {
                  const display = b.displayName || `${b.startTime} to ${b.endTime}`;
                  return <option key={b._id} value={display}>{b.batchName} ({display})</option>;
                })}
              </select>
              {errors.preferredBatch && <span className="error-text">{errors.preferredBatch}</span>}
            </div>

            <div className="form-group">
              <label>Faculty Allotment *</label>
              <select name="facultyAllot" value={formData.facultyAllot} onChange={handleChange} className={errors.facultyAllot ? "error-field" : ""} disabled={loadingFaculty}>
                <option value="">{loadingFaculty ? "Loading..." : "Select Faculty"}</option>
                {/* Fallback for saved faculty */}
                {formData.facultyAllot && formData.facultyAllot !== "not_allotted" && !facultyMembers.find(f => f.facultyName === formData.facultyAllot) && (
                  <option value={formData.facultyAllot}>{formData.facultyAllot}</option>
                )}
                {facultyMembers.map((f) => (
                  <option key={f._id} value={f.facultyName}>
                    {f.facultyName} ({f.facultyNo}){f.courseAssigned ? ` - ${f.courseAssigned}` : ""}
                  </option>
                ))}
                <option value="not_allotted">Not Allotted</option>
              </select>
              {facultyError && !loadingFaculty && <span className="error-text" style={{ color: "orange" }}>⚠️ {facultyError}</span>}
              {errors.facultyAllot && <span className="error-text">{errors.facultyAllot}</span>}
            </div>
          </div>
        </FormSection>

<FormSection title="Other Information" icon={Hash}>
  <div className="form-grid">
    <div className="form-group">
      <label>Cast *</label>
      <select name="cast" value={formData.cast} onChange={handleChange} className={errors.cast ? "error-field" : ""}>
        <option value="">Select Cast</option>
        {castOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {errors.cast && <span className="error-text">{errors.cast}</span>}
    </div>

    <div className="form-group">
      <label>Category</label>
      <select
        name="category"
        value={formData.category || ""}
        onChange={handleChange}
        className={errors.category ? "error-field" : ""}
      >
        <option value="">Select Category</option>
        {categories.map((cat) => (
          <option key={cat._id} value={cat.categoryName}>
            {cat.categoryName}
          </option>
        ))}
      </select>
      {errors.category && <span className="error-text">{errors.category}</span>}
    </div>
  </div>
</FormSection>

        {/* <FormSection title="Reference (Optional)" icon={User}>
          <div className="form-grid">
            <div className="form-group">
              <label>Reference Name</label>
              <input type="text" name="referenceName" value={formData.referenceName} onChange={handleChange} onBlur={handleBlur} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label>Reference Contact</label>
              <input type="tel" name="referenceContact" value={formData.referenceContact} onChange={handleChange} onBlur={handleBlur} maxLength="10" placeholder="Optional" className={errors.referenceContact ? "error-field" : ""} />
              {errors.referenceContact && <span className="error-text">{errors.referenceContact}</span>}
            </div>
            <div className="form-group">
              <label>Reference Relation</label>
              <select name="referenceRelation" value={formData.referenceRelation} onChange={handleChange}>
                {relationOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </FormSection> */}

        <FormSection title="Remarks (Optional)" icon={AlertCircle}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Remarks / Notes</label>
              <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="4" placeholder="Optional remarks..." />
            </div>
          </div>
        </FormSection>

        <div className="form-actions">
          <Link to={`${basePath}/front-office/admissions`} className="btn-reset">Cancel</Link>
          <button type="submit" disabled={isSubmitting || loadingSetup} className="btn-submit">
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {showScholarshipModal && (
        <div className="modal-overlay">
          <div className="modal-content scholarship-modal" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3><Gift size={20} /> Apply Scholarship</h3>
              <button onClick={() => { setShowScholarshipModal(false); setScholarshipPercent(""); setCalculatedFees(null); }} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Scholarship Percentage (%)</label>
                <input
                  type="number" value={scholarshipPercent} min="0" max="100" step="any"
                  placeholder="e.g. 25"
                  onChange={(e) => {
                    const pct = parseFloat(e.target.value) || 0;
                    setScholarshipPercent(pct);
                    if (selectedCourseDetails && pct > 0) {
                      const base = selectedCourseDetails.totalFee || 0;
                      const dur  = selectedCourseDetails.duration || 1;
                      const disc = (base * pct) / 100;
                      const final = base - disc;
                      setCalculatedFees({ originalTotal: base, originalMonthly: selectedCourseDetails.monthlyFee || 0, finalTotal: final, finalMonthly: final / dur, scholarshipValue: disc, savings: disc, percent: pct });
                    } else { setCalculatedFees(null); }
                  }}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px" }}
                />
              </div>
              {calculatedFees && calculatedFees.percent > 0 && (
                <div style={{ marginTop: "16px", padding: "16px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                  <strong style={{ color: "#1d4ed8" }}>Fee Calculation</strong>
                  <div style={{ marginTop: "10px", fontSize: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#6b7280" }}>Original Total:</span><span>₹{calculatedFees.originalTotal}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#16a34a" }}><span>Scholarship ({calculatedFees.percent}%):</span><span>- ₹{calculatedFees.scholarshipValue.toFixed(2)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "600", borderTop: "1px solid #bfdbfe", paddingTop: "6px" }}><span>Final Total:</span><span style={{ color: "#1d4ed8" }}>₹{calculatedFees.finalTotal.toFixed(2)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#6b7280" }}>New Monthly:</span><span style={{ color: "#16a34a", fontWeight: "600" }}>₹{calculatedFees.finalMonthly.toFixed(2)}</span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => { setShowScholarshipModal(false); setScholarshipPercent(""); setCalculatedFees(null); }} className="btn-secondary">Cancel</button>
              <button
                disabled={!calculatedFees || calculatedFees.percent <= 0}
                className="btn-primary"
                onClick={() => {
                  if (calculatedFees && calculatedFees.percent > 0) {
                    setFormData((p) => ({
                      ...p,
                      hasScholarship: true, scholarshipApplied: true,
                      scholarshipName: `${calculatedFees.percent}% Scholarship`,
                      scholarshipCode: `SCH${calculatedFees.percent}`,
                      originalTotalFee: calculatedFees.originalTotal,
                      originalMonthlyFee: calculatedFees.originalMonthly,
                      scholarshipValue: calculatedFees.scholarshipValue,
                      finalTotalFee: calculatedFees.finalTotal,
                      finalMonthlyFee: calculatedFees.finalMonthly,
                      scholarshipPercent: calculatedFees.percent,
                    }));
                    setShowScholarshipModal(false);
                    alert(`✅ ${calculatedFees.percent}% scholarship applied! Final fee: ₹${calculatedFees.finalTotal.toFixed(2)}`);
                  } else {
                    alert("Please enter a valid percentage");
                  }
                }}
              >
                Apply Scholarship
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditAdmission;