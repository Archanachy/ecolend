// Dashboard — the authenticated landing page. Quick links into the main areas.
// Richer stats/feeds arrive with later phases.
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const tiles = [
    { to: '/browse', icon: '🔍', title: 'Browse listings', desc: 'Find tools and equipment to borrow near you.' },
    { to: '/listings/mine', icon: '📦', title: 'My listings', desc: 'Manage the items you lend out.' },
    { to: '/bookings/mine', icon: '📅', title: 'My bookings', desc: 'Track the items you are borrowing.' },
    { to: '/bookings/requests', icon: '📨', title: 'Incoming requests', desc: 'Approve or decline requests to borrow your items.' },
    { to: '/favorites', icon: '♥', title: 'Saved listings', desc: 'Items you bookmarked to borrow later.' },
    { to: '/earnings', icon: '💰', title: 'Earnings', desc: 'Track rental income from items you lend.' },
    { to: '/notifications', icon: '🔔', title: 'Notifications', desc: 'Booking requests, approvals and payments.' },
    { to: '/profile/edit', icon: '👤', title: 'Edit profile', desc: 'Update your name, contact and address details.' },
    { to: '/settings', icon: '⚙️', title: 'Settings & security', desc: 'Two-factor auth, sessions, privacy and more.' },
  ];
  if (user?.role === 'admin') {
    tiles.push({ to: '/admin', icon: '🛡️', title: 'Admin console', desc: 'Moderate users, bookings, logs and alerts.' });
  }

  return (
    <div className="container-lg">
      <div className="page-header">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1>Welcome back, {user?.name || 'there'} 👋</h1>
          <p>Here&apos;s everything you can do on EcoLend.</p>
        </div>
        <Link to="/listings/new" className="btn">+ New listing</Link>
      </div>

      <ul className="card-grid">
        {tiles.map((t) => (
          <li key={t.to}>
            <Link to={t.to} className="card-link">
              <span className="feature-icon" aria-hidden="true">{t.icon}</span>
              <h3 className="card-title">{t.title}</h3>
              <p className="muted text-sm" style={{ margin: 0 }}>{t.desc}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 'var(--space-8)' }}>
        <button type="button" className="btn-ghost" onClick={handleLogout}>Log out</button>
      </div>
    </div>
  );
}
