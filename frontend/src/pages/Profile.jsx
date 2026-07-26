// Public profile view. Shows only non-sensitive fields (the API never returns
// email/phone/address for another user).
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getPublicProfile } from '../api/users';
import { listReviews } from '../api/reviews';
import { useAuth } from '../context/AuthContext';


export default function Profile() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');
  const [reviews, setReviews] = useState([]);
  const navigate = useNavigate();

  async function onLogout() {
    localStorage.removeItem('userId');
    await logout();
    navigate('/login');
  }

  useEffect(() => {
    getPublicProfile(id)
      .then((res) => {
        setProfile(res.data);
        setStatus('ready');
      })
      .catch(() => setStatus('missing'));
    listReviews(id)
      .then((res) => setReviews(res.data))
      .catch(() => setReviews([]));
  }, [id]);

  if (status === 'loading') return <div className="container-sm"><p className="loading" role="status">Loading…</p></div>;
  if (status === 'missing') return <div className="container-sm"><div className="empty-state"><h3>Profile not found</h3></div></div>;

  const isOwn = String(user?._id || user?.id) === String(profile.id);
  const initial = profile.name?.[0]?.toUpperCase() || '?';
  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  

  return (    
    <div className="container-sm">
      <div className="card">
        <div className="row" style={{ gap: 'var(--space-4)' }}>
          <span
            aria-hidden="true"
            style={{
              width: 64, height: 64, borderRadius: 'var(--radius-pill)',
              background: 'var(--color-primary-soft)', color: 'var(--color-primary-hover)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'var(--text-2xl)', fontWeight: 800, flex: '0 0 auto',
            }}
          >
            {initial}
          </span>
          <div>
            <h1 style={{ margin: 0 }}>{profile.name}</h1>
            {profile.profile.location && <p className="muted" style={{ margin: 'var(--space-1) 0 0' }}>📍 {profile.profile.location}</p>}
            {avg && (
              <p className="muted" style={{ margin: 'var(--space-1) 0 0' }}>
                {'★'.repeat(Math.round(avg))} {avg} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h2>Reviews</h2>
        {reviews.length === 0 ? (
          <p className="muted text-sm">No reviews yet.</p>
        ) : (
          <ul className="list-plain stack">
            {reviews.map((r) => (
              <li key={r._id} className="card card-pad-sm" style={{ background: 'var(--color-surface-muted)' }}>
                <div className="row-between">
                  <span className="badge badge-warning">{'★'.repeat(r.rating)}</span>
                  <span className="muted text-xs">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.comment && <p style={{ margin: 'var(--space-2) 0 0' }}>{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="nav-actions" style={{ marginTop: 'var(--space-5)' }}>
        {isOwn && <button type="button" className="btn btn-outline btn-sm" onClick={onLogout}>Log out</button>}

      </div>

      
    </div>
  );
}
