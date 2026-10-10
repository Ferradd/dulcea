import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  // TEAM_012: 6-page brochure site — inlining ~17KB of CSS into each HTML
  // removes the render-blocking stylesheet chain entirely
  // (render-blocking-insight est. ~1.1s on mobile home).
  build: { inlineStylesheets: 'always' },
  vite: {
    plugins: [tailwindcss()],
  },
});
