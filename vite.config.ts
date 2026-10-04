import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Les librairies changent rarement : des fichiers séparés restent en
        // cache navigateur d'un déploiement à l'autre.
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
