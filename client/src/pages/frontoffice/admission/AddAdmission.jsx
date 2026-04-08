// pages/frontoffice/admission/AddAdmission.jsx
import React, { useState, useEffect } from "react";
import {
  admissionAPI,
  enquiryAPI,
  setupAPI,
  courseAPI,
} from "../../../services/api"; // Added setupAPI
import { useLocation } from "react-router-dom";
import { facultyAPI } from "../../../services/api";
import { useNavigate } from "react-router-dom";
import {
  User,
  Phone,
  Mail,
  BookOpen,
  Calendar,
  Camera,
  Users,
  AlertCircle,
  Save,
  X,
  Upload,
  FileText,
  UserCheck,
  Hash,
  FileDigit,
  UserCircle,
  Award,
  Gift,
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

const AddAdmission = () => {
  const location = useLocation();
  const [isFromEnquiry, setIsFromEnquiry] = useState(false);
  const [enquiryData, setEnquiryData] = useState(null);
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const basePath = "";
  const navigate = useNavigate();

  // NEW: States for dynamic data
  const [qualifications, setQualifications] = useState([]);
  const [batches, setBatches] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [setupError, setSetupError] = useState(null);

  //faculty list
  const [facultyMembers, setFacultyMembers] = useState([]);
  const [loadingFaculty, setLoadingFaculty] = useState(false);
  const [facultyError, setFacultyError] = useState(null);

  // ========== NEW SCHOLARSHIP STATES ==========
  const [showScholarshipModal, setShowScholarshipModal] = useState(false);
  const [availableScholarships, setAvailableScholarships] = useState([]);
  const [selectedScholarship, setSelectedScholarship] = useState(null);
  const [loadingScholarships, setLoadingScholarships] = useState(false);
  const [calculatedFees, setCalculatedFees] = useState(null);
  const [scholarshipDocuments, setScholarshipDocuments] = useState({});
  const [selectedCourseDetails, setSelectedCourseDetails] = useState(null);
  // Scholarship modal state
const [scholarshipPercent, setScholarshipPercent] = useState("");
  // ============================================

  const [formData, setFormData] = useState({
    // Admission Details
    admissionNo: `ADM${new Date().getFullYear()}${Math.floor(
      1000 + Math.random() * 9000
    )}`,
    admissionBy: "Admin",
    admissionDate: new Date().toISOString().split("T")[0],
    enquiryNo: "",

    // Personal Information
    fullName: "",
    dateOfBirth: "",
    gender: "",
    fatherName: "",
    motherName: "",

    // Contact Information
    email: "", // Optional
    mobileNumber: "",
    fatherNumber: "",
    motherNumber: "",
    aadharNumber: "",
    place: "",
    address: "",
    city: "",
    state: "",
    pincode: "",

    // Academic Information
    lastQualification: "",
    yearOfPassing: "",

    // Course Information
    interestedCourse: "",
    courseId: "", // Added courseId
    specialization: "",
    preferredBatch: "",
    facultyAllot: "",

    // Other Category
    cast: "",
    speciallyAbled: false,

    // Reference Section - Optional
    referenceName: "", // Optional
    referenceContact: "", // Optional
    referenceRelation: "", // Optional

    // Remarks - Optional
    remarks: "", // Optional

    // ========== NEW SCHOLARSHIP FIELDS ==========
    hasScholarship: false,
    scholarshipApplied: false,
    scholarshipId: "",
    scholarshipName: "",
    scholarshipCode: "",
    originalTotalFee: 0,
    originalMonthlyFee: 0,
    scholarshipValue: 0,
    finalTotalFee: 0,
    finalMonthlyFee: 0,
    scholarshipDocuments: [],
    // ============================================
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Fetch setup data on component mount
  useEffect(() => {
    fetchSetupData();
    fetchCourses();
    fetchFaculty();
  }, []);

  // ========== NEW: Fetch course details when course is selected ==========
  useEffect(() => {
    if (formData.courseId) {
      fetchCourseDetails(formData.courseId);
    }
  }, [formData.courseId]);

  const fetchCourseDetails = async (courseId) => {
    try {
      const response = await courseAPI.getCourse(courseId);
      if (response.data.success) {
        setSelectedCourseDetails(response.data.data);
        
        // Set original fees
        setFormData(prev => ({
          ...prev,
          interestedCourse: response.data.data.courseFullName || prev.interestedCourse,
          originalTotalFee: response.data.data.totalFee || 0,
          originalMonthlyFee: response.data.data.monthlyFee || 0,
          finalTotalFee: response.data.data.totalFee || 0,
          finalMonthlyFee: response.data.data.monthlyFee || 0,
        }));
        
        // Fetch eligible scholarships
       
      }
    } catch (err) {
      console.error("Failed to fetch course details:", err);
    }
  };

  // ========== NEW: Fetch eligible scholarships ==========
 
  // =====================================================

  // Fetch faculty members
  const fetchFaculty = async () => {
    try {
      setLoadingFaculty(true);
      setFacultyError(null);

      const response = await facultyAPI.getFaculty({
        limit: 100, // Get all faculty or a large number
        status: "active", // Only active faculty
      });

      if (response.data.success) {
        setFacultyMembers(response.data.data || []);
      } else {
        throw new Error(response.data.message || "Failed to load faculty");
      }
    } catch (err) {
      console.error("Error fetching faculty:", err);
      setFacultyError(err.message || "Failed to load faculty");
      setFacultyMembers([]);
    } finally {
      setLoadingFaculty(false);
    }
  };

  //fetch courses from the courseAPI
  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);

      const response = await courseAPI.getActiveCourses();

      if (response.data.success) {
        setCourses(response.data.data || []);
      }
    } catch (err) {
      console.error("Admission course fetch failed", err);
    } finally {
      setLoadingCourses(false);
    }
  };

  // NEW: Function to fetch dynamic data
  const fetchSetupData = async () => {
    try {
      setLoadingSetup(true);
      setSetupError(null);

      // Check if setupAPI exists and has getActiveData method
      if (!setupAPI || !setupAPI.getAll) {
        throw new Error("Setup API not configured properly");
      }

      const response = await setupAPI.getAll();
      if (response.data.success) {
        const { qualifications, areas, batches } = response.data.data;
        setQualifications(qualifications || []);
        setAreas(areas || []);
        setBatches(batches || []);
      } else {
        throw new Error(response.data.message || "Failed to load setup data");
      }
    } catch (error) {
      console.error("Failed to load setup data:", error);
      setSetupError(error.message || "Failed to load setup data.");

      // Set empty arrays as fallback
      setQualifications([]);
      setAreas([]);
      setBatches([]);
    } finally {
      setLoadingSetup(false);
    }
  };

  useEffect(() => {
  if (courses.length === 0 || formData.courseId) return;

  // Only run when coming from enquiry and courseId is still empty
  if (formData.interestedCourse) {
    const matchedCourse = courses.find(
      (c) =>
        c.courseFullName?.toLowerCase().trim() ===
          formData.interestedCourse.toLowerCase().trim() ||
        c.courseShortName?.toLowerCase().trim() ===
          formData.interestedCourse.toLowerCase().trim()
    );

    if (matchedCourse) {
      console.log("✅ Course matched by name:", matchedCourse.courseFullName);
      setFormData((prev) => ({
        ...prev,
        courseId: matchedCourse._id,
        interestedCourse: matchedCourse.courseFullName,
      }));
      fetchCourseDetails(matchedCourse._id); // ← triggers scholarship button
    } else {
      console.warn("⚠️ No course match found for:", formData.interestedCourse);
    }
  }
}, [courses, formData.interestedCourse]);

  // Check if coming from enquiry
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get("fromEnquiry") === "true") {
      setIsFromEnquiry(true);

      // Get enquiry data from localStorage
      const storedEnquiryData = localStorage.getItem("enquiryData");

      console.log("🔍 Loading enquiry data...");

      if (storedEnquiryData) {
        try {
          const data = JSON.parse(storedEnquiryData);

          console.log("✅ Enquiry data loaded:", {
            qualification: data.qualification,
            batchTime: data.batchTime,
            place: data.place,
            courseId: data.courseId,
          });

          // Helper to format date
          const formatDateForInput = (dateString) => {
            if (!dateString) return "";
            try {
              const date = new Date(dateString);
              return isNaN(date.getTime())
                ? ""
                : date.toISOString().split("T")[0];
            } catch (e) {
              return "";
            }
          };

          // Store enquiry data for later use
          setEnquiryData(data);

          // JUST USE THE EXACT VALUES - NO MAPPING NEEDED
          setFormData((prev) => ({
            ...prev,
            enquiryNo: data.enquiryNo || "",
            fullName: data.applicantName || "",
            dateOfBirth: formatDateForInput(data.dateOfBirth),
            gender: data.gender || "",
            fatherName: data.fatherName || data.guardianName || "",
            mobileNumber: data.contactNo || "",
            email: data.email || "",
            fatherNumber:
              data.fatherNumber ||
              data.guardianContact ||
              data.whatsappNo ||
              "",
            place: data.place || "", // Will be matched by dropdown
            address: data.address || data.place || "",
            city: data.city || "",
            state: data.state || "",
            lastQualification: data.qualification || "", // EXACT VALUE
            yearOfPassing: data.yearOfPassing || "",
            interestedCourse: data.courseInterested || "",
            courseId: data.courseId || "", // Added courseId
            preferredBatch: data.batchTime || "", // EXACT VALUE
            referenceName: data.reference || "",
            remarks: `Converted from Enquiry...`, // Your existing remarks
          }));

          if (data.courseId) {
  fetchCourseDetails(data.courseId);
}

          console.log("✅ Form prefilled with enquiry data");
        } catch (error) {
          console.error("Error parsing enquiry data:", error);
        }
      }
    }
  }, [location]);

  // Phone validation
  const validatePhoneFormat = (phone) => {
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length !== 10) {
      return "Phone number must be exactly 10 digits";
    }
    if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
      return "Phone number must start with 6, 7, 8, or 9";
    }
    return null;
  };

  // Handle photo upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 100 * 1024) {
      alert("Photo size must be less than 100KB");
      return;
    }

    if (!file.type.match("image/jpeg") && !file.type.match("image/jpg")) {
      alert("Only JPEG/JPG images are allowed");
      return;
    }

    setStudentPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const castOptions = [
    { value: "general", label: "General" },
    { value: "sc", label: "SC" },
    { value: "st", label: "ST" },
    { value: "obc", label: "OBC" },
    { value: "minority", label: "Minority" },
  ];

  const relationOptions = [
    { value: "", label: "Select Relation" },
    { value: "parent", label: "Parent" },
    { value: "relative", label: "Relative" },
    { value: "friend", label: "Friend" },
    { value: "teacher", label: "Teacher" },
    { value: "other", label: "Other" },
  ];

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }

    // Phone number validation
    if (
      name === "mobileNumber" ||
      name === "fatherNumber" ||
      name === "motherNumber" ||
      name === "referenceContact"
    ) {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({
        ...prev,
        [name]: digitsOnly,
      }));
      return;
    }

    // Aadhar number validation
    if (name === "aadharNumber") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 12);
      setFormData((prev) => ({
        ...prev,
        [name]: digitsOnly,
      }));
      return;
    }

    // Pincode
    if (name === "pincode") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
      setFormData((prev) => ({
        ...prev,
        [name]: digitsOnly,
      }));
      return;
    }

    // Handle course selection
    if (name === "courseId") {
      const selectedCourse = courses.find(c => c._id === value);
      setFormData((prev) => ({
        ...prev,
        courseId: value,
        interestedCourse: selectedCourse ? selectedCourse.courseFullName : "",
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle blur for validation
  const handleBlur = (e) => {
    const { name, value } = e.target;

    // Phone validation
    if (
      (name === "mobileNumber" ||
        name === "fatherNumber" ||
        name === "motherNumber" ||
        name === "referenceContact") &&
      value
    ) {
      const formatError = validatePhoneFormat(value);
      if (formatError) {
        setErrors((prev) => ({ ...prev, [name]: formatError }));
      }
    }

    // Auto-capitalization
    const capitalizeFields = [
      "fullName",
      "fatherName",
      "motherName",
      "place",
      "city",
      "state",
      "referenceName",
      "admissionBy",
    ];

    if (capitalizeFields.includes(name) && value.trim()) {
      const capitalizedValue = value
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      if (capitalizedValue !== value) {
        setFormData((prev) => ({
          ...prev,
          [name]: capitalizedValue,
        }));
      }
    }
  };

  // ========== NEW SCHOLARSHIP FUNCTIONS ==========
  const openScholarshipModal = () => {
    if (!formData.courseId) {
      alert("Please select a course first");
      return;
    }
    setShowScholarshipModal(true);
  };

  const handleScholarshipSelect = (scholarshipId) => {
    const scholarship = availableScholarships.find(s => s._id === scholarshipId);
    setSelectedScholarship(scholarship);
    
    if (!scholarship || !selectedCourseDetails) return;
    
    // Calculate fees based on scholarship
    const baseTotal = selectedCourseDetails.totalFee || 0;
    const duration = selectedCourseDetails.duration || 1;
    
    let finalTotal = baseTotal;
    let scholarshipValue = 0;
    
    if (scholarship.type === 'percentage') {
      scholarshipValue = (baseTotal * scholarship.value) / 100;
      finalTotal = baseTotal - scholarshipValue;
    } else if (scholarship.type === 'fixed_amount') {
      scholarshipValue = scholarship.value;
      finalTotal = Math.max(0, baseTotal - scholarshipValue);
    }
    
    const finalMonthly = finalTotal / duration;
    
    setCalculatedFees({
      originalTotal: baseTotal,
      originalMonthly: selectedCourseDetails.monthlyFee || 0,
      finalTotal,
      finalMonthly,
      scholarshipValue,
      savings: baseTotal - finalTotal
    });
  };

  const handleDocumentUpload = (docName, file) => {
    setScholarshipDocuments(prev => ({
      ...prev,
      [docName]: file
    }));
  };

  const applyScholarship = () => {
    if (!selectedScholarship || !calculatedFees) return;
    
    setFormData(prev => ({
      ...prev,
      hasScholarship: true,
      scholarshipApplied: true,
      scholarshipId: selectedScholarship._id,
      scholarshipName: selectedScholarship.scholarshipName,
      scholarshipCode: selectedScholarship.scholarshipCode,
      originalTotalFee: calculatedFees.originalTotal,
      originalMonthlyFee: calculatedFees.originalMonthly,
      scholarshipValue: calculatedFees.scholarshipValue,
      finalTotalFee: calculatedFees.finalTotal,
      finalMonthlyFee: calculatedFees.finalMonthly,
      scholarshipDocuments: Object.keys(scholarshipDocuments).map(name => ({
        name,
        fileName: scholarshipDocuments[name].name,
        uploaded: true
      }))
    }));
    
    setShowScholarshipModal(false);
    alert(`✅ Scholarship applied! Final fee: ₹${calculatedFees.finalTotal}`);
  };

  const removeScholarship = () => {
    if (window.confirm("Are you sure you want to remove the scholarship?")) {
      setFormData(prev => ({
        ...prev,
        hasScholarship: false,
        scholarshipApplied: false,
        scholarshipId: "",
        scholarshipName: "",
        scholarshipCode: "",
        finalTotalFee: prev.originalTotalFee,
        finalMonthlyFee: prev.originalMonthlyFee,
        scholarshipDocuments: []
      }));
      setSelectedScholarship(null);
      setCalculatedFees(null);
    }
  };
  // ===============================================

  // FORM VALIDATION - FIXED
  const validateForm = () => {
    const newErrors = {};

    // REQUIRED FIELDS (all except optional ones)
    const requiredFields = [
      "fullName",
      "dateOfBirth",
      "gender",
      "fatherName",
      "motherName",
      "mobileNumber",
      "fatherNumber",
      "motherNumber",
      "aadharNumber",
      "place",
      "address",
      "city",
      "state",
      "pincode",
      "lastQualification",
      "yearOfPassing",
      "interestedCourse",
      "preferredBatch",
      "facultyAllot",
      "cast",
    ];

    requiredFields.forEach((field) => {
      if (!formData[field] || formData[field].toString().trim() === "") {
        newErrors[field] = `${field
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase())} is required`;
      }
    });

    // Validate Admission Date
    if (!formData.admissionDate || formData.admissionDate.trim() === "") {
      newErrors.admissionDate = "Admission date is required";
    }

    // Email is OPTIONAL but validate format if provided
    if (formData.email && formData.email.trim()) {
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    // Phone validations
    if (formData.mobileNumber) {
      if (formData.mobileNumber.length !== 10) {
        newErrors.mobileNumber = "Mobile number must be 10 digits";
      } else {
        const formatError = validatePhoneFormat(formData.mobileNumber);
        if (formatError) {
          newErrors.mobileNumber = formatError;
        }
      }
    }

    if (formData.fatherNumber) {
      if (formData.fatherNumber.length !== 10) {
        newErrors.fatherNumber = "Father's number must be 10 digits";
      }
    }

    if (formData.motherNumber) {
      if (formData.motherNumber.length !== 10) {
        newErrors.motherNumber = "Mother's number must be 10 digits";
      }
    }

    // Aadhar validation
    if (formData.aadharNumber && formData.aadharNumber.length !== 12) {
      newErrors.aadharNumber = "Aadhar number must be 12 digits";
    }

    // Year of passing validation
    if (formData.yearOfPassing) {
      const currentYear = new Date().getFullYear();
      if (
        formData.yearOfPassing < 2000 ||
        formData.yearOfPassing > currentYear
      ) {
        newErrors.yearOfPassing = `Year must be between 2000 and ${currentYear}`;
      }
    }

    // Pincode validation
    if (formData.pincode && formData.pincode.length !== 6) {
      newErrors.pincode = "Pincode must be 6 digits";
    }

    // Reference fields are OPTIONAL but validate if provided
    if (formData.referenceContact && formData.referenceContact.trim()) {
      if (formData.referenceContact.length !== 10) {
        newErrors.referenceContact = "Reference contact must be 10 digits";
      }
    }

    setErrors(newErrors);

    // Log errors for debugging
    if (Object.keys(newErrors).length > 0) {
      console.log("Validation errors:", newErrors);
    }

    return Object.keys(newErrors).length === 0;
  };

  // FIXED: Handle form submission with better error messages
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("Form Data at submission:");
    console.log(
      "fatherNumber:",
      formData.fatherNumber,
      "type:",
      typeof formData.fatherNumber
    );
    console.log(
      "motherNumber:",
      formData.motherNumber,
      "type:",
      typeof formData.motherNumber
    );
    console.log(
      "Are they empty?",
      !formData.fatherNumber,
      !formData.motherNumber
    );

    // Validate form
    if (!validateForm()) {
      // Find all error fields
      const errorFields = Object.keys(errors);
      if (errorFields.length > 0) {
        // Get the first error message
        const firstErrorField = errorFields[0];
        const errorMessage = errors[firstErrorField];

        // Show specific error
        alert(`Please fix: ${errorMessage}`);

        // Focus on the error field
        const inputElement = document.querySelector(
          `[name="${firstErrorField}"]`
        );
        if (inputElement) {
          inputElement.focus();
          inputElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        alert("Please check all required fields before submitting.");
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // FIXED: Prepare admission data - ALL FIELDS ARE PRESENT
      const admissionData = {
        // Student Information
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        fatherName: formData.fatherName,
        motherName: formData.motherName,

        // Contact Information - ALL MANDATORY
        email: formData.email || "", // Optional but send empty string
        mobileNumber: formData.mobileNumber,
        fatherNumber: formData.fatherNumber, // MANDATORY
        motherNumber: formData.motherNumber, // MANDATORY
        aadharNumber: formData.aadharNumber,
        place: formData.place || "",
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,

        // Academic Information
        lastQualification: formData.lastQualification,
        yearOfPassing: formData.yearOfPassing,

        // Course Information
        course: formData.interestedCourse,
        courseId: formData.courseId, // Added courseId
        specialization: formData.specialization || "",
        batchTime: formData.preferredBatch,
        admissionYear: new Date().getFullYear(),

        // Status and Remarks
        status: "admitted",
        priority: "medium", // Added this field
        remarks: formData.remarks || "",

        // Admission Information
        admissionNo: formData.admissionNo,
        admissionBy: formData.admissionBy,
        admissionDate: formData.admissionDate,

        // Additional fields
        facultyAllot: formData.facultyAllot,
        cast: formData.cast,
        speciallyAbled: formData.speciallyAbled,
        referenceName: formData.referenceName || "",
        referenceContact: formData.referenceContact || "",
        referenceRelation: formData.referenceRelation || "",

        // Source information (required by schema)
        source: "website", // Default value

        // Enquiry reference
        enquiryNo: formData.enquiryNo || null,

        // ========== NEW SCHOLARSHIP FIELDS ==========
        hasScholarship: formData.hasScholarship,
        scholarship: formData.hasScholarship ? {
          applied: true,
          scholarshipId: formData.scholarshipId,
          scholarshipName: formData.scholarshipName,
          scholarshipCode: formData.scholarshipCode,
          percent:           formData.scholarshipPercent || 0,
          type:              "percentage", 
          originalTotalFee: formData.originalTotalFee,
          originalMonthlyFee: formData.originalMonthlyFee,
          scholarshipValue: formData.scholarshipValue,
          finalTotalFee: formData.finalTotalFee,
          finalMonthlyFee: formData.finalMonthlyFee,
          documents: formData.scholarshipDocuments
        } : null,
        // ===========================================

        // Fees information (default values)
        totalFees: formData.finalTotalFee || 0,
        paidFees: 0,
        balanceFees: formData.finalTotalFee || 0,
      };

      // ============================================================
    // ✅ CLOUDINARY: Use FormData if photo selected, else plain JSON
    // ============================================================

       let payload;

    if (studentPhoto) {
      payload = new FormData();
      Object.entries(admissionData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          // Objects & arrays must be stringified — FormData only accepts strings/Blobs
          payload.append(key, typeof value === "object" ? JSON.stringify(value) : value);
        }
      });
      payload.append("photo", studentPhoto); // ← actual file goes last
    } else {
      payload = admissionData; // no photo → send JSON as before
    }


      

      // DEBUG: Log what we're sending
      console.log("DEBUG - Form Data:");
      console.log(
        "Father Number:",
        formData.fatherNumber,
        "Type:",
        typeof formData.fatherNumber
      );
      console.log(
        "Mother Number:",
        formData.motherNumber,
        "Type:",
        typeof formData.motherNumber
      );
      console.log("Scholarship Data:", formData.hasScholarship ? formData.scholarshipName : "None");
      console.log("Full request body:", admissionData);

      // Create admission
      const response = await admissionAPI.createAdmission(payload);

     if (response.data.success) {
        alert("✅ Admission created successfully!");
        localStorage.removeItem("enquiryData");

        const user = JSON.parse(localStorage.getItem("user"));
        const role = user?.role;

        if (role === "admin") {
          navigate("/admin/front-office/admissions");
        } else if (role === "faculty" || role === "instructor") {
          navigate("/faculty/front-office/admissions");
        } else {
          navigate("/admin/front-office/admissions");
        }
      } else {
        throw new Error(response.data.message || "Failed to create admission");
      }

    } catch (err) {    // ← ✅ catch block was completely missing!
      console.error("Submission error:", err);

      if (err.response?.data?.errors) {
        const backendErrors = err.response.data.errors;
        let errorMessage = "Server validation failed:\n";
        Object.keys(backendErrors).forEach((field) => {
          errorMessage += `• ${field}: ${backendErrors[field].message || backendErrors[field]}\n`;
        });
        alert(errorMessage);

        const newErrors = {};
        Object.keys(backendErrors).forEach((field) => {
          newErrors[field] = backendErrors[field].message || "Invalid value";
        });
        setErrors(newErrors);
      } else if (err.response?.data?.message) {
        alert(`Error: ${err.response.data.message}`);
      } else {
        alert("Failed to create admission. Please check console for details.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      admissionNo: `ADM${new Date().getFullYear()}${Math.floor(
        1000 + Math.random() * 9000
      )}`,
      admissionBy: "Admin",
      admissionDate: new Date().toISOString().split("T")[0],
      enquiryNo: "",
      fullName: "",
      dateOfBirth: "",
      gender: "",
      fatherName: "",
      motherName: "",
      email: "",
      mobileNumber: "",
      fatherNumber: "",
      motherNumber: "",
      aadharNumber: "",
      place: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      lastQualification: "",
      yearOfPassing: "",
      interestedCourse: "",
      courseId: "",
      specialization: "",
      preferredBatch: "",
      facultyAllot: "",
      cast: "",
      speciallyAbled: false,
      referenceName: "",
      referenceContact: "",
      referenceRelation: "",
      remarks: "",
      // Reset scholarship fields
      hasScholarship: false,
      scholarshipApplied: false,
      scholarshipId: "",
      scholarshipName: "",
      scholarshipCode: "",
      originalTotalFee: 0,
      originalMonthlyFee: 0,
      scholarshipValue: 0,
      finalTotalFee: 0,
      finalMonthlyFee: 0,
      scholarshipDocuments: [],
    });
    setStudentPhoto(null);
    setPhotoPreview(null);
    setErrors({});
    setSelectedScholarship(null);
    setCalculatedFees(null);
    setScholarshipDocuments({});
  };

  return (
    <div className="add-admission-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>
            {isFromEnquiry ? "Convert Enquiry to Admission" : "New Admission"}
          </h1>
          <p>
            {isFromEnquiry
              ? `Converting enquiry ${formData.enquiryNo} for ${formData.fullName}`
              : "Fill in the admission details (All fields are required except email, reference, and remarks)"}
          </p>
        </div>
        <div className="header-actions">
          <Link to={`${basePath}/front-office/admissions`} className="btn-secondary">
            <X size={18} />
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || loadingSetup}
            className="btn-primary"
          >
            <Save size={18} />
            {isSubmitting ? "Saving..." : "Save Admission"}
            {loadingSetup && " (Loading data...)"}
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

      <form onSubmit={handleSubmit} className="admission-form">
        {/* Admission Details */}
        <FormSection title="Admission Details" icon={FileDigit}>
          <div className="admission-details-grid">
            <div className="student-photo-section">
              <div className="photo-upload-container">
                <div className="photo-preview">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Student Preview" />
                  ) : (
                    <div className="photo-placeholder">
                      <Camera size={48} />
                      <span>Student Photo</span>
                    </div>
                  )}
                </div>
                <div className="photo-upload-controls">
                  <label className="photo-upload-btn">
                    <input
                      type="file"
                      accept=".jpg,.jpeg"
                      onChange={handlePhotoUpload}
                      className="file-input"
                    />
                    <Upload size={16} />
                    Upload Photo
                  </label>
                  <p className="photo-note">Max 100KB, JPEG/JPG only</p>
                </div>
              </div>
            </div>

            <div className="admission-info-section">
              <div className="form-grid">
                <div className="form-group">
                  <label>Admission No *</label>
                  <input
                    type="text"
                    value={formData.admissionNo}
                    readOnly
                    className="readonly-input"
                  />
                </div>
                <div className="form-group">
                  <label>Enquiry No</label>
                  <input
                    type="text"
                    value={formData.enquiryNo}
                    readOnly
                    className="readonly-input"
                  />
                </div>
                <div className="form-group">
                  <label>Admission By *</label>
                  <input
                    type="text"
                    name="admissionBy"
                    value={formData.admissionBy}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Admin"
                  />
                </div>
                <div className="form-group">
                  <label>Admission Date *</label>
                  <input
                    type="date"
                    name="admissionDate"
                    value={formData.admissionDate}
                    onChange={handleChange}
                    className={errors.admissionDate ? "error-field" : ""}
                  />
                  {errors.admissionDate && (
                    <span className="error-text">{errors.admissionDate}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </FormSection>

        {/* Personal Information */}
        <FormSection title="Personal Information" icon={User}>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.fullName ? "error-field" : ""}
              />
              {errors.fullName && (
                <span className="error-text">{errors.fullName}</span>
              )}
            </div>
            <div className="form-group">
              <label>Date of Birth *</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className={errors.dateOfBirth ? "error-field" : ""}
              />
              {errors.dateOfBirth && (
                <span className="error-text">{errors.dateOfBirth}</span>
              )}
            </div>
            <div className="form-group">
              <label>Gender *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
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
              <label>Father's Name *</label>
              <input
                type="text"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.fatherName ? "error-field" : ""}
              />
              {errors.fatherName && (
                <span className="error-text">{errors.fatherName}</span>
              )}
            </div>
            <div className="form-group">
              <label>Mother's Name *</label>
              <input
                type="text"
                name="motherName"
                value={formData.motherName}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.motherName ? "error-field" : ""}
              />
              {errors.motherName && (
                <span className="error-text">{errors.motherName}</span>
              )}
            </div>
          </div>
        </FormSection>

        {/* Contact Information */}
        <FormSection title="Contact Information" icon={Phone}>
          <div className="form-grid">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Optional"
                className={errors.email ? "error-field" : ""}
              />
              {errors.email && (
                <span className="error-text">{errors.email}</span>
              )}
            </div>
            <div className="form-group">
              <label>Student Mobile Number *</label>
              <input
                type="tel"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength="10"
                placeholder="10 digits"
                className={errors.mobileNumber ? "error-field" : ""}
              />
              {errors.mobileNumber && (
                <span className="error-text">{errors.mobileNumber}</span>
              )}
            </div>
            <div className="form-group">
              <label>Father's Mobile Number *</label>
              <input
                type="tel"
                name="fatherNumber"
                value={formData.fatherNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength="10"
                placeholder="10 digits"
                className={errors.fatherNumber ? "error-field" : ""}
              />
              {errors.fatherNumber && (
                <span className="error-text">{errors.fatherNumber}</span>
              )}
            </div>
            <div className="form-group">
              <label>Mother's Mobile Number *</label>
              <input
                type="tel"
                name="motherNumber"
                value={formData.motherNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength="10"
                placeholder="10 digits"
                className={errors.motherNumber ? "error-field" : ""}
              />
              {errors.motherNumber && (
                <span className="error-text">{errors.motherNumber}</span>
              )}
            </div>
            <div className="form-group">
              <label>Aadhar Number *</label>
              <input
                type="tel"
                name="aadharNumber"
                value={formData.aadharNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength="12"
                placeholder="12 digits"
                className={errors.aadharNumber ? "error-field" : ""}
              />
              {errors.aadharNumber && (
                <span className="error-text">{errors.aadharNumber}</span>
              )}
            </div>

            {/* Place Field Changed to Dropdown */}
            <div className="form-group">
              <label>Place *</label>
              <select
                name="place"
                value={formData.place}
                onChange={handleChange}
                className={errors.place ? "error-field" : ""}
                disabled={loadingSetup}
              >
                <option value="">
                  {loadingSetup ? "Loading places..." : "Select Place/Area"}
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
              {loadingSetup && (
                <span className="loading-indicator">Loading places...</span>
              )}
            </div>

            <div className="form-group full-width">
              <label>Address *</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                placeholder="Complete address"
                className={errors.address ? "error-field" : ""}
              />
              {errors.address && (
                <span className="error-text">{errors.address}</span>
              )}
            </div>
            <div className="form-group">
              <label>City *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="City"
                className={errors.city ? "error-field" : ""}
              />
              {errors.city && <span className="error-text">{errors.city}</span>}
            </div>
            <div className="form-group">
              <label>State *</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="State"
                className={errors.state ? "error-field" : ""}
              />
              {errors.state && (
                <span className="error-text">{errors.state}</span>
              )}
            </div>
            <div className="form-group">
              <label>Pincode *</label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                maxLength="6"
                placeholder="6 digits"
                className={errors.pincode ? "error-field" : ""}
              />
              {errors.pincode && (
                <span className="error-text">{errors.pincode}</span>
              )}
            </div>
          </div>
        </FormSection>

        {/* Academic Information */}
        <FormSection title="Academic Information" icon={BookOpen}>
          <div className="form-grid">
            {/* Qualification Field Changed to Dynamic Dropdown */}
            <div className="form-group">
              <label>Last Qualification *</label>
              <select
                name="lastQualification"
                value={formData.lastQualification}
                onChange={handleChange}
                className={errors.lastQualification ? "error-field" : ""}
                disabled={loadingSetup}
              >
                <option value="">
                  {loadingSetup
                    ? "Loading qualifications..."
                    : "Select Qualification"}
                </option>
                {qualifications.map((qual) => (
                  <option key={qual._id} value={qual.qualificationName}>
                    {qual.qualificationName}
                  </option>
                ))}
              </select>
              {errors.lastQualification && (
                <span className="error-text">{errors.lastQualification}</span>
              )}
              {loadingSetup && (
                <span className="loading-indicator">
                  Loading qualifications...
                </span>
              )}
            </div>
            <div className="form-group">
              <label>Year of Passing *</label>
              <input
                type="number"
                name="yearOfPassing"
                value={formData.yearOfPassing}
                onChange={handleChange}
                placeholder="2023"
                min="2000"
                max={new Date().getFullYear()}
                className={errors.yearOfPassing ? "error-field" : ""}
              />
              {errors.yearOfPassing && (
                <span className="error-text">{errors.yearOfPassing}</span>
              )}
            </div>
          </div>
        </FormSection>

        {/* Course Information */}
        <FormSection title="Course Information" icon={BookOpen}>
          <div className="form-grid">
            <div className="form-group">
              <label>Course *</label>
              <select
                name="courseId"
                value={formData.courseId}
                onChange={handleChange}
              >
                <option value="">Select Course</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.courseFullName} ({course.courseShortName})
                  </option>
                ))}
              </select>

              {errors.interestedCourse && (
                <span className="error-text">{errors.interestedCourse}</span>
              )}
            </div>
            
            {/* ========== NEW SCHOLARSHIP BUTTON ========== */}
            {formData.courseId && (
              <div className="form-group scholarship-action">
                {!formData.hasScholarship ? (
                  <button
                    type="button"
                    onClick={openScholarshipModal}
                    className="btn-scholarship"
                    disabled={loadingScholarships}
                  >
                    <Gift size={16} />
                    {loadingScholarships ? "Loading Scholarships..." : "Apply Scholarship"}
                  </button>
                ) : (
                  <div className="scholarship-applied">
                    <div className="scholarship-badge">
                      <Award size={16} />
                      <span>{formData.scholarshipName} Applied</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeScholarship}
                      className="btn-remove-scholarship"
                    >
                      <X size={14} />
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* =========================================== */}

            {/* Batch Field Changed to Dynamic Dropdown */}
            <div className="form-group">
              <label>Batch *</label>
              <select
                name="preferredBatch"
                value={formData.preferredBatch}
                onChange={handleChange}
                className={errors.preferredBatch ? "error-field" : ""}
                disabled={loadingSetup}
              >
                <option value="">
                  {loadingSetup ? "Loading batches..." : "Select Batch"}
                </option>
                {batches.map((batch) => {
                  // Create display text for batch
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
              {errors.preferredBatch && (
                <span className="error-text">{errors.preferredBatch}</span>
              )}
              {loadingSetup && (
                <span className="loading-indicator">Loading batches...</span>
              )}
            </div>
            <div className="form-group">
              <label>Faculty Allotment *</label>
              <select
                name="facultyAllot"
                value={formData.facultyAllot}
                onChange={handleChange}
                className={errors.facultyAllot ? "error-field" : ""}
                disabled={loadingFaculty}
              >
                <option value="">
                  {loadingFaculty ? "Loading faculty..." : "Select Faculty"}
                </option>
                {facultyMembers.map((faculty) => (
                  <option key={faculty._id} value={faculty.facultyName}>
                    {faculty.facultyName} ({faculty.facultyNo})
                    {faculty.courseAssigned
                      ? ` - ${faculty.courseAssigned}`
                      : ""}
                  </option>
                ))}
                <option value="not_allotted">Not Allotted</option>
              </select>

              {/* Show loading or error messages */}
              {loadingFaculty && (
                <span className="loading-indicator">Loading faculty...</span>
              )}
              {facultyError && !loadingFaculty && (
                <span
                  className="error-text"
                  style={{ color: "orange", fontSize: "12px" }}
                >
                  ⚠️ {facultyError}
                </span>
              )}
              {errors.facultyAllot && (
                <span className="error-text">{errors.facultyAllot}</span>
              )}
            </div>
          </div>
        </FormSection>

        {/* Other Information */}
        <FormSection title="Other Information" icon={Hash}>
          <div className="form-grid">
            <div className="form-group">
              <label>Cast *</label>
              <select
                name="cast"
                value={formData.cast}
                onChange={handleChange}
                className={errors.cast ? "error-field" : ""}
              >
                <option value="">Select Cast</option>
                {castOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.cast && <span className="error-text">{errors.cast}</span>}
            </div>
            <div className="form-group checkbox-container">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="speciallyAbled"
                  checked={formData.speciallyAbled}
                  onChange={handleChange}
                />
                <span>Specially Abled</span>
              </label>
            </div>
          </div>
        </FormSection>

        {/* Remarks - OPTIONAL */}
        <FormSection title="Remarks (Optional)" icon={AlertCircle}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Remarks / Notes</label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows="4"
                placeholder="Optional remarks or notes..."
              />
            </div>
          </div>
        </FormSection>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" onClick={handleReset} className="btn-reset">
            Reset Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting || loadingSetup}
            className="btn-submit"
          >
            {isSubmitting ? "Saving..." : "Save Admission"}
            {loadingSetup && " (Loading data...)"}
          </button>
        </div>
      </form>

      {/* ========== NEW SCHOLARSHIP MODAL ========== */}
      {/* ========== UPDATED SCHOLARSHIP MODAL - SIMPLE PERCENTAGE INPUT ========== */}
{showScholarshipModal && (
  <div className="modal-overlay">
    <div className="modal-content scholarship-modal" style={{ maxWidth: "450px" }}>
      <div className="modal-header">
        <h3>
          <Gift size={20} />
          Apply Scholarship
        </h3>
        <button
          onClick={() => {
            setShowScholarshipModal(false);
            setScholarshipPercent("");
            setCalculatedFees(null);
          }}
          className="modal-close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="modal-body">
        {/* Scholarship Percentage Input */}
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scholarship Percentage (%)
          </label>
          <input
            type="number"
            value={scholarshipPercent}
            onChange={(e) => {
              const percent = parseFloat(e.target.value) || 0;
              setScholarshipPercent(percent);
              
              // Calculate fees in real-time
              if (selectedCourseDetails && percent > 0) {
                const baseTotal = selectedCourseDetails.totalFee || 0;
                const duration = selectedCourseDetails.duration || 1;
                const discountAmount = (baseTotal * percent) / 100;
                const finalTotal = baseTotal - discountAmount;
                const finalMonthly = finalTotal / duration;
                
                setCalculatedFees({
                  originalTotal: baseTotal,
                  originalMonthly: selectedCourseDetails.monthlyFee || 0,
                  finalTotal,
                  finalMonthly,
                  scholarshipValue: discountAmount,
                  savings: discountAmount,
                  percent: percent
                });
              } else {
                setCalculatedFees(null);
              }
            }}
            placeholder="Enter scholarship percentage (e.g., 25)"
            min="0"
            max="100"
            step="any"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter discount percentage to apply on total course fee
          </p>
        </div>

        {/* Fee Calculation Display */}
        {calculatedFees && calculatedFees.percent > 0 && (
          <div className="fee-calculation mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold mb-3 text-blue-800">Fee Calculation</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Original Total Fee:</span>
                <span className="font-medium">₹{calculatedFees.originalTotal}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Scholarship ({calculatedFees.percent}%):</span>
                <span>- ₹{calculatedFees.scholarshipValue.toFixed(2)}</span>
              </div>
              <div className="border-t border-blue-200 my-2"></div>
              <div className="flex justify-between font-bold">
                <span>Final Total Fee:</span>
                <span className="text-blue-800">₹{calculatedFees.finalTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Original Monthly Fee:</span>
                <span>₹{calculatedFees.originalMonthly.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>New Monthly Fee:</span>
                <span className="text-green-700">₹{calculatedFees.finalMonthly.toFixed(2)}</span>
              </div>
              <div className="bg-green-100 p-2 rounded mt-2">
                <div className="flex justify-between font-semibold">
                  <span>You Save:</span>
                  <span className="text-green-700">₹{calculatedFees.savings.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button
          onClick={() => {
            setShowScholarshipModal(false);
            setScholarshipPercent("");
            setCalculatedFees(null);
          }}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (calculatedFees && calculatedFees.percent > 0) {
              // Apply scholarship
              setFormData(prev => ({
                ...prev,
                hasScholarship: true,
                scholarshipApplied: true,
                scholarshipName: `${calculatedFees.percent}% Scholarship`,
                scholarshipCode: `SCH${calculatedFees.percent}`,
                originalTotalFee: calculatedFees.originalTotal,
                originalMonthlyFee: calculatedFees.originalMonthly,
                scholarshipValue: calculatedFees.scholarshipValue,
                finalTotalFee: calculatedFees.finalTotal,
                finalMonthlyFee: calculatedFees.finalMonthly,
                scholarshipPercent: calculatedFees.percent,
                scholarshipDocuments: []
              }));
              setShowScholarshipModal(false);
              alert(`✅ ${calculatedFees.percent}% scholarship applied! Final fee: ₹${calculatedFees.finalTotal.toFixed(2)}`);
            } else {
              alert("Please enter a valid scholarship percentage");
            }
          }}
          disabled={!calculatedFees || calculatedFees.percent <= 0}
          className="btn-primary"
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

export default AddAdmission;