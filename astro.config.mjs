// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

export default defineConfig({
  // The one place the site's address lives: the canonical link and the
  // Open Graph and Twitter image URLs are all built from it.
  site: 'https://restless.kainoa.me',
  // Every page is prerendered. Only the two routes that read GitHub on
  // request (src/pages/download/latest.ts, src/pages/api/releases.ts) opt out
  // with `prerender = false` and run as Vercel Functions.
  adapter: vercel(),
  devToolbar: { enabled: false },
  // Terminal fragments are <pre>; keep their line breaks exactly as written.
  compressHTML: false,
  vite: {
    plugins: [tailwindcss()],
  },
});
