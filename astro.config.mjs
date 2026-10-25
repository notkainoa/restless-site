// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // The one place the site's address lives: the canonical link and the
  // Open Graph and Twitter image URLs are all built from it.
  site: 'https://restless-site.vercel.app',
  devToolbar: { enabled: false },
  // Terminal fragments are <pre>; keep their line breaks exactly as written.
  compressHTML: false,
  vite: {
    plugins: [tailwindcss()],
  },
});
