// Loading placeholders. One shared implementation so every list in the app
// loads with the same shape and rhythm, instead of ad-hoc "Loading…" text.
// aria-hidden + an aria-busy container keeps them out of the accessibility
// tree — screen readers get the status message, not a pile of empty boxes.

// A list of card-shaped placeholders. `thumb` adds an image block on top.
export function SkeletonCards({ count = 6, thumb = false, grid = true }) {
  return (
    <ul className={grid ? 'card-grid' : 'list-plain stack'} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="card" aria-hidden="true">
          {thumb && <div className="skeleton skeleton-thumb" style={{ marginBottom: 'var(--space-4)' }} />}
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text" style={{ width: '55%' }} />
          <div className="skeleton skeleton-text" style={{ width: '35%' }} />
        </li>
      ))}
    </ul>
  );
}

// Compact rows, for tables and simple lists.
export function SkeletonRows({ count = 4 }) {
  return (
    <div className="card" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" style={{ padding: 'var(--space-3) 0' }}>
          <div className="skeleton skeleton-text" style={{ width: `${70 - i * 8}%` }} />
          <div className="skeleton skeleton-text" style={{ width: '30%', marginBottom: 0 }} />
        </div>
      ))}
    </div>
  );
}
