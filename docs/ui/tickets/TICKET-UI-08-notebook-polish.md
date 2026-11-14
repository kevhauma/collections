# TICKET-UI-08: Notebook polish

- **Area:** UI
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Stack](../../technical-design.md#stack) (UI library), [.impeccable/surfaces/src-ui.md](../../../.impeccable/surfaces/src-ui.md), [DESIGN.md](../../../DESIGN.md), extends [TICKET-ITM-04](../../items/tickets/TICKET-ITM-04-item-images.md) and [TICKET-ITM-05](../../items/tickets/TICKET-ITM-05-collection-views.md)

## User story

As the admin or a visitor, I want the notebook page to feel finished (text on the squares, drawn dividers, clipped
pictures I can open large, a table that uses the screen) and a list toolbar that doesn't fire a request per click, so
browsing a collection looks right and stays fast.

## Description

Six small fixes from using the app: a paperclip on pictures, a wider table on big screens, no repeated requests from
the toolbar's Apply, click-to-enlarge on item pictures, hand-drawn dividers and word underlines, and body text sitting on
the paper's squares.

## Current situation (as-is)

- **Picture decoration:** pictures sit on a [`PostIt`](../../../src/ui/post-it.tsx) fastened by a `pin` or `tape`
  (`fastenings`). Item thumbnails pick one by id in `Thumbnail`
  ([src/routes/item-views.tsx](../../../src/routes/item-views.tsx)); the collection picture
  ([src/routes/collection-picture.tsx](../../../src/routes/collection-picture.tsx)) always uses the pin. There is no
  paperclip.
- **Table width:** the public shell caps the page at `max-w-3xl` (48rem,
  [src/routes/public-layout.tsx](../../../src/routes/public-layout.tsx)) and the admin shell at `max-w-6xl`
  ([src/routes/admin-layout.tsx](../../../src/routes/admin-layout.tsx)). A table with many fields scrolls sideways
  inside [`Table`](../../../src/ui/table.tsx)'s `overflow-x-auto` even on a wide monitor with empty space left and
  right.
- **Apply spam:** [`ItemToolbar`](../../../src/routes/item-toolbar.tsx) is a GET form; every click on Apply (or Enter
  in search) starts a new navigation, so clicking repeatedly sends one request per click, even when nothing changed.
- **Enlarge:** item pictures only appear as thumbnails (`thumbUrl`) in `Thumbnail` (table `sm`, grid `md`) and on the
  item form ([src/routes/image-section.tsx](../../../src/routes/image-section.tsx)). Nothing opens the display size
  (`imageUrl`).
- **Dividers:** boxes get a sketched ballpoint outline from the `ink-outline` utility: pseudo-elements filled with
  `--ink-line` and masked by vector pen strokes (`--ink-c1..4` corners, `--ink-h1`/`--ink-h2` and `--ink-v1`/`--ink-v2`
  edges, [src/ui/styles.css](../../../src/ui/styles.css)). Dividers are still straight CSS borders: table rows
  (`Td`, `border-dashed border-rule`), the sortable-list handle cell
  ([src/ui/sortable-list.tsx](../../../src/ui/sortable-list.tsx)), the header underline (`Th`, `border-b-2
  border-ink`) and the public footer (`border-t border-dashed`). They look machine-ruled next to the drawn boxes.
- **Word underlines:** links are underlined with a plain CSS `text-decoration` (`a` in `@layer base`,
  `text-underline-offset: 4px`, `text-decoration-thickness: 1.5px`), and sortable table headers add `hover:underline`
  (`Th`). These are straight machine lines too.
- **Grid alignment:** the paper is an 18px grid (`--grid-square`), but body text is `1rem/1.4` = 22.4px per line
  (`html` in `styles.css`, DESIGN.md › Body). Lines drift across the squares, so text never sits on a grid line.

## Desired result (to-be)

- A `paperclip` fastening on `PostIt`: a drawn clip over the top edge, in ink, legible by day and night. Pictures
  (item thumbnails, the collection picture, the item form's current image) use it; blank post-its and notes keep
  pins and tape.
- The list pages widen on large screens so a table with many columns fits: the public shell, or the table area alone,
  grows beyond `max-w-3xl` from a breakpoint up, while titles and prose keep a readable measure. Phone width
  unchanged.
- Apply doesn't flood the server: while a toolbar navigation is in flight, further submits are ignored (the button
  shows it's busy), and submitting the same query as the current URL does nothing. Without JS the form still works
  as a plain GET.
- Clicking an item's picture opens it at display size (`imageUrl`) in a native `<dialog>` via invoker commands
  (the [`Dialog`](../../../src/ui/dialog.tsx) pattern), so it works without JS and on public pages without client
  components. Escape, the close button and a backdrop click close it. Items without a picture aren't clickable.
- Dividers are drawn like the outlines: a utility next to `ink-outline` in `styles.css` that masks `--ink-line` with
  the existing horizontal strokes (`--ink-h1`/`--ink-h2`), plus a faint dotted variant for row rules. Used for table
  rows, the header underline, the sortable-list cell and the footer.
- Word underlines are drawn too: links (and the sortable header's hover underline) get a hand-drawn ink stroke under
  the words instead of `text-decoration`, following the text when a link wraps onto a second line. The text itself
  stays crisp. The underline still shows without hover, so links remain recognisable (WCAG 1.4.1).
- Body line height becomes one grid square (or the grid becomes one line), and the vertical rhythm (padding, gaps,
  row heights) snaps to whole squares, so set text in the main column sits on the grid lines. The grid background
  starts where the text does, so both line up.

## UI requirements

- Paperclip fastening on picture post-its.
- Wider list/table area on large screens.
- Busy state on the toolbar's Apply button.
- A picture dialog opened from item thumbnails in table and grid, admin and public.
- Drawn dividers in tables, sortable lists and the footer, and drawn underlines under links.
- Text aligned to the squared paper.

## Acceptance criteria

- [x] `PostIt` has a `paperclip` fastening; item thumbnails with a picture, the collection picture and the item form's
      image use it. It's visible on every post-it colour, by day and night. (`fastenings.paperclip` in
      `src/ui/post-it.tsx`: an ink wire over a wider paper-coloured pass, so the part on the page reads on dark paper;
      used by `Thumbnail` via `postItLook` in `src/routes/item-views.tsx`, `CollectionPicture` and `ImageSection`.
      Orca screenshots 2026-11-14 on yellow, pink, blue and green post-its, light and dark.)
- [x] On a ≥1280px viewport, a public have list in table view with 8+ fields shows more columns without horizontal
      scroll than today; at 360px nothing changes and the page doesn't scroll sideways. (Public shell
      `max-w-3xl xl:max-w-6xl` in `src/routes/public-layout.tsx`. At 1440px a 10-field have list: table scroller
      1088/1088 px, all 12 columns visible; with the old `max-w-3xl` the same table was 1019 px in a 704 px scroller. At
      360px `scrollWidth` = 360.)
- [x] Clicking Apply ten times quickly sends one request (network panel); Apply with an unchanged query sends none.
      With JS off, Apply still submits the GET form. (`data-submit-once` on the toolbar form and the inline guard from
      `src/lib/submit-once.ts`, rendered in `routes/root.tsx`. Production build, Orca network log: ten clicks with an
      unchanged query sent no request; ten clicks after typing "kind" sent one `?view=table&q=kind…`. The button shows
      "Applying…" while busy. Headless Chrome over CDP with script execution disabled: typing "blue" + Apply loaded
      `?view=table&q=blue…` with 2 rows.)
- [x] Clicking an item picture in table and grid view (admin and public) opens the display-size image in a dialog
      with an alt text; Escape, the close button and a backdrop click close it. Works with JS off. Public pages still
      ship no client components. (`Enlargeable` in `src/routes/item-views.tsx`: an invoker-command button and a
      `Dialog closedby="any"` with `imageUrl` and alt = item title. Orca, admin want table, public table and grid: the
      dialog opens with the 1000px image; Escape, a backdrop click and the × close it. Same in headless Chrome with
      scripts disabled. The public production HTML has no module script, only the flight data and the submit guard.
      Backdrop close relies on `closedby`, which Safari lacks; there Escape and × still close it.)
- [x] Table rows, the header underline, the sortable-list handle cell and the public footer use the drawn divider; no
      straight `border-dashed`/`border-dotted` divider remains in `src/**/*.tsx`. (`ink-rule` / `ink-rule-dotted` in
      `styles.css`, used by `Th`, `Td`, the `SortableList` handle cell and the public `main` above the footer;
      `grep border-dashed|border-dotted src/**/*.tsx` finds nothing.)
- [x] Links and the sortable header's hover state show a drawn underline instead of a straight one, including a link
      that wraps over two lines; link text stays crisp. Visible by day and night, with 3:1 contrast
      against the paper. (`ink-underline` utility, applied to `a:not(.no-underline)` and as `hover:ink-underline` on
      `Th`, nav tabs and ghost buttons: a background-image stroke with `box-decoration-break: clone`. Orca: the wrapped
      title link "What's Going On" is underlined on both lines. Ink #1f3a93 on paper 9.89:1, night #d3ddff 13.5:1; the
      error summary's red underline 4.76:1 / 5.5:1.)
- [x] Body text lines in the main column sit on the grid: line height equals `--grid-square` (or a whole multiple),
      checked by overlaying a page screenshot on the grid at 360px and desktop. Headline sizes keep their look.
      (`--grid-square: 1.375rem` = the body line height and every `--text-*--line-height`; the grid rows start at the
      baseline, `calc(var(--grid-square) / 2 + 0.25rem)`; shells, list page, toolbar and table step in `sq` tokens. On
      the public list at 360px and 1440px, label, table header and cell text all have their glyph box at the same
      offset to the grid rows (measured with Range rects), and a zoomed screenshot shows the words on the lines.
      Labels inside 44px drawn boxes (tabs, buttons, inputs) are centred in the box, half a square off, by choice: the
      boxes stay on the squares. The h1 keeps its size, its line height rounded to whole squares.)
- [x] Dark mode still meets the TICKET-UI-03 contrast rules for the clip, the dividers and the dialog. (Clip: day ink
      on post-its 8:1+, the paper pass on night paper 18:1; header rule in night ink 13.5:1; row rules keep the `rule`
      token the dashed borders used; the dialog is unchanged paper and ink. Orca dark screenshots of table, grid and
      dialog.)
- [x] Every new string (dialog close label, busy label) has an explicit i18n id with EN and NL text.
      (`items.picture.open`, `items.picture.close`, `items.filter.busy` in `en.json` / `nl.json`; catalogs test passes.)
- [x] Unit tests cover: the "unchanged query" check (same params → skip, any changed field → submit, ignoring
      parameter order) if it lands as a function. (`src/lib/submit-once.test.ts`: "skips the same params", "ignores
      parameter order", "submits when any field changed".)
- [x] UI follows the design direction in `.impeccable/surfaces/src-ui.md` and `DESIGN.md` (update both for the clip,
      the drawn divider and the new line height); live browser check at 360px and desktop, light and dark. (Notebook
      polish addendum in `src-ui.md`; DESIGN.md typography, spacing, layout, links, tables, post-it and dialog sections.
      Orca 2026-11-14: public list table and grid at 360px and 1440px, admin want table and item form, light and dark.)
- [x] Verified with the fallow skill. (`npx fallow@3.43.0 audit --base HEAD`: no issues in 23 changed files; advisory
      styling notes only, for the picture dialog's width and the grid post-it's rounded width.)

## Notes

- Independent of other open tickets; can ship any time. Six items in one ticket because each is small; split them if
  one grows (the grid alignment is the one most likely to ripple through spacing across every page).
- Grid alignment: changing the line height touches every component's spacing. Prefer changing `--grid-square` to the
  line height if that reads better than squeezing Kalam to 18px; decide in the design pass.
- Enlarge: the table thumbnail is small, so the click target must still be at least 24px (WCAG 2.5.8).
- The edge strokes stretch only along their length, so a long row rule keeps its weight; check at 100% and 200% zoom.
- Underlines: a pseudo-element doesn't follow a wrapped link. A stroke image (like `--ink-h1`, in the link colour) as
  a `background-image` at the baseline with `box-decoration-break: clone` follows wrapped lines without touching the
  text. Mind the sortable header's red-pen `HoverMark` (TICKET-UI-05): the drawn underline must not fight it.
