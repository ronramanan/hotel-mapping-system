import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Dashboard from './components/Dashboard';
import ImportHotel from './components/ImportHotel';
import ReviewQueue from './components/ReviewQueue';
import MasterHotels from './components/MasterHotels';
import DatabaseInit from './components/DatabaseInit';
import BulkImport from './components/BulkImport';

function App() {
  return (
    <Router>
      
      
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-brand">
              🏨 Hotel Mapping System
            </Link>
            <div className="nav-links">
              <Link to="/" className="nav-link">Dashboard</Link>
              <Link to="/import" className="nav-link">Import Hotels</Link>
              <Link to="/review" className="nav-link">Review Queue</Link>
              <Link to="/masters" className="nav-link">Master Hotels</Link>
              <Link to="/bulk-import-supplier">Bulk Import Suppliers</Link>
              <Link to="/bulk-import-master">Bulk Import Masters</Link>
              <Link to="/admin" className="nav-link">Admin</Link>
            </div>
          </div>
        </nav>

        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/import" element={<ImportHotel />} />
            <Route path="/review" element={<ReviewQueue />} />
            <Route path="/masters" element={<MasterHotels />} />
            <Route path="/admin" element={<DatabaseInit />} />
            <Route path="/bulk-import-supplier" element={<BulkImport type="supplier" />} />
            <Route path="/bulk-import-master" element={<BulkImport type="master" />} />
          </Routes>
        </div>

        <footer className="footer">
          <p>Hotel Mapping System v1.0 | Built for AWS Amplify</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
