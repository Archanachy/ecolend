// Shared Axios instance. `withCredentials` sends the session cookie; a response
// interceptor redirects to /login on 401 so an expired/invalid session never
// leaves the user on a broken authenticated page.
import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
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
