# TICKET-UI-05: Red-pen circle on hover, red-pen cross on delete

- **Area:** UI
- **Released in:** _unreleased_
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

- [ ] Hovering a `primary`, `secondary` or `ghost` Button / LinkButton, a TabLinks tab or nav link, or a table sort
      link draws a red-pen circle around it in one animated stroke; leaving removes it.
- [ ] Hovering a delete control (delete item, delete collection, delete field, delete option) draws a red-pen "X" in
      two sequential strokes instead of a circle; the revoke button gets the circle, not the cross.
- [ ] Marks use only the red-pen token and `#ink-wobble`; no `.tsx` gains a hex or `rgb()` value; no new dependency,
      image asset or client component; `pointer-events: none`; no layout shift on hover.
- [ ] With `prefers-reduced-motion: reduce` nothing is drawn and the colour hover still works; on a touch device
      (`hover: none`) no mark appears or sticks after a tap.
- [ ] Marks are not clipped inside tables, dialogs or the header, and don't hide a control's label.
- [ ] Dark mode: marks switch to the night red pen through the token and keep 3:1 against the paper.
- [ ] `.impeccable/surfaces/src-ui.md` and `DESIGN.md` describe the hover marks and their motion before the code lands.
- [ ] Unit tests: none needed (CSS and markup only). Existing tests still pass.
- [ ] UI follows the design direction in `.impeccable/surfaces/src-ui.md` / `DESIGN.md`; live browser check at 360 px
      and desktop, light and dark, including a reduced-motion check.
- [ ] Verified with the fallow skill.

## Notes

- Scope: Buttons, LinkButtons, TabLinks and table sort links. Plain prose links, checkboxes / choices and rating
  stars are left out; add them later if wanted.
- `danger` is reused by revoke, so the cross can't key off the variant alone; that's why it's an explicit switch.
- Many controls already wear `ink-outline`'s box, which uses both pseudo-elements. The mark needs another layer (an
  inline SVG child, or a wrapper's pseudo-element); don't break the box.
- Independent, can ship any time (TICKET-UI-04 is shipped).
