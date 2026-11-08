import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // En desarrollo, /api va al Worker local (npm run dev -w apps/api). En producción, editor y API comparten origen.
    // CMS_API_URL permite apuntar a otra copia del API (p. ej. una segunda instancia de pruebas).
    proxy: { '/api': (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.CMS_API_URL ?? 'http://127.0.0.1:8787' },
  },
});
