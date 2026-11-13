import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Relative base so the built site works from any path.
export default defineConfig({
  base: './',
  plugins: [react(), cloudflare()],
  define: {
    // Shown on the home page as "Updated <date>" so each deployed version is identifiable.
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
});
