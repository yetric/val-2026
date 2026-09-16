import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// Proxies to the standalone backend in ../server (its own port, its own
// history archive) — not the legacy public/ + server.js pair, which keeps
// running independently on :3000 for now.
export default defineConfig({
  plugins: [svelte({ preprocess: vitePreprocess() })],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/geography.json': 'http://localhost:3001',
      '/districts.json': 'http://localhost:3001',
    },
  },
});
