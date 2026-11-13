# TICKET-UI-03: Dark mode

- **Area:** UI
- **Released in:** _unreleased_
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
- `styles.css` redefines the colour tokens (and the shadow `rgb()` values) for dark in one block each, under
  `:root[data-theme="dark"]` and under `@media (prefers-color-scheme: dark)` for `:root:not([data-theme="light"])`.
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

- [ ] With the device in dark mode and no cookie, every page renders dark; in light mode, light, exactly as today.
- [ ] Choosing Light or Dark overrides the device setting and survives a reload; System returns to following it.
- [ ] The switch works with JS off: a form post to `/theme`, then back to the same page. An invalid value answers 400;
      an off-site `Referer` redirects home.
- [ ] No flash of the wrong theme on load with a forced theme (the attribute is in the server HTML).
- [ ] Every text/background pair in dark meets WCAG AA contrast (4.5:1 for text, 3:1 for outlines and the focus ring),
      including red pen and text on highlighter and on each post-it colour.
- [ ] Native controls (date, select, checkbox, scrollbars) are dark in dark mode.
- [ ] No new colour exists outside the tokens; no `.tsx` file gains a hex or `rgb()` value.
- [ ] Public pages still ship no client components.
- [ ] Unit tests cover: the `/theme` action (each valid value sets the cookie, invalid → 400, redirect target) and the
      root's `data-theme` for each cookie value, including a missing or garbage cookie → none.
- [ ] UI follows the dark addendum in `.impeccable/surfaces/src-ui.md`; live browser check of every page listed above
      in dark at 360 px and desktop, plus the switch in both headers.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-UI-02 (shells) and TICKET-I18N-02 (the switcher pattern), both shipped. Independent, can ship any time.
- This overturns a recorded design decision; update `design.json` and `src-ui.md` in the same change so they don't
  contradict the code.
- The squared-paper grid lines and the ink outlines (coloured via `--ink-line`) must be checked on dark paper.
