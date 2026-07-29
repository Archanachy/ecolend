// Global footer with grouped links.
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <strong>🌱 EcoLend</strong>
          <p className="muted text-sm">
            Borrow, don&apos;t buy. A secure peer-to-peer marketplace for lending
            tools and equipment within your community.
          </p>
        </div>
        <div className="footer-col">
          <h4>Marketplace</h4>
          <Link to="/browse">Browse listings</Link>
          <Link to="/listings/new">List an item</Link>
          <Link to="/bookings/mine">My bookings</Link>
        </div>
        <div className="footer-col">
          <h4>Account</h4>
          <Link to="/register">Get started</Link>
          <Link to="/login">Log in</Link>
          <Link to="/settings">Settings</Link>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <Link to="/about">About</Link>
          <Link to="/how-it-works">How it works</Link>
          <Link to="/faq">Help &amp; FAQ</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="footer-col">
          <h4>Privacy &amp; security</h4>
          <Link to="/settings/privacy">Your data</Link>
          <Link to="/settings/accessibility">Accessibility</Link>
          <Link to="/mfa/setup">Two-factor auth</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} EcoLend. All rights reserved.</div>
    </footer>
  );
}
