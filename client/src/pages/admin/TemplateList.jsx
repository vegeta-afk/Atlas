// pages/admin/TemplateList.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, LayoutTemplate } from "lucide-react";
import "./TemplateList.css";
import { templateAPI } from "../../services/api";

const CATEGORY_LABELS = {
  birthday: "Birthday Card",
  idcard: "ID Card",
  certificate: "Certificate",
  marksheet: "Marksheet",
  custom: "Custom",
};

const TemplateList = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await templateAPI.getAll();
      setTemplates(res.data.templates || []);
    } catch (err) {
      console.error("Failed to load templates:", err);
      setError(err?.response?.data?.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (template) => {
    if (!window.confirm(`Delete "${template.name}"? This can't be undone.`)) return;
    try {
      await templateAPI.delete(template._id);
      setTemplates((prev) => prev.filter((t) => t._id !== template._id));
    } catch (err) {
      console.error("Delete failed:", err);
      alert(err?.response?.data?.message || "Failed to delete template");
    }
  };

  return (
    <div className="admission-list-container">
      <div className="page-header">
        <div>
          <h1>Template Designer</h1>
          <p>Manage birthday cards, ID cards, certificates & any custom design</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => navigate("/admin/setup/templates/new")}>
            <Plus size={18} />
            New Template
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Loading templates...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-alert">
          <p>{error}</p>
          <button onClick={fetchTemplates} className="btn-retry">Retry</button>
        </div>
      )}

      {!loading && !error && templates.length === 0 && (
        <div className="empty-state">
          <LayoutTemplate size={48} />
          <h3>No templates yet</h3>
          <p>Create your first design — birthday card, ID card, certificate, anything.</p>
          <button className="btn-primary" onClick={() => navigate("/admin/setup/templates/new")}>
            <Plus size={16} /> New Template
          </button>
        </div>
      )}

      {!loading && !error && templates.length > 0 && (
        <div className="tl-grid">
          {templates.map((t) => (
            <div className="tl-card" key={t._id}>
              <div className="tl-thumb">
                <img src={t.imageUrl} alt={t.name} />
                <span className="tl-badge">{CATEGORY_LABELS[t.category] || t.category}</span>
              </div>
              <div className="tl-info">
                <h4>{t.name}</h4>
                <p>{t.fields?.length || 0} field{t.fields?.length === 1 ? "" : "s"}</p>
              </div>
              <div className="tl-actions">
                <Link to={`/admin/setup/templates/edit/${t._id}`} className="btn-secondary">
                  <Pencil size={14} /> Edit
                </Link>
                <button className="btn-danger" onClick={() => handleDelete(t)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateList;
