# TICKET-UI-03: Dark mode

- **Area:** UI
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Stack](../../technical-design.md#stack) (UI library), [.impeccable/surfaces/src-ui.md](../../../.impeccable/surfaces/src-ui.md) (reverses "Dark mode is out of scope")

## User story

As the admin or a visitor, I want the app in dark colours when my device is in dark mode, or when I pick it, so it's
easy on the eyes at night.

## Description

A dark version of the notebook page that follows the device setting by default, with a System / Light / Dark switch in
both headers. The switch works without JS, like the language switcher.

## Current situation (as-is)

- The design direction rules dark mode out: "Dark mode is out of scope; the page is paper."
  ([.impeccable/design.json](../../../.impeccable/design.json), [.impeccable/surfaces/src-ui.md](../../../.impeccable/surfaces/src-ui.md)).
- All colours are the twelve `@theme` tokens in [src/ui/styles.css](../../../src/ui/styles.css). Components use only
  these tokens; no hex values live in `.tsx` files. A few `rgb()` values sit in the shadows (`--shadow-postit`,
  `--shadow-pin`) and the post-it corner fold.
- `<html>` in [src/routes/root.tsx](../../../src/routes/root.tsx) carries only `lang`. There is no `color-scheme`, so
  native controls (date picker, select, scrollbars) are always light.
- The language switcher ([src/routes/locale-switcher.tsx](../../../src/routes/locale-switcher.tsx)) posts to `/locale`
  ([src/routes/locale.ts](../../../src/routes/locale.ts)), which sets a cookie and redirects back: the pattern to
  reuse.

## Desired result (to-be)

- The design direction gets a dark addendum first (via the impeccable skill): the same notebook world at night, e.g.
  dark paper with light ink. It names the dark value of every token. Post-its stay their paper colours, with dark text
  on them.
- ~~`styles.css` redefines the colour tokens (and the shadow `rgb()` values) for dark in one block each, under
  `:root[data-theme="dark"]` and under `@media (prefers-color-scheme: dark)` for `:root:not([data-theme="light"])`.~~
  Built instead: each token in `@theme` is `light-dark(day, night)` (shadows too), and `color-scheme` on `:root`
  (`light dark`, or `light` / `dark` when `data-theme` forces one) picks the value. One place per token instead of
  three copies of every dark value. Only the checkbox tick, an image, needs the two dark selectors.
  No component changes colour on its own; the tokens do the work.
- `color-scheme: light dark` on `:root` (and `light` / `dark` when forced), so native controls follow.
- A `theme` cookie (`system` | `light` | `dark`, default `system`). The root document renders
  `data-theme="light"` or `"dark"` on `<html>` when the cookie forces one, and nothing for `system`. Rendered on the
  server, so there's no flash of the wrong theme.
- `POST /theme` validates the value with zod, sets the cookie (1 year, `SameSite=Lax`) and redirects back with 303 via
  `safeRedirectTarget`, mirroring `/locale`.
- Item images and uploaded photos are never recoloured.

## UI requirements

- A theme switch (System / Light / Dark) next to the language switcher in the public and admin headers, as
  `aria-pressed` buttons in a plain form, like `LocaleSwitcher`. Labels in EN and NL.
- Every page in dark: public index and have/want pages, admin home, collection, item form, field editor, type-change
  and option previews, export, settings, login, setup, 404 and error pages.
- The wobbly ink outlines, red-pen marks, highlighter, focus ring and selection all stay visible on dark paper.

## Acceptance criteria

- [x] With the device in dark mode and no cookie, every page renders dark; in light mode, light, exactly as today. (Orca with `set media dark`/`light` and theme System: `<html>` has no `data-theme`, body ink is rgb(211 221 255)
      on dark and rgb(31 58 147) on light. The light values in `styles.css` are the old hex values, unchanged)
- [x] Choosing Light or Dark overrides the device setting and survives a reload; System returns to following it. (Orca: Light chosen with the device in dark stayed light after a reload; System then followed the device both
      ways)
- [x] The switch works with JS off: a form post to `/theme`, then back to the same page. An invalid value answers 400;
      an off-site `Referer` redirects home. (curl: 303 to `/shop/want?view=grid` with `theme=dark; Path=/; Max-Age=31536000;
      SameSite=Lax`; `theme=sepia` → 400; a Referer on `https://evil.example` → `/`; a cross-origin `Origin` → 403.
      `src/routes/theme.test.ts`)
- [x] No flash of the wrong theme on load with a forced theme (the attribute is in the server HTML). (curl with `Cookie: theme=dark` → `<html lang="en" data-theme="dark">`; a garbage cookie → no attribute)
- [x] Every text/background pair in dark meets WCAG AA contrast (4.5:1 for text, 3:1 for outlines and the focus ring),
      including red pen and text on highlighter and on each post-it colour. (Computed: ink 13.5, ink-soft 8.8, pencil 7.2, red-pen 5.5 on
      paper; paper on ink 13.5 and on red 5.5; ink on highlighter 6.3, on grid 11.0; outlines and focus ring are ink.
      Post-its keep the day palette inside (`postit-corner`), where red pen and ink already met it; the 404 post-it
      shows the day red. Listed in DESIGN.md › Colors › Night)
- [x] Native controls (date, select, checkbox, scrollbars) are dark in dark mode. (computed `color-scheme: dark` on the date input and `<html>`; scrollbar in the night rule/paper colours; the
      checkbox tick switches to the night ink via `--ink-tick`)
- [x] No new colour exists outside the tokens; no `.tsx` file gains a hex or `rgb()` value. (grep of `src/**/*.ts(x)` for hex or `rgb(` finds none; every night value is in the `@theme` tokens or the
      `--ink-tick` image in `styles.css`)
- [x] Public pages still ship no client components. (`ThemeSwitcher` is a server component with a plain form; `/shop` has no module script)
- [x] Unit tests cover: the `/theme` action (each valid value sets the cookie, invalid → 400, redirect target) and the
      root's `data-theme` for each cookie value, including a missing or garbage cookie → none. (`src/routes/theme.test.ts`, and `src/lib/theme.test.ts` › `forcedTheme`, which `root.tsx` puts on `<html>`)
- [x] UI follows the dark addendum in `.impeccable/surfaces/src-ui.md`; live browser check of every page listed above
      in dark at 360 px and desktop, plus the switch in both headers. (Orca, prod build, 2026-11-13, at 360 px and the pane's 553 px max: public index,
      have/want table and grid, admin home, collection, item form, field editor, type-change and option previews,
      export, settings, collection settings, login, setup, 404. Outlines, ticks, disabled buttons, highlighter and
      focus ring all visible; post-its and rank numerals legible. The 500 page uses the 404 frame. Switch used from
      the public and admin headers)
- [x] Verified with the fallow skill. (`npx fallow@3.42.0 audit --base HEAD` → no issues, after moving the shared /locale and /theme action into
      `src/routes/cookie-switch.ts` and covering route `.ts` modules' `loader`/`action` in `.fallowrc.json` like the
      `.tsx` ones)

## Notes

- Needs TICKET-UI-02 (shells) and TICKET-I18N-02 (the switcher pattern), both shipped. Independent, can ship any time.
- This overturns a recorded design decision; update `design.json` and `src-ui.md` in the same change so they don't
  contradict the code.
- The squared-paper grid lines and the ink outlines (coloured via `--ink-line`) must be checked on dark paper.
