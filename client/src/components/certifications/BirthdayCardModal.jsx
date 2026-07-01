// components/BirthdayCardModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { X, Download, Share2 } from "lucide-react";
import "./BirthdayCardModal.css";

// IMPORTANT: put birthday-card-template.png inside your Vite "public" folder
// so it's served at the root, e.g. frontend/public/birthday-card-template.png
const TEMPLATE_SRC = "/birthday-card-template.png";

// Where the name gets drawn, as ratios of the template image size.
// Tuned to this specific template's ticket box between the two stars.
const NAME_BOX = {
  centerXRatio: 0.5,
  centerYRatio: 0.73,
  maxWidthRatio: 0.68, // shrink font if the name is wider than this
};

const loadGoogleFont = () => {
  if (document.getElementById("dancing-script-font")) return;
  const link = document.createElement("link");
  link.id = "dancing-script-font";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap";
  document.head.appendChild(link);
};

const BirthdayCardModal = ({ name, onClose }) => {
  const canvasRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadGoogleFont();

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = TEMPLATE_SRC;

    img.onload = async () => {
      try {
        await document.fonts.load('700 60px "Dancing Script"');
        await document.fonts.ready;
      } catch (e) {
        // font failed to load, canvas will fall back to default font
      }

      const canvas = canvasRef.current;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const boxCenterX = img.width * NAME_BOX.centerXRatio;
      const boxCenterY = img.height * NAME_BOX.centerYRatio;
      const maxWidth = img.width * NAME_BOX.maxWidthRatio;

      let fontSize = Math.round(img.width * 0.065);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#16357e";

      const setFont = (size) => {
        ctx.font = `700 ${size}px "Dancing Script", cursive`;
      };

      setFont(fontSize);
      let textWidth = ctx.measureText(name).width;
      while (textWidth > maxWidth && fontSize > 20) {
        fontSize -= 2;
        setFont(fontSize);
        textWidth = ctx.measureText(name).width;
      }

      ctx.fillText(name, boxCenterX, boxCenterY);

      setImageUrl(canvas.toDataURL("image/png"));
      setLoading(false);
    };

    img.onerror = () => {
      setLoading(false);
      setFailed(true);
    };
  }, [name]);

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `Happy-Birthday-${name.replace(/\s+/g, "-")}.png`;
    link.click();
  };

  const handleShare = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `birthday-${name}.png`, {
        type: "image/png",
      });

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: "Happy Birthday!",
          text: `🎂 Happy Birthday ${name}! From IIT Computer Institute, Rishikesh`,
        });
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
    <div className="bday-modal-overlay" onClick={onClose}>
      <div className="bday-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="bday-modal-close" onClick={onClose}>
          <X size={22} />
        </button>

        {loading && (
          <div className="bday-modal-loading">
            <div className="loading-spinner" />
            <p>Generating card...</p>
          </div>
        )}

        {!loading && imageUrl && (
          <>
            <img
              src={imageUrl}
              alt={`Birthday card for ${name}`}
              className="bday-card-img"
            />
            <div className="bday-modal-actions">
              <button className="btn-secondary" onClick={handleDownload}>
                <Download size={18} />
                Download
              </button>
              <button className="btn-primary" onClick={handleShare}>
                <Share2 size={18} />
                Share
              </button>
            </div>
          </>
        )}

        {!loading && failed && (
          <div className="bday-modal-error">
            <p>Couldn't load the birthday card template.</p>
            <p style={{ fontSize: 13, color: "#888" }}>
              Make sure <code>birthday-card-template.png</code> is placed directly
              inside your <code>public</code> folder.
            </p>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </div>
  );
};

export default BirthdayCardModal;