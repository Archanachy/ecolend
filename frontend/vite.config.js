import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies /api to the backend so the SPA and API share an origin.
// The target is configurable: locally it defaults to localhost, but under
// Docker Compose it is set to the backend service name (http://backend:5000),
// since inside the frontend container `localhost` is the container itself.
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': proxyTarget,
    },
  },
});
