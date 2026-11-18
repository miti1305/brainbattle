import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development, calls to /api and /socket.io are forwarded to the Express server,
// so the React code never needs to know the backend URL.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});
