// components/layout/FacultyLayout.jsx
import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import FacultySidebar from './FacultySidebar';
import Navbar from './Navbar';
import './AdminLayout.css'; // reuse same CSS

const FacultyLayout = () => {
  // Auth guard - check if logged in and is faculty/instructor
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (user.role !== 'faculty' && user.role !== 'instructor') {
      return <Navigate to="/login" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="admin-layout">
      <FacultySidebar />
      <div className="main-content">
        <Navbar />
        <div className="content-wrapper">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default FacultyLayout;