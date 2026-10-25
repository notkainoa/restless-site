// /api/releases: every Restless release, newest first, for the version list
// on /download. Amped-era releases are already filtered out.
import type { APIRoute } from 'astro';
import { getReleases, RELEASES_URL } from '../../lib/release';

export const prerender = false;

export const GET: APIRoute = async () => {
  const releases = await getReleases();
  if (!releases) {
    return Response.json(
      { error: 'GitHub could not be reached', releasesUrl: RELEASES_URL },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return Response.json(
    { releases },
    {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400, stale-if-error=86400',
      },
    },
  );
};
