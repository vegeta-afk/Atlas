// components/dynamic-templates/DynamicCardModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { X, Download, Share2 } from "lucide-react";
import "./DynamicCardModal.css";
import { templateAPI } from "../../../services/api";

const fontsLoaded = new Set();
const loadFont = (family) => {
  if (!family || fontsLoaded.has(family) || family === "Arial" || family === "Georgia") return;
  fontsLoaded.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(
    / /g,
    "+"
  )}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
};

// Resolves a field's TEXT value given the source record (with light date formatting)
const resolveValue = (data, dataKey) => {
  if (!dataKey) return "";
  const value = dataKey.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), data);
  if (value === undefined || value === null) return "";
  if (/date/i.test(dataKey) && !isNaN(Date.parse(value))) {
    return new Date(value).toLocaleDateString("en-GB");
  }
  return String(value);
};

// Resolves a field's RAW value (used for photo URLs — no stringifying/formatting)
const resolveRaw = (data, dataKey) => {
  if (!dataKey) return null;
  return dataKey.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), data);
};

// Promise-based image loader (used for both background + photo fields)
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

// Rounded-rect clip path helper (for square/rounded photo boxes)
const roundRectPath = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
};

/**
 * Props:
 *  - templateId: string (required) — the saved Template._id to render
 *  - data: object (required) — record whose fields fill in the dynamic text/photo
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

        const bgImg = await loadImage(template.imageUrl);
        if (cancelled) return;

        const canvas = canvasRef.current;
        canvas.width = bgImg.width;
        canvas.height = bgImg.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(bgImg, 0, 0);

        // Sequential (not forEach) because photo fields need to await image load
        for (const field of template.fields) {
          if (cancelled) return;

          const isImageField = field.fieldType === "image" || field.type === "image";

          if (isImageField) {
            const photoUrl =
              field.source === "static" ? field.staticUrl : resolveRaw(data, field.dataKey);
            if (!photoUrl) continue;

            try {
              const photoImg = await loadImage(photoUrl);
              if (cancelled) return;

              const boxW = canvas.width * (field.widthRatio || 0.2);
              const boxH = canvas.height * (field.heightRatio || field.widthRatio || 0.2);
              const centerX = canvas.width * field.xRatio;
              const centerY = canvas.height * field.yRatio;
              const boxX = centerX - boxW / 2;
              const boxY = centerY - boxH / 2;

              // "object-cover" style crop so the photo fills the box without distortion
              const scale = Math.max(boxW / photoImg.width, boxH / photoImg.height);
              const drawW = photoImg.width * scale;
              const drawH = photoImg.height * scale;
              const drawX = boxX - (drawW - boxW) / 2;
              const drawY = boxY - (drawH - boxH) / 2;

              ctx.save();
              ctx.beginPath();
              if (field.shape === "circle") {
                ctx.arc(centerX, centerY, Math.min(boxW, boxH) / 2, 0, Math.PI * 2);
              } else if (field.borderRadius) {
                roundRectPath(ctx, boxX, boxY, boxW, boxH, canvas.width * field.borderRadius);
              } else {
                ctx.rect(boxX, boxY, boxW, boxH);
              }
              ctx.closePath();
              ctx.clip();
              ctx.drawImage(photoImg, drawX, drawY, drawW, drawH);
              ctx.restore();

              // Optional border around the photo
              if (field.borderWidth) {
                ctx.save();
                ctx.lineWidth = canvas.width * field.borderWidth;
                ctx.strokeStyle = field.borderColor || "#ffffff";
                ctx.beginPath();
                if (field.shape === "circle") {
                  ctx.arc(centerX, centerY, Math.min(boxW, boxH) / 2, 0, Math.PI * 2);
                } else {
                  ctx.rect(boxX, boxY, boxW, boxH);
                }
                ctx.stroke();
                ctx.restore();
              }
            } catch (photoErr) {
              // Missing/broken photo shouldn't kill the whole card — just skip it
              console.warn("Photo field skipped:", photoErr);
            }
            continue;
          }

          // ── Text field (unchanged logic) ──
          const text =
            field.source === "static" ? field.staticText : resolveValue(data, field.dataKey);
          if (!text) continue;

          const centerX = bgImg.width * field.xRatio;
          const centerY = bgImg.height * field.yRatio;
          const maxWidth = bgImg.width * field.maxWidthRatio;

          let fontSize = Math.round(bgImg.width * field.fontSizeRatio);
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
        }

        if (!cancelled) {
          setImageUrl(canvas.toDataURL("image/png"));
          setLoading(false);
        }
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