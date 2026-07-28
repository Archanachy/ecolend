// Client-side admin guard. The server double-enforces the admin role AND
// mandatory admin MFA on every /api/admin request; this only improves UX by
// not rendering admin pages for non-admins, and by sending admins who have not
// yet enrolled in two-factor to the setup page instead of showing them 403s.
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <p className="loading">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  // Spec 05: MFA is not optional for admin accounts.
  if (!user.mfaEnabled) {
    return <Navigate to="/mfa/setup" replace state={{ adminMfaRequired: true }} />;
  }
  return <Outlet />;
}
