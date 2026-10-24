// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Absolute URLs (canonical, Open Graph) need to know where the site lives.
// Set SITE_URL once there's a domain; on Vercel the production URL is used.
const site =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:4321');

export default defineConfig({
  site,
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
