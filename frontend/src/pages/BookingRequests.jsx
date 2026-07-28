// Incoming booking requests where the current user is the lender.
// Requests awaiting a decision are actionable inline — approving is the single
// most common lender task, so it should not require opening each booking.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBookingRequests, changeBookingStatus } from '../api/bookings';
import { SkeletonCards } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

export default function BookingRequests() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const confirm = useConfirm();
  const toast = useToast();

  const load = useCallback(
    () =>
      getBookingRequests()
        .then((res) => setBookings(res.data))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  async function act(id, action) {
    if (action === 'reject') {
      const ok = await confirm({
        title: 'Decline this request?',
        message: 'The borrower will be told their request was declined. This cannot be undone.',
        confirmLabel: 'Decline',
        danger: true,
      });
      if (!ok) return;
    }
    setBusyId(id);
    try {
      await changeBookingStatus(id, action);
      toast.success(action === 'approve' ? 'Approved — the borrower can now pay.' : 'Request declined.');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'That action could not be completed.');
    } finally {
      setBusyId(null);
    }
  }

  const awaiting = bookings.filter((b) => b.status === 'requested').length;

  return (
    <div className="container-md">
      <p className="text-sm"><Link to="/bookings/mine">← My bookings</Link></p>
      <div className="page-header">
        <div>
          <span className="eyebrow">Lending</span>
          <h1>Incoming requests</h1>
          {!loading && awaiting > 0 && (
            <p>{awaiting} {awaiting === 1 ? 'request needs' : 'requests need'} your decision.</p>
          )}
        </div>
      </div>
      {loading ? (
        <SkeletonCards count={3} grid={false} />
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <h3>No incoming requests</h3>
          <p>Requests to borrow your listed items will appear here.</p>
          <Link to="/listings/new" className="btn" style={{ marginTop: 'var(--space-4)' }}>List an item</Link>
        </div>
      ) : (
        <ul className="list-plain stack">
          {bookings.map((b) => (
            <li key={b._id} className="card card-pad-sm">
              <div className="row-between">
                <div>
                  <div className="row" style={{ gap: 'var(--space-2)' }}>
                    <Link to={`/bookings/${b._id}`}><strong>Booking #{b._id.slice(-6)}</strong></Link>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="muted text-sm" style={{ margin: 'var(--space-1) 0 0' }}>
                    {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                    {' · '}NPR {b.feeTotal + b.depositAmount}
                  </p>
                </div>
                {b.status === 'requested' ? (
                  <div className="row">
                    <button type="button" className="btn-sm" disabled={busyId === b._id} onClick={() => act(b._id, 'approve')}>
                      Approve
                    </button>
                    <button type="button" className="btn-outline btn-sm" disabled={busyId === b._id} onClick={() => act(b._id, 'reject')}>
                      Decline
                    </button>
                  </div>
                ) : (
                  <Link to={`/bookings/${b._id}`} className="btn btn-outline btn-sm">View</Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
