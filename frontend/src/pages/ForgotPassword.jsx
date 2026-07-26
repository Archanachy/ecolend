// Forgot-password page. The backend responds identically whether or not the
// email exists, so this page always shows the same confirmation — it never
// reveals which addresses are registered.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await forgotPassword(email);
    } finally {
      setSent(true);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <span className="auth-brand">🌱 EcoLend</span>
        <h1>Reset your password</h1>
        {sent ? (
          <div className="alert alert-success" role="status">
            If an account exists for that email, a reset link is on its way. The
            link expires in 1 hour.
          </div>
        ) : (
          <>
            <p className="muted">Enter your email and we&apos;ll send you a reset link.</p>
            <form onSubmit={onSubmit} noValidate>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-block">Send reset link</button>
            </form>
          </>
        )}
        <p className="auth-alt">
          <Link to="/login">Back to log in</Link>
        </p>
      </div>
    </div>
  );
}
