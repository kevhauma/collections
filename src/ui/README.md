# src/ui

The in-house component library: a notebook page in blue ballpoint on squared paper, item images as post-its. The
design rules are in [DESIGN.md](../../DESIGN.md) and [.impeccable/surfaces/src-ui.md](../../.impeccable/surfaces/src-ui.md).

**Every component here is a server component. None uses hooks or `'use client'`.** Dialogs and popovers open
through native HTML (invoker commands, the Popover API), so they work with JavaScript off (spike-results § 10).
Import each component from its own file (`../ui/button`). There is no barrel.

## Foundations

| File | What |
|---|---|
| `styles.css` | Tailwind `@theme` tokens (the only colours that exist), the squared-paper base, and the utilities `ink-outline`, `ink-rule` / `ink-rule-dotted` (a drawn line along the bottom edge: header rule / row rule), `ink-underline` (the drawn word underline every link gets unless it has `no-underline`; `--underline` swaps its ink), `hover-mark`, `highlighted`, `day-colours` (day token values whatever the theme: post-its, flags), `postit-corner`, `ink-check`, `popover-anchored`. One `--grid-square` (22px) is one line of set text, and the spacing tokens `sq-half`, `sq`, `sq-2`, `sq-4` (`py-sq`, `gap-sq`, `h-sq-4`) keep vertical rhythm on the squares (TICKET-UI-08). Self-hosts Kalam and Reenie Beanie; `routes/root.tsx` preloads the same three woff2 files (TICKET-UI-07), so a new face there needs a preload too. |
| `ink-defs.tsx` | `InkDefs`: the SVG `#ink-wobble` filter the drawn checkbox, radio and `InkIcon` reference (outlines are vector masks, see `ink-outline`). Render it **once** per document, in the root shell. |
| `cn.ts` | `cn(...classes)`: `twMerge` over the truthy class strings, so a caller's `className` wins over conflicting defaults. |
| `invoker-commands.d.ts` | Adds `commandfor` / `command` to React's button types. |

Drawn outlines: add `ink-outline` to draw a box. Set `[--ink-line:var(--color-red-pen)]` to recolour it, and
`[--ink-echo:none]` to drop the faint second pen pass.

## Components

Every component takes `className`, merged with `cn()`. Use it for layout only.

| Component | File | Props |
|---|---|---|
| `Button` | `button.tsx` | All `<button>` attributes, plus `variant`: `primary` (filled ink) · `secondary` (drawn, default) · `ghost` (underlined, no outline) · `danger` (red pen). `size`: `sm` (min 40 px) · `md` (min 44 px, default) · `icon` (44 px square; give it an `aria-label` and `title`). Also opens dialogs (`commandfor="id" command="show-modal"`) and popovers (`popoverTarget="id"`). As a toggle, `aria-pressed` gives it the highlighter. Hovering draws a red-pen loop round it; `mark="cross"` scribbles an X instead, for a control that deletes. |
| `LinkButton` | `button.tsx` | All `<a>` attributes, plus the same `variant` / `size` / `mark` as `Button`. |
| `HoverMark` | `hover-mark.tsx` | `mark?`: `circle` (default) · `cross`. The red-pen hover mark; `Button`, `LinkButton`, `TabLinks` and table sort links render it as their last child (the parent must be positioned). |
| `Input` | `input.tsx` | All `<input>` attributes. `className` goes to the drawn box and the rest to the input. Set `aria-invalid` and the box turns red. |
| `Textarea` | `input.tsx` | All `<textarea>` attributes, same split as `Input`. |
| `Select` | `input.tsx` | All `<select>` attributes, same split as `Input`. Children are `<option>`s. |
| `Checkbox` | `choice.tsx` | All `<input>` attributes except `type`, plus `label: ReactNode`. The checkbox is its own label, so it doesn't go inside `FormField`. |
| `RadioGroup` | `choice.tsx` | `legend: ReactNode`, `name`, `options: {value, label}[]`, `defaultValue?`, `required?`. Renders a `<fieldset>`. |
| `FormField` | `form-field.tsx` | `id`, `label: ReactNode`, `hint?`, `error?`, `required?: string` (the word screen readers hear; the label gets an asterisk), `children: (control) => ReactNode`. Spread `control` (`id`, `aria-describedby`, `aria-invalid`, `aria-required`) onto the control: `{(control) => <Input {...control} name="title" />}`. The error is read before the hint. |
| `ErrorSummary` | `error-summary.tsx` | `title: ReactNode`, `errors: {href, text}[]` (each links to its control). A red-pen box with `role="alert"` at the top of a failed form; renders nothing without errors. |
| `Card` | `card.tsx` | `heading?: ReactNode` (an `<h2>` on a paper-scrap tab), `tone`: `red` (default) · `ink`, `children`. A drawn `<section>`. |
| `Badge` | `badge.tsx` | `variant`: `outline` (default) · `highlight` · `pencil` (private / secondary), `children`. |
| `PostIt` | `post-it.tsx` | `color`: `yellow` · `pink` · `blue` · `green`. `tilt`: `left` · `right` · `none`. `size`: `sm` (56 px) · `md` (80 px) · `lg` (176 px). `fastening`: `pin` (default) · `tape` · `paperclip`; item lists pick colour, tilt and fastening with `postItLook(id)` from `src/features/items/post-it-look.ts` · `none`. `children`: a photo (`<img className="size-full object-cover">`, any aspect ratio: the single grid cell is pinned to the box) or a note. This is the item image frame. |
| `Rating` | `rating.tsx` | `value`, `max`, `symbol`, `label` (read out instead, e.g. "4 of 5"). A row of `max` symbols, the first `value` in ink and the rest faded. |
| `InkIcon` | `ink-icon.tsx` | `name`: `flag-en` · `flag-nl` · `system` · `light` · `dark`. A 24 px pen sketch in ink (currentColor) through `#ink-wobble`, `aria-hidden`; the control holding it carries the name. Add a drawing to its `drawings` map for a new icon (a new locale needs its flag). |
| `Rank` | `rank.tsx` | `children` (the number). A want's rank scrawled in red pen, Reenie Beanie 36 px. |
| `EmptyState` | `empty-state.tsx` | `title: ReactNode` (scrawled), `children?` (explanation), `action?` (usually a `Button` or `LinkButton`). |
| `Table` | `table.tsx` | `children` (`<thead>` / `<tbody>`). Wraps the table in a horizontal scroller and uses tabular numerals. |
| `Th` | `table.tsx` | `children`, `sort?: { href, direction: "ascending" \| "descending" \| "none" }`. A sortable header renders a plain link and sets `aria-sort`. |
| `Td` | `table.tsx` | All `<td>` attributes. |
| `TabLinks` | `tab-links.tsx` | `label` (the nav's accessible name), `tabs: {href, label, current?}[]`, `variant`: `tabs` (drawn, default; the current tab is filled with ink) · `nav` (plain links; the current one gets the highlighter). Tabs are links, and the current one gets `aria-current="page"`. |
| `Dialog` | `dialog.tsx` | `id`, `title: ReactNode`, `closeLabel: string` (accessible name of the × button), `closedby?: "any"` (also closes on a backdrop click), `className?` (e.g. a wider width), `children`. Open it with `<Button commandfor={id} command="show-modal">`. |
| `Popover` | `popover.tsx` | `id`, `children`. Open it with `<Button popoverTarget={id}>`. It sits under its button where CSS anchor positioning exists, and centred otherwise. Light dismiss and Escape come from the browser. |

## Client components

A component that needs state gets `'use client'` and goes in this table. Public routes must never import one.

| Component | File | Props |
|---|---|---|
| `SortableList` | `sortable-list.tsx` | `items: {id, content, anchor?}[]` (`anchor` = the row's HTML id), `onMove(id, to)`: a server action taking the 1-based target position, `handleLabel` (the drag handle's tooltip), `failedMessage` (shown when a save fails), `layout`: `list` (an `<ol>`, default) · `table` (a `<tbody>`; each `content` is the row's `<td>`s and the handle gets its own cell, so add a header column), `className`. Drag-and-drop by a handle (hidden from assistive tech), optimistic with a fallback and the message when saving fails; the drop target gets the highlighter. Rows must also carry no-JS move controls. Uses `moveInList`. |
