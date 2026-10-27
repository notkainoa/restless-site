# Restless website

Marketing site for [Restless](https://github.com/notkainoa/restless), the macOS menu bar app that keeps your Mac awake with the lid closed.

It's three static pages, the home page, `/download` and `/downloads`, built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com), plus two small server routes that read GitHub releases. There's no database, no analytics and no CMS. The app's [README](https://github.com/notkainoa/restless#readme) is the source of truth for the copy.

## Run it locally

You need Node 22.23 or newer (Astro 7’s minimum).

```sh
npm install
npm run dev        # http://localhost:4321, server routes included
npm run build      # Vercel build output in ./.vercel/output
```

`npm run dev` runs the server routes too. To run the production build the way Vercel does, use `npx vercel dev`.

## Downloads and releases

Publishing a release with `./release.sh <version>` in the app repo is the only step. The site picks up the new version on its own, and visitors download the zip without ever landing on a GitHub page.

- **`/download`** is the download page. On a Mac it starts the download right away, then shows how to install, a "Download didn't start? Try again" link and every version. It doesn't download on iPhone, iPad, Android, Windows or Linux, or when Chrome reports an Intel Mac. Every Download button on the site points here.
- **`/download?version=1.2.0`** (or `v1.2.0`) is the same page for one version: it downloads that version and names its zip in the steps. A version that was never released gets "There's no such version" and the list instead.
- **`/downloads`** is just the All versions list (the footer's Releases link). Nothing downloads there. Each version's Download button opens `/download?version=<version>` (the newest opens plain `/download`).
- **`/download/latest`** looks up the newest release and redirects to its `Restless-<version>.zip`, and **`/download/<version>`** (like `/download/1.2.0`) does the same for one version. The zip comes back as an attachment, so the browser downloads it and stays on the page.
- **`/api/releases`** returns every release as JSON for the All versions list.

Only releases with a `Restless-<version>.zip` asset count, so the pre-rename Amped release is never offered. Drafts and prereleases are skipped too. `src/lib/release.ts` does the lookup for both routes and for the build.

### Why a server route

The zip's name changes with every version, so a static link can't point straight at it, and GitHub's `releases/latest` link opens a GitHub page instead of the file. A tiny function that asks the GitHub Releases API for the newest zip and redirects to it keeps the page static and needs no redeploy after a release.

The two routes are the only code that runs on request. They opt out of prerendering (`export const prerender = false`) and the Vercel adapter turns them into a function. Every page is still prerendered.

### Caching and GitHub's rate limit

Both routes send `s-maxage=300, stale-while-revalidate=86400, stale-if-error=86400`, so Vercel's CDN answers almost every request, and each function instance asks GitHub at most once every five minutes. A new release shows up within about five minutes. That keeps the routes well inside GitHub's anonymous limit of 60 requests an hour, so they work without a token.

**Optional:** set `GITHUB_TOKEN` in the Vercel project's environment variables (Production and Preview) to raise the limit to 5,000 requests an hour. A fine-grained token with read-only access to public repositories is enough. The build uses it too.

### When GitHub is down

- Each function instance keeps the last list it fetched and uses that if GitHub stops answering.
- With nothing to fall back on, `/download/latest` redirects to <https://github.com/notkainoa/restless/releases/latest>, so a download never fails outright. The page's automatic download asks with `?auto` and gets an empty `204` instead, which leaves the visitor on the page with the Try again link.
- The All versions list is rendered at build time and then refreshed from `/api/releases`. If the API fails, the list from the build stays.
- The home page's version label is also read at build time, and falls back to `1.0.0` if GitHub can't be reached.

## Deploy to Vercel

The repo deploys with no extra setup. Astro's Vercel adapter writes the build output, and `vercel.json` only pins the build command and adds long-lived caching for hashed assets. `GITHUB_TOKEN` is optional (see above).

1. On [vercel.com/new](https://vercel.com/new), import `notkainoa/restless-site`. Vercel detects Astro.
2. Deploy. That's it.

Or from the command line: `npx vercel` for a preview, `npx vercel --prod` for production.

Absolute URLs (the canonical link and the Open Graph and Twitter image) are all built from one setting, line 8 of `astro.config.mjs`:

```js
  site: 'https://restless.kainoa.me',
```

If the domain changes, edit that line and redeploy.

## Brand assets

`public/brand/` holds copies of the icon from the app repo: the flat `restless-light.svg` and `restless-dark.svg`, plus the Icon Composer layers in `layers/`. If the icon changes, copy the new files over and run:

```sh
npm run assets
```

That regenerates `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` and the 1200×630 `og.png`. The outputs are committed, so builds don't run this step. `astro.config.mjs` hashes those three icon files into the links in `src/layouts/Base.astro`, so a browser fetches the new favicon instead of keeping the old one.

## Design

The home page has four parts, nothing else: the hero ("Lid shut." / "Still running." either side of the Restless panel at 11:41 pm), the five settings as sentences with working switches, one paragraph on approving the helper, and the download. Dark only, one typeface (Hanken Grotesk, self-hosted). The palette is neutral: sections alternate between a near-black (`--bg`) and a dark gray (`--bg-alt`), with the app icon's violet (`--accent`) on the download action, links and focus rings, and its deep indigo (`--deep`) under the closing download. Use the variables in `src/styles/global.css` (or their Tailwind names, like `bg-bg-alt` and `text-accent`) rather than hard-coded colors. The look came out of a pass with [tasteskill v2](https://www.tasteskill.dev/) and was then cut back to the essentials.

The panel, menu bar and Terminal in the hero are built in HTML from the app's own strings (`src/components/frags/`, styled by `src/styles/ui.css` under `[data-ui]`). The Terminal output is sample content.

The share image (`og.png`) uses *Moon, New York, March 8, 1865* by Lewis Morris Rutherfurd, public domain (source in `public/media/credits.json`).

## Layout

```
src/
  pages/
    index.astro            the home page
    downloads.astro        every version, no download
    download/index.astro   the download page
    download/[version].ts  redirect to the newest (latest) or one version's zip (server route)
    api/releases.ts        every release as JSON (server route)
  components/
    Nav.astro              the top bar
    Hero.astro             headline, the panel frame, the download
    Switches.astro         five settings as sentences with switches
    Approve.astro          the helper, in one paragraph
    Closing.astro          download and the facts that make it safe
    Footer.astro, EyeMark.astro, Icon.astro, Chevron.astro
    frags/                 panel, menu bar, Terminal
    download/              install steps, version list and row
  lib/release.ts           GitHub release lookup, filtering and fallbacks
  lib/format.ts            dates and file sizes, shared with the browser
  styles/global.css        tokens, type, buttons, entrances
  styles/ui.css            fragment styles, scoped to [data-ui]
scripts/generate-assets.mjs  favicon, touch icon and OG image
```

## Motion and accessibility

The headline rises in on load and each section's parts arrive once as you scroll; the switches answer clicks, Space and Enter. On `/download` the All versions button glides down to the list. With `prefers-reduced-motion` entrances become plain fades and the jump is instant. Everything renders without JavaScript; without it, `/download` shows a plain Download button instead of starting the download.

## Credits

Restless began as a fork of [Amped](https://github.com/gustaferiksson/amped) by Gustaf Eriksson, and its panel design is adapted from [OpenUsage](https://github.com/robinebers/openusage).
