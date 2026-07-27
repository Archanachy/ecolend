// Public listing detail. Authenticated users can pick dates and request a
// booking; guests are prompted to log in.
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getListing, getListingAvailability } from '../api/listings';
import FavoriteButton from '../components/FavoriteButton';
import { createBooking } from '../api/bookings';
import { removeListing } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [listing, setListing] = useState(null);
  const [status, setStatus] = useState('loading');
  const [dates, setDates] = useState({ startDate: '', endDate: '' });
  const [error, setError] = useState('');

  const [photoIndex, setPhotoIndex] = useState(0);
  const [booked, setBooked] = useState([]);

  useEffect(() => {
    getListing(id)
      .then((res) => {
        setListing(res.data);
        setPhotoIndex(0);
        setStatus('ready');
      })
      .catch(() => setStatus('missing'));
    getListingAvailability(id)
      .then((res) => setBooked(res.data))
      .catch(() => setBooked([]));
  }, [id]);

  // True when the chosen range overlaps an existing booking.
  function overlapsBooked(start, end) {
    if (!start || !end) return false;
    const s = new Date(start);
    const e = new Date(end);
    return booked.some((b) => s < new Date(b.endDate) && e > new Date(b.startDate));
  }

  async function requestBooking(e) {
    e.preventDefault();
    setError('');
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await createBooking({ listingId: id, ...dates });
      navigate(`/bookings/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create the booking.');
    }
  }

  async function adminRemove() {
    const ok = await confirm({
      title: 'Remove this listing?',
      message: 'Moderation action: the listing will no longer be visible to anyone.',
      confirmLabel: 'Remove listing',
      danger: true,
    });
    if (!ok) return;
    try {
      await removeListing(id);
      toast.success('Listing removed.');
      navigate('/browse');
    } catch {
      toast.error('Could not remove the listing.');
    }
  }

  if (status === 'loading') return <div className="container-md"><p className="loading" role="status">Loading…</p></div>;
  if (status === 'missing') {
    return (
      <div className="container-md">
        <div className="empty-state">
          <h3>Listing unavailable</h3>
          <p>This listing is no longer available.</p>
          <Link to="/browse" className="btn" style={{ marginTop: 'var(--space-4)' }}>Back to browse</Link>
        </div>
      </div>
    );
  }

  const days =
    dates.startDate && dates.endDate
      ? Math.max(0, Math.ceil((new Date(dates.endDate) - new Date(dates.startDate)) / 86400000))
      : 0;
  const feePart = days * listing.feePerDay;
  const total = feePart + listing.depositAmount;
  const conflict = overlapsBooked(dates.startDate, dates.endDate);

  return (
    <div className="container-md">
      <p className="text-sm"><Link to="/browse">← Back to browse</Link></p>

      <div className="card">
        {listing.photos?.length > 0 && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <img
              src={listing.photos[photoIndex]}
              alt={`${listing.title} photo ${photoIndex + 1}`}
              className="listing-thumb"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            {listing.photos.length > 1 && (
              <div className="gallery-thumbs">
                {listing.photos.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    className={`gallery-thumb ${i === photoIndex ? 'is-active' : ''}`}
                    onClick={() => setPhotoIndex(i)}
                    aria-label={`Show photo ${i + 1}`}
                    aria-current={i === photoIndex}
                  >
                    <img src={url} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="row-between">
          <span className="badge badge-neutral">{listing.category}</span>
          <FavoriteButton listingId={listing._id} />
        </div>
        <h1 style={{ marginTop: 'var(--space-3)' }}>{listing.title}</h1>
        {listing.location && <p className="muted">📍 {listing.location}</p>}
        {listing.description && <p>{listing.description}</p>}
        <div className="row" style={{ marginTop: 'var(--space-4)' }}>
          <span className="price" style={{ fontSize: 'var(--text-xl)' }}>NPR {listing.feePerDay}</span>
          <span className="price-unit">per day</span>
          <span className="chip">Refundable deposit NPR {listing.depositAmount}</span>
        </div>
        <p className="text-sm" style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>
          <Link to={`/profile/${listing.ownerId}`}>View lender profile →</Link>
        </p>
        {user?.role === 'admin' && (
          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" className="btn-danger btn-sm" onClick={adminRemove}>Remove listing (admin)</button>
          </div>
        )}
      </div>

      <form onSubmit={requestBooking} className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h2>Request to borrow</h2>
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        {booked.length > 0 && (
          <div className="alert alert-warning">
            <div>
              <strong>Already booked:</strong>
              <ul className="list-plain text-sm" style={{ marginTop: 'var(--space-1)' }}>
                {booked.map((b) => (
                  <li key={`${b.startDate}-${b.endDate}`}>
                    {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div className="row" style={{ alignItems: 'flex-start', gap: 'var(--space-4)' }}>
          <div className="field" style={{ flex: '1 1 160px', marginBottom: 0 }}>
            <label htmlFor="startDate">Start date</label>
            <input id="startDate" type="date" value={dates.startDate} onChange={(e) => setDates((d) => ({ ...d, startDate: e.target.value }))} required />
          </div>
          <div className="field" style={{ flex: '1 1 160px', marginBottom: 0 }}>
            <label htmlFor="endDate">End date</label>
            <input id="endDate" type="date" value={dates.endDate} onChange={(e) => setDates((d) => ({ ...d, endDate: e.target.value }))} required />
          </div>
        </div>

        {days > 0 && (
          <div className="card card-pad-sm" style={{ background: 'var(--color-surface-muted)', marginTop: 'var(--space-4)' }}>
            <div className="row-between text-sm"><span className="muted">{days} day(s) × NPR {listing.feePerDay}</span><span>NPR {feePart}</span></div>
            <div className="row-between text-sm"><span className="muted">Refundable deposit</span><span>NPR {listing.depositAmount}</span></div>
            <hr />
            <div className="row-between"><strong>Total due</strong><span className="price">NPR {total}</span></div>
          </div>
        )}
        {conflict && (
          <p className="field-error" role="alert" style={{ marginTop: 'var(--space-3)' }}>
            Those dates overlap an existing booking. Please pick another range.
          </p>
        )}
        {!user && <p className="muted text-sm" style={{ marginTop: 'var(--space-3)' }}>You must be logged in to request a booking.</p>}
        <button type="submit" style={{ marginTop: 'var(--space-4)' }} disabled={conflict}>
          {user ? 'Request to borrow' : 'Log in to book'}
        </button>
      </form>
    </div>
  );
}
