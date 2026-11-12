import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built site works from any folder or GitHub Pages path.
export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    // Shown on the home page as "Updated <date>" so each deployed version is identifiable.
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
});
