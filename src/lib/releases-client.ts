// The browser's copy of /api/releases. Fetched once per page and shared by
// the version list and the download page.
import type { RestlessRelease } from './release';

let pending: Promise<RestlessRelease[] | null> | undefined;

/** Every release, newest first, or null if the API didn't answer. */
export function loadReleases(): Promise<RestlessRelease[] | null> {
  pending ??= (async () => {
    try {
      const res = await fetch('/api/releases');
      if (!res.ok) return null;
      const { releases } = await res.json();
      return Array.isArray(releases) && releases.length > 0 ? (releases as RestlessRelease[]) : null;
    } catch {
      return null;
    }
  })();
  return pending;
}
