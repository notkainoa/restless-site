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

That regenerates `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` and the 1200×630 `og.png`. The outputs are committed, so builds don't run this step.

## Design

The page was art-directed with [tasteskill v2](https://www.tasteskill.dev/) (direction "The product performs", seed 425275325; palette redrawn once to "green-black and bone" so the violet app icon is the only purple on the page). In short:

- **Idea:** one night on a closed MacBook. The hero headline is split around a frame, "Lid shut." on the left and "Still running." on the right, while a reel of that night passes through it as you scroll: the lid coming down at 11:41 pm, the moon, the build at 62%, done at 3:12 am.
- **Pictures are the product's own interface,** built in HTML at true size from the app's real strings (the panel, the helper alert, Settings), plus macOS screens around it (Terminal, Downloads, Notification Center, System Settings). Every fragment's root has `data-ui`; inside it the product's own conventions apply.
- **The live thing:** the five settings as sentences, each ending in Restless's switch. Flipping them changes the menu bar eye (`eye.slash` / `eye` / `eye.fill`) and the status line using the app's own rules.
- **House rules:** one typeface (Hanken Grotesk, self-hosted), five type sizes, one ground, one ink, one accent on the download action. No gradients, no shadows outside fragments, no eyebrow labels, no hairlines.

Sample content, for you to keep or replace: the build, deploy, download, notification and agent logs in the fragments are invented to look like a believable night's work; none of them claims anything about real users.

### Checking it

The skill's gates were run on the production build (`npm run build && npm run preview`):

```sh
node <taste-skill>/scripts/lint.mjs src
node <taste-skill>/scripts/inspect.mjs http://localhost:4321/
```

Both pass with no failures. Two warnings are known and deliberate: em dashes appear only inside quoted app and Terminal strings, and on phones the inspector reads the hero reel's clipped frames as crossing the headline (they're clipped by the window, so nothing visibly does). Its working files go in `.taste-skill/`, which is git-ignored.

## Pictures

`public/media/` holds the found pictures, with their sources in `credits.json` and a credit line in the footer. Both are public domain:

- *Moon, New York, March 8, 1865* by Lewis Morris Rutherfurd (ETH-Bibliothek Zürich, via Wikimedia Commons)
- *Five Minutes in Orbit* by NASA Earth Observatory, from photographs by the Expedition 73 crew (via Wikimedia Commons), trimmed to 14 seconds, muted, as WebM and MP4

## Layout

```
src/
  pages/index.astro        the page, in the order of its argument
  components/
    Hero.astro             split headline and the night reel
    Showcase.astro         what keeps running: SSH, downloads, builds, agents
    Switches.astro         the live thing: five sentences with switches
    HowItWorks.astro       approve the helper once (pinned stage, three states)
    Proof.astro            signed, notarized, open source, Sparkle, macOS 26
    Closing.astro          the download, with Restless as it first opens
    Night.astro            the closing clip
    Footer.astro           one line, plus credits
    EyeMark.astro          the app icon as inline SVG
    frags/                 interface fragments (panel, menu bar, alert, windows)
  scripts/reel.ts          the hero reel's scroll stepping
  lib/release.ts           build-time GitHub release lookup with fallback
  styles/global.css        tokens, type steps, buttons, entrances
  styles/ui.css            fragment styles, scoped to [data-ui]
scripts/generate-assets.mjs  favicon, touch icon and OG image
```

## Motion and accessibility

The hero reel and the how-it-works stage are the two held moments; both are plain `position: sticky` with native scrolling, and each held screen has its own caption and count. Section parts rise in once as they arrive, pictures open from the bottom edge, controls answer press and hover, and the closing clip plays only while it's on screen. With `prefers-reduced-motion` nothing travels: the reel swaps frames in place, entrances become fades and the clip stays on its poster. Everything renders without JavaScript.

The site is dark only, whatever the visitor's system setting.

## Credits

Restless began as a fork of [Amped](https://github.com/gustaferiksson/amped) by Gustaf Eriksson, and its panel design is adapted from [OpenUsage](https://github.com/robinebers/openusage).
