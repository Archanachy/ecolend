// Navbar bell with an unread badge. Polls on an interval (the project
// deliberately has no websocket layer) and refreshes on route change.
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getUnreadCount } from '../api/notifications';

const POLL_MS = 60000;

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    const load = () =>
      getUnreadCount()
        .then((res) => active && setUnread(res.data.unread))
        .catch(() => {});
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [location.pathname]);

  return (
    <Link
      to="/notifications"
      className="bell"
      aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
    >
      <span aria-hidden="true">🔔</span>
      {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  );
}
