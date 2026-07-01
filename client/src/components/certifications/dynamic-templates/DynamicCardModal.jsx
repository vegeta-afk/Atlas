// components/dynamic-templates/DynamicCardModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { X, Download, Share2 } from "lucide-react";
import "./DynamicCardModal.css";
import { templateAPI } from "../../services/api";

const fontsLoaded = new Set();
const loadFont = (family) => {
  if (fontsLoaded.has(family) || family === "Arial" || family === "Georgia") return;
  fontsLoaded.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(
    / /g,
    "+"
  )}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
};

// Resolves a field's text given the source record. Supports dot paths
// like "course.name" in case your data is nested.
const resolveValue = (data, dataKey) => {
  if (!dataKey) return "";
  const value = dataKey.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), data);
  if (value === undefined || value === null) return "";
  // light date formatting for common date-ish keys
  if (/date/i.test(dataKey) && !isNaN(Date.parse(value))) {
    return new Date(value).toLocaleDateString("en-GB");
  }
  return String(value);
};

/**
 * Props:
 *  - templateId: string (required) — the saved Template._id to render
 *  - data: object (required) — record whose fields fill in the dynamic text
 *  - fileName: string (optional) — used for download/share filename
 *  - onClose: function
 */
const DynamicCardModal = ({ templateId, data, fileName = "card", onClose }) => {
  const canvasRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await templateAPI.getById(templateId);
        const template = res.data.template;
        if (!template) throw new Error("Template not found");

        template.fields.forEach((f) => loadFont(f.fontFamily));
        await document.fonts.ready;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = template.imageUrl;

        img.onload = () => {
          if (cancelled) return;
          const canvas = canvasRef.current;
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);

          template.fields.forEach((field) => {
            const text =
              field.source === "static" ? field.staticText : resolveValue(data, field.dataKey);
            if (!text) return;

            const centerX = img.width * field.xRatio;
            const centerY = img.height * field.yRatio;
            const maxWidth = img.width * field.maxWidthRatio;

            let fontSize = Math.round(img.width * field.fontSizeRatio);
            ctx.textBaseline = "middle";
            ctx.fillStyle = field.color;

            const setFont = (size) => {
              ctx.font = `${field.fontWeight} ${size}px "${field.fontFamily}", sans-serif`;
            };

            setFont(fontSize);
            let textWidth = ctx.measureText(text).width;
            while (textWidth > maxWidth && fontSize > 10) {
              fontSize -= 2;
              setFont(fontSize);
              textWidth = ctx.measureText(text).width;
            }

            let drawX = centerX;
            if (field.align === "left") {
              ctx.textAlign = "left";
              drawX = centerX - maxWidth / 2;
            } else if (field.align === "right") {
              ctx.textAlign = "right";
              drawX = centerX + maxWidth / 2;
            } else {
              ctx.textAlign = "center";
            }

            ctx.fillText(text, drawX, centerY);
          });

          setImageUrl(canvas.toDataURL("image/png"));
          setLoading(false);
        };

        img.onerror = () => {
          if (!cancelled) {
            setError("Couldn't load the template image.");
            setLoading(false);
          }
        };
      } catch (err) {
        console.error("DynamicCardModal error:", err);
        if (!cancelled) {
          setError(err.message || "Failed to generate card");
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [templateId, data]);

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `${fileName}.png`;
    link.click();
  };

  const handleShare = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
      } else {
        handleDownload();
        alert("Sharing isn't supported on this device/browser — image downloaded instead.");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Share failed:", err);
        handleDownload();
      }
    }
  };

  return (
    <div className="dcm-overlay" onClick={onClose}>
      <div className="dcm-content" onClick={(e) => e.stopPropagation()}>
        <button className="dcm-close" onClick={onClose}>
          <X size={22} />
        </button>

        {loading && (
          <div className="dcm-loading">
            <div className="loading-spinner" />
            <p>Generating...</p>
          </div>
        )}

        {!loading && imageUrl && (
          <>
            <img src={imageUrl} alt={fileName} className="dcm-img" />
            <div className="dcm-actions">
              <button className="btn-secondary" onClick={handleDownload}>
                <Download size={18} /> Download
              </button>
              <button className="btn-primary" onClick={handleShare}>
                <Share2 size={18} /> Share
              </button>
            </div>
          </>
        )}

        {!loading && error && (
          <div className="dcm-error">
            <p>{error}</p>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </div>
  );
};

export default DynamicCardModal;
