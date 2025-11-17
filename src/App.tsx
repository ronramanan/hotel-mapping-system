import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import BulkImport from './components/BulkImport';
import ExportMappings from './components/ExportMappings';
import HotelMatchingReview from './components/HotelMatchingReview';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public route - Login */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes - require authentication */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="app">
                <Navbar />
                <div className="app-content">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/bulk-import-master" element={<BulkImport type="master" />} />
                    <Route path="/bulk-import-supplier" element={<BulkImport type="supplier" />} />
                    <Route path="/review" element={<HotelMatchingReview />} />
                    <Route path="/export" element={<ExportMappings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
