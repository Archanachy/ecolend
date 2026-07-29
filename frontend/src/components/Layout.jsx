// Page chrome: navbar on top, the routed page in the middle, footer at the
// bottom. Wraps the whole route tree so every page shares the same navigation.
// A skip link lets keyboard users jump straight to the page content. A slim
// banner reminds unverified users to verify (listing/booking require it).
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user } = useAuth();
  const needsVerify = user && user.emailVerified === false;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Navbar />
      {needsVerify && (
        <div className="verify-banner" role="status">
          <span>📧 Please verify your email to list items or make bookings.</span>
          <Link to="/verify-email">Verify now</Link>
        </div>
      )}
      <main id="main-content" style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
