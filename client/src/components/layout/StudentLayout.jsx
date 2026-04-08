import React from 'react';
import { Outlet } from 'react-router-dom';
import StudentSidebar from './StudentSidebar';
import Navbar from './Navbar';
import './AdminLayout.css'; // reuse same CSS

const StudentLayout = () => {
  return (
    <div className="admin-layout">
      <StudentSidebar />
      <div className="main-content">
        <Navbar />
        <div className="content-wrapper">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default StudentLayout;