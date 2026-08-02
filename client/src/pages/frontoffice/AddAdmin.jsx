import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../../services/api";
import {
  Save, X, User, Copy, Check, Eye, EyeOff,
  Mail, Phone, Calendar, ShieldCheck, RefreshCw, Search, Trash2,
} from "lucide-react";

const AddAdmin = () => {
  const navigate = useNavigate();
  const basePath = "/admin";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    mobileNumber: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [createdAdmin, setCreatedAdmin] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isPasswordCopied, setIsPasswordCopied] = useState(false);
  const [submittedPassword, setSubmittedPassword] = useState("");

  // ── Admin list state ─────────────────────────────────────────────────
  const [admins, setAdmins] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setListLoading(true);
    setListError(null);
    try {
      const response = await adminAPI.getAdmins();
      const data = response.data.admins || response.data.data || [];
      setAdmins(data);
    } catch (err) {
      console.error("Error fetching admins:", err);
      setListError(err.response?.data?.message || "Failed to load admins");
    } finally {
      setListLoading(false);
    }
  };

  const handleDeleteAdmin = async (admin) => {
    const confirmed = window.confirm(
      `Delete admin "${admin.name || admin.fullName}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(admin._id);
    try {
      await adminAPI.deleteAdmin(admin._id);
      setAdmins((prev) => prev.filter((a) => a._id !== admin._id));
    } catch (err) {
      console.error("Error deleting admin:", err);
      alert(err.response?.data?.message || "Failed to delete admin");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const filteredAdmins = admins.filter((a) => {
    const q = search.toLowerCase();
    return (
      (a.name || a.fullName || "").toLowerCase().includes(q) ||
      (a.email || "").toLowerCase().includes(q)
    );
  });
  // ─────────────────────────────────────────────────────────────────────

  const formatName = (name) =>
    name
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const formatPhoneNumber = (phone) => phone.replace(/\D/g, "").slice(0, 10);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === "name") formattedValue = formatName(value);
    if (name === "mobileNumber") formattedValue = formatPhoneNumber(value);

    setFormData({ ...formData, [name]: formattedValue });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password: pass });
    if (errors.password) setErrors({ ...errors, password: "" });
  };

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    if (!formData.name.trim()) newErrors.name = "Name is required";

    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!emailRegex.test(formData.email)) newErrors.email = "Please enter a valid email address";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";

    if (formData.mobileNumber && !phoneRegex.test(formData.mobileNumber)) {
      newErrors.mobileNumber = "Mobile number must be exactly 10 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(submittedPassword)
      .then(() => {
        setIsPasswordCopied(true);
        setTimeout(() => setIsPasswordCopied(false), 2000);
      })
      .catch((err) => console.error("Failed to copy: ", err));
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setCreatedAdmin(null);
    setSubmittedPassword("");
    setIsPasswordCopied(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      alert("Please fill all required fields before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await adminAPI.createAdmin(formData);

      if (response.data.success) {
        setCreatedAdmin(response.data.admin);
        setSubmittedPassword(formData.password);
        setShowSuccessModal(true);
        setFormData({ name: "", email: "", password: "", mobileNumber: "" });
        setErrors({});
        fetchAdmins();
      } else {
        throw new Error(response.data.message || "Failed to create admin");
      }
    } catch (err) {
      console.error("Error creating admin:", err);
      alert(err.response?.data?.message || "Failed to create admin. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel? All unsaved changes will be lost.")) {
      navigate(`${basePath}/dashboard`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const form = e.target.form;
      const focusableElements = form.querySelectorAll(
        'input:not([type="checkbox"]), select, textarea, button'
      );
      const currentIndex = Array.from(focusableElements).indexOf(e.target);
      if (currentIndex < focusableElements.length - 1) {
        focusableElements[currentIndex + 1].focus();
      }
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        .aa-input:focus { outline: none; border-color: #4f46e5 !important; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
        .aa-btn-primary:hover { background: #4338ca !important; }
        .aa-btn-secondary:hover { background: #e5e7eb !important; }
        .aa-back-link:hover { color: #4f46e5 !important; }
        .aa-copy-btn:hover { background: #f3f4f6 !important; }
        .aa-row:hover { background: #f9fafb !important; }
        .aa-search:focus { outline: none; border-color: #4f46e5 !important; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
        .aa-refresh:hover { background: #f3f4f6 !important; }
        .aa-delete-btn:hover { background: #fef2f2 !important; }
      `}</style>

      {/* Header */}
      <div style={styles.pageHeader}>
        <div style={styles.headerLeft}>
          <button style={styles.backLink} className="aa-back-link" onClick={handleCancel} type="button">
            <X size={20} />
            Cancel
          </button>
          <div>
            <h1 style={styles.h1}>Create New Admin</h1>
            <p style={styles.subtitle}>Add a new admin account for the institute software</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <User size={20} />
            <h3 style={styles.cardTitle}>Admin Details</h3>
          </div>
          <div style={styles.cardContent}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Full Name <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Admin full name"
                  className="aa-input"
                  style={{ ...styles.input, ...(errors.name ? styles.inputError : {}) }}
                />
                {errors.name && <span style={styles.errorText}>{errors.name}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Email ID <span style={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="email@example.com"
                  className="aa-input"
                  style={{ ...styles.input, ...(errors.email ? styles.inputError : {}) }}
                />
                {errors.email && <span style={styles.errorText}>{errors.email}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Mobile No</label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="10 digit mobile number"
                  maxLength="10"
                  className="aa-input"
                  style={{ ...styles.input, ...(errors.mobileNumber ? styles.inputError : {}) }}
                />
                {errors.mobileNumber && <span style={styles.errorText}>{errors.mobileNumber}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Password <span style={styles.required}>*</span>
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Set a temporary password"
                    className="aa-input"
                    style={{ ...styles.input, ...(errors.password ? styles.inputError : {}), flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.iconBtn}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={generatePassword}
                    style={styles.btnSecondary}
                    className="aa-btn-secondary"
                  >
                    Generate
                  </button>
                </div>
                {errors.password && <span style={styles.errorText}>{errors.password}</span>}
                <span style={styles.fieldNote}>Minimum 6 characters. Share this with the admin securely.</span>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.formActions}>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ ...styles.btnPrimary, opacity: isSubmitting ? 0.6 : 1 }}
            className="aa-btn-primary"
            type="submit"
          >
            <Save size={18} />
            {isSubmitting ? "Creating..." : "Create Admin"}
          </button>
        </div>
      </form>

      {/* ── Admin List — directly below the form ───────────────────────── */}
      <div style={styles.listSection}>
        <div style={styles.listHeader}>
          <div>
            <h2 style={styles.listTitle}>Existing Admins</h2>
            <p style={styles.subtitle}>{admins.length} admin{admins.length !== 1 ? "s" : ""} with access to this system</p>
          </div>
          <div style={styles.toolbar}>
            <div style={styles.searchWrapper}>
              <Search size={16} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="aa-search"
                style={styles.searchInput}
              />
            </div>
            <button style={styles.refreshBtn} className="aa-refresh" onClick={fetchAdmins} title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {listLoading ? (
          <div style={styles.stateBox}>Loading admins...</div>
        ) : listError ? (
          <div style={{ ...styles.stateBox, color: "#ef4444" }}>{listError}</div>
        ) : filteredAdmins.length === 0 ? (
          <div style={styles.stateBox}>
            {search ? "No admins match your search." : "No admins found yet."}
          </div>
        ) : (
          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Mobile</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((admin) => (
                  <tr key={admin._id} style={styles.row} className="aa-row">
                    <td style={styles.td}>
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>
                          {(admin.name || admin.fullName || "A").charAt(0).toUpperCase()}
                        </div>
                        <span style={styles.nameText}>{admin.name || admin.fullName || "—"}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.iconCell}>
                        <Mail size={14} style={styles.cellIcon} />
                        {admin.email}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.iconCell}>
                        <Phone size={14} style={styles.cellIcon} />
                        {admin.mobileNumber || "—"}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...(admin.isActive === false ? styles.badgeInactive : styles.badgeActive) }}>
                        <ShieldCheck size={12} />
                        {admin.isActive === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.iconCell}>
                        <Calendar size={14} style={styles.cellIcon} />
                        {formatDate(admin.createdAt)}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleDeleteAdmin(admin)}
                        disabled={deletingId === admin._id}
                        style={styles.deleteBtn}
                        className="aa-delete-btn"
                        title="Delete admin"
                      >
                        <Trash2 size={14} />
                        {deletingId === admin._id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* ─────────────────────────────────────────────────────────────── */}

      {showSuccessModal && createdAdmin && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>✅ Admin Created Successfully!</h2>
              <button onClick={handleCloseSuccessModal} style={styles.closeButton}>×</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.successIcon}>
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>

              <div style={styles.infoBlock}>
                <h3 style={styles.infoName}>{createdAdmin.name}</h3>
                <p style={styles.infoLine}><strong>Email:</strong> {createdAdmin.email}</p>
                {createdAdmin.mobileNumber && (
                  <p style={styles.infoLine}><strong>Mobile:</strong> {createdAdmin.mobileNumber}</p>
                )}
              </div>

              <div style={styles.passwordSection}>
                <h4 style={styles.sectionTitle}>Login Credentials</h4>
                <div style={styles.passwordDisplay}>
                  <div style={styles.passwordField}>
                    <span style={styles.passwordLabel}>Password:</span>
                    <span style={styles.passwordValue}>{submittedPassword}</span>
                    <button onClick={copyToClipboard} style={styles.copyButton} className="aa-copy-btn">
                      {isPasswordCopied ? <Check size={16} /> : <Copy size={16} />}
                      {isPasswordCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p style={styles.passwordNote}>
                    ⚠️ Share this password with the new admin securely. They'll be asked to change it on first login.
                  </p>
                </div>
              </div>

              <div style={styles.loginInstructions}>
                <h4 style={styles.sectionTitle}>How to Login:</h4>
                <ol style={styles.orderedList}>
                  <li>Go to your institute login page</li>
                  <li>Username: <strong>{createdAdmin.email}</strong></li>
                  <li>Password: <strong>{submittedPassword}</strong></li>
                </ol>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={handleCloseSuccessModal} style={styles.btnPrimary} className="aa-btn-primary">
                Done
              </button>
              <button onClick={copyToClipboard} style={styles.btnSecondary} className="aa-btn-secondary">
                {isPasswordCopied ? <Check size={16} /> : <Copy size={16} />}
                {isPasswordCopied ? "Copied!" : "Copy Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: "1000px", margin: "0 auto", padding: "24px", fontFamily: "inherit" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" },
  headerLeft: { display: "flex", alignItems: "center", gap: "16px" },
  backLink: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "14px", padding: 0 },
  h1: { margin: 0, fontSize: "22px", fontWeight: 700, color: "#111827" },
  subtitle: { margin: "4px 0 0", fontSize: "13px", color: "#6b7280" },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" },
  cardHeader: { display: "flex", alignItems: "center", gap: "10px", padding: "16px 20px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" },
  cardTitle: { margin: 0, fontSize: "15px", fontWeight: 600, color: "#111827" },
  cardContent: { padding: "20px" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "18px" },
  formGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: 600, color: "#374151" },
  required: { color: "#ef4444" },
  input: { padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" },
  inputError: { borderColor: "#ef4444" },
  errorText: { color: "#ef4444", fontSize: "12px" },
  fieldNote: { color: "#9ca3af", fontSize: "12px" },
  iconBtn: { padding: "0 12px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center" },
  formActions: { display: "flex", justifyContent: "flex-end", gap: "12px" },
  btnPrimary: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "10px 16px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" },
  btnSubmit: { padding: "12px 24px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" },
  modalContent: { background: "#fff", borderRadius: "12px", maxWidth: "480px", width: "100%", maxHeight: "90vh", overflowY: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid #e5e7eb" },
  modalTitle: { margin: 0, fontSize: "16px", fontWeight: 700, color: "#111827" },
  closeButton: { background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#6b7280", lineHeight: 1 },
  modalBody: { padding: "20px" },
  successIcon: { display: "flex", justifyContent: "center", marginBottom: "16px" },
  infoBlock: { textAlign: "center", marginBottom: "20px" },
  infoName: { margin: "0 0 8px", fontSize: "17px", fontWeight: 700, color: "#111827" },
  infoLine: { margin: "4px 0", fontSize: "13px", color: "#4b5563" },
  passwordSection: { marginBottom: "18px" },
  sectionTitle: { fontSize: "13px", fontWeight: 700, color: "#374151", margin: "0 0 8px" },
  passwordDisplay: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px" },
  passwordField: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  passwordLabel: { fontSize: "13px", color: "#6b7280" },
  passwordValue: { fontFamily: "monospace", fontSize: "14px", fontWeight: 700, color: "#111827", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "4px 8px" },
  copyButton: { display: "flex", alignItems: "center", gap: "4px", padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: "6px", background: "#fff", cursor: "pointer", fontSize: "12px", marginLeft: "auto" },
  passwordNote: { fontSize: "12px", color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "8px 10px", marginTop: "10px" },
  loginInstructions: { marginBottom: "4px" },
  orderedList: { margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#4b5563", lineHeight: 1.8 },
  modalFooter: { display: "flex", gap: "10px", padding: "16px 20px", borderTop: "1px solid #e5e7eb" },

  // ── List section styles ──
  listSection: { marginTop: "32px" },
  listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" },
  listTitle: { margin: 0, fontSize: "18px", fontWeight: 700, color: "#111827" },
  toolbar: { display: "flex", gap: "10px" },
  searchWrapper: { position: "relative" },
  searchIcon: { position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" },
  searchInput: { padding: "9px 12px 9px 36px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", width: "220px", boxSizing: "border-box" },
  refreshBtn: { padding: "0 14px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center" },
  stateBox: { padding: "36px", textAlign: "center", color: "#6b7280", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", fontSize: "14px" },
  tableCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  theadRow: { background: "#f9fafb", borderBottom: "1px solid #e5e7eb" },
  th: { textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.03em" },
  row: { borderBottom: "1px solid #f3f4f6" },
  td: { padding: "14px 16px", fontSize: "14px", color: "#374151" },
  nameCell: { display: "flex", alignItems: "center", gap: "10px" },
  avatar: { width: "32px", height: "32px", borderRadius: "50%", background: "#4f46e5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, flexShrink: 0 },
  nameText: { fontWeight: 600, color: "#111827" },
  iconCell: { display: "flex", alignItems: "center", gap: "6px", color: "#4b5563" },
  cellIcon: { color: "#9ca3af", flexShrink: 0 },
  badge: { display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 },
  badgeActive: { background: "#dcfce7", color: "#166534" },
  badgeInactive: { background: "#fee2e2", color: "#991b1b" },
  deleteBtn: { display: "flex", alignItems: "center", gap: "4px", padding: "6px 10px", background: "#fff", color: "#ef4444", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
};

export default AddAdmin;