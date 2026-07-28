// Booking detail — the most stateful page. It renders a different action panel
// depending on (status, viewer role); the server is the real authority and
// rejects any illegal or wrongly-roled action.
import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBooking, changeBookingStatus, addBookingComment } from '../api/bookings';
import { createReview, listReviews } from '../api/reviews';
import { resolveDispute } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';

const STATUS_LABEL = {
  requested: 'Requested',
  approved: 'Approved — payment due',
  paid: 'Paid',
  active: 'Active',
  returned: 'Returned — awaiting confirmation',
  completed: 'Completed',
  disputed: 'Disputed',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
};

// Which state-machine actions to offer, given status and the viewer's role.
function actionsFor(status, isLender, isBorrower) {
  const a = [];
  if (status === 'requested' && isLender) a.push(['Approve', 'approve'], ['Reject', 'reject']);
  if (status === 'requested' && isBorrower) a.push(['Cancel request', 'cancel']);
  if (status === 'approved' && (isLender || isBorrower)) a.push(['Cancel', 'cancel']);
  if (status === 'paid' && isLender) a.push(['Confirm handover', 'handover']);
  if (status === 'active' && isBorrower) a.push(['Confirm return', 'return']);
  if (status === 'returned' && isLender) a.push(['Confirm all good', 'complete'], ['Report an issue', 'dispute']);
  return a;
}

export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const uid = user?._id || user?.id;
  const [booking, setBooking] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [reviewMsg, setReviewMsg] = useState('');
  const [reviews, setReviews] = useState([]);

  const load = useCallback(() => {
    getBooking(id)
      .then((res) => {
        setBooking(res.data);
        setStatus('ready');
        // Both parties may review each other, once each. Fetch what already
        // exists so we can show their review and hide the form once you've
        // written yours (rather than letting you submit into a 409).
        return listReviews({ bookingId: id })
          .then((r) => setReviews(r.data))
          .catch(() => setReviews([]));
      })
      .catch((err) => setStatus(err.response?.status === 403 ? 'forbidden' : 'missing'));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action) {
    setError('');
    try {
      await changeBookingStatus(id, action);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'That action could not be completed.');
    }
  }

  // Admin-only: settle a disputed booking. Same endpoint the admin console
  // uses; the server re-checks the role and that the booking is disputed.
  async function resolve(outcome) {
    const toLender = outcome === 'release_to_lender';
    const ok = await confirm({
      title: 'Resolve this dispute?',
      message: toLender
        ? 'The deposit will be released to the lender. This is final.'
        : 'The deposit will be returned to the borrower. This is final.',
      confirmLabel: toLender ? 'Release to lender' : 'Return to borrower',
      danger: true,
    });
    if (!ok) return;
    setError('');
    try {
      await resolveDispute(id, outcome);
      toast.success('Dispute resolved.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resolve the dispute.');
    }
  }

  async function postComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    await addBookingComment(id, comment);
    setComment('');
    load();
  }

  async function submitReview(e) {
    e.preventDefault();
    setReviewMsg('');
    try {
      await createReview({ bookingId: id, rating: Number(review.rating), comment: review.comment });
      setReviewMsg('Thanks — your review was saved.');
      load(); // refresh so the form is replaced by what you just wrote
    } catch (err) {
      setReviewMsg(err.response?.data?.error || 'Could not save your review.');
    }
  }

  if (status === 'loading') return <div className="container-md"><p className="loading" role="status">Loading…</p></div>;
  if (status === 'forbidden') {
    return (
      <div className="container-md"><div className="empty-state"><h3>Access denied</h3><p>You are not a participant of this booking.</p><Link to="/bookings/mine" className="btn" style={{ marginTop: 'var(--space-4)' }}>Back to my bookings</Link></div></div>
    );
  }
  if (status === 'missing') {
    return (
      <div className="container-md"><div className="empty-state"><h3>Not found</h3><Link to="/bookings/mine" className="btn" style={{ marginTop: 'var(--space-4)' }}>Back to my bookings</Link></div></div>
    );
  }

  const isLender = String(booking.lenderId) === String(uid);
  const isBorrower = String(booking.borrowerId) === String(uid);
  // An admin can open any booking (the API allows it) but is deliberately NOT
  // given the parties' actions — an admin approving on a lender's behalf would
  // break the trust model. Their one power is resolving a dispute.
  const isAdmin = user?.role === 'admin' && !isLender && !isBorrower;
  const actions = actionsFor(booking.status, isLender, isBorrower);
  const myReview = reviews.find((r) => String(r.authorId) === String(uid));
  const primaryAction = (action) => ['approve', 'complete', 'handover', 'return'].includes(action);

  return (
    <div className="container-md">
      <p className="text-sm">
        <Link to={isAdmin ? '/admin/bookings' : isLender ? '/bookings/requests' : '/bookings/mine'}>← Back</Link>
      </p>

      <div className="card">
        <div className="row-between">
          <div>
            <span className="eyebrow">Booking</span>
            <h1 style={{ margin: 0 }}>#{booking._id.slice(-6)}</h1>
          </div>
          <StatusBadge status={booking.status} />
        </div>
        <p className="muted text-sm" style={{ marginTop: 'var(--space-2)' }}>{STATUS_LABEL[booking.status] || booking.status}</p>
        <hr />
        <dl className="detail-list">
          <dt>Dates</dt>
          <dd>{new Date(booking.startDate).toLocaleDateString()} – {new Date(booking.endDate).toLocaleDateString()}</dd>
          <dt>Rental fee</dt>
          <dd>NPR {booking.feeTotal}</dd>
          <dt>Deposit</dt>
          <dd>NPR {booking.depositAmount}</dd>
          <dt>Total</dt>
          <dd><span className="price">NPR {booking.feeTotal + booking.depositAmount}</span></dd>
        </dl>
      </div>

      {isAdmin && (
        <div className="card" style={{ marginTop: 'var(--space-5)' }}>
          <h2>🛡️ Admin</h2>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {booking.status === 'disputed' ? (
            <>
              <p className="muted text-sm">
                Decide where the NPR {booking.depositAmount} deposit goes. This is final and is
                written to the audit log.
              </p>
              <div className="row">
                <button type="button" className="btn-outline" onClick={() => resolve('release_to_lender')}>
                  Release deposit to lender
                </button>
                <button type="button" className="btn-outline" onClick={() => resolve('return_to_borrower')}>
                  Return deposit to borrower
                </button>
              </div>
            </>
          ) : (
            <p className="muted">
              You are viewing this booking as an admin. Admins cannot approve, cancel or complete
              on a member&apos;s behalf — only the lender and borrower can move their own booking
              along. Your only action here is resolving a dispute.
            </p>
          )}
        </div>
      )}

      {!isAdmin && (
      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h2>Actions</h2>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {booking.status === 'approved' && isBorrower && (
          <Link to={`/bookings/${booking._id}/pay`} className="btn btn-lg btn-block" style={{ marginBottom: 'var(--space-3)' }}>Pay now →</Link>
        )}
        {actions.length === 0 && !(booking.status === 'approved' && isBorrower) ? (
          <p className="muted">No actions available to you right now.</p>
        ) : (
          <div className="row">
            {actions.map(([label, action]) => (
              <button
                key={action}
                type="button"
                className={primaryAction(action) ? '' : action === 'reject' || action === 'dispute' || action === 'cancel' ? 'btn-outline' : 'btn-outline'}
                onClick={() => act(action)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h2>Timeline</h2>
        <ol className="list-plain stack-sm">
          {booking.statusHistory.map((h, i) => (
            <li key={i} className="row" style={{ justifyContent: 'space-between' }}>
              <StatusBadge status={h.status} />
              <span className="muted text-sm">{new Date(h.at).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      </div>

      {booking.status === 'completed' && (isLender || isBorrower) && (
        <div className="card" style={{ marginTop: 'var(--space-5)' }}>
          <h2>Reviews</h2>
          {reviews.length > 0 && (
            <ul className="list-plain stack-sm" style={{ marginBottom: 'var(--space-4)' }}>
              {reviews.map((r) => (
                <li key={r._id} className="card card-pad-sm" style={{ background: 'var(--color-surface-muted)' }}>
                  <div className="row-between">
                    <strong>{String(r.authorId) === String(uid) ? 'Your review' : 'Their review'}</strong>
                    <span aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  </div>
                  {r.comment && <div>{r.comment}</div>}
                </li>
              ))}
            </ul>
          )}
          {myReview ? (
            <p className="muted text-sm">
              You&apos;ve reviewed this booking. Reviews are permanent — they can&apos;t be edited
              or deleted, so they stay trustworthy for other members.
            </p>
          ) : (
        <>
          <h3>Leave a review</h3>
          {reviewMsg && <div className="alert alert-success" role="status">{reviewMsg}</div>}
          <form onSubmit={submitReview}>
            <div className="field">
              <label htmlFor="rating">Rating</label>
              <select id="rating" value={review.rating} onChange={(e) => setReview((r) => ({ ...r, rating: e.target.value }))} style={{ maxWidth: 120 }}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="review-comment">Your review</label>
              <input
                id="review-comment"
                placeholder="Share how it went…"
                value={review.comment}
                onChange={(e) => setReview((r) => ({ ...r, comment: e.target.value }))}
              />
            </div>
            <button type="submit">Submit review</button>
          </form>
        </>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h2>Messages</h2>
        {booking.comments.length === 0 ? (
          <p className="muted text-sm">No messages yet.</p>
        ) : (
          <ul className="list-plain stack-sm" style={{ marginBottom: 'var(--space-4)' }}>
            {booking.comments.map((c, i) => (
              <li key={i} className="card card-pad-sm" style={{ background: 'var(--color-surface-muted)' }}>
                <div className="muted text-xs">{new Date(c.at).toLocaleString()}</div>
                <div>{c.body}</div>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={postComment} className="row" style={{ flexWrap: 'nowrap' }}>
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a message" style={{ margin: 0 }} />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}
