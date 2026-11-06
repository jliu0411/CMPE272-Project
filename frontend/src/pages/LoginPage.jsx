import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Wallet, ArrowRight } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { isConfigured } from '../services/supabase';

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <div className="page-center">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <Wallet size={32} />
          <h1>REMS</h1>
        </div>

        <h2>Welcome Back</h2>
        <p>Sign in to manage your reimbursements.</p>

        {!isConfigured && (
          <div className="error-message">
            Supabase is not configured. Check your .env.local file.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={submitting || !isConfigured}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
            {!submitting && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="login-footer">
          Don't have an account? Contact your administrator.
        </p>
      </div>
    </div>
  );
}