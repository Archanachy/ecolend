// Admin bookings overview, filterable by status, with dispute resolution.
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listAdminBookings, resolveDispute } from '../../api/admin';
import StatusBadge from '../../components/StatusBadge';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';

// Every status the booking state machine can produce, so the admin can filter
// to any of them — not just the three that used to be listed here.
const BOOKING_STATUSES = [
  'requested', 'approved', 'paid', 'active',
  'returned', 'completed', 'disputed', 'resolved', 'cancelled',
];

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('');
  const confirm = useConfirm();
  const toast = useToast();

  const load = useCallback(() => {
    listAdminBookings(status ? { status } : {}).then((res) => setBookings(res.data.items));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id, outcome) {
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
    await resolveDispute(id, outcome);
    toast.success('Dispute resolved.');
    load();
  }

  return (
    <div className="container-lg">
      <p className="text-sm"><Link to="/admin">← Admin</Link></p>
      <div className="page-header">
        <div>
          <span className="eyebrow">🛡️ Admin</span>
          <h1>Bookings &amp; disputes</h1>
        </div>
      </div>
      <div className="filter-bar">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>
      {bookings.length === 0 ? (
        <div className="empty-state"><h3>No bookings match</h3></div>
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
                    Total NPR {b.feeTotal + b.depositAmount} · {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                  </p>
                </div>
                {b.status === 'disputed' && (
                  <div className="row">
                    <button type="button" className="btn-outline btn-sm" onClick={() => resolve(b._id, 'release_to_lender')}>Release to lender</button>
                    <button type="button" className="btn-outline btn-sm" onClick={() => resolve(b._id, 'return_to_borrower')}>Return to borrower</button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
