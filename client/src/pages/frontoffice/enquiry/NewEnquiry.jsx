import React, { useState, useEffect } from "react";
import { enquiryAPI, setupAPI, courseAPI } from "../../../services/api"; // Added courseAPI
import {
  Save,
  X,
  Calendar,
  User,
  Phone,
  BookOpen,
  Users,
  FileText,
  Book,
} from "lucide-react";
import { Link } from "react-router-dom";
import "./NewEnquiry.css";

const NewEnquiry = () => {
  const [formData, setFormData] = useState({
    enquiryNo: "3479",
    enquiryDate: new Date().toISOString().split("T")[0],
    enquiryBy: "",
    enquiryMethod: "",
    applicantName: "",
    contactNo: "",
    whatsappNo: "",
    guardianName: "",
    guardianContact: "",
    gender: "",
    qualification: "",
    schoolCollege: "",
    yearOfPassing: "",
    percentage: "",
    courseInterested: "",
    courseId: "", // Added to store course ID
    batchTime: "",
    reference: "",
    place: "",
    city: "",
    state: "",
    remark: "",
    dateOfComing: new Date().toISOString().split("T")[0],
    prospectusFees: "no",
    prospectusAmount: "",
  });

  // States for dynamic data
  const [qualifications, setQualifications] = useState([]);
  const [batches, setBatches] = useState([]);
  const [areas, setAreas] = useState([]);
  const [enquiryMethods, setEnquiryMethods] = useState([]);
  const [courses, setCourses] = useState([]); // NEW: Courses state

  const [loadingSetup, setLoadingSetup] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false); // NEW
  const [setupError, setSetupError] = useState(null);
  const [courseError, setCourseError] = useState(null); // NEW

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create refs for phone inputs to highlight them on error
  const contactNoRef = React.useRef(null);
  const whatsappNoRef = React.useRef(null);
  const guardianContactRef = React.useRef(null);

  // Fetch setup data and courses on component mount
  useEffect(() => {
    fetchSetupData();
    fetchCourses(); // NEW: Fetch courses on mount
  }, []);

  // Fetch setup data
  const fetchSetupData = async () => {
    try {
      setLoadingSetup(true);
      setSetupError(null);

      const response = await setupAPI.getAll();

      if (response.data.success) {
        const { qualifications, areas, batches, enquiryMethods } =
          response.data.data;
        setQualifications(qualifications || []);
        setAreas(areas || []);
        setBatches(batches || []);
        setEnquiryMethods(enquiryMethods || []);
      } else {
        throw new Error(response.data.message || "Failed to load setup data");
      }
    } catch (error) {
      console.error("Failed to load setup data:", error);
      setSetupError(
        error.message || "Failed to load setup data. Using default values."
      );
      setQualifications([]);
      setAreas([]);
      setBatches([]);
      setEnquiryMethods([]);
    } finally {
      setLoadingSetup(false);
    }
  };

  // NEW: Function to fetch courses from database
  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      setCourseError(null);

      // Fetch active courses
      const response = await courseAPI.getActiveCourses();

      if (response.data.success) {
        const coursesData = response.data.data || [];

        // Sort courses alphabetically
        const sortedCourses = coursesData.sort((a, b) =>
          a.courseFullName.localeCompare(b.courseFullName)
        );

        setCourses(sortedCourses);
      } else {
        throw new Error(response.data.message || "Failed to load courses");
      }
    } catch (error) {
      console.error("Failed to load courses:", error);
      setCourseError("Failed to load courses. Please select manually.");
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  // Handle Enter key to move to next field
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

  // Format name to Title Case (First letter capital, rest small)
  const formatToTitleCase = (text) => {
    if (!text) return "";
    return text
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Phone validation - Only check for 10 digits
  const validatePhoneFormat = (phone) => {
    const digitsOnly = phone.replace(/\D/g, "");

    // Check if exactly 10 digits
    if (digitsOnly.length !== 10) {
      return "Phone number must be exactly 10 digits";
    }

    return null; // Valid format
  };

  // Handle input change with validation
  const handleChange = (e) => {
    const { name, value, type } = e.target;

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // Special handling for name fields - format to Title Case
    if (
      name === "applicantName" ||
      name === "guardianName" ||
      name === "reference"
    ) {
      const formattedValue = formatToTitleCase(value);
      setFormData((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));
    }
    // Special handling for phone numbers
    else if (
      name === "contactNo" ||
      name === "whatsappNo" ||
      name === "guardianContact"
    ) {
      // Allow only digits and limit to 10
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);

      setFormData((prev) => ({
        ...prev,
        [name]: digitsOnly,
      }));

      // Only validate format during typing
      if (digitsOnly && digitsOnly.length === 10) {
        const formatError = validatePhoneFormat(digitsOnly);
        if (formatError) {
          setErrors((prev) => ({ ...prev, [name]: formatError }));
        }
      }
    }
    // Handle course selection
    else if (name === "courseInterested") {
      const selectedCourse = courses.find((course) => course._id === value);
      setFormData((prev) => ({
        ...prev,
        courseInterested: selectedCourse ? selectedCourse.courseFullName : "",
        courseId: value,
      }));
    } else if (type === "radio") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle blur for phone validation
  const handleBlur = (e) => {
    const { name, value } = e.target;

    if (
      (name === "contactNo" ||
        name === "whatsappNo" ||
        name === "guardianContact") &&
      value
    ) {
      const formatError = validatePhoneFormat(value);
      if (formatError) {
        setErrors((prev) => ({ ...prev, [name]: formatError }));
      }
    }
  };

  const generateEnquiryNo = () => {
    const prefix = "ENQ";
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${year}${random}`;
  };

  // Form validation before submission - Only check required fields
  const validateForm = () => {
    const newErrors = {};

    // IMPORTANT REQUIRED FIELDS (from your list)
    const requiredFields = [
      { name: "enquiryBy", label: "Enquiry by" },
      { name: "enquiryMethod", label: "Enquiry method" },
      { name: "applicantName", label: "Applicant name" },
      { name: "contactNo", label: "Contact number" },
      { name: "whatsappNo", label: "WhatsApp number" },
      { name: "gender", label: "Gender" },
      { name: "guardianName", label: "Guardian name" },
      { name: "guardianContact", label: "Guardian contact" },
      { name: "qualification", label: "Qualification" },
      { name: "courseId", label: "Course interested" },
      { name: "batchTime", label: "Batch time" },
      { name: "place", label: "Place" },
      { name: "city", label: "City" },
      { name: "state", label: "State" },
    ];

    // Check all required fields
    requiredFields.forEach(({ name, label }) => {
      if (!formData[name] || formData[name].toString().trim() === "") {
        newErrors[name] = `${label} is required`;
      }
    });

    // Validate phone numbers format (if provided)
    const phoneFields = [
      { name: "contactNo", label: "Contact number" },
      { name: "whatsappNo", label: "WhatsApp number" },
      { name: "guardianContact", label: "Guardian contact" },
    ];

    phoneFields.forEach(({ name, label }) => {
      if (formData[name]) {
        if (formData[name].length !== 10) {
          newErrors[name] = `${label} must be 10 digits`;
        } else {
          const formatError = validatePhoneFormat(formData[name]);
          if (formatError) {
            newErrors[name] = formatError;
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      alert("Please fill all required fields before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate enquiry number if needed
      let payload = { ...formData };

      if (!payload.enquiryNo || payload.enquiryNo === "3479") {
        payload.enquiryNo = generateEnquiryNo();
      }

      console.log("Submitting enquiry to backend:", payload);

      // API call
      const response = await enquiryAPI.createEnquiry(payload);

      console.log("Backend response:", response.data);

      alert("Enquiry submitted successfully!");
      window.location.href = "/admin/front-office/enquiries";
    } catch (error) {
      console.error("Error submitting enquiry:", error.response?.data || error);
      alert(
        error.response?.data?.message ||
          "Error submitting enquiry. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      enquiryNo: generateEnquiryNo(),
      enquiryDate: new Date().toISOString().split("T")[0],
      enquiryBy: "",
      enquiryMethod: "",
      applicantName: "",
      contactNo: "",
      whatsappNo: "",
      guardianName: "",
      guardianContact: "",
      gender: "",
      qualification: "",
      schoolCollege: "",
      yearOfPassing: "",
      percentage: "",
      courseInterested: "",
      courseId: "",
      batchTime: "",
      reference: "",
      place: "",
      city: "",
      state: "",
      remark: "",
      dateOfComing: new Date().toISOString().split("T")[0],
      prospectusFees: "no",
      prospectusAmount: "",
    });
    setCourseSearch("");
    setErrors({});
    setShowCourseDropdown(false);
  };

  const handleConvertToAdmission = () => {
    if (!validateForm()) {
      alert("Please fill all required fields before converting to admission.");
      return;
    }

    localStorage.setItem("enquiryData", JSON.stringify(formData));
    window.location.href =
      "/admin/front-office/admissions/add?fromEnquiry=true";
  };

  return (
    <div className="new-enquiry-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <Link to="/admin/front-office/enquiries" className="back-link">
            <X size={20} />
            Cancel
          </Link>
          <div>
            <h1>New Enquiry Form</h1>
            <p>Fill in the details for new enquiry</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            onClick={handleConvertToAdmission}
            className="btn-convert"
            type="button"
          >
            <User size={18} />
            Convert to Admission
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary"
            type="submit"
          >
            <Save size={18} />
            {isSubmitting ? "Submitting..." : "Submit Enquiry"}
          </button>
        </div>
      </div>

      {setupError && (
        <div className="setup-error-alert">
          <p>⚠️ {setupError}</p>
          <button onClick={fetchSetupData} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {courseError && (
        <div className="setup-error-alert">
          <p>⚠️ {courseError}</p>
          <button onClick={fetchCourses} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="enquiry-form">
        {/* Section 1: Enquiry Details */}
        <div className="form-card">
          <div className="card-header">
            <Calendar size={20} />
            <h3>Enquiry Details</h3>
          </div>
          <div className="card-content">
            <div className="form-grid">
              <div className="form-group">
                <label>Enquiry No</label>
                <input
                  type="text"
                  name="enquiryNo"
                  value={formData.enquiryNo}
                  onChange={handleChange}
                  className="enquiry-no"
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>
                  Enquiry By <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  name="enquiryBy"
                  value={formData.enquiryBy}
                  onChange={handleChange}
                  placeholder="Staff name who took enquiry"
                  onKeyDown={handleKeyDown}
                  className={errors.enquiryBy ? "error-field" : ""}
                />
                {errors.enquiryBy && (
                  <span className="error-text">{errors.enquiryBy}</span>
                )}
              </div>
              <div className="form-group">
                <label>Date of Enquiry</label>
                <input
                  type="date"
                  name="enquiryDate"
                  value={formData.enquiryDate}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="form-group">
                <label>
                  Enquiry Method <span className="required-star">*</span>
                  {loadingSetup && (
                    <span className="loading-text"> (Loading...)</span>
                  )}
                </label>
                <select
                  name="enquiryMethod"
                  value={formData.enquiryMethod}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  className={errors.enquiryMethod ? "error-field" : ""}
                  disabled={loadingSetup}
                >
                  <option value="">
                    {loadingSetup
                      ? "Loading enquiry methods..."
                      : "Select Enquiry Method"}
                  </option>
                  {enquiryMethods.map((method) => (
                    <option
                      key={method._id}
                      value={method.methodName.toLowerCase().replace(/ /g, "_")}
                    >
                      {method.methodName}
                    </option>
                  ))}
                </select>
                {errors.enquiryMethod && (
                  <span className="error-text">{errors.enquiryMethod}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Personal Details */}
        <div className="form-card">
          <div className="card-header">
            <User size={20} />
            <h3>Personal Details</h3>
          </div>
          <div className="card-content">
            <div className="form-grid">
              <div className="form-group">
                <label>
                  Applicant Name <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  name="applicantName"
                  value={formData.applicantName}
                  onChange={handleChange}
                  placeholder="Full name of applicant"
                  onKeyDown={handleKeyDown}
                  className={errors.applicantName ? "error-field" : ""}
                />
                {errors.applicantName && (
                  <span className="error-text">{errors.applicantName}</span>
                )}
              </div>
              <div className="form-group">
                <label>
                  Contact No <span className="required-star">*</span>
                </label>
                <input
                  ref={contactNoRef}
                  type="tel"
                  name="contactNo"
                  value={formData.contactNo}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="10 digit mobile number"
                  maxLength="10"
                  onKeyDown={handleKeyDown}
                  className={errors.contactNo ? "error-field" : ""}
                />
                {errors.contactNo && (
                  <span className="error-text">{errors.contactNo}</span>
                )}
              </div>
              <div className="form-group">
                <label>
                  WhatsApp No <span className="required-star">*</span>
                </label>
                <input
                  ref={whatsappNoRef}
                  type="tel"
                  name="whatsappNo"
                  value={formData.whatsappNo}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="10 digit WhatsApp number"
                  maxLength="10"
                  onKeyDown={handleKeyDown}
                  className={errors.whatsappNo ? "error-field" : ""}
                />
                {errors.whatsappNo && (
                  <span className="error-text">{errors.whatsappNo}</span>
                )}
              </div>
              <div className="form-group">
                <label>
                  Gender <span className="required-star">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  className={errors.gender ? "error-field" : ""}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && (
                  <span className="error-text">{errors.gender}</span>
                )}
              </div>
              <div className="form-group">
                <label>
                  Guardian Name <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  name="guardianName"
                  value={formData.guardianName}
                  onChange={handleChange}
                  placeholder="Fathers name"
                  onKeyDown={handleKeyDown}
                  className={errors.guardianName ? "error-field" : ""}
                />
                {errors.guardianName && (
                  <span className="error-text">{errors.guardianName}</span>
                )}
              </div>
              <div className="form-group">
                <label>
                  Guardian Contact No <span className="required-star">*</span>
                </label>
                <input
                  ref={guardianContactRef}
                  type="tel"
                  name="guardianContact"
                  value={formData.guardianContact}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="10 digit guardian contact"
                  maxLength="10"
                  onKeyDown={handleKeyDown}
                  className={errors.guardianContact ? "error-field" : ""}
                />
                {errors.guardianContact && (
                  <span className="error-text">{errors.guardianContact}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Academic & Course Details - UPDATED */}
        <div className="form-sections-row">
          {/* Left Column - Academic Details */}
          <div className="form-column">
            <div className="form-card">
              <div className="card-header">
                <BookOpen size={20} />
                <h3>Academic Details</h3>
              </div>
              <div className="card-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      Qualification <span className="required-star">*</span>
                      {loadingSetup && (
                        <span className="loading-text"> (Loading...)</span>
                      )}
                    </label>
                    <select
                      name="qualification"
                      value={formData.qualification}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      className={errors.qualification ? "error-field" : ""}
                      disabled={loadingSetup}
                    >
                      <option value="">
                        {loadingSetup ? "Loading..." : "Select Qualification"}
                      </option>
                      {qualifications.map((qual) => (
                        <option key={qual._id} value={qual.qualificationName}>
                          {qual.qualificationName}
                        </option>
                      ))}
                    </select>
                    {errors.qualification && (
                      <span className="error-text">{errors.qualification}</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Year of Passing (Optional)</label>
                    <input
                      type="number"
                      name="yearOfPassing"
                      value={formData.yearOfPassing}
                      onChange={handleChange}
                      placeholder="2023"
                      min="2000"
                      max={new Date().getFullYear()}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Course Details - UPDATED WITH DROPDOWN */}
          <div className="form-column">
            <div className="form-card">
              <div className="card-header">
                <Book size={20} />
                <h3>Course Details</h3>
              </div>
              <div className="card-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      Course Interested <span className="required-star">*</span>
                      {loadingCourses && (
                        <span className="loading-text"> (Loading...)</span>
                      )}
                    </label>
                    <select
                      name="courseInterested"
                      value={formData.courseId}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      className={errors.courseInterested ? "error-field" : ""}
                      disabled={loadingCourses}
                    >
                      <option value="">
                        {loadingCourses
                          ? "Loading courses..."
                          : "Select Course"}
                      </option>
                      {courses.map((course) => (
                        <option key={course._id} value={course._id}>
                          {course.courseFullName} ({course.courseShortName}) -{" "}
                          {course.duration} 
                        </option>
                      ))}
                    </select>
                    {errors.courseInterested && (
                      <span className="error-text">
                        {errors.courseInterested}
                      </span>
                    )}
                    {formData.courseId && (
                      <div className="course-info">
                        <small>
                          Selected:{" "}
                          {
                            courses.find((c) => c._id === formData.courseId)
                              ?.courseFullName
                          }
                        </small>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>
                      Batch Time Interested{" "}
                      <span className="required-star">*</span>
                      {loadingSetup && (
                        <span className="loading-text"> (Loading...)</span>
                      )}
                    </label>
                    <select
                      name="batchTime"
                      value={formData.batchTime}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      className={errors.batchTime ? "error-field" : ""}
                      disabled={loadingSetup}
                    >
                      <option value="">
                        {loadingSetup ? "Loading..." : "Select Batch Time"}
                      </option>
                      {batches.map((batch) => {
                        const displayName =
                          batch.displayName ||
                          `${batch.startTime} to ${batch.endTime}`;
                        return (
                          <option key={batch._id} value={displayName}>
                            {batch.batchName} ({displayName})
                          </option>
                        );
                      })}
                    </select>
                    {errors.batchTime && (
                      <span className="error-text">{errors.batchTime}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Location Details */}
        <div className="form-card">
          <div className="card-header">
            <Users size={20} />
            <h3>Location Details</h3>
          </div>
          <div className="card-content">
            <div className="form-grid">
              {/* Place dropdown instead of text input */}
              <div className="form-group">
                <label>
                  Place <span className="required-star">*</span>
                  {loadingSetup && (
                    <span className="loading-text"> (Loading...)</span>
                  )}
                </label>
                <select
                  name="place"
                  value={formData.place}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  className={errors.place ? "error-field" : ""}
                  disabled={loadingSetup}
                >
                  <option value="">
                    {loadingSetup ? "Loading..." : "Select Place/Area"}
                  </option>
                  {areas.map((area) => (
                    <option key={area._id} value={area.areaName}>
                      {area.areaName} {area.city ? `(${area.city})` : ""}
                    </option>
                  ))}
                </select>
                {errors.place && (
                  <span className="error-text">{errors.place}</span>
                )}
              </div>

              <div className="form-group">
                <label>
                  City <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                  onKeyDown={handleKeyDown}
                  className={errors.city ? "error-field" : ""}
                />
                {errors.city && (
                  <span className="error-text">{errors.city}</span>
                )}
              </div>
              <div className="form-group">
                <label>
                  State <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                  onKeyDown={handleKeyDown}
                  className={errors.state ? "error-field" : ""}
                />
                {errors.state && (
                  <span className="error-text">{errors.state}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Additional Details */}
        <div className="form-card">
          <div className="card-header">
            <FileText size={20} />
            <h3>Additional Details (Optional)</h3>
          </div>
          <div className="card-content">
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Remark (Optional)</label>
                <textarea
                  name="remark"
                  value={formData.remark}
                  onChange={handleChange}
                  placeholder="Any additional remarks..."
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Prospectus Fees Submit (Optional)</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="prospectusFees"
                      value="yes"
                      checked={formData.prospectusFees === "yes"}
                      onChange={handleChange}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="prospectusFees"
                      value="no"
                      checked={formData.prospectusFees === "no"}
                      onChange={handleChange}
                    />
                    No
                  </label>
                </div>
              </div>

              {formData.prospectusFees === "yes" && (
                <div className="form-group">
                  <label>Amount (Optional)</label>
                  <input
                    type="number"
                    name="prospectusAmount"
                    value={formData.prospectusAmount}
                    onChange={handleChange}
                    placeholder="Amount paid"
                    onKeyDown={handleKeyDown}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" onClick={handleReset} className="btn-reset">
            Reset Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting || loadingSetup || loadingCourses}
            className="btn-submit"
          >
            {isSubmitting ? "Submitting..." : "Submit Enquiry"}
            {(loadingSetup || loadingCourses) && " (Loading data...)"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewEnquiry;
