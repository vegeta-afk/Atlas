import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { studentAPI, materialAPI } from "../../services/api";
import { Search, Plus, Package, X } from "lucide-react";
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
      await materialAPI.createMaterial({ name: newMaterialName.trim() });
      setNewMaterialName("");
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add material");
    } finally {
      setSavingMaterial(false);
    }
  };

  return (
    <div className="material-issue-container">
      <div className="page-header">
        <div>
          <h1>Material Issue</h1>
          <p>Issue bags, notebooks, and other material to active students</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          Add Material
        </button>
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

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Add New Material</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
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
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAddMaterial} disabled={savingMaterial}>
                {savingMaterial ? "Adding..." : "Add Material"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialIssue;