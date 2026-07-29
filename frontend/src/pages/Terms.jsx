// Terms of Service — static content page linked from registration and the
// footer. Placeholder coursework copy, not legal advice.
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="container-md">
      <div className="page-header">
        <div>
          <span className="eyebrow">Legal</span>
          <h1>Terms of Service</h1>
          <p>Last updated {new Date().getFullYear()}</p>
        </div>
      </div>
      <div className="card stack">
        <section>
          <h2>1. About EcoLend</h2>
          <p className="muted">
            EcoLend is a peer-to-peer marketplace that lets members lend and
            borrow tools and equipment. We provide the platform; the lending
            agreement is between the lender and the borrower.
          </p>
        </section>
        <section>
          <h2>2. Your account</h2>
          <p className="muted">
            You must provide accurate details, keep your credentials secure, and
            are responsible for activity under your account. We recommend enabling
            two-factor authentication. You must be legally able to enter contracts.
          </p>
        </section>
        <section>
          <h2>3. Listings &amp; bookings</h2>
          <p className="muted">
            Lenders are responsible for the accuracy, safety and legality of items
            they list. Borrowers agree to return items in the condition received,
            within the agreed dates. A refundable deposit protects the lender
            against loss or damage.
          </p>
        </section>
        <section>
          <h2>4. Payments &amp; deposits</h2>
          <p className="muted">
            Payments and refundable deposits are processed securely through Khalti.
            Deposits are released on a successful return, or resolved by our team in
            the event of a dispute.
          </p>
        </section>
        <section>
          <h2>5. Prohibited use</h2>
          <p className="muted">
            You may not use EcoLend for unlawful purposes, list prohibited items,
            attempt to circumvent our security controls, or misuse other members&apos;
            data.
          </p>
        </section>
        <section>
          <h2>6. Liability</h2>
          <p className="muted">
            EcoLend is provided &quot;as is&quot; for this coursework project and is not a
            production service. To the extent permitted by law, we are not liable
            for losses arising from lending arrangements between members.
          </p>
        </section>
        <p className="text-sm">
          See also our <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
