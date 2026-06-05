import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },

  server: {
    port: 3000,
    strictPort: false,   // fall back to next port if 3000 is busy
    open: false,
    proxy: {
      // Proxy all /api calls to the Express backend
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // Proxy socket.io for real-time features
      '/socket.io': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },

  preview: {
    port: 3000,
  },
});
