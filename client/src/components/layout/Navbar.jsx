// components/layout/Navbar.jsx
import React from 'react';
import { Menu } from 'lucide-react';
import FlipClock from './FlipClock';
import './Navbar.css';

const Navbar = ({ onMenuToggle }) => {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="navbar-hamburger" onClick={onMenuToggle} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <h2>Atlas - IIT Computer Institute</h2>
      </div>
      <div className="navbar-right">
        <FlipClock />
      </div>
    </nav>
  );
};

export default Navbar;