// Settings hub — links to the sub-settings pages.
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();

  const items = [
    { to: '/settings/privacy', label: 'Privacy & data', desc: 'Export your data or delete your account.' },
    { to: '/settings/notifications', label: 'Notifications', desc: 'Choose which emails you receive.' },
    { to: '/settings/accessibility', label: 'Accessibility', desc: 'Text size, contrast and motion.' },
    {
      to: '/mfa/setup',
      label: 'Two-factor authentication',
      desc: 'Add a second layer of login security.',
      badge: user?.mfaEnabled
        ? <span className="badge badge-success">Enabled</span>
        : <span className="badge badge-warning">Off</span>,
    },
    { to: '/sessions', label: 'Active sessions', desc: 'Review and sign out other devices.' },
  ];

  return (
    <div className="container-sm">
      <div className="page-header">
        <div>
          <span className="eyebrow">Account</span>
          <h1>Settings</h1>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <ul className="link-list">
          {items.map((i) => (
            <li key={i.to} style={{ padding: '0 var(--space-5)' }}>
              <Link to={i.to}>
                <span>
                  <span style={{ display: 'block', fontWeight: 700 }}>
                    {i.label} {i.badge}
                  </span>
                  <span className="muted text-sm" style={{ fontWeight: 400 }}>{i.desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
