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
    <main style={{ maxWidth: 420, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Reset your password</h1>
      {sent ? (
        <p role="status">
          If an account exists for that email, a reset link is on its way. The link
          expires in 1 hour.
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <button type="submit">Send reset link</button>
        </form>
      )}
      <p>
        <Link to="/login">Back to log in</Link>
      </p>
    </main>
  );
}
