import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        bypass: (req) => {
          // Don't proxy Vite's internal paths
          if (req.url?.startsWith('/src/') || req.url?.startsWith('/@')) {
            return false;
          }
        },
      },
      '/s/': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
