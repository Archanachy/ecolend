// Role-based access control helpers. Role is read only from the server-side
// session (never from the request), which — together with per-resource
// ownership checks in the controllers — is what prevents privilege escalation
// and IDOR across the app. Use requireRole for role-gated routes; use
// isOwnerOrAdmin inside controllers after loading a resource.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.role || !roles.includes(req.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

// True if the current user owns the resource (by id) or is an admin. The owner
// id is taken from the resource loaded server-side, and the caller id from the
// session — never from client-supplied values.
function isOwnerOrAdmin(req, ownerId) {
  if (req.role === 'admin') return true;
  return ownerId && String(ownerId) === String(req.userId);
}

module.exports = { requireRole, isOwnerOrAdmin };
