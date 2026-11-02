import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds to ../public, which server.js serves as static files alongside the
// API. Keeps one deploy, one Node app, no added hosting cost (design doc:
// "Tech stack" — cost-driven, no new infra beyond the existing cPanel plan).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
});
