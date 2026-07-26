// Active sessions page. Lists the user's sessions and lets them revoke a single
// device or all other devices. The current session is marked and can't be
// revoked from here (that's what logging out is for).
import { useEffect, useState, useCallback } from 'react';
import { listSessions, revokeSession, revokeOtherSessions } from '../api/auth';
import { SkeletonCards } from '../components/Skeleton';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await listSessions();
      setSessions(data);
    } catch {
      setError('Could not load your sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRevoke(id) {
    await revokeSession(id);
    load();
  }

  async function onRevokeOthers() {
    await revokeOtherSessions();
    load();
  }

  return (
    <div className="container-md">
      <div className="page-header">
        <div>
          <span className="eyebrow">Security</span>
          <h1>Active sessions</h1>
          <p>Devices currently signed in to your account.</p>
        </div>
        <button type="button" className="btn-outline" onClick={onRevokeOthers} disabled={sessions.length <= 1}>
          Log out all other devices
        </button>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {loading ? (
        <SkeletonCards count={3} grid={false} />
      ) : (
        <ul className="list-plain stack">
          {sessions.map((s) => (
            <li key={s.id} className="card card-pad-sm">
              <div className="row-between">
                <div>
                  <div className="row" style={{ gap: 'var(--space-2)' }}>
                    <strong>{s.current ? 'This device' : 'Another device'}</strong>
                    {s.current && <span className="badge badge-success">Current</span>}
                  </div>
                  {s.createdAt && <p className="muted text-sm" style={{ margin: 'var(--space-1) 0 0' }}>Signed in {new Date(s.createdAt).toLocaleString()}</p>}
                </div>
                {!s.current && (
                  <button type="button" className="btn-danger btn-sm" onClick={() => onRevoke(s.id)}>
                    Log out
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
