// Shared by the build and the browser, so the version list reads the same
// whether it was rendered at build time or refreshed from /api/releases.

const DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "Oct 24, 2026", or '' for a missing date. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : DATE.format(date);
}

/** Decimal units, the way Finder counts: 2708514 → "2.7 MB". */
export function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
