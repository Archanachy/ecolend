// Email verification page. With a ?token it verifies immediately and reports
// the result; without one it tells the user to check their inbox and offers a
// resend. The resend response is always generic, so this page never confirms
// whether an address is registered.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../api/auth';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState(token ? 'verifying' : 'idle');
  const [email, setEmail] = useState('');
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  async function handleResend(e) {
    e.preventDefault();
    try {
      await resendVerification(email);
    } finally {
      setResent(true);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <span className="auth-brand">🌱 EcoLend</span>
        <h1>Verify your email</h1>

        {status === 'verifying' && <p className="loading" role="status">Verifying…</p>}

        {status === 'success' && (
          <>
            <div className="alert alert-success" role="status">Your email is verified.</div>
            <Link to="/login" className="btn btn-block">Continue to log in</Link>
          </>
        )}

        {status === 'error' && (
          <div className="alert alert-error" role="alert">
            This verification link is invalid or has expired. Request a new one below.
          </div>
        )}

        {(status === 'idle' || status === 'error') && (
          <>
            <p className="muted">Check your inbox for a verification link. Didn&apos;t get it?</p>
            {resent ? (
              <div className="alert alert-success" role="status">If that address needs verifying, a new link is on its way.</div>
            ) : (
              <form onSubmit={handleResend}>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-block">Resend verification email</button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
