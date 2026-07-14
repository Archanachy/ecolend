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
    <main style={{ maxWidth: 480, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Verify your email</h1>

      {status === 'verifying' && <p role="status">Verifying…</p>}

      {status === 'success' && (
        <>
          <p role="status">Your email is verified.</p>
          <Link to="/login">Continue to log in</Link>
        </>
      )}

      {status === 'error' && (
        <p role="alert">
          This verification link is invalid or has expired. Request a new one below.
        </p>
      )}

      {(status === 'idle' || status === 'error') && (
        <>
          <p>Check your inbox for a verification link. Didn&apos;t get it?</p>
          {resent ? (
            <p role="status">If that address needs verifying, a new link is on its way.</p>
          ) : (
            <form onSubmit={handleResend}>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <button type="submit">Resend verification email</button>
            </form>
          )}
        </>
      )}
    </main>
  );
}
