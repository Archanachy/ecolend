// Notification centre. Clicking an item marks it read and follows its link.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../api/notifications';
import { SkeletonCards } from '../components/Skeleton';

const ICON = { booking: '📅', payment: '💳', review: '⭐', system: '🔔' };

function timeAgo(date) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    listNotifications(50)
      .then((res) => {
        setItems(res.data.items);
        setUnread(res.data.unread);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function open(n) {
    if (!n.read) {
      await markNotificationRead(n._id).catch(() => {});
      setItems((list) => list.map((i) => (i._id === n._id ? { ...i, read: true } : i)));
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.link) navigate(n.link);
  }

  async function readAll() {
    await markAllNotificationsRead().catch(() => {});
    setItems((list) => list.map((i) => ({ ...i, read: true })));
    setUnread(0);
  }

  return (
    <div className="container-md">
      <div className="page-header">
        <div>
          <span className="eyebrow">Activity</span>
          <h1>Notifications</h1>
          <p>{unread > 0 ? `${unread} unread` : 'You are all caught up'}</p>
        </div>
        {unread > 0 && (
          <button type="button" className="btn-outline" onClick={readAll}>
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonCards count={4} grid={false} />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <h3>No notifications yet</h3>
          <p>Booking requests, approvals and payments will show up here.</p>
          <Link to="/browse" className="btn" style={{ marginTop: 'var(--space-4)' }}>Browse listings</Link>
        </div>
      ) : (
        <ul className="list-plain stack">
          {items.map((n) => (
            <li key={n._id}>
              <button
                type="button"
                onClick={() => open(n)}
                className={`notif ${n.read ? '' : 'is-unread'}`}
              >
                <span className="notif-icon" aria-hidden="true">{ICON[n.type] || '🔔'}</span>
                <span className="notif-body">
                  <span className="notif-message">{n.message}</span>
                  <span className="notif-time">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && <span className="notif-dot" aria-label="Unread" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
