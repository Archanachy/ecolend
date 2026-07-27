// Saved listings. Reads the full listing objects from the server; the hearts
// are driven by the shared favorites context so removing one updates instantly.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listFavorites } from '../api/favorites';
import { useFavorites } from '../context/FavoritesContext';
import FavoriteButton from '../components/FavoriteButton';
import { SkeletonCards } from '../components/Skeleton';

export default function Favorites() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { ids } = useFavorites();

  useEffect(() => {
    listFavorites()
      .then((res) => setItems(res.data))
      .finally(() => setLoading(false));
  }, []);

  // Hide anything unsaved during this visit without needing a refetch.
  const visible = items.filter((l) => ids.has(String(l._id)));

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Your list</span>
          <h1>Saved listings</h1>
          <p>{visible.length > 0 ? `${visible.length} saved` : 'Items you save appear here'}</p>
        </div>
      </div>

      {loading ? (
        <SkeletonCards count={3} thumb />
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing saved yet</h3>
          <p>Tap the ♡ on any listing to keep it here for later.</p>
          <Link to="/browse" className="btn" style={{ marginTop: 'var(--space-4)' }}>Browse listings</Link>
        </div>
      ) : (
        <ul className="card-grid">
          {visible.map((l) => (
            <li key={l._id} style={{ position: 'relative' }}>
              <FavoriteButton listingId={l._id} className="fav-btn-float" />
              <Link to={`/listings/${l._id}`} className="card-link">
                {l.photos?.[0] ? (
                  <img src={l.photos[0]} alt={l.title} className="card-thumb" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div className="card-thumb-placeholder" aria-hidden="true">🛠️</div>
                )}
                <span className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>{l.category}</span>
                <h3 className="card-title">{l.title}</h3>
                {l.location && <p className="muted text-sm" style={{ margin: '0 0 var(--space-3)' }}>📍 {l.location}</p>}
                <p style={{ margin: 0 }}>
                  <span className="price">NPR {l.feePerDay}</span>
                  <span className="price-unit"> /day</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
