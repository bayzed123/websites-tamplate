import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative by default: the demo is published several directories deep inside
// the showcase hub, and "./" is the only base that works without knowing where.
// A real deployment sets VITE_BASE to its own path ("/" on a custom domain,
// "/<repo>/" on a project Pages site).
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
