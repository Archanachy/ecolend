// Shared Axios instance. `withCredentials` sends the session cookie; a response
// interceptor redirects to /login on 401 so an expired/invalid session never
// leaves the user on a broken authenticated page.
import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

// Double-submit CSRF: echo the csrfToken cookie in a header on state-changing
// requests. The backend sets that cookie on any GET, so it's present by the
// time the SPA issues its first write.
client.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (!['get', 'head', 'options'].includes(method)) {
    const token = getCookie('csrfToken');
    if (token) config.headers['X-CSRF-Token'] = token;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // The auth probe (/auth/me) is expected to 401 for guests — it must not
    // trigger the redirect, or guests would be bounced off public pages.
    const isAuthProbe = error.config?.url === '/auth/me';
    if (error.response?.status === 401 && !isAuthProbe) {
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default client;
