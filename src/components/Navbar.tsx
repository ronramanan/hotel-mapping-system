import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('authTime');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>🏨 Hotel Mapping System</h1>
        </div>
        
        <div className="navbar-menu">
          <Link to="/" className="nav-link">Dashboard</Link>
          <Link to="/bulk-import-master" className="nav-link">Import Masters</Link>
          <Link to="/bulk-import-supplier" className="nav-link">Import Suppliers</Link>
          <Link to="/reviews" className="nav-link">Pending Reviews</Link>
          <Link to="/review" className="nav-link">Review Matches</Link>
          <Link to="/export" className="nav-link">Export</Link>
          
          <button onClick={handleLogout} className="logout-button">
            🚪 Logout
          </button>
        </div>
      </div>

      <style>{`
        .navbar {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 15px 0;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .navbar-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
        }

        .navbar-brand h1 {
          margin: 0;
          color: white;
          font-size: 24px;
          font-weight: bold;
        }

        .navbar-menu {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .nav-link {
          color: white;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 6px;
          transition: background 0.3s;
          font-weight: 500;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .logout-button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid white;
          padding: 8px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
          font-size: 14px;
        }

        .logout-button:hover {
          background: white;
          color: #667eea;
        }

        @media (max-width: 768px) {
          .navbar-container {
            flex-direction: column;
          }
          
          .navbar-menu {
            width: 100%;
            justify-content: center;
          }
          
          .nav-link {
            font-size: 14px;
            padding: 6px 12px;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
