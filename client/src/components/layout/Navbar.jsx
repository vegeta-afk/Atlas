// components/layout/Navbar.jsx
import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import './Navbar.css';

const Navbar = ({ onMenuToggle }) => {
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.fullName || user.name || user.email || 'User');
        setUserRole(user.role || '');
      } catch {
        setUserName('User');
      }
    }
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {/* Hamburger — only visible on mobile */}
        <button className="navbar-hamburger" onClick={onMenuToggle} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <h2>IMS Dashboard</h2>
      </div>
      <div className="navbar-right">
        <div className="user-profile">
          <span>{userName}</span>
          {userRole && (
            <span style={{ fontSize: '11px', color: '#888', marginLeft: '6px', textTransform: 'capitalize' }}>
              ({userRole})
            </span>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;