// Auth API calls. All go through the shared Axios client (sends the session
// cookie, redirects to /login on 401).
import client from './client';

export function register({ name, email, password, captchaToken }) {
  return client.post('/auth/register', { name, email, password, captchaToken });
}

export function login({ email, password, captchaToken }) {
  return client.post('/auth/login', { email, password, captchaToken });
}

export function logout() {
  return client.post('/auth/logout');
}

export function getMe() {
  return client.get('/auth/me');
}

export function verifyEmail(token) {
  return client.post('/auth/verify-email', { token });
}

export function resendVerification(email) {
  return client.post('/auth/verify-email/resend', { email });
}

export function forgotPassword(email) {
  return client.post('/auth/password/forgot', { email });
}

export function resetPassword(token, password) {
  return client.post('/auth/password/reset', { token, password });
}

export function mfaSetup() {
  return client.post('/auth/mfa/setup');
}

export function mfaEnable(code) {
  return client.post('/auth/mfa/enable', { code });
}

export function mfaVerify(payload) {
  // payload is { code } or { backupCode }
  return client.post('/auth/mfa/verify', payload);
}

export function mfaDisable(code) {
  return client.post('/auth/mfa/disable', { code });
}

export function listSessions() {
  return client.get('/auth/sessions');
}

export function revokeOtherSessions() {
  return client.delete('/auth/sessions/others');
}

export function revokeSession(id) {
  return client.delete(`/auth/sessions/${id}`);
}
