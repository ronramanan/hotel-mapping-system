import React, { useState } from 'react';
import { initializeSchema, testConnection } from '../utils/database';

const DatabaseInit: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'initializing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleTestConnection = async () => {
    setStatus('testing');
    setMessage('Testing database connection...');
    
    try {
      const connected = await testConnection();
      if (connected) {
        setStatus('success');
        setMessage('✅ Database connection successful!');
      } else {
        setStatus('error');
        setMessage('❌ Failed to connect to database. Check environment variables.');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`❌ Connection error: ${error}`);
    }
  };

  const handleInitialize = async () => {
    setStatus('initializing');
    setMessage('Initializing database schema...');
    
    try {
      await initializeSchema();
      setStatus('success');
      setMessage('✅ Database initialized successfully! You can now import hotels.');
    } catch (error) {
      setStatus('error');
      setMessage(`❌ Initialization error: ${error}`);
    }
  };

  return (
    <div>
      <h1>Database Administration</h1>

      <div className="card">
        <h2 className="card-title">Database Setup</h2>
        
        {message && (
          <div className={`message message-${status === 'success' ? 'success' : status === 'error' ? 'error' : 'info'}`}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button
            className="button button-primary"
            onClick={handleTestConnection}
            disabled={status === 'testing' || status === 'initializing'}
          >
            {status === 'testing' ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            className="button button-success"
            onClick={handleInitialize}
            disabled={status === 'testing' || status === 'initializing'}
          >
            {status === 'initializing' ? 'Initializing...' : 'Initialize Database'}
          </button>
        </div>
      </div>

      <div className="card" style={{ backgroundColor: '#f8f9fa' }}>
        <h3>Environment Variables Required:</h3>
        <pre style={{ background: '#fff', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
{`REACT_APP_DB_HOST=your-rds-endpoint.rds.amazonaws.com
REACT_APP_DB_PORT=5432
REACT_APP_DB_NAME=hotelmapping
REACT_APP_DB_USER=postgres
REACT_APP_DB_PASSWORD=your-password
REACT_APP_DB_SSL=true`}
        </pre>
        <p style={{ marginTop: '1rem', color: '#666' }}>
          Set these in AWS Amplify Console → Environment variables
        </p>
      </div>
    </div>
  );
};

export default DatabaseInit;
