// Admin overview: headline stats + links to the management pages.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOverview } from '../../api/admin';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getOverview().then((res) => setStats(res.data)).catch(() => setStats(null));
  }, []);

  const cards = stats
    ? [
        { label: 'Users', value: stats.users },
        { label: 'Active listings', value: stats.listings },
        { label: 'Bookings (30d)', value: stats.bookingsThisMonth },
        { label: 'Open disputes', value: stats.openDisputes },
        { label: 'Unack. alerts', value: stats.unackAlerts },
      ]
    : [];

  const sections = [
    { to: '/admin/users', icon: '👥', title: 'Users', desc: 'Suspend or reinstate accounts.' },
    { to: '/admin/bookings', icon: '📅', title: 'Bookings & disputes', desc: 'Review bookings and resolve disputes.' },
    { to: '/admin/reviews', icon: '⭐', title: 'Reviews', desc: 'Moderate and remove abusive reviews.' },
    { to: '/admin/logs', icon: '📜', title: 'Activity logs', desc: 'Audit trail of key actions.' },
    { to: '/admin/alerts', icon: '🚨', title: 'Security alerts', desc: 'Acknowledge integrity and abuse alerts.' },
  ];

  return (
    <div className="container-lg">
      <div className="page-header">
        <div>
          <span className="eyebrow">🛡️ Admin console</span>
          <h1>Overview</h1>
        </div>
        <Link to="/dashboard" className="btn btn-ghost">← Main site</Link>
      </div>

      {stats && (
        <div className="stat-grid" style={{ marginBottom: 'var(--space-8)' }}>
          {cards.map((c) => (
            <div key={c.label} className="stat">
              <div className="stat-value">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      <ul className="card-grid">
        {sections.map((s) => (
          <li key={s.to}>
            <Link to={s.to} className="card-link">
              <span className="feature-icon" aria-hidden="true">{s.icon}</span>
              <h3 className="card-title">{s.title}</h3>
              <p className="muted text-sm" style={{ margin: 0 }}>{s.desc}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
