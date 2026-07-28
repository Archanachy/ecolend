// Landing page after returning from Khalti. The result shown here was computed
// server-side (the backend verified the payment via Khalti's Lookup API before
// redirecting here); the ?result value is only a display hint. The real booking
// status is authoritative on the booking page.
import { useParams, useSearchParams, Link } from 'react-router-dom';

export default function PaymentCallback() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const result = params.get('result');

  return (
    <div className="container-narrow">
      <div className="card" style={{ textAlign: 'center' }}>
        {result === 'success' && (
          <>
            <div style={{ fontSize: 56, lineHeight: 1 }} aria-hidden="true">✅</div>
            <h1 style={{ color: 'var(--color-success)' }}>Payment received</h1>
            <p className="muted">Your booking is now paid. The lender will arrange handover.</p>
            <Link to={`/bookings/${id}`} className="btn btn-block" style={{ marginTop: 'var(--space-4)' }}>Continue</Link>
          </>
        )}
        {result === 'pending' && (
          <>
            <div style={{ fontSize: 56, lineHeight: 1 }} aria-hidden="true">⏳</div>
            <h1>We couldn&apos;t confirm your payment yet</h1>
            <p className="muted">If money left your account it will be reconciled — you can also try again.</p>
            <div className="form-actions" style={{ justifyContent: 'center' }}>
              <Link to={`/bookings/${id}/pay`} className="btn">Retry payment</Link>
              <Link to={`/bookings/${id}`} className="btn btn-ghost">Back to booking</Link>
            </div>
          </>
        )}
        {(result === 'failed' || !result) && (
          <>
            <div style={{ fontSize: 56, lineHeight: 1 }} aria-hidden="true">❌</div>
            <h1>Payment was not completed</h1>
            <p className="muted">No charge was made. You can try again whenever you&apos;re ready.</p>
            <div className="form-actions" style={{ justifyContent: 'center' }}>
              <Link to={`/bookings/${id}/pay`} className="btn">Retry payment</Link>
              <Link to={`/bookings/${id}`} className="btn btn-ghost">Back to booking</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
