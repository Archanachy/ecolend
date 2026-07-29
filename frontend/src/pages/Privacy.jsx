// Privacy Policy — static content page linked from registration and the footer.
// Placeholder coursework copy, not legal advice.
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="container-md">
      <div className="page-header">
        <div>
          <span className="eyebrow">Legal</span>
          <h1>Privacy Policy</h1>
          <p>Last updated {new Date().getFullYear()}</p>
        </div>
      </div>
      <div className="card stack">
        <section>
          <h2>1. What we collect</h2>
          <p className="muted">
            Account details (name, email), an optional profile (bio, location) and,
            if you provide them, contact details (phone, address) used to arrange
            handovers. We record security-relevant events such as logins.
          </p>
        </section>
        <section>
          <h2>2. How we protect it</h2>
          <p className="muted">
            Passwords are hashed with argon2id and never stored in plain text.
            Sensitive fields (phone, address and your two-factor secret) are
            encrypted at rest with AES-256-GCM. Access is protected by sessions,
            optional two-factor authentication and role-based controls.
          </p>
        </section>
        <section>
          <h2>3. How we use it</h2>
          <p className="muted">
            To operate the marketplace: authenticate you, show public profile
            information to other members, process bookings and payments, and keep
            the service secure. Your email and address are never shown on your
            public profile.
          </p>
        </section>
        <section>
          <h2>4. Your rights</h2>
          <p className="muted">
            You can <Link to="/settings/privacy">export all your data</Link> as a
            JSON file, and request account deletion, at any time from your privacy
            settings.
          </p>
        </section>
        <section>
          <h2>5. Third parties</h2>
          <p className="muted">
            Payments are handled by Khalti under their own privacy terms. We do not
            sell your data.
          </p>
        </section>
        <p className="text-sm">
          See also our <Link to="/terms">Terms of Service</Link>.
        </p>
      </div>
    </div>
  );
}
