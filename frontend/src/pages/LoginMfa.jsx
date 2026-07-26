// Second-factor step. Reached only after a password login that returned
// mfaRequired. Accepts a 6-digit TOTP code (auto-submits on the 6th digit) or,
// via a toggle, a backup code.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginMfa() {
  const { completeMfa } = useAuth();
  const navigate = useNavigate();
  const [useBackup, setUseBackup] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(value) {
    setSubmitting(true);
    setError('');
    try {
      const result = await completeMfa(useBackup ? { backupCode: value } : { code: value });
      // Admins land in the admin console; members in the marketplace dashboard.
      navigate(result?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      const status = err.response?.status;
      setError(status === 401 ? 'That code was not valid.' : 'Something went wrong.');
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }

  function onChange(e) {
    const value = e.target.value;
    setCode(value);
    // Auto-submit a full 6-digit TOTP code.
    if (!useBackup && /^\d{6}$/.test(value)) submit(value);
  }

  function onSubmit(e) {
    e.preventDefault();
    submit(code);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <span className="auth-brand">🌱 EcoLend</span>
        <h1>Two-factor authentication</h1>
        <p className="muted">{useBackup ? 'Enter one of your backup codes.' : 'Enter the 6-digit code from your authenticator app.'}</p>
        {error && (
          <div className="alert alert-error" role="alert">{error}</div>
        )}
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="mfa-code">{useBackup ? 'Backup code' : 'Authentication code'}</label>
            <input
              id="mfa-code"
              type="text"
              inputMode={useBackup ? 'text' : 'numeric'}
              autoComplete="one-time-code"
              value={code}
              onChange={onChange}
              autoFocus
              disabled={submitting}
              style={{ letterSpacing: useBackup ? 'normal' : '0.3em', textAlign: 'center', fontSize: 'var(--text-lg)' }}
            />
          </div>
          <button type="submit" className="btn-block" disabled={submitting || code.length === 0}>
            {submitting ? 'Verifying…' : 'Verify'}
          </button>
        </form>
        <button
          type="button"
          className="btn-ghost btn-block btn-sm"
          style={{ marginTop: 'var(--space-3)' }}
          onClick={() => {
            setUseBackup((v) => !v);
            setCode('');
            setError('');
          }}
        >
          {useBackup ? 'Use an authenticator code instead' : 'Use a backup code instead'}
        </button>
      </div>
    </div>
  );
}
