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
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default client;
