// @ts-check
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// Browsers keep favicons far longer than the page's cache headers say, so the
// icon links carry a fingerprint of the files. Regenerating the icons
// (npm run assets) changes it, and every browser fetches the new ones.
const iconVersion = ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png']
  .reduce(
    (hash, file) => hash.update(readFileSync(new URL(`./public/${file}`, import.meta.url))),
    createHash('sha256'),
  )
  .digest('hex')
  .slice(0, 8);

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
    define: { __ICON_VERSION__: JSON.stringify(iconVersion) },
  },
});
