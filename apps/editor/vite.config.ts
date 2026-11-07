import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // En desarrollo, /api va al Worker local (npm run dev -w apps/api). En producción, editor y API comparten origen.
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
});
