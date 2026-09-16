import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// The legacy app (public/ + server.js) keeps running on :3000 untouched;
// this dev server proxies API + data calls to it so the new frontend works
// against real live results without duplicating any backend code.
export default defineConfig({
  plugins: [svelte({ preprocess: vitePreprocess() })],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/geography.json': 'http://localhost:3000',
      '/districts.json': 'http://localhost:3000',
    },
  },
});
