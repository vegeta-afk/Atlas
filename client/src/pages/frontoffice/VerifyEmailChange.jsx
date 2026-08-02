import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { authAPI } from "../../services/api"; 

const VerifyEmailChange = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    authAPI
      .confirmEmailChange({ token })
      .then((res) => {
        setStatus("success");
        setMessage(res.data.message || "Email updated successfully.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.message || "This link is invalid or has expired.");
      });
  }, [token]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {status === "verifying" && (
          <>
            <Loader2 size={36} style={{ animation: "spin 1s linear infinite" }} color="#4f46e5" />
            <h2 style={styles.title}>Verifying your email...</h2>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 size={36} color="#16a34a" />
            <h2 style={styles.title}>Email updated</h2>
            <p style={styles.text}>{message}</p>
            <Link to="/login" style={styles.link}>Go to login</Link>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle size={36} color="#dc2626" />
            <h2 style={styles.title}>Couldn't verify</h2>
            <p style={styles.text}>{message}</p>
            <Link to="/account-settings?tab=email" style={styles.link}>Try again</Link>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const styles = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", padding: 24 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "40px 32px", textAlign: "center", maxWidth: 380, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  title: { margin: "8px 0 0", fontSize: 18, fontWeight: 700, color: "#111827" },
  text: { margin: 0, fontSize: 14, color: "#6b7280" },
  link: { marginTop: 10, color: "#4f46e5", fontWeight: 600, fontSize: 14, textDecoration: "none" },
};

export default VerifyEmailChange;