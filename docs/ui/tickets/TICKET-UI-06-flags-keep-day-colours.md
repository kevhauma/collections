# TICKET-UI-06: Flags keep their colours in dark mode

- **Area:** UI
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Bug fix
- **Traceability:** [technical-design.md § Stack](../../technical-design.md#stack) (UI library), [DESIGN.md](../../../DESIGN.md) (Components › Icons), follows up [TICKET-UI-04](./TICKET-UI-04-pen-drawn-switcher-icons.md) and [TICKET-UI-03](./TICKET-UI-03-dark-mode.md)

## User story

As a visitor or the admin using dark mode, I want the language flags to keep their real colours, so a Dutch or
British flag still looks like that flag instead of a colour-inverted negative.

## Description

In dark mode the flag sketches swap paper and ink with the theme, so their white fields turn near-black and the
blue turns pale. Flags should be drawn in their day colours in both themes, like a printed sticker on the page.

## Current situation (as-is)

- [src/ui/ink-icon.tsx](../../../src/ui/ink-icon.tsx) draws `flag-en` and `flag-nl` with `fill-paper` for the white
  field, `currentColor` (ink) for the blue strokes and the edge, `fill-ink/20` for the Union Jack's blue wash and
  `stroke-red-pen` for red.
- Those tokens are `light-dark()` pairs in [src/ui/styles.css](../../../src/ui/styles.css): `--color-paper`
  `#fdfdfb` → `#12151d`, `--color-ink` `#1f3a93` → `#d3ddff`, `--color-red-pen` `#d6312b` → `#f05a4f`.
- **Root cause:** the flags use the theme tokens, so at night the white field becomes dark paper and the blue becomes
  light gel ink. The flag reads as a negative. TICKET-UI-04 chose this on purpose ("follow dark mode via the tokens");
  this ticket reverses that for flags only.
- Prior art: `postit-corner` in [src/ui/styles.css](../../../src/ui/styles.css) already keeps day colours at night
  by restating the day values of `--color-paper`, `--color-ink` and `--color-red-pen` (`color-scheme: light` alone
  can't flip the tokens, because the build resolves `light-dark()` on `:root`).

## Desired result (to-be)

- `flag-en` and `flag-nl` render in their day colours in both themes: paper-white field, day-ink blue, day red pen,
  with the same pen strokes and `#ink-wobble`.
- Done by reusing the post-it approach (restate the three day token values on the flag), not by adding hex values to
  `.tsx`. A shared utility both post-its and flags use is preferred over a second copy of the values.
- The System / Light / Dark theme icons are unchanged: they keep following the theme.
- On the dark page the flag's light field needs no extra border: the existing drawn edge is enough, unless the
  browser check shows the flag bleeding into the header.

## UI requirements

- In dark mode both flags look the same as by day, in the public and admin headers.
- The pressed flag's `highlighted` cue stays visible around the flag at night.

## Acceptance criteria

- [x] In dark mode the English and Dutch flags show a light field, day-blue strokes and day-red stripes, identical to
      light mode (compare computed `fill` / `stroke` in both themes). (Production build, Orca browser 2026-11-14,
      `data-theme` light and dark: every flag shape computes the same values in both, field `rgb(253, 253, 251)`,
      strokes `rgb(31, 58, 147)`, red `rgb(214, 49, 43)`, Union Jack wash day ink at 20 %.)
- [x] The theme icons (System, Light, Dark) still switch to night ink in dark mode. (Same check: their strokes compute
      `rgb(31, 58, 147)` by day and `rgb(211, 221, 255)` at night.)
- [x] No `.tsx` gains a hex or `rgb()` value; the day values live once in `src/ui/styles.css`, shared with
      `postit-corner` if possible; no new dependency or asset. (New `day-colours` utility in `src/ui/styles.css` holds
      the three day values, moved out of `postit-corner`; `PostIt` and the two flag groups in `src/ui/ink-icon.tsx`
      use the class, the flags plus `text-ink` so `currentColor` is the day ink. `package.json` unchanged.)
- [x] The pressed language is still visibly marked (non-colour cue) in both themes. (Screenshots: the pressed flag's
      button keeps the `highlighted` band behind the flag at night, public header 1280 px and admin header 360 px.)
- [x] `DESIGN.md` / `.impeccable/surfaces/src-ui.md` note that flags keep day colours in dark mode. (DESIGN.md
      › Components › Icons; src-ui.md › Drawn icons addendum.)
- [x] Unit tests: none needed (CSS only). Existing tests still pass. (`npm test`: 37 files, 917 tests passed.)
- [x] Live browser check in both headers, light and dark, at 360 px and desktop. (Orca browser on `npm start`:
      public header dark at 1280 px, admin (login) header dark at 360 px, light compared by computed styles; the light
      field sits inside its drawn edge without bleeding into the dark header, so no extra border was added. Logged-in
      admin header not opened: it renders the same `LocaleSwitcher`.)
- [x] Verified with the fallow skill. (`npx fallow@3.43.0 audit --base HEAD`: 0 dead code, 0 complexity,
      0 duplication; only the inherited `grid-cols-[100%]` advisory on `post-it.tsx`.)

## Notes

- Flags are real-world symbols, so their colours carry meaning; the notebook theme icons don't, which is why only
  flags opt out.
- Independent, can ship any time (TICKET-UI-03 and TICKET-UI-04 are shipped).
