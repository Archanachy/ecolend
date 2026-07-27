// The lender's own listings, with edit/delete actions.
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyListings, deleteListing, updateListing } from '../api/listings';
import StatusBadge from '../components/StatusBadge';
import { SkeletonCards } from '../components/Skeleton';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

export default function MyListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    getMyListings()
      .then((res) => setListings(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id) {
    const ok = await confirm({
      title: 'Delete this listing?',
      message:
        'This cannot be undone. Listings with bookings in progress cannot be deleted — pause one instead to hide it from Browse.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteListing(id);
      toast.success('Listing deleted.');
      load();
    } catch (err) {
      // Most often the server's 409: bookings are still in progress.
      toast.error(err.response?.data?.error || 'Could not delete that listing.');
    }
  }

  async function onToggleStatus(l) {
    const next = l.status === 'active' ? 'paused' : 'active';
    try {
      await updateListing(l._id, { status: next });
      toast.success(next === 'paused' ? 'Listing paused — hidden from Browse.' : 'Listing is live again.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update that listing.');
    }
  }

  return (
    <div className="container-md">
      <div className="page-header">
        <div>
          <span className="eyebrow">Lending</span>
          <h1>My listings</h1>
        </div>
        <Link to="/listings/new" className="btn">+ New listing</Link>
      </div>
      {loading ? (
        <SkeletonCards count={3} grid={false} />
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing listed yet</h3>
          <p>List a tool or piece of equipment and start earning.</p>
          <Link to="/listings/new" className="btn" style={{ marginTop: 'var(--space-4)' }}>+ New listing</Link>
        </div>
      ) : (
        <ul className="list-plain stack">
          {listings.map((l) => (
            <li key={l._id} className="card card-pad-sm">
              <div className="row-between">
                <div>
                  <Link to={`/listings/${l._id}`} style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{l.title}</Link>
                  <div style={{ marginTop: 'var(--space-2)' }}><StatusBadge status={l.status} /></div>
                </div>
                <div className="row">
                  {l.status !== 'removed_by_admin' && (
                    <button type="button" className="btn-outline btn-sm" onClick={() => onToggleStatus(l)}>
                      {l.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                  )}
                  <Link to={`/listings/${l._id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                  <button type="button" className="btn-danger btn-sm" onClick={() => onDelete(l._id)}>Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
