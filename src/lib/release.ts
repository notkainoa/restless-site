// Restless releases, read from the GitHub Releases API. The same lookup runs
// at build time (for the pages) and on request (for /download/latest and
// /api/releases), so a new release shows up without a redeploy.
//
// Only releases with a `Restless-<version>.zip` asset count. The repo also
// holds releases from before the rename (Amped 1.0.1, with Amped-1.0.1.zip),
// and those must never be offered.

export const REPO = 'notkainoa/restless';
export const REPO_URL = `https://github.com/${REPO}`;
export const LATEST_URL = `${REPO_URL}/releases/latest`;
export const RELEASES_URL = `${REPO_URL}/releases`;

/** The download page. Every Download button on the site points here. */
export const DOWNLOAD_PAGE = '/download';
/** Redirects to the newest Restless zip on GitHub. */
export const LATEST_ZIP = '/download/latest';

const FALLBACK_VERSION = '1.0.0';
const ASSET = /^Restless-(\d+)\.(\d+)\.(\d+)\.zip$/;
/** How long a fetched list counts as fresh inside one server instance. */
const FRESH_MS = 5 * 60 * 1000;

export interface RestlessRelease {
  version: string;
  /** `Restless-<version>.zip` */
  assetName: string;
  /** The zip itself (GitHub's browser_download_url). */
  url: string;
  /** Bytes. */
  size: number;
  /** ISO date the release was published. */
  publishedAt: string;
  /** The release notes page. */
  notesUrl: string;
}

interface GitHubRelease {
  draft?: boolean;
  prerelease?: boolean;
  html_url?: unknown;
  published_at?: unknown;
  assets?: { name?: unknown; size?: unknown; browser_download_url?: unknown }[];
}

/** Fetches every Restless release, newest version first. Throws on any failure. */
async function fetchReleases(): Promise<RestlessRelease[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'restless-site',
  };
  // Optional: lifts the 60 requests/hour anonymous limit.
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, {
    headers,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);

  const data = (await res.json()) as GitHubRelease[];
  if (!Array.isArray(data)) throw new Error('GitHub API returned something other than a list');

  const releases: (RestlessRelease & { key: number[] })[] = [];
  for (const r of data) {
    // A token with push access also sees drafts; neither drafts nor
    // prereleases are offered.
    if (r.draft || r.prerelease) continue;
    for (const a of r.assets ?? []) {
      const match = typeof a.name === 'string' ? ASSET.exec(a.name) : null;
      const url = a.browser_download_url;
      if (!match || typeof url !== 'string' || !url.startsWith(`${REPO_URL}/releases/download/`)) continue;
      const version = match.slice(1, 4).join('.');
      releases.push({
        version,
        assetName: match[0],
        url,
        size: typeof a.size === 'number' ? a.size : 0,
        publishedAt: typeof r.published_at === 'string' ? r.published_at : '',
        notesUrl:
          typeof r.html_url === 'string' && r.html_url.startsWith(`${REPO_URL}/`)
            ? r.html_url
            : `${REPO_URL}/releases/tag/v${version}`,
        key: match.slice(1, 4).map(Number),
      });
    }
  }
  if (releases.length === 0) throw new Error('No Restless-<version>.zip assets found');

  releases.sort((a, b) => b.key[0] - a.key[0] || b.key[1] - a.key[1] || b.key[2] - a.key[2]);
  return releases.map(({ key: _key, ...release }) => release);
}

let cache: { at: number; releases: RestlessRelease[] } | undefined;
let inflight: Promise<RestlessRelease[]> | undefined;

/**
 * Restless releases, newest first. Reuses a list fetched in the last five
 * minutes, and if GitHub fails, the last list this instance saw. Returns null
 * only when GitHub fails and there's nothing to fall back on.
 */
export async function getReleases(): Promise<RestlessRelease[] | null> {
  if (cache && Date.now() - cache.at < FRESH_MS) return cache.releases;
  inflight ??= fetchReleases().finally(() => (inflight = undefined));
  try {
    const releases = await inflight;
    cache = { at: Date.now(), releases };
    return releases;
  } catch (error) {
    console.warn(`[release] GitHub lookup failed: ${(error as Error).message}`);
    return cache?.releases ?? null;
  }
}

/** What the home page needs: the latest version, with a fallback so it always renders one. */
export interface Release {
  version: string;
  /** `Restless-<version>.zip`, the asset name every release uses. */
  assetName: string;
  /** Release notes page for this version. */
  notesUrl: string;
  /** Where the Download button points. Always the latest release. */
  downloadUrl: string;
}

export async function getLatestRelease(): Promise<Release> {
  const latest = (await getReleases())?.[0];
  if (!latest) console.warn(`[release] Using fallback version ${FALLBACK_VERSION}`);
  const version = latest?.version ?? FALLBACK_VERSION;
  return {
    version,
    assetName: `Restless-${version}.zip`,
    notesUrl: latest?.notesUrl ?? `${REPO_URL}/releases/tag/v${version}`,
    downloadUrl: LATEST_URL,
  };
}
