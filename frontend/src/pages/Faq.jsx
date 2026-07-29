// Help / FAQ page (v2). Uses native <details> so it stays accessible and
// keyboard-operable without any JavaScript.
import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    heading: 'Borrowing',
    items: [
      ['How much does it cost?', 'You pay a daily rental fee plus a refundable deposit. The deposit comes back to you when the item is returned in good condition. The exact total is shown before you confirm.'],
      ['When am I charged?', 'Only after the owner approves your request. Nothing is taken while a request is pending.'],
      ['What if I return an item late?', 'Contact the owner through the booking messages as early as you can. Persistent late returns can lead to a dispute, which an admin will resolve.'],
      ['What if the item is damaged?', 'The owner can raise a dispute. An EcoLend admin reviews it and decides whether the deposit is released to the owner or returned to you.'],
    ],
  },
  {
    heading: 'Lending',
    items: [
      ['How do I set a fair price?', 'Look at similar listings in your area. A common rule of thumb is 1–5% of the item value per day, plus a deposit that covers replacement cost.'],
      ['Can I decline a request?', 'Yes. You are never obliged to accept. You can also pause a listing to hide it from Browse without deleting it.'],
      ['When do I get paid?', 'The rental fee is settled once the booking completes. The deposit is only touched if there is a dispute.'],
    ],
  },
  {
    heading: 'Account & security',
    items: [
      ['Why do I need to verify my email?', 'Verification confirms you are reachable and reduces fraud. You need a verified email before listing an item or making a booking.'],
      ['What is two-factor authentication?', 'An extra code from an authenticator app at login. Even if someone learns your password they cannot get in. Admin accounts must have it enabled.'],
      ['Is my personal data safe?', 'Passwords are hashed and never stored in plain text. Your phone number and address are encrypted at rest and never shown on your public profile.'],
      ['Can I download or delete my data?', 'Yes — export everything as JSON, or request account deletion, from Privacy & data in Settings.'],
    ],
  },
];

export default function Faq() {
  return (
    <div className="container-md">
      <div className="page-header">
        <div>
          <span className="eyebrow">Help</span>
          <h1>Frequently asked questions</h1>
          <p>Answers to the things people ask most.</p>
        </div>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.heading} style={{ marginBottom: 'var(--space-8)' }}>
          <h2>{section.heading}</h2>
          <div className="card" style={{ padding: 0 }}>
            {section.items.map(([q, a]) => (
              <details key={q} className="faq-item">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <div className="card">
        <h2>Still stuck?</h2>
        <p className="muted">We usually reply within a working day.</p>
        <Link to="/contact" className="btn">Contact support</Link>
      </div>
    </div>
  );
}
