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

OWN-WORLD: White squared paper (#fdfdfb, #e3e9f3 grid), ballpoint blue ink #1f3a93 for all text and outlines, red pen #d6312b for ranks and module tabs only, highlighter #fff27a for the active/top item. Every box, button, tab, input and chip has a wobbly double-pass pen outline (SVG displacement filter on pseudo-elements, content stays crisp). Post-its in yellow, pink, blue, green, pinned or taped, slightly rotated. Reenie Beanie for scrawled display and numbers, Kalam for set text.

STORY: The owner sees everything about a collection on one page and edits without leaving it. A relative opens the want link on a phone, reads a short ranked list with the top wish highlighted, sees owned items and doesn't buy a duplicate.

FIRST VIEWPORT: Admin: top line of scrawled app name, collection links (active highlighted), drawn search, util links. Below, huge scrawled collection name, drawn Have/Want tabs, red counts, drawn action buttons with filled "+ Add item" top right. Module mosaic: ranked Want module (left, full height, red rank numerals, post-it per row, big #1 post-it pinned over its corner), Share, Have count, Recently got (post-it cluster), Fields. Public phone: one calm column, same paper and ink, no mosaic.

FORM: User-steered: Ballpoint Notes (re-roll 1 steer) → Crammed Page, bolder register (re-roll 2, fused with japanese-high-density-web) → hand-drawn outlines + post-it images (re-roll 3 steer). Seed key d9a418d7.

Signature interaction: a want reranks in place and keeps its highlighter until noticed; a bought want is struck through with "got it!" before it leaves for Have. Motion: post-its settle with a small rotate-and-drop when added; nothing else animates; reduced motion removes it.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Handwriting face (Kalam) for data at small sizes on phones: verify legibility at 360 px, fall back to a set face for table data if it fails.
- Real item photos inside post-its: crop square, keep the post-it border visible.
