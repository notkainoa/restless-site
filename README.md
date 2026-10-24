# Restless website

Marketing site for [Restless](https://github.com/notkainoa/restless), the macOS menu bar app that keeps your Mac awake with the lid closed.

It's a single static page built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com). There's no backend, no analytics and no CMS. The app's [README](https://github.com/notkainoa/restless#readme) is the source of truth for the copy.

## Run it locally

You need Node 22.23 or newer (Astro 7’s minimum).

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in ./dist
npm run preview    # serve ./dist
```

## The version number

At build time `src/lib/release.ts` reads the latest release from the GitHub Releases API (`/repos/notkainoa/restless/releases/latest`) and fills in the version, the asset name (`Restless-<version>.zip`) and the release notes link. If the request fails (offline, rate limit, bad response), the build logs a warning and falls back to `1.0.0`. The Download buttons always point at <https://github.com/notkainoa/restless/releases/latest>, so they're never stale even when the version label is.

Set `GITHUB_TOKEN` in the build environment if anonymous API limits become a problem on shared CI.

Since the version is baked in at build time, publish a new app release and then redeploy the site. To automate that, create a [Vercel Deploy Hook](https://vercel.com/docs/deploy-hooks) and call it at the end of the app's `release.sh`, for example `curl -X POST "$VERCEL_DEPLOY_HOOK"`.

## Deploy to Vercel

The repo deploys with no extra setup. `vercel.json` only pins the build and adds long-lived caching for hashed assets.

1. On [vercel.com/new](https://vercel.com/new), import `notkainoa/restless-site`. Vercel detects Astro.
2. Deploy. That's it.

Or from the command line: `npx vercel` for a preview, `npx vercel --prod` for production.

Absolute URLs for the canonical link and the Open Graph image come from `SITE_URL` if it's set, otherwise from Vercel's production URL. Once there's a domain, set `SITE_URL=https://your.domain` in the project's environment variables.

## Brand assets

`public/brand/` holds copies of the icon from the app repo: the flat `restless-light.svg` and `restless-dark.svg`, plus the Icon Composer layers in `layers/`. If the icon changes, copy the new files over and run:

```sh
npm run assets
```

That regenerates `favicon.svg` (which follows the light/dark color scheme), `favicon.ico`, `apple-touch-icon.png` and the 1200×630 `og.png`. The outputs are committed, so builds don't run this step.

## Layout

```
src/
  pages/index.astro        the page, section by section
  components/
    Hero.astro             hero with the live eye
    EyeMark.astro          the icon as inline SVG (theme-aware; `live` adds the moving iris)
    LidDemo.astro          3D laptop and a working copy of the Restless panel
    Details.astro          menu bar states and the smaller features
    Helper.astro           how lid-closed mode stays passwordless
    Trust.astro, Download.astro, Header.astro, Footer.astro
  scripts/
    eye.ts                 spring-driven gaze that follows the pointer
    lid.ts                 the demo's state, mirroring the app's panel logic
  lib/release.ts           build-time GitHub release lookup with fallback
  styles/global.css        palette (from the icon's purples), type scale, buttons, reveals
scripts/generate-assets.mjs  favicon, touch icon and OG image
```

## Motion and accessibility

Motion is kept to a few purposeful pieces: the hero entrance, the eye (which opens on load, follows the pointer and glances around when idle), scroll reveals, the lid demo and the helper diagram. With `prefers-reduced-motion` the eye stays still, reveals become plain fades and the laptop switches state without animating. Everything also renders without JavaScript.

The theme follows the system until the visitor picks one with the toggle; the choice is remembered in `localStorage`.

## Credits

Restless began as a fork of [Amped](https://github.com/gustaferiksson/amped) by Gustaf Eriksson, and its panel design is adapted from [OpenUsage](https://github.com/robinebers/openusage).
