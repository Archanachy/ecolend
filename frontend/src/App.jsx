// EcoLend frontend — root component and route table.
// Pages are added to this table as they are built; the design-system chrome
// wraps this in later steps.
import { Routes, Route, Link } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import LoginMfa from './pages/LoginMfa';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import MfaSetup from './pages/MfaSetup';
import Sessions from './pages/Sessions';
import Browse from './pages/Browse';
import ListingDetail from './pages/ListingDetail';
import ListingForm from './pages/ListingForm';
import MyListings from './pages/MyListings';
import MyBookings from './pages/MyBookings';
import BookingRequests from './pages/BookingRequests';
import BookingDetail from './pages/BookingDetail';
import PaymentPay from './pages/PaymentPay';
import PaymentCallback from './pages/PaymentCallback';
import Profile from './pages/Profile';
import ProfileEdit from './pages/ProfileEdit';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLogs from './pages/admin/AdminLogs';
import AdminAlerts from './pages/admin/AdminAlerts';
import AdminBookings from './pages/admin/AdminBookings';
import AdminReviews from './pages/admin/AdminReviews';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import Faq from './pages/Faq';
import Contact from './pages/Contact';
import Favorites from './pages/Favorites';
import Notifications from './pages/Notifications';
import Earnings from './pages/Earnings';
import Settings from './pages/Settings';
import SettingsPrivacy from './pages/SettingsPrivacy';
import SettingsNotifications from './pages/SettingsNotifications';
import SettingsAccessibility from './pages/SettingsAccessibility';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import { useAuth } from './context/AuthContext';

function Home() {
  const { user } = useAuth();
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <span className="eyebrow">Peer-to-peer lending marketplace</span>
          <h1>Borrow the tools you need. Lend the ones you don&apos;t.</h1>
          <p className="hero-lead">
            EcoLend connects neighbours to share tools and equipment safely —
            with verified accounts, secure payments and deposit protection built
            in. Save money, reduce waste, build community.
          </p>
          <div className="hero-actions">
            {user ? (
              <>
                <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn btn-lg">
                  {user.role === 'admin' ? 'Go to admin console' : 'Go to dashboard'}
                </Link>
                <Link to="/browse" className="btn btn-outline btn-lg">Browse listings</Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn-lg">Get started — it&apos;s free</Link>
                <Link to="/browse" className="btn btn-outline btn-lg">Browse listings</Link>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="container">
        <div className="features">
          <div className="feature">
            <span className="feature-icon" aria-hidden="true">🔒</span>
            <h3>Secure by design</h3>
            <p>Two-factor authentication, encrypted personal data and hardened
              sessions keep your account and details safe.</p>
          </div>
          <div className="feature">
            <span className="feature-icon" aria-hidden="true">💳</span>
            <h3>Protected payments</h3>
            <p>Pay through Khalti with refundable deposits. Every transaction is
              verified server-side, so amounts can never be tampered with.</p>
          </div>
          <div className="feature">
            <span className="feature-icon" aria-hidden="true">♻️</span>
            <h3>Better for the planet</h3>
            <p>Sharing what you already own means fewer things bought, made and
              thrown away. Borrowing is the greener choice.</p>
          </div>
        </div>

        <h2 style={{ marginTop: 'var(--space-16)', marginBottom: 'var(--space-6)' }}>
          How it works
        </h2>
        <div className="steps">
          <div className="step">
            <h3>Find an item</h3>
            <p>Browse listings near you and pick the dates you need it for.</p>
          </div>
          <div className="step">
            <h3>Request &amp; pay</h3>
            <p>Send a booking request. Once the owner approves, pay securely
              with a refundable deposit.</p>
          </div>
          <div className="step">
            <h3>Borrow &amp; return</h3>
            <p>Collect the item, use it, and return it to get your deposit back.
              Leave a review to build trust.</p>
          </div>
        </div>
      </div>
    </>
  );
}

function NotFound() {
  return (
    <div className="container-sm">
      <div className="empty-state">
        <h1 style={{ fontSize: 'var(--text-4xl)', marginBottom: 'var(--space-2)' }}>404</h1>
        <h3>Page not found</h3>
        <p>The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <Link to="/" className="btn" style={{ marginTop: 'var(--space-4)' }}>Back to home</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login/mfa" element={<LoginMfa />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/about" element={<About />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/faq" element={<Faq />} />
      <Route path="/contact" element={<Contact />} />

      {/* Public browse + detail */}
      <Route path="/browse" element={<Browse />} />
      <Route path="/listings/:id" element={<ListingDetail />} />
      <Route path="/profile/:id" element={<Profile />} />
      {/* Public because Khalti redirects here cross-site; shows the verified result */}
      <Route path="/bookings/:id/payment/callback" element={<PaymentCallback />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/mfa/setup" element={<MfaSetup />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/listings/mine" element={<MyListings />} />
        <Route path="/listings/new" element={<ListingForm />} />
        <Route path="/listings/:id/edit" element={<ListingForm />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/earnings" element={<Earnings />} />
        <Route path="/bookings/mine" element={<MyBookings />} />
        <Route path="/bookings/requests" element={<BookingRequests />} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
        <Route path="/bookings/:id/pay" element={<PaymentPay />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/privacy" element={<SettingsPrivacy />} />
        <Route path="/settings/notifications" element={<SettingsNotifications />} />
        <Route path="/settings/accessibility" element={<SettingsAccessibility />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/logs" element={<AdminLogs />} />
        <Route path="/admin/alerts" element={<AdminAlerts />} />
        <Route path="/admin/bookings" element={<AdminBookings />} />
        <Route path="/admin/reviews" element={<AdminReviews />} />
      </Route>

      <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
