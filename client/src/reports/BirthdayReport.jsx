// pages/reports/BirthdayReport.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Download,
  Phone,
  Calendar,
  MessageCircle,
  AlertCircle,
  Gift,
  GraduationCap,
  Briefcase,
  CalendarDays,
  Users,
  Cake,
} from "lucide-react";
import "./ReportList.css";
import { reportAPI } from "../services/api";
import DynamicCardModal from "../components/dynamic-templates/DynamicCardModal";
import { templateAPI } from "../services/api";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-GB");
};

const BirthdayReport = () => {
  const todayStr = new Date().toISOString().split("T")[0];

  const [data, setData] = useState({ students: [], faculty: [] });
  const [filtered, setFiltered] = useState([]);
  const [upcomingWeekCount, setUpcomingWeekCount] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all | student | faculty
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [useRange, setUseRange] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Person currently shown in the birthday card modal (null = closed)
  const [birthdayTemplateId, setBirthdayTemplateId] = useState(null);

useEffect(() => {
  templateAPI.getAll("birthday").then((res) => {
    const templates = res.data.templates || [];
    if (templates.length > 0) setBirthdayTemplateId(templates[0]._id);
  }).catch((err) => console.error("Failed to load birthday template:", err));
}, []);

  // ── Fetch ───────────────────────────────────────────────────────────────
  const fetchBirthdays = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = { type: typeFilter };
      if (searchTerm) queryParams.search = searchTerm;

      if (useRange && dateRange.startDate && dateRange.endDate) {
        queryParams.startDate = dateRange.startDate;
        queryParams.endDate = dateRange.endDate;
      } else {
        queryParams.date = selectedDate;
      }

      const res = await reportAPI.getBirthdays(queryParams);
      const json = res.data;
      if (!json.success) throw new Error(json.message || "Failed to load");

      setData({ students: json.students || [], faculty: json.faculty || [] });
      setUpcomingWeekCount(json.upcomingWeekCount || 0);

      // Build combined list for table
      const studentRows = (json.students || []).map((s) => ({
        id: s._id,
        type: "student",
        displayName: s.fullName || s.applicantName || "N/A",
        admissionNo: s.admissionNo,
        phone: s.mobileNumber,
        role: s.course || "N/A",
        dateOfBirth: s.dateOfBirth,
        email: s.email,
        status: s.status,
      }));

      const facultyRows = (json.faculty || []).map((f) => ({
        id: f._id,
        type: "faculty",
        displayName: f.facultyName || f.name || f.fullName || "N/A",
        phone: f.mobileNo || f.whatsappNo || f.mobileNumber || f.contactNo || "N/A",
        role: "Faculty",
        dateOfBirth: f.dateOfBirth,
        email: f.email,
        photo: f.photo,
      }));

      const combined = [...studentRows, ...facultyRows];
      setFiltered(combined);
    } catch (err) {
      console.error("Birthday fetch error:", err);
      setError(err.message || "Failed to load birthday report");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, useRange, dateRange, typeFilter, searchTerm]);

  useEffect(() => {
    fetchBirthdays();
  }, [fetchBirthdays]);

  // ── Local search filter ──────────────────────────────────────────────────
  useEffect(() => {
    const allRows = [
      ...data.students.map((s) => ({
        id: s._id,
        type: "student",
        displayName: s.fullName || s.applicantName || "N/A",
        admissionNo: s.admissionNo,
        phone: s.mobileNumber,
        role: s.course || "N/A",
        dateOfBirth: s.dateOfBirth,
      })),
      ...data.faculty.map((f) => ({
        id: f._id,
        type: "faculty",
        displayName: f.facultyName || f.name || f.fullName || "N/A",
        phone: f.mobileNo || f.whatsappNo || f.mobileNumber || f.contactNo || "N/A",
        role: "Faculty",
        dateOfBirth: f.dateOfBirth,
      })),
    ];

    if (!searchTerm.trim()) {
      setFiltered(allRows);
      return;
    }
    const q = searchTerm.toLowerCase();
    setFiltered(
      allRows.filter(
        (p) =>
          p.displayName?.toLowerCase().includes(q) ||
          p.phone?.includes(searchTerm) ||
          p.admissionNo?.toLowerCase().includes(q)
      )
    );
  }, [searchTerm, data]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getWhatsAppLink = (phone, name) => {
    if (!phone || phone === "N/A") return null;
    const cleanNumber = phone.replace(/\D/g, "");
    if (cleanNumber.length < 10) return null;
    const message = `🎂 Happy Birthday ${name || ""}! 🎉\n\nWishing you a day filled with joy, happiness, and success! May this special year bring you new opportunities and wonderful memories. 🌟\n\nBest wishes,\nIIT Computer Institute, Rishikesh`;
    return `https://wa.me/91${cleanNumber}?text=${encodeURIComponent(message)}`;
  };

  const isToday = selectedDate === todayStr && !useRange;

  const getPageDescription = () => {
    if (isToday) return "Today's birthdays — students & faculty";
    if (useRange && dateRange.startDate && dateRange.endDate)
      return `Birthdays from ${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}`;
    return `Birthdays on ${formatDate(selectedDate)}`;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="admission-list-container">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1>Birthday Report</h1>
          <p>{getPageDescription()}</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => alert("Export coming soon!")}>
            <Download size={18} />
            Export List
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Loading birthdays...</p>
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="error-alert">
          <AlertCircle size={20} />
          <div>
            <strong>Error loading birthday report:</strong>
            <p>{error}</p>
          </div>
          <button onClick={fetchBirthdays} className="btn-retry">
            Retry
          </button>
        </div>
      )}

      {/* ── Stats Cards ── */}
      {!loading && !error && (
        <div className="stats-cards">
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ background: "#fff0f0", color: "#e53935" }}
            >
              <Gift size={24} />
            </div>
            <div>
              <h3>{filtered.length}</h3>
              <p>{isToday ? "Today's Birthdays" : "Total Found"}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-blue-100 text-blue-600">
              <GraduationCap size={24} />
            </div>
            <div>
              <h3>{data.students.length}</h3>
              <p>Students</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-purple-100 text-purple-600">
              <Briefcase size={24} />
            </div>
            <div>
              <h3>{data.faculty.length}</h3>
              <p>Faculty</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-green-100 text-green-600">
              <CalendarDays size={24} />
            </div>
            <div>
              <h3>{upcomingWeekCount}</h3>
              <p>This Week</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      {!loading && !error && (
        <div className="filters-section-horizontal">
          {/* Search */}
          <div className="search-box-horizontal">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by name, phone, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date input(s) */}
          {!useRange ? (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="br-date-input"
            />
          ) : (
            <>
              <input
                type="date"
                value={dateRange.startDate}
                placeholder="From"
                max={dateRange.endDate || undefined}
                onChange={(e) =>
                  setDateRange((p) => ({ ...p, startDate: e.target.value }))
                }
                className="br-date-input"
              />
              <input
                type="date"
                value={dateRange.endDate}
                placeholder="To"
                min={dateRange.startDate || undefined}
                onChange={(e) =>
                  setDateRange((p) => ({ ...p, endDate: e.target.value }))
                }
                className="br-date-input"
              />
            </>
          )}

          {/* Quick: Today */}
          <button
            className="quick-date-btn"
            style={{
              background: isToday ? "#e3f2fd" : "#fff",
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: isToday ? 600 : 400,
            }}
            onClick={() => {
              setSelectedDate(todayStr);
              setUseRange(false);
            }}
          >
            Today
          </button>

          {/* Toggle range */}
          <button
            className="quick-date-btn"
            style={{
              background: useRange ? "#e8eaf6" : "#fff",
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: useRange ? 600 : 400,
            }}
            onClick={() => setUseRange((r) => !r)}
          >
            {useRange ? "Single Date" : "Date Range"}
          </button>

          {/* Type filter */}
          <div className="filter-select-horizontal">
            <Users size={16} />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="student">Students Only</option>
              <option value="faculty">Faculty Only</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Type</th>
              <th>Contact</th>
              <th>Date of Birth</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && !error && filtered.length > 0 ? (
              filtered.map((person, idx) => (
                <tr key={`${person.type}-${person.id}`}>
                  <td style={{ color: "#999", fontSize: 13 }}>{idx + 1}</td>

                  {/* Name + ID */}
                  <td>
                    <div className="student-info">
                      <div
                        className="avatar"
                        style={{
                          background:
                            person.type === "faculty" ? "#e8eaf6" : "#e8f5e9",
                          color:
                            person.type === "faculty" ? "#3949ab" : "#388e3c",
                        }}
                      >
                        {person.displayName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <strong>{person.displayName}</strong>
                        {person.type === "student" && person.admissionNo && (
                          <small>{person.admissionNo}</small>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Type badge */}
                  <td>
                    {person.type === "student" ? (
                      <span className="admission-status-badge bg-green-100 text-green-800">
                        <GraduationCap size={12} />
                        Student
                      </span>
                    ) : (
                      <span className="admission-status-badge bg-purple-100 text-purple-800">
                        <Briefcase size={12} />
                        Faculty
                      </span>
                    )}
                  </td>

                  {/* Contact */}
                  <td>
                    <div className="contact-info">
                      <div>
                        <Phone size={14} /> {person.phone || "N/A"}
                      </div>
                    </div>
                  </td>

                  {/* DOB */}
                  <td>
                    <div className="date-info">
                      <Calendar size={14} />
                      {formatDate(person.dateOfBirth)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="action-buttons">
                      {getWhatsAppLink(person.phone, person.displayName) ? (
                        <a
                          href={getWhatsAppLink(person.phone, person.displayName)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Send Birthday Wish on WhatsApp"
                          style={{
                            background: "#e8f5e9",
                            border: "1px solid #4caf50",
                            borderRadius: 6,
                            padding: "5px 8px",
                            display: "inline-flex",
                            alignItems: "center",
                            color: "#2e7d32",
                            textDecoration: "none",
                          }}
                        >
                          <MessageCircle size={16} />
                        </a>
                      ) : (
                        <span
                          title="No number available"
                          style={{
                            background: "#f5f5f5",
                            border: "1px solid #ddd",
                            borderRadius: 6,
                            padding: "5px 8px",
                            display: "inline-flex",
                            alignItems: "center",
                            color: "#bbb",
                            cursor: "not-allowed",
                          }}
                        >
                          <MessageCircle size={16} />
                        </span>
                      )}

                      {/* Birthday card button */}
                      <button
  title="Generate Birthday Card"
  onClick={() => {
    if (!birthdayTemplateId) {
      alert("No birthday template saved yet — create one in Template Designer first.");
      return;
    }
    setCardPerson(person);
  }}
                        style={{
                          background: "#fff3e0",
                          border: "1px solid #ff9800",
                          borderRadius: 6,
                          padding: "5px 8px",
                          display: "inline-flex",
                          alignItems: "center",
                          color: "#e65100",
                          cursor: "pointer",
                          marginLeft: 6,
                        }}
                      >
                        <Cake size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-row">
                  <div className="empty-state">
                    <Gift size={48} />
                    <h3>No birthdays found</h3>
                    <p>
                      {loading
                        ? "Loading..."
                        : isToday
                        ? "No birthdays today 🎂"
                        : "No birthdays on this date"}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Birthday Card Modal ── */}
      {cardPerson && birthdayTemplateId && (
  <DynamicCardModal
    templateId={birthdayTemplateId}
    data={{
      fullName: cardPerson.displayName,
      admissionNo: cardPerson.admissionNo,
      phone: cardPerson.phone,
      dateOfBirth: cardPerson.dateOfBirth,
    }}
    fileName={`Birthday-${cardPerson.displayName}`}
    onClose={() => setCardPerson(null)}
  />
)}
    </div>
  );
};

export default BirthdayReport;