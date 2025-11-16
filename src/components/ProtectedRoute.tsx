import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const authTime = localStorage.getItem('authTime');
  
  // Check if session is still valid (24 hours)
  if (isAuthenticated && authTime) {
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - parseInt(authTime);
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    // Session expires after 24 hours
    if (hoursDiff > 24) {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('authTime');
      return <Navigate to="/login" replace />;
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
