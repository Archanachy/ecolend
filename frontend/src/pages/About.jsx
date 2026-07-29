// About page (v2) — the story, the numbers, and the values behind EcoLend.
import { Link } from 'react-router-dom';

const VALUES = [
  { icon: '♻️', t: 'Use over ownership', d: 'The average power drill is used for less than 15 minutes in its entire life. Sharing what already exists beats manufacturing more of it.' },
  { icon: '🤝', t: 'Trust by design', d: 'Verified accounts, reviews, refundable deposits and admin-resolved disputes make lending to a neighbour feel safe.' },
  { icon: '🔐', t: 'Security first', d: 'Two-factor authentication, encrypted personal data and server-verified payments are built in, not bolted on.' },
  { icon: '🌍', t: 'Local by default', d: 'Borrowing happens between neighbours. Shorter trips, stronger communities, less waste.' },
];

export default function About() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <span className="eyebrow">About us</span>
          <h1>Fewer things bought. More things shared.</h1>
          <p className="hero-lead">
            EcoLend is a peer-to-peer marketplace for lending tools and
            equipment. We think most of what people need occasionally, someone
            nearby already owns — and would happily lend, if it were safe and
            simple to do so.
          </p>
        </div>
      </section>

      <div className="container">
        <div className="stat-grid" style={{ marginBottom: 'var(--space-12)' }}>
          <div className="stat"><div className="stat-value">15 min</div><div className="stat-label">Average lifetime use of a home power drill</div></div>
          <div className="stat"><div className="stat-value">~80%</div><div className="stat-label">Of household tools used less than once a year</div></div>
          <div className="stat"><div className="stat-value">1 item</div><div className="stat-label">Shared can replace many bought</div></div>
        </div>

        <h2>What we care about</h2>
        <div className="features" style={{ marginBottom: 'var(--space-12)' }}>
          {VALUES.map((v) => (
            <div className="feature" key={v.t}>
              <span className="feature-icon" aria-hidden="true">{v.icon}</span>
              <h3>{v.t}</h3>
              <p>{v.d}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>About this project</h2>
          <p className="muted">
            EcoLend was built as a secure web application coursework project,
            with an emphasis on authentication hardening, access control,
            payment-verification integrity and data protection. The security
            controls described across the site are genuinely implemented, not
            illustrative.
          </p>
          <div className="form-actions">
            <Link to="/how-it-works" className="btn btn-outline">How it works</Link>
            <Link to="/register" className="btn">Get started</Link>
          </div>
        </div>
      </div>
    </>
  );
}
