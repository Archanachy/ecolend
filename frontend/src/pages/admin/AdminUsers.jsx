// Admin user management: list users, suspend / reinstate.
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listUsers, suspendUser } from '../../api/admin';
import StatusBadge from '../../components/StatusBadge';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  const load = useCallback(() => {
    listUsers().then((res) => setUsers(res.data.items));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(u) {
    await suspendUser(u._id, u.status !== 'suspended');
    load();
  }

  return (
    <div className="container-lg">
      <p className="text-sm"><Link to="/admin">← Admin</Link></p>
      <div className="page-header">
        <div>
          <span className="eyebrow">🛡️ Admin</span>
          <h1>Users</h1>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td className="muted">{u.email}</td>
                <td><span className="badge badge-neutral">{u.role}</span></td>
                <td><StatusBadge status={u.status === 'active' ? 'active_user' : u.status} /></td>
                <td style={{ textAlign: 'right' }}>
                  {u.role !== 'admin' && (
                    <button type="button" className={u.status === 'suspended' ? 'btn-outline btn-sm' : 'btn-danger btn-sm'} onClick={() => toggle(u)}>
                      {u.status === 'suspended' ? 'Reinstate' : 'Suspend'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
