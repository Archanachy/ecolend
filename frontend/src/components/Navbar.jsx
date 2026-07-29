// Global navigation. Renders two distinct interfaces: the marketplace nav for
// members, and a visually separate admin console nav for admins (so the two
// contexts are never confused). The server re-checks the role on every
// /api/admin request — this split is UX, not a security boundary.
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';



  const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  // ---------------------------------------------------------- admin console
  if (isAdmin) {
    return (
      <header className="navbar admin-mode">
        <Link to="/admin" className="nav-brand">
          <span className="nav-logo" aria-hidden="true">🛡️</span>
          EcoLend <span className="admin-chip">Admin</span>
        </Link>
        <nav aria-label="Admin" className="nav-links">
          <NavLink to="/admin" end className={linkClass}>Overview</NavLink>
          <NavLink to="/admin/users" className={linkClass}>Users</NavLink>
          <NavLink to="/admin/bookings" className={linkClass}>Bookings</NavLink>
          <NavLink to="/admin/reviews" className={linkClass}>Reviews</NavLink>
          <NavLink to="/admin/logs" className={linkClass}>Logs</NavLink>
          <NavLink to="/admin/alerts" className={linkClass}>Alerts</NavLink>
        </nav>
        <div className="nav-actions">
          <NavLink to="/browse" className="nav-link">↗ Marketplace</NavLink>
          <NavLink to="/settings" className="nav-link">Settings</NavLink>
          <ThemeToggle />
        </div>
      </header>
    );
  }

  // ------------------------------------------------------------ marketplace
  return (
    <header className="navbar">
      <Link to={user ? '/dashboard' : '/'} className="nav-brand">
        <span className="nav-logo" aria-hidden="true">🌱</span>
        EcoLend
      </Link>
      <nav aria-label="Primary" className="nav-links">
        <NavLink to="/browse" className={linkClass}>Browse</NavLink>
        {user && <NavLink to="/listings/mine" className={linkClass}>My Listings</NavLink>}
        {user && <NavLink to="/bookings/mine" className={linkClass}>My Bookings</NavLink>}
        {user && <NavLink to="/favorites" className={linkClass}>Saved</NavLink>}
        {user && <NavLink to="/earnings" className={linkClass}>Earnings</NavLink>}

      </nav>
      <div className="nav-actions">
        <ThemeToggle />
        {user ? (
          <>
            <NotificationBell />
            <NavLink to="/settings" className="nav-link">Settings</NavLink>
            <NavLink to={`/profile/${localStorage.getItem('userId')}`} className="nav-link">
              <span
                aria-hidden="true"
                style={{
                  width: 32, height: 32, borderRadius: 'var(--radius-pill)',
                  background: 'var(--color-primary-soft)', color: 'var(--color-primary-hover)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'var(--text-lg)', fontWeight: 800, flex: '0 0 auto',
                }}
              >
                {user.name?.[0]?.toUpperCase() || '?'}
              </span>
            </NavLink>
          </>

        ) : (
          <>
            <NavLink to="/login" className="nav-link">Log in</NavLink>
            <Link to="/register" className="btn btn-sm">Get started</Link>
          </>
        )}
      </div>
    </header>
  );
}
