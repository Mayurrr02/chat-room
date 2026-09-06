import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Sparkles, Shield, User, Lock, Mail, ArrowRight } from 'lucide-react';

const AuthPage = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please provide username and password');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      if (isRegister) {
        await register(username.trim(), password.trim(), email.trim(), displayName.trim());
      } else {
        await login(username.trim(), password.trim());
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoUser) => {
    setUsername(demoUser);
    setPassword('password123');
    setLoading(true);
    setErrorMsg('');
    try {
      await login(demoUser, 'password123');
    } catch (e) {
      // If user doesn't exist yet, auto-register
      try {
        await register(demoUser, 'password123', `${demoUser}@example.com`, demoUser.toUpperCase());
      } catch (regErr) {
        setErrorMsg(regErr.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card-wrapper">
        {/* Brand Header */}
        <div className="auth-brand-header">
          <div className="auth-logo-badge">
            <MessageSquare size={28} color="#4F46E5" />
          </div>
          <h1>AI Chat Platform</h1>
          <p>Real-Time Human & AI Collaboration Platform</p>
        </div>

        {/* Tab Toggle */}
        <div className="auth-tab-switch">
          <button
            type="button"
            className={`auth-tab-btn ${!isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(false);
              setErrorMsg('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(true);
              setErrorMsg('');
            }}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

          {isRegister && (
            <>
              <div className="form-group">
                <label><User size={14} /> Full / Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mayur Jadhav"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label><Mail size={14} /> Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. mayur@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label><User size={14} /> Username</label>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label><Lock size={14} /> Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Quick Demo Logins for Fast Testing */}
        <div className="demo-accounts-bar">
          <span style={{ fontSize: '12px', color: '#64748b' }}>Quick Test Logins:</span>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              className="btn-demo-pill"
              onClick={() => handleDemoLogin('alice')}
              disabled={loading}
            >
              @alice
            </button>
            <button
              type="button"
              className="btn-demo-pill"
              onClick={() => handleDemoLogin('bob')}
              disabled={loading}
            >
              @bob
            </button>
            <button
              type="button"
              className="btn-demo-pill"
              onClick={() => handleDemoLogin('charlie')}
              disabled={loading}
            >
              @charlie
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
