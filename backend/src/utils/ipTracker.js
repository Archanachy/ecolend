// IP-based failed-login tracking and temporary blocking. Complements per-account
// lockout: if one IP racks up failures across many accounts, it is blocked
// outright. Admin IPs (ADMIN_IP_ALLOWLIST) bypass the IP block but never the
// per-account lockout. State is in-memory — fine for this single-instance
// coursework deployment; a multi-instance deployment would use a shared store.
const SecurityAlert = require('../models/securityAlert.model');
const { logger } = require('../middleware/logger');

const WINDOW_MS = 10 * 60 * 1000; // rolling 10-minute window
const MAX_FAILURES = 20; // failures before a block
const BLOCK_MS = 60 * 60 * 1000; // 1-hour block

const failures = new Map(); // ip -> number[] (failure timestamps)
const blockedUntil = new Map(); // ip -> epoch ms

function allowlist() {
  return (process.env.ADMIN_IP_ALLOWLIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAllowlisted(ip) {
  return allowlist().includes(ip);
}

function isBlocked(ip) {
  if (isAllowlisted(ip)) return false;
  const until = blockedUntil.get(ip);
  if (!until) return false;
  if (Date.now() > until) {
    blockedUntil.delete(ip);
    return false;
  }
  return true;
}

// Records one failed login for an IP; blocks the IP and raises a security alert
// once the threshold is crossed.
async function recordFailure(ip) {
  if (!ip || isAllowlisted(ip)) return;
  const now = Date.now();
  const recent = (failures.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  failures.set(ip, recent);

  if (recent.length >= MAX_FAILURES && !blockedUntil.has(ip)) {
    blockedUntil.set(ip, now + BLOCK_MS);
    logger.warn('security.ip_blocked', { ip });
    try {
      await SecurityAlert.create({
        type: 'rate_limit_triggered',
        detail: `IP ${ip} blocked after ${recent.length} failed logins`,
      });
    } catch {
      // Never let alerting break the request path.
    }
  }
}

function reset(ip) {
  failures.delete(ip);
  blockedUntil.delete(ip);
}

// For tests: clear all state.
function _clear() {
  failures.clear();
  blockedUntil.clear();
}

module.exports = { isBlocked, recordFailure, reset, _clear, MAX_FAILURES };
