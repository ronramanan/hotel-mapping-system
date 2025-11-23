import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import './App.css';

import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import BulkImport from './components/BulkImport';
import MappingReview from './components/MappingReview';
import SupplierManagement from './components/SupplierManagement';
import ExportMappings from './components/ExportMappings';
import Settings from './components/Settings';

// Configure Amplify
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID || '',
      userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || '',
      identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID || '',
      loginWith: {
        email: true,
        username: false,
      },
    },
  },
  Storage: {
    S3: {
      bucket: process.env.REACT_APP_S3_BUCKET || '',
      region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
    },
  },
  API: {
    REST: {
      HotelMappingAPI: {
        endpoint: process.env.REACT_APP_API_ENDPOINT || '',
        region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
      },
    },
  },
};

// Only configure Amplify if we have the required environment variables
if (process.env.REACT_APP_USER_POOL_ID) {
  Amplify.configure(amplifyConfig);
}

function App() {
  const isAuthConfigured = !!process.env.REACT_APP_USER_POOL_ID;

  const AppContent = () => (
    <Router>
      <div className="app">
        <Navbar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/import" element={<BulkImport />} />
            <Route path="/review" element={<MappingReview />} />
            <Route path="/suppliers" element={<SupplierManagement />} />
            <Route path="/export" element={<ExportMappings />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </Router>
  );

  // If authentication is not configured, show the app without auth
  if (!isAuthConfigured) {
    return <AppContent />;
  }

  // With authentication
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <AppContent />
      )}
    </Authenticator>
  );
}

export default App;
