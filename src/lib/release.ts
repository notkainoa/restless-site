// Reads the latest Restless release from GitHub once, at build time.
// The page must always render a version, so any failure (offline build,
// rate limit, malformed response) falls back to the last known release.

export const REPO = 'notkainoa/restless';
export const REPO_URL = `https://github.com/${REPO}`;
export const LATEST_URL = `${REPO_URL}/releases/latest`;
export const RELEASES_URL = `${REPO_URL}/releases`;

const FALLBACK_VERSION = '1.0.0';
const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

export interface Release {
  version: string;
  /** `Restless-<version>.zip`, the asset name every release uses. */
  assetName: string;
  /** Release notes page for this version. */
  notesUrl: string;
  /** Where the Download button points. Always the latest release. */
  downloadUrl: string;
}

function release(version: string, notesUrl?: string): Release {
  return {
    version,
    assetName: `Restless-${version}.zip`,
    notesUrl: notesUrl ?? `${REPO_URL}/releases/tag/v${version}`,
    downloadUrl: LATEST_URL,
  };
}

let cached: Promise<Release> | undefined;

export function getLatestRelease(): Promise<Release> {
  cached ??= fetchLatest();
  return cached;
}

async function fetchLatest(): Promise<Release> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'restless-site-build',
  };
  // Optional: avoids the 60 requests/hour anonymous limit on shared CI.
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);

    const data = (await res.json()) as { tag_name?: unknown; html_url?: unknown };
    const version = typeof data.tag_name === 'string' ? data.tag_name.replace(/^v/, '') : '';
    if (!SEMVER.test(version)) throw new Error(`Unexpected tag_name: ${String(data.tag_name)}`);

    const notesUrl =
      typeof data.html_url === 'string' && data.html_url.startsWith(`${REPO_URL}/`)
        ? data.html_url
        : undefined;
    return release(version, notesUrl);
  } catch (error) {
    console.warn(
      `[release] Using fallback version ${FALLBACK_VERSION}: ${(error as Error).message}`,
    );
    return release(FALLBACK_VERSION);
  }
}
