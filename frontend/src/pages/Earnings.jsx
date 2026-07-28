// Lender earnings dashboard. Deposits are excluded from earnings — they are
// refundable and never income, which the page states explicitly.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEarnings } from '../api/bookings';
import StatusBadge from '../components/StatusBadge';
import { SkeletonCards } from '../components/Skeleton';

export default function Earnings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEarnings()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container-lg">
        <SkeletonCards count={4} />
      </div>
    );
  }

  const stats = [
    { label: 'Total earned', value: `NPR ${data.totalEarned}`, hint: 'From completed bookings' },
    { label: 'Pending', value: `NPR ${data.pendingEarnings}`, hint: 'In-progress bookings' },
    { label: 'This month', value: `NPR ${data.thisMonth}`, hint: 'Completed since the 1st' },
    { label: 'Completed', value: data.completedCount, hint: `${data.activeCount} in progress` },
  ];

  return (
    <div className="container-lg">
      <div className="page-header">
        <div>
          <span className="eyebrow">Lending</span>
          <h1>Earnings</h1>
          <p>Rental income from items you lend out.</p>
        </div>
        <Link to="/listings/mine" className="btn btn-outline">My listings</Link>
      </div>

      <div className="stat-grid" style={{ marginBottom: 'var(--space-8)' }}>
        {stats.map((s) => (
          <div key={s.label} className="stat">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="muted text-xs" style={{ marginTop: 'var(--space-1)' }}>{s.hint}</div>
          </div>
        ))}
      </div>

      <div className="alert alert-info">
        Refundable deposits are held for the borrower and are never counted as earnings.
      </div>

      <h2>Recent activity</h2>
      {data.recent.length === 0 ? (
        <div className="empty-state">
          <h3>No earnings yet</h3>
          <p>Once someone books one of your items, it will appear here.</p>
          <Link to="/listings/new" className="btn" style={{ marginTop: 'var(--space-4)' }}>+ New listing</Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table>
            <thead>
              <tr><th>Booking</th><th>Dates</th><th>Status</th><th style={{ textAlign: 'right' }}>Fee</th></tr>
            </thead>
            <tbody>
              {data.recent.map((b) => (
                <tr key={b._id}>
                  <td><Link to={`/bookings/${b._id}`}>#{b._id.slice(-6)}</Link></td>
                  <td className="muted text-sm">
                    {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                  </td>
                  <td><StatusBadge status={b.status} /></td>
                  <td style={{ textAlign: 'right' }} className="price">NPR {b.feeTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
