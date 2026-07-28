// Security-alerts viewer with acknowledge (page-load based, not websocket).
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listAlerts, acknowledgeAlert } from '../../api/admin';

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState([]);

  const load = useCallback(() => {
    listAlerts().then((res) => setAlerts(res.data));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function ack(id) {
    await acknowledgeAlert(id);
    load();
  }

  return (
    <div className="container-lg">
      <p className="text-sm"><Link to="/admin">← Admin</Link></p>
      <div className="page-header">
        <div>
          <span className="eyebrow">🛡️ Admin</span>
          <h1>Security alerts</h1>
        </div>
      </div>
      {alerts.length === 0 ? (
        <div className="empty-state">
          <h3>All clear</h3>
          <p>No security alerts right now.</p>
        </div>
      ) : (
        <ul className="list-plain stack">
          {alerts.map((a) => (
            <li key={a._id} className="card card-pad-sm">
              <div className="row-between">
                <div>
                  <div className="row" style={{ gap: 'var(--space-2)' }}>
                    <span className={`badge ${a.acknowledged ? 'badge-neutral' : 'badge-danger'}`}>{a.type}</span>
                    {a.acknowledged && <span className="muted text-xs">acknowledged</span>}
                  </div>
                  <p style={{ margin: 'var(--space-2) 0 var(--space-1)' }}>{a.detail}</p>
                  <p className="muted text-xs" style={{ margin: 0 }}>{new Date(a.createdAt).toLocaleString()}</p>
                </div>
                {!a.acknowledged && (
                  <button type="button" className="btn-outline btn-sm" onClick={() => ack(a._id)}>Acknowledge</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
