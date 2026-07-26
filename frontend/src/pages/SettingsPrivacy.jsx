// Privacy & data: download my data (JSON) and request account deletion.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { exportMyData, requestAccountDeletion } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

export default function SettingsPrivacy() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const { data } = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ecolend-data.json';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    const ok = await confirm({
      title: 'Request account deletion?',
      message:
        'Your account will be scheduled for removal and you will be logged out immediately. This cannot be undone.',
      confirmLabel: 'Delete my account',
      danger: true,
    });
    if (!ok) return;
    try {
      await requestAccountDeletion();
    } catch (err) {
      // Most often the server's 409: bookings are still in progress. Stay put
      // and explain, rather than silently doing nothing.
      toast.error(err.response?.data?.error || 'Could not request account deletion.');
      return;
    }
    await logout().catch(() => {});
    navigate('/');
  }

  return (
    <div className="container-sm">
      <p className="text-sm"><Link to="/settings">← Settings</Link></p>
      <div className="page-header">
        <div>
          <span className="eyebrow">Account</span>
          <h1>Privacy &amp; data</h1>
        </div>
      </div>
      <section className="card">
        <h2>Download my data</h2>
        <p className="muted">Export everything we hold about you as a JSON file.</p>
        <button type="button" className="btn-outline" onClick={download} disabled={busy}>{busy ? 'Preparing…' : 'Download my data'}</button>
      </section>
      <section className="card" style={{ marginTop: 'var(--space-5)', borderColor: 'var(--color-danger-soft)' }}>
        <h2>Delete my account</h2>
        <p className="muted">This schedules your account for deletion and logs you out. This cannot be undone.</p>
        <button type="button" className="btn-danger" onClick={deleteAccount}>Request account deletion</button>
      </section>
    </div>
  );
}
