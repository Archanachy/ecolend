// Auth API calls. All go through the shared Axios client (sends the session
// cookie, redirects to /login on 401).
import client from './client';

export function register({ name, email, password }) {
  return client.post('/auth/register', { name, email, password });
}

export function login({ email, password }) {
  return client.post('/auth/login', { email, password });
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
