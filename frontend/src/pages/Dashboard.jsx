// Minimal dashboard placeholder — proves the authenticated session works end to
// end. The full dashboard (stats, bookings, listings) is built later.
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <main style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Welcome, {user?.name}</h1>
      <p>You are logged in as {user?.email}.</p>
      <button type="button" onClick={handleLogout}>
        Log out
      </button>
    </main>
  );
}
