import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertTriangle } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setSubmitting(false);
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="container d-flex justify-content-center align-items-center animate-fade-in" style={{ minHeight: '80vh' }}>
      <div className="card glass-panel p-4 p-md-5 w-100" style={{ maxWidth: '480px' }}>
        <h2 className="text-center mb-4 gradient-text font-secondary">Sign In</h2>
        
        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
            <AlertTriangle size={18} />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Email Address</label>
            <div className="input-group">
              <span className="input-group-text input-icon-wrapper">
                <Mail size={18} />
              </span>
              <input
                type="email"
                className="form-control custom-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label">Password</label>
            <div className="input-group">
              <span className="input-group-text input-icon-wrapper">
                <Lock size={18} />
              </span>
              <input
                type="password"
                className="form-control custom-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn custom-btn-primary w-100 py-2.5 fs-5"
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-muted mt-4 mb-0">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary text-decoration-none">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
