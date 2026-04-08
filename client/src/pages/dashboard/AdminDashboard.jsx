// pages/dashboard/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';
import {
  Users,
  UserCircle,
  BookOpen,
  Calendar,
  Bell,
  TrendingUp,
  MoreVertical,
  IndianRupee,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalCourses: 0,
    totalAdmissions: 0,
  });

  const [genderData, setGenderData] = useState({ male: 0, female: 0, other: 0 });
  const [attendanceData, setAttendanceData] = useState([]);
  const [feeStats, setFeeStats] = useState({ collected: 0, pending: 0 });
  const [recentAdmissions, setRecentAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setAdminName(user.fullName || user.name || 'Admin');
      } catch {}
    }
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();

      const [studentsRes, facultyRes, admissionsRes, coursesRes] = await Promise.allSettled([
        fetch(`${API_URL}/students`, { headers }),
        fetch(`${API_URL}/faculty/stats/dashboard`, { headers }),
        fetch(`${API_URL}/admissions/stats/dashboard`, { headers }),
        fetch(`${API_URL}/courses/stats/summary`, { headers }),
      ]);

      // ── Students ──────────────────────────────────────────
      if (studentsRes.status === 'fulfilled' && studentsRes.value.ok) {
        const data = await studentsRes.value.json();
        if (data.success) {
          const students = data.data || [];
          const male   = students.filter(s => s.gender === 'male').length;
          const female = students.filter(s => s.gender === 'female').length;
          const other  = students.filter(s => s.gender === 'other').length;
          setGenderData({ male, female, other });

          // Fee stats from student data
          const collected = students.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
          const pending   = students.reduce((sum, s) => sum + (s.balanceAmount || 0), 0);
          setFeeStats({ collected, pending });

          setStats(prev => ({ ...prev, totalStudents: students.length }));
        }
      }

      // ── Faculty ───────────────────────────────────────────
      if (facultyRes.status === 'fulfilled' && facultyRes.value.ok) {
        const data = await facultyRes.value.json();
        if (data.success) {
          setStats(prev => ({
            ...prev,
            totalFaculty: data.data?.totalFaculty || data.data?.total || 0,
          }));
        }
      }

      // ── Admissions ────────────────────────────────────────
      if (admissionsRes.status === 'fulfilled' && admissionsRes.value.ok) {
        const data = await admissionsRes.value.json();
        if (data.success) {
          setStats(prev => ({
            ...prev,
            totalAdmissions: data.data?.total || data.data?.totalAdmissions || 0,
          }));
          // Recent admissions for notice board
          const recent = data.data?.recentAdmissions || [];
          setRecentAdmissions(recent.slice(0, 4));
        }
      }

      // ── Courses ───────────────────────────────────────────
      if (coursesRes.status === 'fulfilled' && coursesRes.value.ok) {
        const data = await coursesRes.value.json();
        if (data.success) {
          setStats(prev => ({
            ...prev,
            totalCourses: data.data?.totalCourses || data.data?.total || 0,
          }));
        }
      }

      // ── Attendance (week) ─────────────────────────────────
      buildWeekAttendance();

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load some dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const buildWeekAttendance = async () => {
    // Build last 6 days labels
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push({ day: days[d.getDay()], present: 0, date: d });
    }
    setAttendanceData(result);
  };

  const totalGender = genderData.male + genderData.female + genderData.other;
  const malePct   = totalGender ? Math.round((genderData.male   / totalGender) * 100) : 0;
  const femalePct = totalGender ? Math.round((genderData.female / totalGender) * 100) : 0;

  const today = new Date();
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];

  const calendarDays = Array.from({ length: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const blanks = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 });

  const formatCurrency = (amount) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000)   return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#64748b' }}>Loading dashboard...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>IMS Dashboard</h1>
          <p>Welcome back, {adminName}! {lastUpdated && <span style={{ fontSize: 12, color: '#94a3b8' }}>Updated {lastUpdated.toLocaleTimeString()}</span>}</p>
        </div>
        <div className="header-right">
          <button className="notification-btn" onClick={fetchAllData} title="Refresh">
            <RefreshCw size={20} />
          </button>
          <button className="notification-btn">
            <Bell size={22} />
            <span className="badge">!</span>
          </button>
          <button className="profile-btn">
            <UserCircle size={22} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Main Content */}
      <div className="dashboard-content">
        {/* ── Left Column ── */}
        <div className="left-column">

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#4f46e5' }}>
                <GraduationCap size={24} />
              </div>
              <div className="stat-info">
                <h3>{stats.totalStudents.toLocaleString()}</h3>
                <p>Total Students</p>
              </div>
              <MoreVertical className="more-icon" />
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#10b981' }}>
                <Users size={24} />
              </div>
              <div className="stat-info">
                <h3>{stats.totalFaculty.toLocaleString()}</h3>
                <p>Faculty</p>
              </div>
              <MoreVertical className="more-icon" />
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#f59e0b' }}>
                <BookOpen size={24} />
              </div>
              <div className="stat-info">
                <h3>{stats.totalCourses.toLocaleString()}</h3>
                <p>Courses</p>
              </div>
              <MoreVertical className="more-icon" />
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#8b5cf6' }}>
                <Calendar size={24} />
              </div>
              <div className="stat-info">
                <h3>{stats.totalAdmissions.toLocaleString()}</h3>
                <p>Admissions</p>
              </div>
              <MoreVertical className="more-icon" />
            </div>
          </div>

          {/* Fee Collection Card */}
          <div className="analytics-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Fee Collection</h3>
              <IndianRupee size={20} color="#4f46e5" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '16px 20px', border: '1px solid #bbf7d0' }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, color: '#16a34a' }}>Total Collected</p>
                <h2 style={{ margin: 0, fontSize: 28, color: '#15803d', fontWeight: 700 }}>{formatCurrency(feeStats.collected)}</h2>
              </div>
              <div style={{ background: '#fff7ed', borderRadius: 12, padding: '16px 20px', border: '1px solid #fed7aa' }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, color: '#ea580c' }}>Pending Balance</p>
                <h2 style={{ margin: 0, fontSize: 28, color: '#c2410c', fontWeight: 700 }}>{formatCurrency(feeStats.pending)}</h2>
              </div>
            </div>
            {/* Collection progress bar */}
            {(feeStats.collected + feeStats.pending) > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  <span>Collection Rate</span>
                  <span>{Math.round((feeStats.collected / (feeStats.collected + feeStats.pending)) * 100)}%</span>
                </div>
                <div style={{ background: '#e2e8f0', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 99,
                    background: 'linear-gradient(90deg, #4f46e5, #10b981)',
                    width: `${Math.round((feeStats.collected / (feeStats.collected + feeStats.pending)) * 100)}%`,
                    transition: 'width 0.8s ease'
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="help-center">
            <h3>Quick Actions</h3>
            <p>Manage your institute</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              {[
                { label: '+ New Admission', href: '/admin/admissions/new', color: '#4f46e5' },
                { label: '👥 View Students', href: '/admin/students', color: '#10b981' },
                { label: '📋 Attendance',    href: '/admin/attendance', color: '#f59e0b' },
                { label: '💰 Fee Report',    href: '/admin/fees', color: '#8b5cf6' },
              ].map(({ label, href, color }) => (
                <a key={label} href={href} style={{
                  display: 'block', padding: '10px 14px', background: color + '15',
                  borderRadius: 10, color, fontWeight: 600, fontSize: 13,
                  textDecoration: 'none', textAlign: 'center', border: `1px solid ${color}30`,
                  transition: 'background 0.2s'
                }}>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="right-column">

          {/* Gender Distribution */}
          <div className="gender-card">
            <h3>Students by Gender</h3>
            <div className="gender-stats">
              <div className="gender-item">
                <div className="gender-label">
                  <span className="dot" style={{ backgroundColor: '#3b82f6' }}></span>
                  <span>Male</span>
                </div>
                <span className="gender-count">{genderData.male} ({malePct}%)</span>
              </div>
              <div className="gender-item">
                <div className="gender-label">
                  <span className="dot" style={{ backgroundColor: '#ec4899' }}></span>
                  <span>Female</span>
                </div>
                <span className="gender-count">{genderData.female} ({femalePct}%)</span>
              </div>
              {genderData.other > 0 && (
                <div className="gender-item">
                  <div className="gender-label">
                    <span className="dot" style={{ backgroundColor: '#8b5cf6' }}></span>
                    <span>Other</span>
                  </div>
                  <span className="gender-count">{genderData.other}</span>
                </div>
              )}
            </div>
            {totalGender > 0 ? (
              <div className="gender-chart">
                <div className="chart-bar" style={{ width: `${malePct}%`, backgroundColor: '#3b82f6' }}>
                  {malePct > 10 ? `${malePct}%` : ''}
                </div>
                <div className="chart-bar" style={{ width: `${femalePct}%`, backgroundColor: '#ec4899' }}>
                  {femalePct > 10 ? `${femalePct}%` : ''}
                </div>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>No student data yet</p>
            )}
          </div>

          {/* Attendance this week */}
          <div className="attendance-card">
            <h3>This Week</h3>
            <div className="attendance-grid">
              {attendanceData.map((item, index) => (
                <div key={index} className="attendance-day" style={{
                  background: item.date?.toDateString() === today.toDateString() ? '#eef2ff' : '#f8fafc',
                  border: item.date?.toDateString() === today.toDateString() ? '1px solid #c7d2fe' : '1px solid transparent'
                }}>
                  <div className="attendance-count" style={{ color: item.present > 0 ? '#4f46e5' : '#94a3b8' }}>
                    {item.present > 0 ? item.present : '—'}
                  </div>
                  <div className="attendance-label">{item.day}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 10, textAlign: 'center' }}>
              Live attendance data from teacher marks
            </p>
          </div>

          {/* Recent Admissions / Notice Board */}
          <div className="notice-card">
            <div className="card-header">
              <h3>Recent Admissions</h3>
              <a href="/admin/admissions" className="view-all">View All</a>
            </div>
            <div className="notice-list">
              {recentAdmissions.length > 0 ? recentAdmissions.map((admission, index) => (
                <div key={index} className="notice-item">
                  <div className="notice-content">
                    <h4>{admission.fullName || admission.name}</h4>
                    <span className="notice-date">
                      {admission.course} · {admission.admissionDate
                        ? new Date(admission.admissionDate).toLocaleDateString('en-IN')
                        : new Date(admission.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
              )) : (
                <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '10px 0' }}>
                  No recent admissions
                </p>
              )}
            </div>
          </div>

          {/* Calendar */}
          <div className="calendar-card">
            <div className="calendar-header">
              <h3>Calendar</h3>
              <span>{monthNames[today.getMonth()]} {today.getFullYear()}</span>
            </div>
            <div className="calendar-weekdays">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                <div key={d} className="weekday">{d}</div>
              ))}
            </div>
            <div className="calendar-days">
              {blanks.map((_, i) => <div key={`b${i}`} />)}
              {calendarDays.map(day => (
                <div
                  key={day}
                  className={`calendar-day ${day === today.getDate() ? 'event-day' : ''}`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;