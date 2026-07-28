// Admin activity-log viewer with a simple action filter.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listLogs } from '../../api/admin';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [action, setAction] = useState('');

  useEffect(() => {
    listLogs(action ? { action } : {}).then((res) => setLogs(res.data.items));
  }, [action]);

  return (
    <div className="container-lg">
      <p className="text-sm"><Link to="/admin">← Admin</Link></p>
      <div className="page-header">
        <div>
          <span className="eyebrow">🛡️ Admin</span>
          <h1>Activity logs</h1>
        </div>
      </div>
      <div className="filter-bar">
        <input placeholder="🔍  Filter by action" value={action} onChange={(e) => setAction(e.target.value)} />
      </div>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table>
          <thead><tr><th>When</th><th>Action</th><th>Target</th><th>IP</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l._id}>
                <td className="muted text-sm">{new Date(l.createdAt).toLocaleString()}</td>
                <td><code style={{ fontSize: 'var(--text-sm)' }}>{l.action}</code></td>
                <td className="text-sm">{l.targetType} {l.targetId?.slice?.(-6)}</td>
                <td className="muted text-sm">{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="muted text-sm" style={{ padding: 'var(--space-5)' }}>No log entries match.</p>}
      </div>
    </div>
  );
}
