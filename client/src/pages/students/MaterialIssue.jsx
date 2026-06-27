import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { studentAPI, materialAPI } from "../../services/api";
import { Search, Plus, Package, X, Edit2, Trash2, BarChart2 } from "lucide-react";
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
const [activeTab, setActiveTab] = useState("inventory");
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

  const handleToggle = async (studentId, materialId) => {
    const key = `${studentId}_${materialId}`;
    const nextIssued = !issuesMap[key]?.issued;

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

  const handleAddMaterial = async () => {
    if (!newMaterialName.trim()) return;
    setSavingMaterial(true);
    try {
      await materialAPI.createMaterial({
  name: newMaterialName.trim(),
  totalQuantity: newMaterialQty,
  unit: newMaterialUnit,
  description: newMaterialDesc
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
      description: editDesc
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
    i => String(i.materialId) === String(materialId) && i.issued
  ).length;
};

  return (
    <div className="material-issue-container">
      <div className="page-header">
  <div>
    <h1>Material Issue</h1>
    <p>Manage material inventory and issue to active students</p>
  </div>
  <button className="btn-primary" onClick={() => setShowAddModal(true)}>
    <Plus size={18} />
    Add Material
  </button>
</div>

{/* Tabs */}
<div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '20px', gap: '4px' }}>
  {[
    { key: 'inventory', label: '📦 Inventory' },
    { key: 'issue', label: '✅ Issue Materials' }
  ].map(tab => (
    <button
      key={tab.key}
      onClick={() => setActiveTab(tab.key)}
      style={{
        padding: '10px 20px',
        fontWeight: 600,
        fontSize: '14px',
        border: 'none',
        borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
        color: activeTab === tab.key ? '#3b82f6' : '#6b7280',
        background: 'none',
        cursor: 'pointer',
        marginBottom: '-2px'
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

      {error && !loading && <div className="error-alert"><p>{error}</p></div>}

      {!loading && !error && (
  <>
    {/* ── INVENTORY TAB ── */}
    {activeTab === 'inventory' && (
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
              <tr><td colSpan={8} className="empty-row">No materials added yet. Click + Add Material.</td></tr>
            ) : (
              materials.map((m, idx) => {
                const issued = getIssuedCount(m._id);
                const available = Math.max(0, (m.totalQuantity || 0) - issued);
                return (
                  <tr key={m._id}>
                    <td>{idx + 1}</td>
                    <td><strong>{m.name}</strong></td>
                    <td style={{ color: '#6b7280', fontSize: '13px' }}>{m.description || '—'}</td>
                    <td>{m.unit || 'pcs'}</td>
                    <td>{m.totalQuantity || 0}</td>
                    <td style={{ color: '#16a34a', fontWeight: 600 }}>{issued}</td>
                    <td style={{ color: available === 0 ? '#dc2626' : '#1d4ed8', fontWeight: 600 }}>{available}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setEditingMaterial(m);
                            setEditName(m.name);
                            setEditUnit(m.unit || 'pcs');
                            setEditQty(m.totalQuantity || 0);
                            setEditDesc(m.description || '');
                            setShowEditModal(true);
                          }}
                          style={{ background: '#eff6ff', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', color: '#3b82f6' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(m._id)}
                          style={{ background: '#fef2f2', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', color: '#ef4444' }}
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
    {activeTab === 'issue' && (
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
          <table className="data-table material-table">
            <thead>
              <tr>
                <th className="sticky-col">Student</th>
                {materials.map((m) => (
                  <th key={m._id} className="material-col">
                    <Package size={14} /> {m.name}
                  </th>
                ))}
                {materials.length === 0 && <th>No materials added yet</th>}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student._id}>
                    <td className="sticky-col">
                      <div className="student-info">
                        <div className="avatar">{student.fullName ? student.fullName.charAt(0) : "?"}</div>
                        <div>
                          <strong>{student.fullName}</strong>
                          <small>{student.studentId}</small>
                        </div>
                      </div>
                    </td>
                    {materials.map((m) => {
                      const key = `${student._id}_${m._id}`;
                      const isIssued = !!issuesMap[key]?.issued;
                      return (
                        <td key={m._id} className="checkbox-cell">
                          <input
                            type="checkbox"
                            checked={isIssued}
                            disabled={togglingKey === key}
                            onChange={() => handleToggle(student._id, m._id)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={materials.length + 1} className="empty-row">No active students found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    )}
  </>
)}

      {showAddModal && (
        <div className="modal-overlay">
  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Add New Material</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <div className="form-group">
  <label>Material Name</label>
  <input type="text" value={newMaterialName} onChange={e => setNewMaterialName(e.target.value)} placeholder="e.g. Bag, Notebook, ID Card" autoFocus />
</div>
<div className="form-group">
  <label>Total Quantity</label>
  <input type="number" value={newMaterialQty} onChange={e => setNewMaterialQty(parseInt(e.target.value) || 0)} min="0" />
</div>
<div className="form-group">
  <label>Unit</label>
  <select value={newMaterialUnit} onChange={e => setNewMaterialUnit(e.target.value)}>
    {['pcs', 'kg', 'set', 'box', 'packet', 'roll'].map(u => <option key={u}>{u}</option>)}
  </select>
</div>
<div className="form-group">
  <label>Description</label>
  <input type="text" value={newMaterialDesc} onChange={e => setNewMaterialDesc(e.target.value)} placeholder="Optional" />
</div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAddMaterial} disabled={savingMaterial}>
                {savingMaterial ? "Adding..." : "Add Material"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingMaterial && (
  <div className="modal-overlay">
  <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header-row">
        <h3>Edit Material</h3>
        <button className="close-btn" onClick={() => setShowEditModal(false)}><X size={18} /></button>
      </div>
      <div className="form-group">
        <label>Material Name</label>
        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Total Quantity</label>
        <input type="number" value={editQty} onChange={e => setEditQty(parseInt(e.target.value) || 0)} min="0" />
      </div>
      <div className="form-group">
        <label>Unit</label>
        <select value={editUnit} onChange={e => setEditUnit(e.target.value)}>
          {['pcs', 'kg', 'set', 'box', 'packet', 'roll'].map(u => <option key={u}>{u}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Description</label>
        <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Optional" />
      </div>
      <div className="modal-actions">
        <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
        <button className="btn-primary" onClick={handleEditMaterial} disabled={savingEdit}>
          {savingEdit ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default MaterialIssue;