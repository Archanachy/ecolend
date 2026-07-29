// How It Works — explains the borrow and lend journeys end to end (v2).
import { Link } from 'react-router-dom';

const BORROW = [
  { t: 'Find what you need', d: 'Browse by category or search your area. Every listing shows the daily fee and the refundable deposit up front.' },
  { t: 'Request your dates', d: 'Pick a start and end date. You will see the exact total before you commit — no hidden fees.' },
  { t: 'Pay securely', d: 'Once the owner approves, pay through Khalti. Your deposit is held, not spent.' },
  { t: 'Collect, use, return', d: 'Meet the owner, use the item, and return it on time to get your deposit back.' },
];

const LEND = [
  { t: 'List your item', d: 'Add a photo, description, daily fee and deposit. It takes a couple of minutes.' },
  { t: 'Approve requests', d: 'You choose who borrows and when. Decline anything you are not comfortable with.' },
  { t: 'Hand it over', d: 'Confirm handover once payment clears. The deposit protects you against loss or damage.' },
  { t: 'Get paid', d: 'Confirm the return and the rental fee is yours. Leave a review to build trust.' },
];

export default function HowItWorks() {
  return (
    <div className="container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Guide</span>
          <h1>How EcoLend works</h1>
          <p>Borrowing and lending, explained in four steps each.</p>
        </div>
      </div>

      <h2>For borrowers</h2>
      <div className="steps" style={{ marginBottom: 'var(--space-12)' }}>
        {BORROW.map((s) => (
          <div className="step" key={s.t}>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </div>
        ))}
      </div>

      <h2>For lenders</h2>
      <div className="steps" style={{ marginBottom: 'var(--space-12)' }}>
        {LEND.map((s) => (
          <div className="step" key={s.t}>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <h2>Ready to start?</h2>
        <p className="muted">Join free — it takes less than a minute.</p>
        <div className="form-actions" style={{ justifyContent: 'center' }}>
          <Link to="/register" className="btn btn-lg">Create an account</Link>
          <Link to="/browse" className="btn btn-outline btn-lg">Browse listings</Link>
        </div>
      </div>
    </div>
  );
}
