// pages/admin/TemplateEditPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TemplateDesigner from "./TemplateDesigner";
import { templateAPI } from "../../services/api";

const TemplateEditPage = () => {
  const { id } = useParams(); // undefined on the "new" route
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return; // new template — nothing to fetch
    (async () => {
      try {
        setLoading(true);
        const res = await templateAPI.getById(id);
        setTemplate(res.data.template);
      } catch (err) {
        console.error("Failed to load template:", err);
        alert("Couldn't load that template.");
        navigate("/admin/setup/templates");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const handleSaved = () => {
    navigate("/admin/setup/templates");
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <p>Loading template...</p>
      </div>
    );
  }

  return <TemplateDesigner existingTemplate={template} onSaved={handleSaved} />;
};

export default TemplateEditPage;
