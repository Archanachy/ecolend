// Public browse page: filter/sort listings and page through results.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { browseListings } from '../api/listings';
import { CATEGORIES } from '../constants/categories';
import FavoriteButton from '../components/FavoriteButton';
import { SkeletonCards } from '../components/Skeleton';

export default function Browse() {
  const [filters, setFilters] = useState({
    q: '', category: '', location: '', sort: 'newest', minPrice: '', maxPrice: '',
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    browseListings({ ...filters, page })
      .then((res) => {
        if (active) setData(res.data);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filters, page]);

  function update(field, value) {
    setPage(1);
    setFilters((f) => ({ ...f, [field]: value }));
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Marketplace</span>
          <h1>Browse listings</h1>
          <p>{data.total > 0 ? `${data.total} item${data.total === 1 ? '' : 's'} available to borrow` : 'Find tools and equipment near you'}</p>
        </div>
      </div>

      <div className="filter-bar">
        <input placeholder="🔍  Search" value={filters.q} onChange={(e) => update('q', e.target.value)} />
        <select value={filters.category} onChange={(e) => update('category', e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="Location" value={filters.location} onChange={(e) => update('location', e.target.value)} />
        <input
          type="number"
          min="0"
          placeholder="Min NPR"
          value={filters.minPrice}
          onChange={(e) => update('minPrice', e.target.value)}
          aria-label="Minimum price per day"
        />
        <input
          type="number"
          min="0"
          placeholder="Max NPR"
          value={filters.maxPrice}
          onChange={(e) => update('maxPrice', e.target.value)}
          aria-label="Maximum price per day"
        />
        <select value={filters.sort} onChange={(e) => update('sort', e.target.value)} aria-label="Sort by">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>

      {loading ? (
        <SkeletonCards count={6} thumb />
      ) : data.items.length === 0 ? (
        <div className="empty-state">
          <h3>No listings match your filters</h3>
          <p>Try widening your search or clearing a filter.</p>
        </div>
      ) : (
        <ul className="card-grid">
          {data.items.map((l) => (
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
                <p className="muted text-sm" style={{ margin: 'var(--space-1) 0 0' }}>
                  Refundable deposit NPR {l.depositAmount}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data.pages > 1 && (
        <div className="pagination">
          <button type="button" className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Previous
          </button>
          <span>Page {page} of {data.pages}</span>
          <button type="button" className="btn-outline btn-sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
