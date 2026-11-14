# TICKET-UI-04: Pen-drawn icons for the language and theme switchers

- **Area:** UI
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Feature
- **Traceability:** [technical-design.md § Stack](../../technical-design.md#stack) (UI library), [DESIGN.md](../../../DESIGN.md) (drawn shapes, `#ink-wobble`), extends [TICKET-UI-03](./TICKET-UI-03-dark-mode.md) and the language switcher (TICKET-I18N-02)

## User story

As the admin or a visitor, I want the language and colour switches drawn as small pen sketches (flags and
sun/moon icons) instead of words, so the header is compact and looks like the rest of the notebook page.

## Description

Replace the text labels in both header switchers with hand-drawn SVG icons: a flag per language and a
System / Light / Dark icon per theme, in ballpoint ink and red pen, run through the shared wobble filter. The
switches keep working without JS and keep their spoken names.

## Current situation (as-is)

- [src/routes/locale-switcher.tsx](../../../src/routes/locale-switcher.tsx) renders one ghost `Button` per locale
  labelled with the language's own name ("English", "Nederlands"), with `lang` and `aria-pressed`, in a form posting
  to `/locale`.
- [src/routes/theme-switcher.tsx](../../../src/routes/theme-switcher.tsx) renders three ghost `Button`s labelled
  "System" / "Light" / "Dark" (ids `shell.theme.*`), with `aria-pressed`, in a form posting to `/theme`.
- Both sit in the public and admin headers ([src/routes/public-layout.tsx](../../../src/routes/public-layout.tsx),
  [src/routes/admin-layout.tsx](../../../src/routes/admin-layout.tsx)). Five text buttons take a lot of header width,
  especially at 360 px.
- The pen look exists already: [src/ui/ink-defs.tsx](../../../src/ui/ink-defs.tsx) renders the `#ink-wobble` filter
  once per document, and [src/ui/styles.css](../../../src/ui/styles.css) uses it for drawn outlines and the drawn
  checkbox. There are no icons in `src/ui/` yet.

## Desired result (to-be)

- Each button shows a small inline SVG sketch instead of its text:
  - **Language:** a pen-drawn flag per locale (English: Union Jack, Dutch: tricolour), drawn with ink outlines and
    hatched or scribbled fills in the existing tokens (ink, red pen, paper). No new colours.
  - **Theme:** System (e.g. a half-shaded circle or a little screen), Light (a sun), Dark (a crescent moon).
- Strokes use `currentColor` / the colour tokens, pass through `url(#ink-wobble)`, and follow dark mode via the
  tokens like every other outline.
- The accessible name stays the word: the language's own name (with `lang`) and the translated `shell.theme.*`
  label, as visually hidden text or `aria-label`, plus a `title` tooltip. The SVG is `aria-hidden`.
- `aria-pressed` still marks the current choice, and it is visible without colour alone (e.g. the drawn box /
  highlighter the pressed ghost button already gets).
- The icons are plain server-rendered SVG: no client component, no icon dependency, no image files.
- The direction in `.impeccable/surfaces/src-ui.md` and `DESIGN.md` gets a line on drawn icons first (via the
  impeccable skill), so the code doesn't contradict it.

## UI requirements

- Both switchers in the public and admin headers show icons only, same order as today.
- Icons are one size (around 20–24 px), drawn at a stroke weight that matches the outlines, and each button keeps a
  tap target of at least 44×44 px.
- Legible in light and dark on the paper, and at 360 px the header no longer wraps because of the switchers.

## Acceptance criteria

- [x] The language switcher shows a pen-drawn English and Dutch flag; the theme switcher shows pen-drawn System,
      Light and Dark icons. No visible text labels remain in either switcher. (`src/ui/ink-icon.tsx` › `InkIcon`
      drawings `flag-en`, `flag-nl`, `system`, `light`, `dark`, used by `locale-switcher.tsx` and `theme-switcher.tsx`;
      live 2026-11-14: every header button's `innerText` is empty.)
- [x] Each button's accessible name is unchanged ("English" with `lang="en"`, "Nederlands" with `lang="nl"`, and the
      translated System / Light / Dark); the SVGs are `aria-hidden`; a `title` tooltip shows the same name. (Live
      accessibility snapshot of the header: buttons "English", "Nederlands", "System", "Light", "Dark", with `lang` en /
      nl, matching `title`, and `aria-hidden="true"` on each SVG; with `locale=nl` the theme names are "Systeem",
      "Licht", "Donker".)
- [x] The current language and theme are marked with `aria-pressed` and a visible non-colour cue. (`aria-pressed`
      true on the current locale and theme only; the pressed button keeps the `highlighted` band (Button's
      `aria-pressed:highlighted`), a filled shape behind the icon that the others lack, seen in both themes.)
- [x] Both switches still work with JS off (form post to `/locale` and `/theme`, back to the same page); public pages
      still ship no client components. (Plain form posts: `POST /theme theme=dark` and `POST /locale locale=nl` with
      Referer `/records` → 303 to `/records` with the cookie set; `InkIcon` is a server component (no `'use client'`),
      and the production `/` has no script `src` or module bootstrap.)
- [x] The icons use only the colour tokens and `#ink-wobble`; no `.tsx` gains a hex or `rgb()` value; no new
      dependency or image asset. (Strokes are `currentColor`, red and fills are `stroke-red-pen` / `fill-paper` /
      `fill-ink/20`, the group has `filter="url(#ink-wobble)"`; `package.json` unchanged, no files added outside
      `src/ui/ink-icon.tsx`.)
- [x] In dark mode the icons switch to the night ink and red pen through the tokens, and keep 3:1 contrast against
      the paper. (Live in the device's dark theme: light gel ink and the bright red pen. Ratios: ink #d3ddff on
      #12151d ≈ 13:1, red #f05a4f on #12151d ≈ 5.4:1, on the Union Jack's 20 % ink wash ≈ 3.3:1; by day red on paper
      4.76:1. The flags carry a paper fill, so red never sits on the highlighter.)
- [x] Unit tests: none needed (markup only, no logic). Existing `src/routes/theme.test.ts` and locale tests still
      pass. (`npm test`: 37 files, 917 tests passed.)
- [x] UI follows the design direction in `.impeccable/surfaces/src-ui.md` / `DESIGN.md` (updated with the drawn-icon
      rule); live browser check in both headers, light and dark, at 360 px and desktop. (Rule added as "Drawn icons
      addendum" in `src-ui.md` and "Components › Icons" plus the `button-icon` size in `DESIGN.md`. Orca browser
      2026-11-14: public header dark at 1280 px, light at 360 px (all five 44×44 switches in one row), admin header
      light at 1280 px on the login page; impeccable detector: no findings. Not checked logged in (no admin password in
      this session); that header renders the same two components plus Log out.)
- [x] Verified with the fallow skill. (`npx fallow@3.43.0 audit --base HEAD`: 0 dead code, 0 complexity,
      0 duplication, no issues in the changed files.)

## Notes

- Flags stand for countries, not languages; that's why the accessible name and tooltip stay the language's own
  name. If a locale is added later, it needs its own drawn flag.
- Keep the icons in one place (e.g. `src/ui/` or next to the switchers) only if both switchers share a drawing
  helper; otherwise inline them in each switcher.
- Independent, can ship any time (TICKET-UI-03 and TICKET-I18N-02 are shipped).
