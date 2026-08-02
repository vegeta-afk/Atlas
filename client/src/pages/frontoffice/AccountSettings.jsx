import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { KeyRound, Mail, Eye, EyeOff, Send, CheckCircle2, ShieldAlert } from "lucide-react";
import { authAPI } from "../../services/api";

const AccountSettings = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "email" ? "email" : "password";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "email" || tab === "password") setActiveTab(tab);
  }, [searchParams]);

  // ── Password state ──────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  const handlePwChange = (e) => {
    const { name, value } = e.target;
    setPwForm({ ...pwForm, [name]: value });
    if (pwErrors[name]) setPwErrors({ ...pwErrors, [name]: "" });
  };

  const validatePwForm = () => {
    const errs = {};
    if (!pwForm.currentPassword) errs.currentPassword = "Current password is required";
    if (!pwForm.newPassword) errs.newPassword = "New password is required";
    else if (pwForm.newPassword.length < 6) errs.newPassword = "Must be at least 6 characters";
    if (pwForm.newPassword !== pwForm.confirmPassword) errs.confirmPassword = "Passwords do not match";
    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    if (!validatePwForm()) return;

    setPwSubmitting(true);
    setPwSuccess(false);
    try {
      await authAPI.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwSuccess(true);
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwErrors({ currentPassword: err.response?.data?.message || "Failed to change password" });
    } finally {
      setPwSubmitting(false);
    }
  };

  // ── Email state ──────────────────────────────────────────────────────
  // Single flow now: fill new email + password, hit "Send Verification Link".
  // The actual email swap only happens once the user clicks the link we
  // email them — there's no separate "confirm" submit anymore, since that
  // used to let the change go through without ever verifying.
  const [emailForm, setEmailForm] = useState({ newEmail: "", password: "" });
  const [emailErrors, setEmailErrors] = useState({});
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailForm({ ...emailForm, [name]: value });
    if (emailErrors[name]) setEmailErrors({ ...emailErrors, [name]: "" });
    if (verificationSent) setVerificationSent(false); // editing again resets the "sent" state
  };

  const validateEmailForm = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailForm.newEmail.trim()) errs.newEmail = "New email is required";
    else if (!emailRegex.test(emailForm.newEmail)) errs.newEmail = "Enter a valid email address";
    if (!emailForm.password) errs.password = "Password is required to confirm this change";
    setEmailErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmailForm()) return;

    setEmailSubmitting(true);
    try {
      await authAPI.sendEmailVerification({
        newEmail: emailForm.newEmail,
        password: emailForm.password,
      });
      setVerificationSent(true);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send verification";
      // show it against whichever field it's about
      if (msg.toLowerCase().includes("password")) {
        setEmailErrors({ password: msg });
      } else {
        setEmailErrors({ newEmail: msg });
      }
    } finally {
      setEmailSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        .as-input:focus { outline: none; border-color: #4f46e5 !important; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
        .as-tab:hover { color: #4f46e5 !important; }
        .as-btn-primary:hover { background: #4338ca !important; }
      `}</style>

      <div style={styles.pageHeader}>
        <h1 style={styles.h1}>Account Settings</h1>
        <p style={styles.subtitle}>Manage your login password and email address</p>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        <button
          className="as-tab"
          style={{ ...styles.tab, ...(activeTab === "password" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("password")}
        >
          <KeyRound size={16} />
          Change Password
        </button>
        <button
          className="as-tab"
          style={{ ...styles.tab, ...(activeTab === "email" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("email")}
        >
          <Mail size={16} />
          Change Email
        </button>
      </div>

      {/* ── PASSWORD TAB ── */}
      {activeTab === "password" && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <KeyRound size={20} />
            <h3 style={styles.cardTitle}>Change Password</h3>
          </div>
          <div style={styles.cardContent}>
            {pwSuccess && (
              <div style={styles.successBanner}>
                <CheckCircle2 size={16} />
                Password changed successfully.
              </div>
            )}

            <form onSubmit={handlePwSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Current Password <span style={styles.required}>*</span></label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw.current ? "text" : "password"}
                    name="currentPassword"
                    value={pwForm.currentPassword}
                    onChange={handlePwChange}
                    placeholder="Enter your current password"
                    className="as-input"
                    style={{ ...styles.input, ...(pwErrors.currentPassword ? styles.inputError : {}) }}
                  />
                  <button type="button" onClick={() => setShowPw({ ...showPw, current: !showPw.current })} style={styles.eyeBtn}>
                    {showPw.current ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pwErrors.currentPassword && <span style={styles.errorText}>{pwErrors.currentPassword}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>New Password <span style={styles.required}>*</span></label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw.next ? "text" : "password"}
                    name="newPassword"
                    value={pwForm.newPassword}
                    onChange={handlePwChange}
                    placeholder="Minimum 6 characters"
                    className="as-input"
                    style={{ ...styles.input, ...(pwErrors.newPassword ? styles.inputError : {}) }}
                  />
                  <button type="button" onClick={() => setShowPw({ ...showPw, next: !showPw.next })} style={styles.eyeBtn}>
                    {showPw.next ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pwErrors.newPassword && <span style={styles.errorText}>{pwErrors.newPassword}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Confirm New Password <span style={styles.required}>*</span></label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={pwForm.confirmPassword}
                    onChange={handlePwChange}
                    placeholder="Re-enter new password"
                    className="as-input"
                    style={{ ...styles.input, ...(pwErrors.confirmPassword ? styles.inputError : {}) }}
                  />
                  <button type="button" onClick={() => setShowPw({ ...showPw, confirm: !showPw.confirm })} style={styles.eyeBtn}>
                    {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pwErrors.confirmPassword && <span style={styles.errorText}>{pwErrors.confirmPassword}</span>}
              </div>

              <button type="submit" disabled={pwSubmitting} style={{ ...styles.btnPrimary, opacity: pwSubmitting ? 0.6 : 1 }} className="as-btn-primary">
                {pwSubmitting ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── EMAIL TAB ── */}
      {activeTab === "email" && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <Mail size={20} />
            <h3 style={styles.cardTitle}>Change Email</h3>
          </div>
          <div style={styles.cardContent}>
            {verificationSent ? (
              <div style={styles.successBanner}>
                <CheckCircle2 size={16} />
                We've sent a verification link to <strong>{emailForm.newEmail}</strong>. Click it to
                finish changing your email — until then, your current email stays active.
              </div>
            ) : (
              <div style={styles.infoBanner}>
                <ShieldAlert size={16} />
                A verification link will be sent to your new email. The change only takes effect once
                you click that link.
              </div>
            )}

            <form onSubmit={handleEmailSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>New Email Address <span style={styles.required}>*</span></label>
                <input
                  type="email"
                  name="newEmail"
                  value={emailForm.newEmail}
                  onChange={handleEmailChange}
                  placeholder="newemail@example.com"
                  className="as-input"
                  style={{ ...styles.input, ...(emailErrors.newEmail ? styles.inputError : {}) }}
                />
                {emailErrors.newEmail && <span style={styles.errorText}>{emailErrors.newEmail}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Confirm With Your Password <span style={styles.required}>*</span></label>
                <input
                  type="password"
                  name="password"
                  value={emailForm.password}
                  onChange={handleEmailChange}
                  placeholder="Enter your current password"
                  className="as-input"
                  style={{ ...styles.input, ...(emailErrors.password ? styles.inputError : {}) }}
                />
                {emailErrors.password && <span style={styles.errorText}>{emailErrors.password}</span>}
              </div>

              <button
                type="submit"
                disabled={emailSubmitting}
                style={{ ...styles.btnPrimary, opacity: emailSubmitting ? 0.6 : 1 }}
                className="as-btn-primary"
              >
                <Send size={14} />
                {emailSubmitting ? "Sending..." : verificationSent ? "Resend Verification Link" : "Send Verification Link"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: "600px", margin: "0 auto", padding: "24px", fontFamily: "inherit" },
  pageHeader: { marginBottom: "20px" },
  h1: { margin: 0, fontSize: "22px", fontWeight: 700, color: "#111827" },
  subtitle: { margin: "4px 0 0", fontSize: "13px", color: "#6b7280" },
  tabBar: { display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid #e5e7eb" },
  tab: { display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", background: "none", border: "none", borderBottom: "2px solid transparent", cursor: "pointer", fontSize: "13.5px", fontWeight: 600, color: "#6b7280" },
  tabActive: { color: "#4f46e5", borderBottomColor: "#4f46e5" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" },
  cardHeader: { display: "flex", alignItems: "center", gap: "10px", padding: "16px 20px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" },
  cardTitle: { margin: 0, fontSize: "15px", fontWeight: 600, color: "#111827" },
  cardContent: { padding: "20px" },
  formGroup: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" },
  label: { fontSize: "13px", fontWeight: 600, color: "#374151" },
  required: { color: "#ef4444" },
  input: { padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" },
  inputError: { borderColor: "#ef4444" },
  errorText: { color: "#ef4444", fontSize: "12px" },
  eyeBtn: { position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex" },
  btnPrimary: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "11px 20px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer", width: "100%", marginTop: "4px" },
  successBanner: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" },
  infoBanner: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: "8px", fontSize: "12.5px", marginBottom: "18px" },
};

export default AccountSettings;