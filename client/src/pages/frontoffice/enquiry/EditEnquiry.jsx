// pages/frontoffice/enquiry/EditEnquiry.jsx
import React, { useState, useEffect } from "react";
import { enquiryAPI, setupAPI, courseAPI } from "../../../services/api";
import {
  Save, X, Calendar, User, Phone, BookOpen, Users, FileText, Book, AlertCircle,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import "./NewEnquiry.css"; // reuse same CSS

const EditEnquiry = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const basePath = user?.role === "faculty" || user?.role === "instructor"
    ? "/faculty" : "/admin";

  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors]         = useState({});

  // Setup data
  const [qualifications, setQualifications] = useState([]);
  const [batches, setBatches]               = useState([]);
  const [areas, setAreas]                   = useState([]);
  const [enquiryMethods, setEnquiryMethods] = useState([]);
  const [courses, setCourses]               = useState([]);
  const [loadingSetup, setLoadingSetup]     = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [formData, setFormData] = useState({
    enquiryNo: "", enquiryDate: "", enquiryBy: "", enquiryMethod: "",
    applicantName: "", contactNo: "", whatsappNo: "",
    guardianName: "", guardianContact: "",
    gender: "", qualification: "", schoolCollege: "",
    yearOfPassing: "", percentage: "",
    courseInterested: "", courseId: "", batchTime: "",
    reference: "", place: "", city: "", state: "",
    remark: "", dateOfComing: "",
    prospectusFees: "no", prospectusAmount: "",
  });

  // ── Fetch all on mount ────────────────────────────────────────
  useEffect(() => {
    fetchSetupData();
    fetchCourses();
    fetchEnquiry();
  }, []);

  // ── After courses load, resolve courseId from courseInterested name ──
  useEffect(() => {
    if (courses.length === 0 || formData.courseId) return;
    if (formData.courseInterested) {
      const matched = courses.find(
        (c) =>
          c.courseFullName?.toLowerCase().trim() ===
            formData.courseInterested.toLowerCase().trim() ||
          c.courseShortName?.toLowerCase().trim() ===
            formData.courseInterested.toLowerCase().trim()
      );
      if (matched) {
        setFormData((p) => ({ ...p, courseId: matched._id }));
      }
    }
  }, [courses, formData.courseInterested]);

  const fetchEnquiry = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const response = await enquiryAPI.getEnquiry(id);
      if (response.data.success) {
        const d = response.data.data;
        const formatDate = (val) => {
          if (!val) return "";
          try {
            const dt = new Date(val);
            return isNaN(dt.getTime()) ? "" : dt.toISOString().split("T")[0];
          } catch { return ""; }
        };

        // Resolve courseId — may be ObjectId string or populated object
        const rawCourseId = d.courseId;
        const resolvedCourseId =
          rawCourseId && typeof rawCourseId === "object"
            ? rawCourseId._id?.toString() || ""
            : rawCourseId?.toString() || "";

        setFormData({
          enquiryNo:        d.enquiryNo       || "",
          enquiryDate:      formatDate(d.enquiryDate),
          enquiryBy:        d.enquiryBy       || "",
          enquiryMethod:    d.enquiryMethod   || "",
          applicantName:    d.applicantName   || "",
          contactNo:        d.contactNo       || "",
          whatsappNo:       d.whatsappNo      || "",
          guardianName:     d.guardianName    || "",
          guardianContact:  d.guardianContact || "",
          gender:           d.gender          || "",
          qualification:    d.qualification   || "",
          schoolCollege:    d.schoolCollege   || "",
          yearOfPassing:    d.yearOfPassing   || "",
          percentage:       d.percentage      || "",
          courseInterested: d.courseInterested || "",
          courseId:         resolvedCourseId,
          batchTime:        d.batchTime       || "",
          reference:        d.reference       || "",
          place:            d.place           || "",
          city:             d.city            || "",
          state:            d.state           || "",
          remark:           d.remark          || "",
          dateOfComing:     formatDate(d.dateOfComing),
          prospectusFees:   d.prospectusFees  || "no",
          prospectusAmount: d.prospectusAmount || "",
        });
      } else {
        throw new Error(response.data.message || "Failed to load enquiry");
      }
    } catch (err) {
      setFetchError(err.message || "Failed to load enquiry details");
    } finally {
      setLoading(false);
    }
  };

  const fetchSetupData = async () => {
    try {
      setLoadingSetup(true);
      const response = await setupAPI.getAll();
      if (response.data.success) {
        const { qualifications, areas, batches, enquiryMethods } = response.data.data;
        setQualifications(qualifications || []);
        setAreas(areas || []);
        setBatches(batches || []);
        setEnquiryMethods(enquiryMethods || []);
      }
    } catch (err) {
      console.error("Setup fetch failed:", err);
    } finally {
      setLoadingSetup(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const response = await courseAPI.getActiveCourses();
      if (response.data.success) {
        setCourses(
          (response.data.data || []).sort((a, b) =>
            a.courseFullName.localeCompare(b.courseFullName)
          )
        );
      }
    } catch (err) {
      console.error("Courses fetch failed:", err);
    } finally {
      setLoadingCourses(false);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));

    if (["contactNo", "whatsappNo", "guardianContact"].includes(name)) {
      setFormData((p) => ({ ...p, [name]: value.replace(/\D/g, "").slice(0, 10) }));
      return;
    }
    if (name === "courseInterested") {
      const selected = courses.find((c) => c._id === value);
      setFormData((p) => ({
        ...p,
        courseId: value,
        courseInterested: selected ? selected.courseFullName : "",
      }));
      return;
    }
    if (type === "radio") {
      setFormData((p) => ({ ...p, [name]: value }));
      return;
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const validateForm = () => {
    const newErrors = {};
    const required = [
      { name: "enquiryBy",       label: "Enquiry by" },
      { name: "enquiryMethod",   label: "Enquiry method" },
      { name: "applicantName",   label: "Applicant name" },
      { name: "contactNo",       label: "Contact number" },
      { name: "whatsappNo",      label: "WhatsApp number" },
      { name: "gender",          label: "Gender" },
      { name: "guardianName",    label: "Guardian name" },
      { name: "guardianContact", label: "Guardian contact" },
      { name: "qualification",   label: "Qualification" },
      { name: "courseId",        label: "Course interested" },
      { name: "batchTime",       label: "Batch time" },
      { name: "place",           label: "Place" },
      { name: "city",            label: "City" },
      { name: "state",           label: "State" },
    ];
    required.forEach(({ name, label }) => {
      if (!formData[name] || !formData[name].toString().trim())
        newErrors[name] = `${label} is required`;
    });
    ["contactNo", "whatsappNo", "guardianContact"].forEach((f) => {
      if (formData[f] && formData[f].length !== 10)
        newErrors[f] = "Must be 10 digits";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit (Save Changes) ────────────────────────────────────
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateForm()) {
      const firstField = Object.keys(errors)[0];
      const el = document.querySelector(`[name="${firstField}"]`);
      if (el) { el.focus(); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await enquiryAPI.updateEnquiry(id, formData);
      if (response.data.success) {
        alert("✅ Enquiry updated successfully!");
        navigate(`${basePath}/front-office/enquiries`);
      } else {
        throw new Error(response.data.message || "Failed to update enquiry");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update enquiry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Convert to Admission (uses UPDATED form values) ──────────
  const handleConvertToAdmission = () => {
    if (!validateForm()) {
      alert("Please fill all required fields before converting.");
      return;
    }

    const enquiryData = {
      _id:              id,
      enquiryNo:        formData.enquiryNo,
      applicantName:    formData.applicantName,
      fatherName:       formData.guardianName,
      dateOfBirth:      "",
      gender:           formData.gender,
      contactNo:        formData.contactNo,
      fatherNumber:     formData.guardianContact,
      whatsappNo:       formData.whatsappNo,
      email:            "",
      address:          formData.place,
      place:            formData.place,
      city:             formData.city,
      state:            formData.state,
      qualification:    formData.qualification,
      yearOfPassing:    formData.yearOfPassing,
      courseInterested: formData.courseInterested,
      courseId:         formData.courseId,         // ✅ passes correct ObjectId
      batchTime:        formData.batchTime,
      reference:        formData.reference,
      enquiryMethod:    formData.enquiryMethod,
      enquiryBy:        formData.enquiryBy,
      remark:           formData.remark,
    };

    localStorage.setItem("enquiryData", JSON.stringify(enquiryData));
    window.location.href = `${basePath}/front-office/admissions/add?fromEnquiry=true`;
  };

  // ── Loading / Error states ────────────────────────────────────
  if (loading) {
    return (
      <div className="new-enquiry-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading enquiry details...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="new-enquiry-container">
        <div className="error-alert">
          <AlertCircle size={20} />
          <div><strong>Failed to load enquiry</strong><p>{fetchError}</p></div>
          <button onClick={fetchEnquiry} className="btn-retry">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="new-enquiry-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <Link to={`${basePath}/front-office/enquiries`} className="back-link">
            <X size={20} /> Cancel
          </Link>
          <div>
            <h1>Edit Enquiry</h1>
            <p>Editing <strong>{formData.enquiryNo}</strong> — <strong>{formData.applicantName}</strong></p>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={handleConvertToAdmission} className="btn-convert" type="button">
            <User size={18} /> Convert to Admission
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary" type="button">
            <Save size={18} /> {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="enquiry-form">

        {/* Enquiry Details */}
        <div className="form-card">
          <div className="card-header"><Calendar size={20} /><h3>Enquiry Details</h3></div>
          <div className="card-content">
            <div className="form-grid">
              <div className="form-group">
                <label>Enquiry No</label>
                <input type="text" value={formData.enquiryNo} readOnly className="readonly-input" />
              </div>
              <div className="form-group">
                <label>Enquiry By *</label>
                <input type="text" name="enquiryBy" value={formData.enquiryBy} onChange={handleChange} className={errors.enquiryBy ? "error-field" : ""} />
                {errors.enquiryBy && <span className="error-text">{errors.enquiryBy}</span>}
              </div>
              <div className="form-group">
                <label>Date of Enquiry</label>
                <input type="date" name="enquiryDate" value={formData.enquiryDate} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Enquiry Method *</label>
                <select name="enquiryMethod" value={formData.enquiryMethod} onChange={handleChange} className={errors.enquiryMethod ? "error-field" : ""} disabled={loadingSetup}>
                  <option value="">{loadingSetup ? "Loading..." : "Select Method"}</option>
                  {/* Fallback for saved method */}
                  {formData.enquiryMethod && !enquiryMethods.find(m => m.methodName.toLowerCase().replace(/ /g, "_") === formData.enquiryMethod) && (
                    <option value={formData.enquiryMethod}>{formData.enquiryMethod}</option>
                  )}
                  {enquiryMethods.map((m) => (
                    <option key={m._id} value={m.methodName.toLowerCase().replace(/ /g, "_")}>
                      {m.methodName}
                    </option>
                  ))}
                </select>
                {errors.enquiryMethod && <span className="error-text">{errors.enquiryMethod}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div className="form-card">
          <div className="card-header"><User size={20} /><h3>Personal Details</h3></div>
          <div className="card-content">
            <div className="form-grid">
              <div className="form-group">
                <label>Applicant Name *</label>
                <input type="text" name="applicantName" value={formData.applicantName} onChange={handleChange} className={errors.applicantName ? "error-field" : ""} />
                {errors.applicantName && <span className="error-text">{errors.applicantName}</span>}
              </div>
              <div className="form-group">
                <label>Contact No *</label>
                <input type="tel" name="contactNo" value={formData.contactNo} onChange={handleChange} maxLength="10" className={errors.contactNo ? "error-field" : ""} />
                {errors.contactNo && <span className="error-text">{errors.contactNo}</span>}
              </div>
              <div className="form-group">
                <label>WhatsApp No *</label>
                <input type="tel" name="whatsappNo" value={formData.whatsappNo} onChange={handleChange} maxLength="10" className={errors.whatsappNo ? "error-field" : ""} />
                {errors.whatsappNo && <span className="error-text">{errors.whatsappNo}</span>}
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
                <label>Guardian Name *</label>
                <input type="text" name="guardianName" value={formData.guardianName} onChange={handleChange} className={errors.guardianName ? "error-field" : ""} />
                {errors.guardianName && <span className="error-text">{errors.guardianName}</span>}
              </div>
              <div className="form-group">
                <label>Guardian Contact *</label>
                <input type="tel" name="guardianContact" value={formData.guardianContact} onChange={handleChange} maxLength="10" className={errors.guardianContact ? "error-field" : ""} />
                {errors.guardianContact && <span className="error-text">{errors.guardianContact}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Academic & Course Details */}
        <div className="form-sections-row">
          <div className="form-column">
            <div className="form-card">
              <div className="card-header"><BookOpen size={20} /><h3>Academic Details</h3></div>
              <div className="card-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Qualification *</label>
                    <select name="qualification" value={formData.qualification} onChange={handleChange} className={errors.qualification ? "error-field" : ""} disabled={loadingSetup}>
                      <option value="">{loadingSetup ? "Loading..." : "Select Qualification"}</option>
                      {formData.qualification && !qualifications.find(q => q.qualificationName === formData.qualification) && (
                        <option value={formData.qualification}>{formData.qualification}</option>
                      )}
                      {qualifications.map((q) => (
                        <option key={q._id} value={q.qualificationName}>{q.qualificationName}</option>
                      ))}
                    </select>
                    {errors.qualification && <span className="error-text">{errors.qualification}</span>}
                  </div>
                  <div className="form-group">
                    <label>Year of Passing</label>
                    <input type="number" name="yearOfPassing" value={formData.yearOfPassing} onChange={handleChange} min="2000" max={new Date().getFullYear()} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-column">
            <div className="form-card">
              <div className="card-header"><Book size={20} /><h3>Course Details</h3></div>
              <div className="card-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Course Interested *</label>
                    <select name="courseInterested" value={formData.courseId} onChange={handleChange} className={errors.courseId ? "error-field" : ""} disabled={loadingCourses}>
                      <option value="">{loadingCourses ? "Loading..." : "Select Course"}</option>
                      {/* Fallback for saved course */}
                      {formData.courseId && !courses.find(c => c._id === formData.courseId) && (
                        <option value={formData.courseId}>{formData.courseInterested || formData.courseId}</option>
                      )}
                      {courses.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.courseFullName} ({c.courseShortName})
                        </option>
                      ))}
                    </select>
                    {errors.courseId && <span className="error-text">{errors.courseId}</span>}
                  </div>
                  <div className="form-group">
                    <label>Batch Time *</label>
                    <select name="batchTime" value={formData.batchTime} onChange={handleChange} className={errors.batchTime ? "error-field" : ""} disabled={loadingSetup}>
                      <option value="">{loadingSetup ? "Loading..." : "Select Batch"}</option>
                      {formData.batchTime && !batches.find(b => (b.displayName || `${b.startTime} to ${b.endTime}`) === formData.batchTime) && (
                        <option value={formData.batchTime}>{formData.batchTime}</option>
                      )}
                      {batches.map((b) => {
                        const display = b.displayName || `${b.startTime} to ${b.endTime}`;
                        return <option key={b._id} value={display}>{b.batchName} ({display})</option>;
                      })}
                    </select>
                    {errors.batchTime && <span className="error-text">{errors.batchTime}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location Details */}
        <div className="form-card">
          <div className="card-header"><Users size={20} /><h3>Location Details</h3></div>
          <div className="card-content">
            <div className="form-grid">
              <div className="form-group">
                <label>Place *</label>
                <select name="place" value={formData.place} onChange={handleChange} className={errors.place ? "error-field" : ""} disabled={loadingSetup}>
                  <option value="">{loadingSetup ? "Loading..." : "Select Place/Area"}</option>
                  {formData.place && !areas.find(a => a.areaName === formData.place) && (
                    <option value={formData.place}>{formData.place}</option>
                  )}
                  {areas.map((a) => (
                    <option key={a._id} value={a.areaName}>
                      {a.areaName}{a.city ? ` (${a.city})` : ""}
                    </option>
                  ))}
                </select>
                {errors.place && <span className="error-text">{errors.place}</span>}
              </div>
              <div className="form-group">
                <label>City *</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange} className={errors.city ? "error-field" : ""} />
                {errors.city && <span className="error-text">{errors.city}</span>}
              </div>
              <div className="form-group">
                <label>State *</label>
                <input type="text" name="state" value={formData.state} onChange={handleChange} className={errors.state ? "error-field" : ""} />
                {errors.state && <span className="error-text">{errors.state}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="form-card">
          <div className="card-header"><FileText size={20} /><h3>Additional Details</h3></div>
          <div className="card-content">
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Remark</label>
                <textarea name="remark" value={formData.remark} onChange={handleChange} rows="3" placeholder="Any additional remarks..." />
              </div>
              <div className="form-group">
                <label>Prospectus Fees Submit</label>
                <div className="radio-group">
                  <label><input type="radio" name="prospectusFees" value="yes" checked={formData.prospectusFees === "yes"} onChange={handleChange} /> Yes</label>
                  <label><input type="radio" name="prospectusFees" value="no"  checked={formData.prospectusFees === "no"}  onChange={handleChange} /> No</label>
                </div>
              </div>
              {formData.prospectusFees === "yes" && (
                <div className="form-group">
                  <label>Amount</label>
                  <input type="number" name="prospectusAmount" value={formData.prospectusAmount} onChange={handleChange} placeholder="Amount paid" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <Link to={`${basePath}/front-office/enquiries`} className="btn-reset">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="btn-submit">
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditEnquiry;