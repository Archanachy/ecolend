// Guards authenticated routes on the client. The server still enforces auth on
// every request — this only improves UX by redirecting before the API 401s.
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
