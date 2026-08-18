import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { studentAPI, materialAPI } from "../../services/api";
import { Search, Plus, Package, X, Edit2, Trash2, ArrowLeft, Eye } from "lucide-react";
import "./MaterialIssue.css";

const MaterialIssue = () => {
  const [searchParams] = useSearchParams();

  const [students, setStudents] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [issuesMap, setIssuesMap] = useState({});
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState("");
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [togglingKey, setTogglingKey] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "inventory");
  const [newMaterialUnit, setNewMaterialUnit] = useState("pcs");
  const [newMaterialQty, setNewMaterialQty] = useState(0);
  const [newMaterialDesc, setNewMaterialDesc] = useState("");
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("pcs");
  const [editQty, setEditQty] = useState(0);
  const [editDesc, setEditDesc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [viewingStudentId, setViewingStudentId] = useState(null);

  // ── New: student-form style issue flow ──
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [userName, setUserName] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      return stored?.name || stored?.fullName || stored?.username || stored?.email || "";
    } catch {
      return "";
    }
  });
  const [localChecks, setLocalChecks] = useState({});
  const [submittingIssue, setSubmittingIssue] = useState(false);

  const viewingStudent = useMemo(
  () => students.find((s) => s._id === viewingStudentId) || null,
  [students, viewingStudentId]
);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsRes, materialsRes, issuesRes] = await Promise.all([
        studentAPI.getStudents({ status: "active", limit: 1000 }),
        materialAPI.getMaterials(),
        materialAPI.getIssues(),
      ]);

      const studentList = (studentsRes.data.data || studentsRes.data.students || [])
        .filter((s) => s.status === "active" || s.isActive !== false);

      setStudents(studentList);
      setMaterials(materialsRes.data.data || []);

      const map = {};
      (issuesRes.data.data || []).forEach((issue) => {
        map[`${issue.studentId}_${issue.materialId}`] = issue;
      });
      setIssuesMap(map);
      setError(null);
    } catch (err) {
      console.error("Error loading material issue data:", err);
      setError(err.response?.data?.message || err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

        useEffect(() => {
    fetchData();
  }, []);

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const term = searchTerm.toLowerCase();
    return students.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(term) ||
        s.studentId?.toLowerCase().includes(term) ||
        s.mobileNumber?.includes(searchTerm)
    );
  }, [students, searchTerm]);

  const selectedStudent = useMemo(
    () => students.find((s) => s._id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

    // When a student is picked, seed the checklist from what's already issued to them
  useEffect(() => {
    if (!selectedStudent) {
      setLocalChecks({});
      return;
    }
    const seeded = {};
    materials.forEach((m) => {
      const key = `${selectedStudent._id}_${m._id}`;
      seeded[m._id] = !!issuesMap[key]?.issued;
    });
    setLocalChecks(seeded);
  }, [selectedStudent, materials, issuesMap]);

  // ── Auto-select the student when arriving from a direct link (e.g. AdmissionList "Issue Material") ──
  useEffect(() => {
    if (loading) return;
    if (selectedStudentId) return;
    if (activeTab !== "issue") return;
    const searchParam = searchParams.get("search");
    if (!searchParam) return;

    if (filteredStudents.length === 1) {
      setSelectedStudentId(filteredStudents[0]._id);
    }
  }, [loading, filteredStudents, activeTab, searchParams, selectedStudentId]);

  const handleToggle = async (studentId, materialId, forcedValue) => {
    const key = `${studentId}_${materialId}`;
    const nextIssued = forcedValue !== undefined ? forcedValue : !issuesMap[key]?.issued;

    setIssuesMap((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), studentId, materialId, issued: nextIssued },
    }));
    setTogglingKey(key);

    try {
      const res = await materialAPI.toggleIssue({ studentId, materialId, issued: nextIssued });
      setIssuesMap((prev) => ({ ...prev, [key]: res.data.data }));
    } catch (err) {
      console.error("Error toggling material issue:", err);
      setIssuesMap((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), issued: !nextIssued } }));
      alert("Failed to update. Try again.");
    } finally {
      setTogglingKey(null);
    }
  };

  const handleLocalCheck = (materialId) => {
    setLocalChecks((prev) => ({ ...prev, [materialId]: !prev[materialId] }));
  };

  const handleSubmitIssue = async () => {
    if (!selectedStudent) return;
    setSubmittingIssue(true);
    try {
      const changed = materials.filter((m) => {
        const key = `${selectedStudent._id}_${m._id}`;
        const current = !!issuesMap[key]?.issued;
        return current !== !!localChecks[m._id];
      });

      for (const m of changed) {
        await handleToggle(selectedStudent._id, m._id, !!localChecks[m._id]);
      }

      setSelectedStudentId(null);
      setSearchTerm("");
    } catch (err) {
      alert("Failed to submit material issue");
    } finally {
      setSubmittingIssue(false);
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterialName.trim()) return;
    setSavingMaterial(true);
    try {
      await materialAPI.createMaterial({
        name: newMaterialName.trim(),
        totalQuantity: newMaterialQty,
        unit: newMaterialUnit,
        description: newMaterialDesc,
      });
      setNewMaterialName("");
      setNewMaterialQty(0);
      setNewMaterialUnit("pcs");
      setNewMaterialDesc("");
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add material");
    } finally {
      setSavingMaterial(false);
    }
  };

  const handleEditMaterial = async () => {
    if (!editName.trim()) return;
    setSavingEdit(true);
    try {
      await materialAPI.updateMaterial(editingMaterial._id, {
        name: editName.trim(),
        totalQuantity: editQty,
        unit: editUnit,
        description: editDesc,
      });
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update material");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (!confirm("Delete this material?")) return;
    try {
      await materialAPI.deleteMaterial(id);
      fetchData();
    } catch (err) {
      alert("Failed to delete material");
    }
  };

  const getIssuedCount = (materialId) => {
    return Object.values(issuesMap).filter(
      (i) => String(i.materialId) === String(materialId) && i.issued
    ).length;
  };

  const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    if (isNaN(date)) return String(d);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const getBatchDisplay = (student) => {
    const b = student?.batchTime || student?.batch;
    if (!b) return "—";
    if (typeof b === "string") return b;
    if (typeof b === "object") {
      const name = b.batchName || b.name || "";
      if (b.startTime && b.endTime) {
        return `${name} (${formatTime(b.startTime)} to ${formatTime(b.endTime)})`.trim();
      }
      return name || "—";
    }
    return String(b);
  };

  return (
    <div className="material-issue-container">
      <div className="page-header">
        <div>
          <h1>Material Issue</h1>
          <p>Manage material inventory and issue to active students</p>
        </div>
                {activeTab === "inventory" && (
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Add Material
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: "20px", gap: "4px" }}>
        {[
          { key: "inventory", label: "📦 Inventory" },
          { key: "issue", label: "✅ Issue Materials" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 20px",
              fontWeight: 600,
              fontSize: "14px",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid #3b82f6" : "2px solid transparent",
              color: activeTab === tab.key ? "#3b82f6" : "#6b7280",
              background: "none",
              cursor: "pointer",
              marginBottom: "-2px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-alert">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── INVENTORY TAB ── */}
          {activeTab === "inventory" && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Material Name</th>
                    <th>Description</th>
                    <th>Unit</th>
                    <th>Total Stock</th>
                    <th>Issued</th>
                    <th>Available</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-row">
                        No materials added yet. Click + Add Material.
                      </td>
                    </tr>
                  ) : (
                    materials.map((m, idx) => {
                      const issued = getIssuedCount(m._id);
                      const available = Math.max(0, (m.totalQuantity || 0) - issued);
                      return (
                        <tr key={m._id}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong>{m.name}</strong>
                          </td>
                          <td style={{ color: "#6b7280", fontSize: "13px" }}>{m.description || "—"}</td>
                          <td>{m.unit || "pcs"}</td>
                          <td>{m.totalQuantity || 0}</td>
                          <td style={{ color: "#16a34a", fontWeight: 600 }}>{issued}</td>
                          <td style={{ color: available === 0 ? "#dc2626" : "#1d4ed8", fontWeight: 600 }}>
                            {available}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => {
                                  setEditingMaterial(m);
                                  setEditName(m.name);
                                  setEditUnit(m.unit || "pcs");
                                  setEditQty(m.totalQuantity || 0);
                                  setEditDesc(m.description || "");
                                  setShowEditModal(true);
                                }}
                                style={{
                                  background: "#eff6ff",
                                  border: "none",
                                  borderRadius: "6px",
                                  padding: "5px 10px",
                                  cursor: "pointer",
                                  color: "#3b82f6",
                                }}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteMaterial(m._id)}
                                style={{
                                  background: "#fef2f2",
                                  border: "none",
                                  borderRadius: "6px",
                                  padding: "5px 10px",
                                  cursor: "pointer",
                                  color: "#ef4444",
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── ISSUE MATERIALS TAB ── */}
          {activeTab === "issue" && (
            <>
                            {!selectedStudent ? (
                <>
                  <div className="search-box-horizontal">
                    <Search size={20} />
                    <input
                      type="text"
                      placeholder="Search by name, student ID, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                                                <tr>
                          <th>Student ID</th>
                          <th>Date of Admission</th>
                          <th style={{ textAlign: "left" }}>Student Name</th>
                          <th>Contact</th>
                          <th>Batch</th>
                          <th>Materials Issued</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.length === 0 ? (
                          <tr>
                                                        <td colSpan={7} className="empty-row">No active students found</td>
                          </tr>
                        ) : (
                          filteredStudents.map((student) => {
                            const issuedCount = materials.filter(
                              (m) => issuesMap[`${student._id}_${m._id}`]?.issued
                            ).length;
                            return (
                                                            <tr key={student._id}>
                                <td className="student-id">{student.studentId}</td>
                                <td>{formatDate(student.admissionDate)}</td>
                                <td>
                                  <div className="student-info">
                                    <div className="avatar">{student.fullName ? student.fullName.charAt(0) : "?"}</div>
                                    <div>
                                      <strong>{student.fullName}</strong>
                                    </div>
                                  </div>
                                </td>
                                <td>{student.mobileNumber || "—"}</td>
                                <td>{getBatchDisplay(student)}</td>
                                <td>
                                  {materials.length === 0 ? "—" : `${issuedCount} / ${materials.length}`}
                                </td>
                                                                <td>
                                  <div className="action-buttons">
                                    <button
                                      className="action-btn view"
                                      onClick={() => setViewingStudentId(student._id)}
                                      title="View Materials Status"
                                    >
                                      <Eye size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="issue-form-card">
                                    <button
                    className="issue-back-btn"
                    onClick={() => {
                      setSelectedStudentId(null);
                      setSearchTerm("");
                    }}
                    type="button"
                  >
                    <ArrowLeft size={16} /> Back to students
                  </button>

                  <h3 className="issue-form-title">New Material Issue</h3>

                  <div className="issue-form-row">
                    <div className="issue-form-field">
                      <label>Date of Admission</label>
                      <div className="static-value">{formatDate(selectedStudent.admissionDate)}</div>
                    </div>
                    <div className="issue-form-field">
                      <label>Batch</label>
                      <div className="static-value">{getBatchDisplay(selectedStudent)}</div>
                    </div>
                  </div>

                  <div className="issue-form-row">
                    <div className="issue-form-field">
                      <label>Roll No</label>
                      <div className="static-value">{selectedStudent.studentId}</div>
                    </div>
                    <div className="issue-form-field">
                      <label>Student Name</label>
                      <div className="static-value">{selectedStudent.fullName}</div>
                    </div>
                  </div>

                  <div className="issue-form-row">
                    <div className="issue-form-field">
                      <label>Date Issue Material</label>
                      <input
                        type="date"
                        className="issue-input"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                      />
                    </div>
                    <div className="issue-form-field">
                      <label>User Name</label>
                      <input
                        type="text"
                        className="issue-input issue-input-username"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="e.g. Admin Anil"
                      />
                    </div>
                  </div>

                  <div className="issue-form-field">
                    <label>Item Details</label>
                    <div className="item-checklist">
                      {materials.length === 0 ? (
                        <div className="empty-row">No materials added yet</div>
                      ) : (
                        materials.map((m) => (
                          <label key={m._id} className="item-checkbox-row">
                            <input
                              type="checkbox"
                              checked={!!localChecks[m._id]}
                              onChange={() => handleLocalCheck(m._id)}
                            />
                            <span className="item-checkbox-label">
                              <Package size={14} />
                              <span>{m.name}</span>
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    className="issue-submit-btn"
                    onClick={handleSubmitIssue}
                    disabled={submittingIssue}
                    type="button"
                  >
                    {submittingIssue ? "Submitting..." : "Submit"}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Add New Material</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="form-group">
              <label>Material Name</label>
              <input
                type="text"
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                placeholder="e.g. Bag, Notebook, ID Card"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Total Quantity</label>
              <input
                type="number"
                value={newMaterialQty}
                onChange={(e) => setNewMaterialQty(parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select value={newMaterialUnit} onChange={(e) => setNewMaterialUnit(e.target.value)}>
                {["pcs", "kg", "set", "box", "packet", "roll"].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={newMaterialDesc}
                onChange={(e) => setNewMaterialDesc(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddMaterial} disabled={savingMaterial}>
                {savingMaterial ? "Adding..." : "Add Material"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingMaterial && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Edit Material</h3>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="form-group">
              <label>Material Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Total Quantity</label>
              <input
                type="number"
                value={editQty}
                onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select value={editUnit} onChange={(e) => setEditUnit(e.target.value)}>
                {["pcs", "kg", "set", "box", "packet", "roll"].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleEditMaterial} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

            {viewingStudent && (
        <div className="modal-overlay" onClick={() => setViewingStudentId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Material Status — {viewingStudent.fullName}</h3>
              <button className="close-btn" onClick={() => setViewingStudentId(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="view-student-meta">
              <span><strong>Roll No:</strong> {viewingStudent.studentId}</span>
              <span><strong>Batch:</strong> {getBatchDisplay(viewingStudent)}</span>
            </div>

            <div className="material-status-list">
              {materials.length === 0 ? (
                <div className="empty-row">No materials added yet</div>
              ) : (
                materials.map((m) => {
                  const key = `${viewingStudent._id}_${m._id}`;
                  const issued = !!issuesMap[key]?.issued;
                  const issuedAt = issuesMap[key]?.issuedDate || issuesMap[key]?.updatedAt;
                  return (
                    <div key={m._id} className="material-status-row">
                      <span className="material-status-name">
                        <Package size={14} />
                        {m.name}
                      </span>
                      <span className={`material-status-badge ${issued ? "issued" : "pending"}`}>
                        {issued ? "Issued" : "Pending"}
                      </span>
                      {issued && issuedAt && (
                        <span className="material-status-date">{formatDate(issuedAt)}</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialIssue;