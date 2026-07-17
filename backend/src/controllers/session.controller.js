// Active-sessions management: list the caller's sessions, revoke one, or revoke
// all others. Every operation is scoped to the authenticated user server-side.
const {
  listUserSessions,
  destroyOtherUserSessions,
  destroyUserSessionById,
} = require('../config/session');
const { logger } = require('../middleware/logger');

async function listSessions(req, res, next) {
  try {
    const sessions = await listUserSessions(req.userId);
    const result = sessions
      .map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        current: s.id === req.sessionID,
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function revokeOthers(req, res, next) {
  try {
    const revoked = await destroyOtherUserSessions(req.userId, req.sessionID);
    logger.info('auth.sessions.revoke_others', { userId: req.userId, revoked });
    return res.json({ revoked });
  } catch (err) {
    return next(err);
  }
}

async function revokeOne(req, res, next) {
  try {
    const ok = await destroyUserSessionById(req.userId, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Session not found' });
    logger.info('auth.sessions.revoke_one', { userId: req.userId });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listSessions, revokeOthers, revokeOne };
