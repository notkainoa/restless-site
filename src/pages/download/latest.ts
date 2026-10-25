// /download/latest: redirects to the newest Restless-<version>.zip, so the
// browser downloads it and the visitor stays on the site.
import type { APIRoute } from 'astro';
import { getReleases, LATEST_URL } from '../../lib/release';

export const prerender = false;

// The CDN keeps the redirect for five minutes, serves the old one while it
// refreshes, and keeps serving it for a day if this function errors. Browsers
// don't cache it.
const CACHED = 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400, stale-if-error=86400';
const BRIEF = 'public, max-age=0, s-maxage=60';

export const GET: APIRoute = async ({ url }) => {
  const latest = (await getReleases())?.[0];
  if (latest) return redirect(latest.url, CACHED);

  // GitHub couldn't be reached. The page's automatic download asks with
  // ?auto: answer 204 so the browser stays put and the visitor can retry.
  // A click (no ?auto) goes to the latest release on GitHub instead, so a
  // download never fails outright.
  if (url.searchParams.has('auto')) {
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  }
  return redirect(LATEST_URL, BRIEF);
};

function redirect(location: string, cacheControl: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: location, 'Cache-Control': cacheControl },
  });
}
