// Admin review moderation: list reviews and remove abusive ones.
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listAdminReviews, removeReview } from '../../api/admin';
import { SkeletonCards } from '../../components/Skeleton';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    listAdminReviews()
      .then((res) => setReviews(res.data.items))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRemove(id) {
    const ok = await confirm({
      title: 'Remove this review?',
      message: 'The review will be permanently deleted from the platform.',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    await removeReview(id);
    toast.success('Review removed.');
    load();
  }

  return (
    <div className="container-lg">
      <p className="text-sm"><Link to="/admin">← Admin</Link></p>
      <div className="page-header">
        <div>
          <span className="eyebrow">🛡️ Admin</span>
          <h1>Reviews</h1>
        </div>
      </div>
      {loading ? (
        <SkeletonCards count={3} grid={false} />
      ) : reviews.length === 0 ? (
        <div className="empty-state"><h3>No reviews yet</h3></div>
      ) : (
        <ul className="list-plain stack">
          {reviews.map((r) => (
            <li key={r._id} className="card card-pad-sm">
              <div className="row-between">
                <div>
                  <div className="row" style={{ gap: 'var(--space-2)' }}>
                    <span className="badge badge-warning">{'★'.repeat(r.rating)}</span>
                    <span className="muted text-xs">{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                  {r.comment && <p style={{ margin: 'var(--space-2) 0 0' }}>{r.comment}</p>}
                  <p className="muted text-xs" style={{ margin: 'var(--space-1) 0 0' }}>
                    about user {String(r.targetUserId).slice(-6)}
                  </p>
                </div>
                <button type="button" className="btn-danger btn-sm" onClick={() => onRemove(r._id)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
