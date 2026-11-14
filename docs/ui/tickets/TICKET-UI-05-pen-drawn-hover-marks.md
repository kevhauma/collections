# TICKET-UI-05: Red-pen circle on hover, red-pen cross on delete

- **Area:** UI
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Feature
- **Traceability:** [technical-design.md § Stack](../../technical-design.md#stack) (UI library), [DESIGN.md](../../../DESIGN.md) (drawn shapes, motion), extends [TICKET-UI-04](./TICKET-UI-04-pen-drawn-switcher-icons.md)

## User story

As the admin or a visitor, I want a red-pen circle to be drawn around whatever I'm about to click, and a red-pen
cross over anything that deletes, so the page reacts like a notebook being marked up and a destructive click is
obvious before I make it.

## Description

On pointer hover, selectable controls get a red-pen loop drawn around them in one quick stroke. Delete controls get
a red "X" scribbled over them instead. Both are CSS-only, use the existing tokens and wobble, and are skipped under
reduced motion and on touch.

## Current situation (as-is)

- Hover is a colour change only: [src/ui/button.tsx](../../../src/ui/button.tsx) gives `secondary` / `ghost`
  `hover:bg-grid`, `primary` `hover:bg-ink-soft`, `danger` `hover:bg-red-pen/10`;
  [src/ui/tab-links.tsx](../../../src/ui/tab-links.tsx) uses `hover:bg-grid` (tabs) and `hover:underline` (nav);
  the sort links in [src/ui/table.tsx](../../../src/ui/table.tsx) use `hover:underline`.
- Delete-style actions all use `Button variant="danger"` (e.g.
  [src/routes/admin-item.tsx](../../../src/routes/admin-item.tsx),
  [src/routes/admin-collection-settings.tsx](../../../src/routes/admin-collection-settings.tsx),
  [src/routes/field-rows.tsx](../../../src/routes/field-rows.tsx),
  [src/routes/admin-field-option.tsx](../../../src/routes/admin-field-option.tsx)), but so does the non-delete
  "revoke" in [src/routes/admin-settings.tsx](../../../src/routes/admin-settings.tsx).
- The pen look lives in [src/ui/styles.css](../../../src/ui/styles.css) (`ink-outline` draws the sketched box with
  `::before` / `::after` masks) and [src/ui/ink-defs.tsx](../../../src/ui/ink-defs.tsx) (`#ink-wobble`).
- The design direction forbids this today: `.impeccable/surfaces/src-ui.md` says "post-its settle … nothing else
  animates", and [DESIGN.md](../../../DESIGN.md) says "Nothing in the system animates today beyond colour
  transitions on hover."

## Desired result (to-be)

- **Circle:** hovering a selectable control (Button / LinkButton `primary`, `secondary`, `ghost`; TabLinks tabs and
  nav; table sort links) draws a loose red-pen ellipse around it: one stroke that starts at about 10 o'clock, runs
  round and overshoots its start a little, revealed by animating `stroke-dashoffset` (around 250–350 ms, ease-out).
  On un-hover it disappears (no reverse animation needed).
- **Cross:** hovering a delete control draws a red-pen "X" over it instead of the circle: two strokes, the second
  starting after the first finishes, same timing family.
- ~~One stroke … revealed by animating `stroke-dashoffset`~~ on a path stretched over the control: built as unstretched
  SVG shapes in percentages (two ellipses for the loop: the full loop plus a short wider run-on past its start; two
  lines for the X), because Chrome lays a `pathLength` dash out in screen space under `non-scaling-stroke`, which cut
  the stretched loop short. The loop starts at 9 o'clock rather than 10 (an ellipse's start point, turned half a
  turn). Still drawn by animating `stroke-dashoffset`.
- "Delete control" is explicit, not inferred from colour: `danger` gets the cross only where the action deletes. The
  revoke button (and any future non-delete `danger`) gets the circle. Pick the smallest switch that does this (e.g.
  a `mark="cross"` prop or a `data-mark` attribute on `Button`).
- The mark is decoration: drawn by CSS (pseudo-element with an SVG mask or an inline `aria-hidden` SVG), red-pen token
  only, through `#ink-wobble` like the other strokes, `pointer-events: none`, and it never shifts layout or covers the
  label so badly it can't be read.
- Only under `@media (hover: hover) and (prefers-reduced-motion: no-preference)`. Under reduced motion the existing
  colour hover stays and nothing is drawn; on touch nothing sticks after a tap.
- Keyboard focus keeps its current focus ring; the marks are hover-only.
- No client component, no JS, no dependency, no image file. Public pages still ship no client components.
- The design direction is updated first (via the impeccable skill): `src-ui.md` and `DESIGN.md` gain the hover-mark
  rule and a motion entry for it, so the code doesn't contradict "nothing else animates".

## UI requirements

- Circle and cross in the red pen, stroke weight matching the outlines, legible on paper by day and night.
- The circle fits the control's shape (wide ellipse for text buttons, near-circle for 44×44 icon buttons) and is not
  clipped by `overflow` in tables, dialogs or the header.
- The cross stays readable over a `danger` button's red label (thinner or offset strokes if needed).
- Checked at 360 px and desktop, light and dark, in the public header, admin nav, item form and a delete dialog.

## Acceptance criteria

- [x] Hovering a `primary`, `secondary` or `ghost` Button / LinkButton, a TabLinks tab or nav link, or a table sort
      link draws a red-pen circle around it in one animated stroke; leaving removes it. (`HoverMark` in
      `src/ui/hover-mark.tsx`, rendered by `Button`, `LinkButton`, `TabLinks` and `Th`'s sort link; `hover-mark`
      utility in `styles.css`. Orca browser on the production build: primary "+ Add item", Have / Want tabs, admin nav,
      header icon buttons, ghost "Log out", "Fields" / "Settings" and the "Title" sort link all draw the loop; paused at
      140 ms the loop is drawn from 9 o'clock over the top and down the right side (`stroke-dashoffset` 0.35); after
      leaving, the mark's `visibility` is `hidden` and no animation remains.)
- [x] Hovering a delete control (delete item, delete collection, delete field, delete option) draws a red-pen "X" in
      two sequential strokes instead of a circle; the revoke button gets the circle, not the cross. (`mark="cross"` on
      the eight delete controls: `admin-item.tsx` (Delete, Delete for good), `admin-collection-settings.tsx` (Delete
      collection…, Delete for good), `field-rows.tsx` (remove option link, delete field, Delete for good),
      `admin-field-option.tsx` (Remove option). The revoke buttons in `admin-settings.tsx` keep the default loop.
      Live: hovering the item's Delete runs two `pen-stroke` animations, the second delayed 300 ms, and draws the X;
      same in the delete dialog. Revoke not opened live: no connected app in the scratch DB; it renders the default.)
- [x] Marks use only the red-pen token and `#ink-wobble`; no `.tsx` gains a hex or `rgb()` value; no new dependency,
      image asset or client component; `pointer-events: none`; no layout shift on hover. (`stroke:
      var(--color-red-pen)`, `<g filter="url(#ink-wobble)">`, `pointer-events: none`, absolutely positioned and
      toggled by `visibility` only. `hover-mark.tsx` is a server component with no colour values; `package.json`
      unchanged. Live: every nav link and button keeps its position and width with the pointer on two different
      controls.)
- [x] With `prefers-reduced-motion: reduce` nothing is drawn and the colour hover still works; on a touch device
      (`hover: none`) no mark appears or sticks after a tap. (Emulated reduced motion: the hovered Delete has its 10 %
      red wash, its mark is `hidden`, no animations run; turning it off draws the X. Mobile emulation (`hover: none`,
      `pointer: coarse`): after tapping Delete the button stays `:hover`, and 0 marks are visible.)
- [x] Marks are not clipped inside tables, dialogs or the header, and don't hide a control's label. (Screenshots: the
      sort link's loop is whole inside the table's `overflow-x-auto` wrapper (the `th` padding holds it), the dialog's
      Delete for good and the header icon buttons show whole marks. Loops pass outside the label; the X is finer and
      lighter (1.1px at 80 %) so "Delete for good" stays readable under it.)
- [x] Dark mode: marks switch to the night red pen through the token and keep 3:1 against the paper. (Dark
      screenshots draw #f05a4f via `--color-red-pen`: 5.5:1 on the night paper; by day #d6312b is 4.76:1.)
- [x] `.impeccable/surfaces/src-ui.md` and `DESIGN.md` describe the hover marks and their motion before the code lands.
      (Same commit: DESIGN.md › Components › Hover marks with the "Pen stroke" motion entry, the button hover line
      and "Not shipped yet"; src-ui.md motion line and "Hover marks addendum".)
- [x] Unit tests: none needed (CSS and markup only). Existing tests still pass. (`npm test`: 37 files, 917 tests
      passed.)
- [x] UI follows the design direction in `.impeccable/surfaces/src-ui.md` / `DESIGN.md`; live browser check at 360 px
      and desktop, light and dark, including a reduced-motion check. (Orca browser 2026-11-14: admin collection
      list, item form and delete dialog dark at 1280 px; public have page light at 360 px with the Dutch flag and the
      Want tab hovered; reduced motion and touch as above. The impeccable skill's detector was not run.)
- [x] Verified with the fallow skill. (`npx fallow@3.43.0 audit --base HEAD`: 0 dead code, 0 complexity,
      0 duplication; one advisory `css-dead-surface` on the `pen-stroke` keyframes, a false positive: the
      `hover-mark` utility's `animation` uses it.)

## Notes

- Scope: Buttons, LinkButtons, TabLinks and table sort links. Plain prose links, checkboxes / choices and rating
  stars are left out; add them later if wanted.
- `danger` is reused by revoke, so the cross can't key off the variant alone; that's why it's an explicit switch.
- Many controls already wear `ink-outline`'s box, which uses both pseudo-elements. The mark needs another layer (an
  inline SVG child, or a wrapper's pseudo-element); don't break the box.
- Independent, can ship any time (TICKET-UI-04 is shipped).
