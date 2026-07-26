// MFA management (authenticated). If MFA is off, this runs enrolment: fetch a
// QR + secret, confirm with a code, then show the one-time backup codes exactly
// once. If MFA is already on, it shows the status and a disable form (which
// requires a current code). The enrolment request is only made when MFA is off,
// so an enabled authenticator is never silently re-provisioned.
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { mfaSetup, mfaEnable, mfaDisable } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function MfaSetup() {
  const { user, refresh } = useAuth();
  const location = useLocation();
  const enabled = Boolean(user?.mfaEnabled);
  // Set when AdminRoute bounced an admin here because MFA is mandatory.
  const adminMfaRequired = location.state?.adminMfaRequired;

  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [loading, setLoading] = useState(false);

  // Disable flow.
  const [disableCode, setDisableCode] = useState('');
  const [disableError, setDisableError] = useState('');

  // Copy-to-clipboard feedback for the backup codes.
  const [copied, setCopied] = useState(false);

  async function copyBackupCodes() {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function downloadBackupCodes() {
    const blob = new Blob(
      [`EcoLend backup codes\n\n${backupCodes.join('\n')}\n\nEach code works once.`],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ecolend-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Provision a fresh secret exactly once when MFA is off. The ref guard stops
  // React StrictMode's double-invoke (and any re-render) from calling setup
  // twice — a second call would generate a new secret and leave the shown QR
  // out of sync with the stored one, so a correct code would be rejected (400).
  const didSetup = useRef(false);
  useEffect(() => {
    if (user === null || enabled || didSetup.current) return;
    didSetup.current = true;
    setLoading(true);
    mfaSetup()
      .then(({ data }) => {
        setQr(data.qr);
        setSecret(data.secret);
      })
      .catch(() => {
        setError('Could not start MFA setup.');
        didSetup.current = false; // allow a retry on next mount
      })
      .finally(() => setLoading(false));
  }, [user, enabled]);

  async function onEnable(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await mfaEnable(code);
      setBackupCodes(data.backupCodes);
      await refresh(); // reflect enabled=true across the app
    } catch (err) {
      setError(err.response?.status === 400 ? 'That code was not valid.' : 'Something went wrong.');
    }
  }

  async function onDisable(e) {
    e.preventDefault();
    setDisableError('');
    try {
      await mfaDisable(disableCode);
      await refresh();
      setDisableCode('');
    } catch (err) {
      setDisableError(err.response?.status === 400 ? 'That code was not valid.' : 'Something went wrong.');
    }
  }

  // 1) Just enabled — show the one-time backup codes.
  if (backupCodes) {
    return (
      <div className="container-sm">
        <div className="card">
          <div className="row" style={{ gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 28 }} aria-hidden="true">✅</span>
            <h1 style={{ margin: 0 }}>Two-factor is on</h1>
          </div>
          <div className="alert alert-warning" role="alert" style={{ marginTop: 'var(--space-4)' }}>
            Save these backup codes now — each works once and they will not be shown again.
          </div>
          <ul className="list-plain" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 'var(--space-2)' }}>
            {backupCodes.map((c) => (
              <li key={c} style={{ background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2) var(--space-3)', textAlign: 'center' }}>
                <code style={{ fontSize: 'var(--text-base)', letterSpacing: '0.05em', userSelect: 'all' }}>{c}</code>
              </li>
            ))}
          </ul>
          <div className="form-actions">
            <button type="button" className="btn-outline" onClick={copyBackupCodes}>
              {copied ? '✓ Copied' : 'Copy all codes'}
            </button>
            <button type="button" className="btn-ghost" onClick={downloadBackupCodes}>Download .txt</button>
          </div>
          <Link to="/settings" className="btn" style={{ marginTop: 'var(--space-4)' }}>Back to settings</Link>
        </div>
      </div>
    );
  }

  // 2) Already enabled — show status + disable form.
  if (enabled) {
    return (
      <div className="container-sm">
        <p className="text-sm"><Link to="/settings">← Settings</Link></p>
        <div className="page-header">
          <div>
            <span className="eyebrow">Security</span>
            <h1>Two-factor authentication</h1>
          </div>
          <span className="badge badge-success">Enabled</span>
        </div>
        <div className="card">
          <p className="muted">
            Two-factor authentication is protecting your account. You&apos;ll be asked
            for a code from your authenticator app each time you log in.
          </p>
          <hr />
          <h2>Turn off two-factor</h2>
          <p className="muted text-sm">Enter a current 6-digit code to confirm.</p>
          {disableError && <div className="alert alert-error" role="alert">{disableError}</div>}
          <form onSubmit={onDisable} noValidate>
            <div className="field">
              <label htmlFor="disable-code">Authentication code</label>
              <input
                id="disable-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: 'var(--text-lg)', maxWidth: 220 }}
              />
            </div>
            <button type="submit" className="btn-danger" disabled={!/^\d{6}$/.test(disableCode)}>
              Turn off MFA
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3) Not enabled — enrolment flow.
  return (
    <div className="container-sm">
      <p className="text-sm"><Link to="/settings">← Settings</Link></p>
      <div className="page-header">
        <div>
          <span className="eyebrow">Security</span>
          <h1>Set up two-factor authentication</h1>
        </div>
      </div>
      <div className="card">
        {adminMfaRequired && (
          <div className="alert alert-warning" role="alert">
            Admin accounts must have two-factor authentication enabled. Finish
            setup below to access the admin console.
          </div>
        )}
        {loading && <p className="loading" role="status">Loading…</p>}
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {qr && (
          <>
            <p className="muted">Scan this with your authenticator app (Google Authenticator, Authy, 1Password…), or enter the key manually.</p>
            <div style={{ textAlign: 'center' }}>
              <img src={qr} alt="MFA QR code" style={{ width: 200, height: 200, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)', background: '#fff' }} />
            </div>
            <p className="text-sm" style={{ textAlign: 'center' }}>
              Manual key: <code style={{ background: 'var(--color-neutral-100)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>{secret}</code>
            </p>
            <form onSubmit={onEnable} noValidate>
              <div className="field">
                <label htmlFor="mfa-confirm">Enter the 6-digit code to confirm</label>
                <input
                  id="mfa-confirm"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: 'var(--text-lg)' }}
                />
              </div>
              <button type="submit" className="btn-block" disabled={!/^\d{6}$/.test(code)}>
                Turn on MFA
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
