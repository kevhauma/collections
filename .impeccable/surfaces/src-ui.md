---
version: 1
slug: "src-ui"
primary_target: "src/ui"
related_targets: []
---

## Scope

Whole app shell and its two faces: admin (Operate, desktop + phone) and public have/want pages (Operate, phone-first, no client JS). Reference sketch: `.impeccable/mocks/decision/bp-drawn.html` (admin Want tab, desktop).

## Direction contract

THESIS: The collection is one crammed notebook page drawn in blue ballpoint on squared paper; every item photo is a post-it tacked onto it. Refuses the grey database app: neutral sidebar, hairline table, one blue accent.

OWN-WORLD: White squared paper (#fdfdfb, #e3e9f3 grid), ballpoint blue ink #1f3a93 for all text and outlines, red pen #d6312b for ranks and module tabs only, highlighter #fff27a for the active/top item. Every box, button, tab, input and chip has a sketched double-pass pen outline (vector strand masks on pseudo-elements, strands overshoot square corners, content stays crisp). Post-its in yellow, pink, blue, green, pinned or taped, slightly rotated. Reenie Beanie for scrawled display and numbers, Kalam for set text.

STORY: The owner sees everything about a collection on one page and edits without leaving it. A relative opens the want link on a phone, reads a short ranked list with the top wish highlighted, sees owned items and doesn't buy a duplicate.

FIRST VIEWPORT: Admin: top line of scrawled app name, collection links (active highlighted), drawn search, util links. Below, huge scrawled collection name, drawn Have/Want tabs, red counts, drawn action buttons with filled "+ Add item" top right. Module mosaic: ranked Want module (left, full height, red rank numerals, post-it per row, big #1 post-it pinned over its corner), Share, Have count, Recently got (post-it cluster), Fields. Public phone: one calm column, same paper and ink, no mosaic.

FORM: User-steered: Ballpoint Notes (re-roll 1 steer) → Crammed Page, bolder register (re-roll 2, fused with japanese-high-density-web) → hand-drawn outlines + post-it images (re-roll 3 steer). Seed key d9a418d7.

Signature interaction: a want reranks in place and keeps its highlighter until noticed; a bought want is struck through with "got it!" before it leaves for Have. Motion: post-its settle with a small rotate-and-drop when added, and the red pen marks what the pointer rests on (hover-marks addendum); nothing else animates; reduced motion removes both.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Dark addendum (TICKET-UI-03)

NIGHT: The same notebook page at night, not a new world. Dark blue-black paper (#12151d, grid #20273a, rule #46526e), light gel-pen ink #d3ddff for text and every drawn outline (ink-soft #a4b3e2, pencil #9ba2b6), a brighter red pen #f05a4f, and the highlighter as a dim amber marker band #5b4b0a that light ink stays readable on. Post-its keep their paper colours and their day contents (dark ink, day red), pinned to the dark page with deeper shadows. Photos are never recoloured. Follows the device by default; a System / Light / Dark switch sits next to the language switch in both headers. Every text pair meets WCAG AA (values and ratios in DESIGN.md › Colors › Night).

## Drawn icons addendum (TICKET-UI-04)

ICONS: Where a control is an icon, the icon is drawn in the same ballpoint: a small sketch on a 24px grid in one ink stroke, red pen and paper only where the subject has them, fills hatched or scribbled, wobbled by `#ink-wobble`. Never an icon library, emoji or a clean geometric glyph. The header switches are icons only (flags for languages, half-hatched circle / sun / crescent for System / Light / Dark), each a 44px target named by its word (aria-label + title); the pressed one keeps the highlighter. Flags keep their day colours at night (light field, day blue, day red), like a sticker on the dark page; the notebook icons follow the theme (TICKET-UI-06).

## Hover marks addendum (TICKET-UI-05)

HOVER: The page reacts like a notebook being marked up. On a device with a pointer, the red pen draws a loose loop round the control under it (buttons, link buttons, tabs, nav links, table sort links) in one quick stroke from about 9 o'clock that runs a little past its start; a control that deletes gets a red X scribbled over it instead, two finer strokes one after the other. Red pen only, wobbled by `#ink-wobble`, never shifting layout or hiding the label. Gone the moment the pointer leaves. Touch and reduced motion get the colour hover only; keyboard focus keeps the dashed outline.

## Notebook polish addendum (TICKET-UI-08)

POLISH: The page is written on the squares. One square is one line of set text (22px), and the shells and list pages step in whole squares from the page top, so each word sits in the middle of its squares and every drawn box and rule runs along a grid line. Every line on the page is drawn: table rules are the outline's own ballpoint strands (two under the header row, a faint dotted pencil rule between rows and above the footer), and links carry a drawn pen stroke under their words that follows them onto a second line. Photos are clipped onto their post-its with an ink paperclip (blank notes keep the pin and the tape); tapping an item's photo opens it large in a drawn dialog, also without JS. The public sheet widens on big screens so a many-field table fits.

## Unresolved

- Handwriting face (Kalam) for data at small sizes on phones: verify legibility at 360 px, fall back to a set face for table data if it fails.
- Real item photos inside post-its: crop square, keep the post-it border visible.
