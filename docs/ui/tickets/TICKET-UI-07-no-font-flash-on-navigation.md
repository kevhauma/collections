# TICKET-UI-07: No font jump when switching pages

- **Area:** UI
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Bug fix
- **Traceability:** [technical-design.md § Stack](../../technical-design.md#stack) (UI library: self-hosted Kalam and Reenie Beanie), [DESIGN.md](../../../DESIGN.md) (typography)

## User story

As a visitor or the admin, I want pages to appear in their handwriting fonts straight away, so the text doesn't
flicker into a different font and jump for a moment every time I switch pages.

## Description

On each page switch the text briefly paints in the fallback font and then swaps to Kalam / Reenie Beanie, so it
visibly jumps. The fonts should be ready before the first paint of every page after the first visit.

## Current situation (as-is)

- [src/ui/styles.css](../../../src/ui/styles.css) imports `@fontsource/kalam/latin-400.css`, `latin-700.css` and
  `@fontsource/reenie-beanie/latin-400.css`. Their `@font-face` rules use **`font-display: swap`**, and the stacks
  fall back to generic `cursive` (`--font-set: "Kalam", cursive`, `--font-hand: "Reenie Beanie", cursive`).
- [src/routes/root.tsx](../../../src/routes/root.tsx) renders `<head>` with only charset and viewport: **no
  `<link rel="preload" as="font">`**. The browser finds the font files only after it has parsed the stylesheet and
  laid out text that uses them.
- Every page switch is a full document load: the headers and nav are plain `<a>` links
  ([src/routes/public-layout.tsx](../../../src/routes/public-layout.tsx),
  [src/routes/admin-layout.tsx](../../../src/routes/admin-layout.tsx), `TabLinks`), and public pages ship no JS.
- **Root cause (confirmed 2026-11-14, see the first criterion):** the font files are requested only once body text
  is laid out, never from `<head>`. When a page's fonts aren't in the renderer's memory cache (a fresh tab or
  renderer process; the HTTP cache is still warm), the disk-cache read finishes a few ms after the first layout, and
  with `swap` that layout is in `cursive`, then shifts. When they are in memory, Chrome uses them synchronously and
  nothing flashes, which is why it doesn't happen on every switch.
- **Likely root cause (as first written):** on each new document the font is requested late and loaded from cache asynchronously. With
  `swap` the browser paints the first frame in `cursive` (different glyphs and metrics), then re-lays out in the
  web font: the visible "jump". To confirm before fixing: reproduce in a **production build** (`dist/client/assets`
  is served `immutable`, see [src/server.ts](../../../src/server.ts)). Vite dev injects CSS through JS and flashes
  more, so a dev-only flash is not this bug.

## Desired result (to-be)

- After the first visit, navigating between any two pages paints text in Kalam / Reenie Beanie on the first frame:
  no fallback frame, no reflow.
- The fix stays small and server-rendered. The likely shape: preload the three woff2 files from the document `<head>`
  (`<link rel="preload" as="font" type="font/woff2" crossorigin>` with Vite-hashed URLs, e.g. via `?url` imports)
  and, if a frame still flashes, change the display strategy (e.g. `font-display: optional`, or `block` for these
  small files) in a local `@font-face` instead of the Fontsource import. Pick whatever the production check proves.
- On a cold first visit the page must still show text (no long invisible-text period on a slow connection). If a
  fallback is ever shown, its metrics are matched (`size-adjust` / `ascent-override` on a local fallback face) so it
  doesn't shift layout.
- Public pages still ship no JS and no client components; no new dependency.

## UI requirements

- No visible change in how the fonts look, only that they no longer flicker on navigation.
- Holds in light and dark, public and admin, at 360 px and desktop.

## Acceptance criteria

- [x] Root cause confirmed in a production build (`npm run build` + start): a performance trace or slowed-down
      recording of a page switch shows the fallback frame before the fix, and its cause is written in this ticket.
      (Production build behind a local proxy that sends `<head>` and then the body 150 ms later, each page opened in a
      fresh Orca tab with a warm HTTP cache: the font requests start only when the body arrives (~186 ms, served from
      cache in ~3 ms), and every load logs a `layout-shift` entry (0.0069 on `/`, 0.0056 on the not-found page `/records`, 0.0003 on
      `/admin`) from the swap to the web font. Pages whose fonts were already in the tab's memory cache showed none.
      Cause written in the as-is above.)
- [x] After the fix, a warm-cache page switch (e.g. `/` → a collection's have page, and admin collection list → an
      item) shows no fallback-font frame and no layout shift from fonts (trace / CLS ≈ 0 for font swaps). (Same
      setup after adding the preloads: the fonts start at 36–58 ms alongside the stylesheet and finish before the
      body arrives; zero `layout-shift` entries on 5 fresh-tab loads (`/`, `/admin` twice, and the not-found pages `/records`, `/records/want`).
      The admin item page was not measured separately; it uses the same root `<head>`.)
- [x] Cold first load on throttled "Slow 4G" still renders readable text within the normal load time (no long
      invisible text). (`font-display: swap` is unchanged. Simulated rather than throttled: an uncached origin whose
      proxy holds each woff2 for 2 s. First contentful paint at 252 ms in the fallback, fonts at ~2.08 s, then one
      swap (0.0068). Text is never invisible.)
- [x] Font preloads (if used) point at the hashed asset URLs actually served, with `crossorigin`, and produce no
      "preloaded but not used" console warning on any page. (`src/routes/root.tsx` imports the three woff2 files with
      `?url`; the served `<head>` has `<link rel="preload" href="/assets/kalam-latin-400-normal-BthBl_aR.woff2"
      as="font" type="font/woff2" crossorigin="">` and the same for Kalam 700 and Reenie Beanie, the same hashed
      files `root-*.css` uses (one resource entry per font, no double fetch). `document.fonts` shows all three faces
      loaded on `/admin`, an admin collection list, `/`, a have and a want page; Orca's console was empty 4 s after
      load.)
- [x] Public pages still ship no client components or scripts; no new dependency. (Only `<link>` tags in the server
      `Layout`; `package.json` unchanged.)
- [x] Unit tests: none needed unless a helper is added to build the preload URLs (then test that helper). (No helper:
      Vite's `?url` imports. `npm test`: 37 files, 917 tests passed.)
- [x] Live browser check, light and dark, at 360 px and desktop, on public and admin pages. (Orca screenshots:
      admin collection list dark at 1280 px, public have page light at 360 px; fonts look as before.)
- [x] Verified with the fallow skill. (`npx fallow@3.43.0 audit --base HEAD`: 0 dead code, 0 complexity,
      0 duplication.)

## Notes

- Only latin subsets are loaded; keep it that way (preload only what every page uses: Kalam 400 is on every page,
  check whether Kalam 700 and Reenie Beanie are too before preloading them).
- If the jump turns out to come from something else (e.g. the stylesheet itself loading late), fix that root cause
  instead and update the as-is.
- Independent, can ship any time.
- All three faces are on every page (Kalam 700 in buttons and tabs, Reenie Beanie in each page's `h1`), so all three
  are preloaded.
- Not done: a metric-matched fallback face. The fallback now shows only on a cold first visit, and generic `cursive`
  is a different font per OS, so `size-adjust` values can't be matched reliably; the cold swap measured 0.0068.
