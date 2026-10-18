import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
const proxy = { '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true } };
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy, fs: { allow: ['..'] } },
  preview: { port: 5173, strictPort: true, proxy },
  build: {
    rollupOptions: {
      output: { manualChunks: { charts: ['recharts'], maps: ['leaflet', 'react-leaflet'] } },
    },
  },
});
