// Bookings where the current user is the borrower.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyBookings } from '../api/bookings';
import { SkeletonCards } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyBookings()
      .then((res) => setBookings(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-md">
      <div className="page-header">
        <div>
          <span className="eyebrow">Borrowing</span>
          <h1>My bookings</h1>
        </div>
        <Link to="/bookings/requests" className="btn btn-outline">Incoming requests →</Link>
      </div>
      {loading ? (
        <SkeletonCards count={3} grid={false} />
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <h3>No bookings yet</h3>
          <p>When you request to borrow an item, it will show up here.</p>
          <Link to="/browse" className="btn" style={{ marginTop: 'var(--space-4)' }}>Browse listings</Link>
        </div>
      ) : (
        <ul className="list-plain stack">
          {bookings.map((b) => (
            <li key={b._id}>
              <Link to={`/bookings/${b._id}`} className="card-link">
                <div className="row-between">
                  <div>
                    <h3 className="card-title">Booking #{b._id.slice(-6)}</h3>
                    <p className="muted text-sm" style={{ margin: 0 }}>Total NPR {b.feeTotal + b.depositAmount}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
