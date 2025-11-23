import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Upload, Search, Users, Download, Settings, LogOut } from 'lucide-react';

const Navbar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/import', label: 'Import', icon: Upload },
    { path: '/review', label: 'Review', icon: Search },
    { path: '/suppliers', label: 'Suppliers', icon: Users },
    { path: '/export', label: 'Export', icon: Download },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          🏨 Hotel Mapping System
        </Link>
        
        <ul className="navbar-menu">
          {navItems.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <Link 
                to={path} 
                className={`navbar-link ${location.pathname === path ? 'active' : ''}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <button className="btn btn-secondary btn-sm">
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
