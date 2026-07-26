// Notification preferences, saved to the profile. Controls whether the user
// receives booking-event emails (new request, approval, payment, return, etc.).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyProfile, updateMyProfile } from '../api/users';

export default function SettingsNotifications() {
  const [prefs, setPrefs] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMyProfile().then((res) => setPrefs(res.data.notificationPrefs));
  }, []);

  async function save(next) {
    setSaved(false);
    setPrefs(next);
    await updateMyProfile({ notificationPrefs: next });
    setSaved(true);
  }

  if (!prefs) return <div className="container-sm"><p className="loading" role="status">Loading…</p></div>;

  return (
    <div className="container-sm">
      <p className="text-sm"><Link to="/settings">← Settings</Link></p>
      <div className="page-header">
        <div>
          <span className="eyebrow">Account</span>
          <h1>Notifications</h1>
        </div>
      </div>
      <div className="card stack">
        <label style={{ fontWeight: 500, marginBottom: 0 }}>
          <input type="checkbox" checked={prefs.email} onChange={(e) => save({ ...prefs, email: e.target.checked })} />
          Email me about my bookings
        </label>
        <p className="muted text-sm" style={{ margin: 0 }}>
          Get an email when a booking request comes in, is approved, paid,
          returned or completed. Security emails (verification, password reset)
          are always sent.
        </p>
        <label style={{ fontWeight: 500, marginBottom: 0 }}>
          <input type="checkbox" checked={prefs.inApp} onChange={(e) => save({ ...prefs, inApp: e.target.checked })} />
          Show notifications in the app
        </label>
        <p className="muted text-sm" style={{ margin: 0 }}>
          Booking activity appears in your notification centre (the 🔔 in the
          top bar).
        </p>
        {saved && <p className="text-sm" role="status" style={{ color: 'var(--color-success)', margin: 0 }}>✓ Saved.</p>}
      </div>
    </div>
  );
}
