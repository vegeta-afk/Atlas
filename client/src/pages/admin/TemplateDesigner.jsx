// pages/admin/TemplateDesigner.jsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Plus, Trash2, Save, Upload, Type, Image as ImageIcon } from "lucide-react";
import "./TemplateDesigner.css";
import { templateAPI } from "../../services/api"; // add this to services/api.js — see note at bottom of file

const FONT_OPTIONS = [
  { label: "Poppins (clean/sans)", value: "Poppins" },
  { label: "Georgia (serif)", value: "Georgia" },
  { label: "Dancing Script (cursive/signature)", value: "Dancing Script" },
  { label: "Arial", value: "Arial" },
];

const DATA_KEY_SUGGESTIONS = [
  "fullName",
  "admissionNo",
  "course",
  "batchTime",
  "fatherName",
  "mobileNumber",
  "email",
  "issueDate",
  "dateOfBirth",
  "facultyName",
  "grade",
  "duration",
  "photo",
  "certificateNo",
  "enrollmentNo",
  "trainingCenter",
  "durationFrom",
  "durationTo",
];

const loadFonts = () => {
  if (document.getElementById("template-designer-fonts")) return;
  const link = document.createElement("link");
  link.id = "template-designer-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Poppins:wght@400;600;700&display=swap";
  document.head.appendChild(link);
};

const uid = () => Math.random().toString(36).slice(2, 10);

const TemplateDesigner = ({ existingTemplate = null, onSaved }) => {
  const [name, setName] = useState(existingTemplate?.name || "");
  const [category, setCategory] = useState(existingTemplate?.category || "custom");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(existingTemplate?.imageUrl || null);
  // Old saved templates won't have fieldType — default them to "text" so nothing breaks
  const [fields, setFields] = useState(
    (existingTemplate?.fields || []).map((f) => ({ fieldType: "text", ...f }))
  );
  const [containers, setContainers] = useState(existingTemplate?.containers || []);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedContainerId, setSelectedContainerId] = useState(null);
  const [saving, setSaving] = useState(false);

  const imageWrapRef = useRef(null);
  const dragState = useRef(null); // { fieldId, offsetX, offsetY }

  useEffect(() => {
    loadFonts();
  }, []);

  const selectedField = fields.find((f) => f.id === selectedId) || null;

  // ── Image upload ──────────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // ── Field CRUD ────────────────────────────────────────────────────────
  const addField = () => {
    const newField = {
      id: uid(),
      fieldType: "text",
      label: `Field ${fields.length + 1}`,
      source: "dynamic",
      dataKey: "fullName",
      staticText: "",
      xRatio: 0.5,
      yRatio: 0.5,
      maxWidthRatio: 0.7,
      fontSizeRatio: 0.045,
      fontFamily: "Poppins",
      fontWeight: "600",
      color: "#16357e",
      align: "center",
      boxed: false,
      boxWidthRatio: 0.3,
      boxHeightRatio: 0.08,
      boxBorderRadius: 0,
    };
    setFields((prev) => [...prev, newField]);
    setSelectedId(newField.id);
  };

  const addPhotoField = () => {
    const newField = {
      id: uid(),
      fieldType: "image",
      label: `Photo ${fields.filter((f) => f.fieldType === "image").length + 1}`,
      source: "dynamic",
      dataKey: "photo",
      xRatio: 0.2,
      yRatio: 0.4,
      widthRatio: 0.2,
      heightRatio: 0.3,
      shape: "square", // "square" | "circle"
      borderRadius: 0.01,
      borderWidth: 0.004,
      borderColor: "#16357e",
    };
    setFields((prev) => [...prev, newField]);
    setSelectedId(newField.id);
  };

  const updateField = (id, patch) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const addContainer = () => {
    const newContainer = {
      id: uid(),
      label: `Container ${containers.length + 1}`,
      xRatio: 0.5,
      yRatio: 0.5,
      widthRatio: 0.35,
      heightRatio: 0.15,
      borderRadius: 0,
    };
    setContainers((prev) => [...prev, newContainer]);
    setSelectedContainerId(newContainer.id);
    setSelectedId(null);
  };

  const updateContainer = (id, patch) => {
    setContainers((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const deleteContainer = (id) => {
    setContainers((prev) => prev.filter((c) => c.id !== id));
    // Orphaned children become free-floating again rather than vanishing.
    setFields((prev) =>
      prev.map((f) => (f.containerId === id ? { ...f, containerId: null, xRatio: 0.5, yRatio: 0.5 } : f))
    );
    if (selectedContainerId === id) setSelectedContainerId(null);
  };

  const selectedContainer = containers.find((c) => c.id === selectedContainerId) || null;

  const deleteField = (id) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  };


  const imgRef = useRef(null);
  const [renderedWidth, setRenderedWidth] = useState(0);

  const updateRenderedWidth = () => {
    if (imgRef.current) setRenderedWidth(imgRef.current.getBoundingClientRect().width);
};

  useEffect(() => {
        window.addEventListener("resize", updateRenderedWidth);
            return () => window.removeEventListener("resize", updateRenderedWidth);
   }, []);


  // ── Dragging fields on the preview ───────────────────────────────────
  const handleFieldMouseDown = (e, field) => {
    e.stopPropagation();
    setSelectedId(field.id);
    setSelectedContainerId(null);
    const imageRect = imageWrapRef.current.getBoundingClientRect();

    let boundsRect = imageRect; // default: field drags relative to whole card
    if (field.containerId) {
      const c = containers.find((c) => c.id === field.containerId);
      if (c) {
        boundsRect = {
          left: imageRect.left + (c.xRatio - c.widthRatio / 2) * imageRect.width,
          top: imageRect.top + (c.yRatio - c.heightRatio / 2) * imageRect.height,
          width: c.widthRatio * imageRect.width,
          height: c.heightRatio * imageRect.height,
        };
      }
    }

    dragState.current = { fieldId: field.id, rect: boundsRect };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleContainerMouseDown = (e, container) => {
    e.stopPropagation();
    setSelectedContainerId(container.id);
    setSelectedId(null);
    const rect = imageWrapRef.current.getBoundingClientRect();
    dragState.current = { containerId: container.id, rect };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragState.current) return;
    const { rect, fieldId, containerId } = dragState.current;
    let xRatio = (e.clientX - rect.left) / rect.width;
    let yRatio = (e.clientY - rect.top) / rect.height;
    xRatio = Math.min(1, Math.max(0, xRatio));
    yRatio = Math.min(1, Math.max(0, yRatio));
    if (fieldId) {
      setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, xRatio, yRatio } : f)));
    } else if (containerId) {
      setContainers((prev) => prev.map((c) => (c.id === containerId ? { ...c, xRatio, yRatio } : c)));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    dragState.current = null;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) return alert("Give the template a name first.");
    if (!imageFile && !imagePreview) return alert("Upload a template image first.");
    if (fields.length === 0) return alert("Add at least one field.");

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("name", name);
      formData.append("category", category);
      formData.append("fields", JSON.stringify(fields));
      formData.append("containers", JSON.stringify(containers));
      if (imageFile) formData.append("image", imageFile);

      const res = existingTemplate
        ? await templateAPI.update(existingTemplate._id, formData)
        : await templateAPI.create(formData);

      alert("Template saved!");
      if (onSaved) onSaved(res.data.template);
    } catch (err) {
      console.error("Save template failed:", err);
      alert(err?.response?.data?.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="td-container">
      {/* ── Left: canvas/preview ── */}
      <div className="td-preview-panel">
        <div className="td-top-bar">
          <input
            type="text"
            placeholder="Template name (e.g. Birthday Card - Blue)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="td-name-input"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="birthday">Birthday Card</option>
            <option value="idcard">ID Card</option>
            <option value="certificate">Certificate</option>
            <option value="marksheet">Marksheet</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {!imagePreview ? (
          <label className="td-upload-box">
            <Upload size={32} />
            <span>Click to upload template image</span>
            <input type="file" accept="image/*" hidden onChange={handleImageChange} />
          </label>
        ) : (
          <>
            <div
              className="td-image-wrap"
              ref={imageWrapRef}
              onClick={() => setSelectedId(null)}
            >
              <img
                src={imagePreview}
                alt="template"
                draggable={false}
                ref={imgRef}
                onLoad={updateRenderedWidth}
              />
              {containers.map((c) => (
                <div
                  key={c.id}
                  className={`td-container-box ${selectedContainerId === c.id ? "selected" : ""}`}
                  style={{
                    position: "absolute",
                    left: `${c.xRatio * 100}%`,
                    top: `${c.yRatio * 100}%`,
                    width: `${c.widthRatio * 100}%`,
                    height: `${c.heightRatio * 100}%`,
                    transform: "translate(-50%, -50%)",
                    border: `2px ${selectedContainerId === c.id ? "solid" : "dashed"} #16357e`,
                    borderRadius: c.borderRadius ? `${c.borderRadius * 100}%` : 0,
                    overflow: "hidden",
                    background: "rgba(22,53,126,0.04)",
                  }}
                  onMouseDown={(e) => handleContainerMouseDown(e, c)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span style={{ position: "absolute", top: 2, left: 4, fontSize: 10, color: "#16357e", opacity: 0.6 }}>
                    {c.label}
                  </span>
                  {fields
                    .filter((f) => f.containerId === c.id)
                    .map((f) => (
                      <div
                        key={f.id}
                        className={`td-field-box ${selectedId === f.id ? "selected" : ""}`}
                        style={{
                          position: "absolute",
                          left: `${f.xRatio * 100}%`,
                          top: `${f.yRatio * 100}%`,
                          maxWidth: "90%",
                          fontFamily: f.fontFamily,
                          fontWeight: f.fontWeight,
                          color: f.color,
                          fontSize: renderedWidth ? `${renderedWidth * f.fontSizeRatio}px` : "16px",
                          textAlign: f.align,
                          transform: "translate(-50%, -50%)",
                        }}
                        onMouseDown={(e) => handleFieldMouseDown(e, f)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {f.source === "static" ? f.staticText || "(empty)" : `{{${f.dataKey || "field"}}}`}
                      </div>
                    ))}
                </div>
              ))}
              {fields.filter((f) => !f.containerId).map((f) =>
                f.fieldType === "image" ? (
                  <div
                    key={f.id}
                    className={`td-field-box td-photo-box ${selectedId === f.id ? "selected" : ""}`}
                    style={{
                      left: `${f.xRatio * 100}%`,
                      top: `${f.yRatio * 100}%`,
                      width: `${f.widthRatio * 100}%`,
                      height: `${f.heightRatio * 100}%`,
                      transform: "translate(-50%, -50%)",
                      borderRadius: f.shape === "circle" ? "50%" : `${(f.borderRadius || 0) * 100}%`,
                      border: `2px dashed ${f.borderColor || "#16357e"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(22,53,126,0.05)",
                    }}
                    onMouseDown={(e) => handleFieldMouseDown(e, f)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ImageIcon size={20} color={f.borderColor || "#16357e"} />
                  </div>
                ) : (
                  <React.Fragment key={f.id}>
                    {f.boxed && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${f.xRatio * 100}%`,
                          top: `${f.yRatio * 100}%`,
                          width: `${(f.boxWidthRatio || 0.3) * 100}%`,
                          height: `${(f.boxHeightRatio || 0.08) * 100}%`,
                          transform: "translate(-50%, -50%)",
                          border: "1.5px dashed #999",
                          borderRadius: f.boxBorderRadius ? `${f.boxBorderRadius * 100}%` : 0,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    <div
                      className={`td-field-box ${selectedId === f.id ? "selected" : ""}`}
                      style={{
                        left: `${f.xRatio * 100}%`,
                        top: `${f.yRatio * 100}%`,
                        maxWidth: f.boxed ? `${(f.boxWidthRatio || 0.3) * 100}%` : `${f.maxWidthRatio * 100}%`,
                        fontFamily: f.fontFamily,
                        fontWeight: f.fontWeight,
                        color: f.color,
                        fontSize: renderedWidth ? `${renderedWidth * f.fontSizeRatio}px` : "16px",
                        textAlign: f.align,
                      }}
                      onMouseDown={(e) => handleFieldMouseDown(e, f)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {f.source === "static" ? f.staticText || "(empty)" : `{{${f.dataKey || "field"}}}`}
                    </div>
                  </React.Fragment>
                )
              )}
            </div>
            <label className="td-replace-image">
              <Upload size={14} /> Replace image
              <input type="file" accept="image/*" hidden onChange={handleImageChange} />
            </label>
          </>
        )}

        <div className="td-add-field-row">
          <button className="btn-secondary td-add-field-btn" onClick={addField}>
            <Plus size={16} /> Add Text Field
          </button>
          <button className="btn-secondary td-add-field-btn" onClick={addPhotoField}>
            <ImageIcon size={16} /> Add Photo Field
          </button>
          <button className="btn-secondary td-add-field-btn" onClick={addContainer}>
            <Plus size={16} /> Add Container
          </button>
        </div>
      </div>

      {/* ── Right: field editor ── */}
      <div className="td-editor-panel">
        <h3>
          <Type size={18} /> Fields ({fields.length})
        </h3>

        <div className="td-field-list">
          {fields.map((f) => (
            <div
              key={f.id}
              className={`td-field-list-item ${selectedId === f.id ? "selected" : ""}`}
              onClick={() => setSelectedId(f.id)}
            >
              <span>{f.fieldType === "image" ? "📷 " : ""}{f.label}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteField(f.id); }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* ── Container editor ── */}
        {selectedContainer && (
          <div className="td-field-editor">
            <label>Label</label>
            <input
              type="text"
              value={selectedContainer.label}
              onChange={(e) => updateContainer(selectedContainer.id, { label: e.target.value })}
            />

            <label>Width ({Math.round(selectedContainer.widthRatio * 100)}%)</label>
            <input
              type="range" min="0.05" max="0.95" step="0.01"
              value={selectedContainer.widthRatio}
              onChange={(e) => updateContainer(selectedContainer.id, { widthRatio: parseFloat(e.target.value) })}
            />

            <label>Height ({Math.round(selectedContainer.heightRatio * 100)}%)</label>
            <input
              type="range" min="0.03" max="0.6" step="0.01"
              value={selectedContainer.heightRatio}
              onChange={(e) => updateContainer(selectedContainer.id, { heightRatio: parseFloat(e.target.value) })}
            />

            <label>Corner Rounding ({Math.round((selectedContainer.borderRadius || 0) * 100)}%)</label>
            <input
              type="range" min="0" max="0.1" step="0.005"
              value={selectedContainer.borderRadius || 0}
              onChange={(e) => updateContainer(selectedContainer.id, { borderRadius: parseFloat(e.target.value) })}
            />

            <p style={{ fontSize: 12, opacity: 0.7 }}>
              Drag any text field onto this container's dropdown ("Parent Container") to make it a child — it'll be clipped to this box and wrap instead of overflowing.
            </p>

            <button className="btn-danger" onClick={() => deleteContainer(selectedContainer.id)}>
              <Trash2 size={14} /> Delete Container
            </button>
          </div>
        )}

        {/* ── Photo field editor ── */}

        {/* ── Photo field editor ── */}
        {selectedField && selectedField.fieldType === "image" && (
          <div className="td-field-editor">
            <label>Label (for your reference only)</label>
            <input
              type="text"
              value={selectedField.label}
              onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
            />

            <label>Content Type</label>
            <div className="td-radio-row">
              <label>
                <input
                  type="radio"
                  checked={selectedField.source === "dynamic"}
                  onChange={() => updateField(selectedField.id, { source: "dynamic" })}
                />
                Dynamic (from record)
              </label>
              <label>
                <input
                  type="radio"
                  checked={selectedField.source === "static"}
                  onChange={() => updateField(selectedField.id, { source: "static" })}
                />
                Static image URL
              </label>
            </div>

            {selectedField.source === "dynamic" ? (
              <>
                <label>Data key</label>
                <input
                  type="text"
                  list="data-key-suggestions"
                  value={selectedField.dataKey}
                  placeholder="e.g. photo"
                  onChange={(e) => updateField(selectedField.id, { dataKey: e.target.value })}
                />
              </>
            ) : (
              <>
                <label>Static image URL</label>
                <input
                  type="text"
                  value={selectedField.staticUrl || ""}
                  placeholder="https://..."
                  onChange={(e) => updateField(selectedField.id, { staticUrl: e.target.value })}
                />
              </>
            )}

            <label>Shape</label>
            <select
              value={selectedField.shape}
              onChange={(e) => updateField(selectedField.id, { shape: e.target.value })}
            >
              <option value="square">Square / Rectangle / Rounded</option>
              <option value="circle">Circle</option>
            </select>

            <label>Width ({Math.round(selectedField.widthRatio * 100)}%)</label>
            <input
              type="range"
              min="0.05"
              max="0.6"
              step="0.01"
              value={selectedField.widthRatio}
              onChange={(e) => updateField(selectedField.id, { widthRatio: parseFloat(e.target.value) })}
            />

            <label>Height ({Math.round(selectedField.heightRatio * 100)}%)</label>
            <input
              type="range"
              min="0.05"
              max="0.6"
              step="0.01"
              value={selectedField.heightRatio}
              onChange={(e) => updateField(selectedField.id, { heightRatio: parseFloat(e.target.value) })}
            />

            {selectedField.shape !== "circle" && (
              <>
                <label>Corner Rounding ({Math.round((selectedField.borderRadius || 0) * 100)}%)</label>
                <input
                  type="range"
                  min="0"
                  max="0.1"
                  step="0.005"
                  value={selectedField.borderRadius || 0}
                  onChange={(e) => updateField(selectedField.id, { borderRadius: parseFloat(e.target.value) })}
                />
              </>
            )}

            <label>Border Width</label>
            <input
              type="range"
              min="0"
              max="0.02"
              step="0.001"
              value={selectedField.borderWidth || 0}
              onChange={(e) => updateField(selectedField.id, { borderWidth: parseFloat(e.target.value) })}
            />

            <label>Border Color</label>
            <input
              type="color"
              value={selectedField.borderColor || "#16357e"}
              onChange={(e) => updateField(selectedField.id, { borderColor: e.target.value })}
            />

            <button className="btn-danger" onClick={() => deleteField(selectedField.id)}>
              <Trash2 size={14} /> Delete Field
            </button>
          </div>
        )}

        {/* ── Text field editor (unchanged from your original) ── */}
        {selectedField && selectedField.fieldType !== "image" && (
          <div className="td-field-editor">
            <label>Label (for your reference only)</label>
            <input
              type="text"
              value={selectedField.label}
              onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
            />

            <label>Content Type</label>
            <div className="td-radio-row">
              <label>
                <input
                  type="radio"
                  checked={selectedField.source === "dynamic"}
                  onChange={() => updateField(selectedField.id, { source: "dynamic" })}
                />
                Dynamic (from record)
              </label>
              <label>
                <input
                  type="radio"
                  checked={selectedField.source === "static"}
                  onChange={() => updateField(selectedField.id, { source: "static" })}
                />
                Static text
              </label>
            </div>

            {selectedField.source === "dynamic" ? (
              <>
                <label>Data key</label>
                <input
                  type="text"
                  list="data-key-suggestions"
                  value={selectedField.dataKey}
                  placeholder="e.g. fullName"
                  onChange={(e) => updateField(selectedField.id, { dataKey: e.target.value })}
                />
              </>
            ) : (
              <>
                <label>Static text</label>
                <input
                  type="text"
                  value={selectedField.staticText}
                  onChange={(e) => updateField(selectedField.id, { staticText: e.target.value })}
                />
              </>
            )}

            <label>Font</label>
            <select
              value={selectedField.fontFamily}
              onChange={(e) => updateField(selectedField.id, { fontFamily: e.target.value })}
            >
              {FONT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <label>Font size ({Math.round(selectedField.fontSizeRatio * 1000)}px @ 1000px width)</label>
            <input
              type="range"
              min="0.015"
              max="0.12"
              step="0.005"
              value={selectedField.fontSizeRatio}
              onChange={(e) => updateField(selectedField.id, { fontSizeRatio: parseFloat(e.target.value) })}
            />

            <label>Max width ({Math.round(selectedField.maxWidthRatio * 100)}%)</label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.02"
              value={selectedField.maxWidthRatio}
              onChange={(e) => updateField(selectedField.id, { maxWidthRatio: parseFloat(e.target.value) })}
            />

            <label>Parent Container</label>
            <select
              value={selectedField.containerId || ""}
              onChange={(e) =>
                updateField(selectedField.id, {
                  containerId: e.target.value || null,
                  xRatio: 0.5,
                  yRatio: 0.5,
                })
              }
            >
              <option value="">None (free position)</option>
              {containers.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>

            <label className="td-checkbox-label">
              <input
                type="checkbox"
                checked={!!selectedField.boxed}
                onChange={(e) => updateField(selectedField.id, { boxed: e.target.checked })}
              />
              Constrain to box (prevents overflow into other rows)
            </label>

            {selectedField.boxed && (
              <>
                <label>Box Width ({Math.round((selectedField.boxWidthRatio || 0.3) * 100)}%)</label>
                <input
                  type="range"
                  min="0.05"
                  max="0.9"
                  step="0.01"
                  value={selectedField.boxWidthRatio || 0.3}
                  onChange={(e) => updateField(selectedField.id, { boxWidthRatio: parseFloat(e.target.value) })}
                />

                <label>Box Height ({Math.round((selectedField.boxHeightRatio || 0.08) * 100)}%)</label>
                <input
                  type="range"
                  min="0.02"
                  max="0.5"
                  step="0.01"
                  value={selectedField.boxHeightRatio || 0.08}
                  onChange={(e) => updateField(selectedField.id, { boxHeightRatio: parseFloat(e.target.value) })}
                />

                <label>Box Corner Rounding ({Math.round((selectedField.boxBorderRadius || 0) * 100)}%)</label>
                <input
                  type="range"
                  min="0"
                  max="0.1"
                  step="0.005"
                  value={selectedField.boxBorderRadius || 0}
                  onChange={(e) => updateField(selectedField.id, { boxBorderRadius: parseFloat(e.target.value) })}
                />
              </>
            )}

            <label>Color</label>
            <input
              type="color"
              value={selectedField.color}
              onChange={(e) => updateField(selectedField.id, { color: e.target.value })}
            />

            <label>Weight</label>
            <select
              value={selectedField.fontWeight}
              onChange={(e) => updateField(selectedField.id, { fontWeight: e.target.value })}
            >
              <option value="400">Normal</option>
              <option value="600">Semi-bold</option>
              <option value="700">Bold</option>
            </select>

            <label>Alignment</label>
            <select
              value={selectedField.align}
              onChange={(e) => updateField(selectedField.id, { align: e.target.value })}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>

            <button className="btn-danger" onClick={() => deleteField(selectedField.id)}>
              <Trash2 size={14} /> Delete Field
            </button>
          </div>
        )}

        {/* Shared datalist used by both text and photo Data Key inputs */}
        <datalist id="data-key-suggestions">
          {DATA_KEY_SUGGESTIONS.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>

        <button className="btn-primary td-save-btn" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? "Saving..." : "Save Template"}
        </button>
      </div>
    </div>
  );
};

export default TemplateDesigner;

/*
  Add to services/api.js:

  export const templateAPI = {
    getAll: (category) => api.get("/templates", { params: category ? { category } : {} }),
    getById: (id) => api.get(`/templates/${id}`),
    create: (formData) => api.post("/templates", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
    update: (id, formData) => api.put(`/templates/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
    delete: (id) => api.delete(`/templates/${id}`),
  };
*/