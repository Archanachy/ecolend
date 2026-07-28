// Payment initiation page. Shows the order summary and hands off to Khalti's
// hosted page — EcoLend never sees any payment credential.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBooking, initiatePayment } from '../api/bookings';

export default function PaymentPay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    getBooking(id).then((res) => setBooking(res.data)).catch(() => setError('Could not load the booking.'));
  }, [id]);

  async function pay() {
    setError('');
    setRedirecting(true);
    try {
      const { data } = await initiatePayment(id);
      // Full-window redirect to Khalti's hosted payment page. This may be a
      // resumed attempt — the server returns the existing payment_url when a
      // previous one is still live.
      window.location.assign(data.payment_url);
    } catch (err) {
      setRedirecting(false);
      // The server settles a lost redirect on its own: if the earlier attempt
      // had in fact completed, the booking is already paid by the time we get
      // here, so send the user to the booking rather than showing an error.
      if (err.response?.status === 409 && /already paid/i.test(err.response?.data?.error || '')) {
        navigate(`/bookings/${id}`, { replace: true });
        return;
      }
      setError(err.response?.data?.error || 'Could not start the payment.');
    }
  }

  if (!booking) return <div className="container-sm"><p className="loading" role="status">{error || 'Loading…'}</p></div>;

  return (
    <div className="container-narrow">
      <div className="card">
        <span className="eyebrow">Checkout</span>
        <h1>Pay for your booking</h1>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <div className="card card-pad-sm" style={{ background: 'var(--color-surface-muted)', marginBottom: 'var(--space-4)' }}>
          <div className="row-between text-sm"><span className="muted">Dates</span><span>{new Date(booking.startDate).toLocaleDateString()} – {new Date(booking.endDate).toLocaleDateString()}</span></div>
          <div className="row-between text-sm"><span className="muted">Rental fee</span><span>NPR {booking.feeTotal}</span></div>
          <div className="row-between text-sm"><span className="muted">Refundable deposit</span><span>NPR {booking.depositAmount}</span></div>
          <hr />
          <div className="row-between"><strong>Total due</strong><span className="price">NPR {booking.feeTotal + booking.depositAmount}</span></div>
        </div>
        <button type="button" className="btn-block btn-lg" onClick={pay} disabled={redirecting}>
          {redirecting ? 'Redirecting to Khalti…' : 'Pay with Khalti'}
        </button>
        <p className="muted text-xs" style={{ marginTop: 'var(--space-3)', textAlign: 'center' }}>
          🔒 You&apos;ll be redirected to Khalti&apos;s secure page. EcoLend never sees your payment details.
        </p>
      </div>
    </div>
  );
}
