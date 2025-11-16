import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check credentials against environment variables
    const validUsername = process.env.REACT_APP_AUTH_USERNAME || 'admin';
    const validPassword = process.env.REACT_APP_AUTH_PASSWORD || 'password123';

    if (username === validUsername && password === validPassword) {
      // Store authentication token
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('authTime', new Date().getTime().toString());
      
      // Redirect to dashboard
      navigate('/');
    } else {
      setError('Invalid username or password');
      setPassword('');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>🏨 Hotel Mapping System</h1>
        <h2>Login</h2>
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <button type="submit" className="login-button">
            🔐 Login
          </button>
        </form>

        <div className="login-footer">
          <p>Kamoota Group - EasyGDS Hotel Mapping</p>
        </div>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .login-box {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          width: 100%;
          max-width: 400px;
        }

        .login-box h1 {
          margin: 0 0 10px 0;
          color: #333;
          text-align: center;
          font-size: 28px;
        }

        .login-box h2 {
          margin: 0 0 30px 0;
          color: #666;
          text-align: center;
          font-size: 20px;
          font-weight: normal;
        }

        .login-box .form-group {
          margin-bottom: 20px;
        }

        .login-box label {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 600;
        }

        .login-box input {
          width: 100%;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.3s;
          box-sizing: border-box;
        }

        .login-box input:focus {
          outline: none;
          border-color: #667eea;
        }

        .login-button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .login-button:hover {
          transform: translateY(-2px);
        }

        .login-button:active {
          transform: translateY(0);
        }

        .error-message {
          background: #ffebee;
          color: #c62828;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
          text-align: center;
          font-weight: 600;
        }

        .login-footer {
          margin-top: 30px;
          text-align: center;
          color: #999;
          font-size: 14px;
        }

        .login-footer p {
          margin: 5px 0;
        }
      `}</style>
    </div>
  );
};

export default Login;
