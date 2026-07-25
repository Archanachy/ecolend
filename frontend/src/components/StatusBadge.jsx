// Maps a booking/listing status to a coloured pill so the state is legible at a
// glance and consistent everywhere it appears.
const VARIANT = {
  // Bookings
  requested: 'badge-warning',
  approved: 'badge-info',
  rejected: 'badge-danger',
  paid: 'badge-primary',
  active: 'badge-success',
  returned: 'badge-info',
  completed: 'badge-success',
  cancelled: 'badge-neutral',
  disputed: 'badge-danger',
  resolved: 'badge-info',
  // Listings / users
  available: 'badge-success',
  unavailable: 'badge-neutral',
  paused: 'badge-warning',
  removed_by_admin: 'badge-danger',
  suspended: 'badge-danger',
  banned: 'badge-danger',
  active_user: 'badge-success',
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const variant = VARIANT[status] || 'badge-neutral';
  const label = String(status).replace(/_/g, ' ');
  return <span className={`badge ${variant}`}>{label}</span>;
}
