# src/ui

The in-house component library: a notebook page in blue ballpoint on squared paper, item images as post-its. The
design rules are in [DESIGN.md](../../DESIGN.md) and [.impeccable/surfaces/src-ui.md](../../.impeccable/surfaces/src-ui.md).

**Every component here is a server component. None uses hooks or `'use client'`.** Dialogs and popovers open
through native HTML (invoker commands, the Popover API), so they work with JavaScript off (spike-results § 10).
Import each component from its own file (`../ui/button`). There is no barrel.

## Foundations

| File | What |
|---|---|
| `styles.css` | Tailwind `@theme` tokens (the only colours that exist), the squared-paper base, and the utilities `ink-outline`, `highlighted`, `postit-corner`, `ink-check`, `popover-anchored`. Self-hosts Kalam and Reenie Beanie. |
| `ink-defs.tsx` | `InkDefs`: the SVG `#ink-wobble` filter every drawn outline references. Render it **once** per document, in the root shell. |
| `cn.ts` | `cn(...classes)`: `twMerge` over the truthy class strings, so a caller's `className` wins over conflicting defaults. |
| `invoker-commands.d.ts` | Adds `commandfor` / `command` to React's button types. |

Drawn outlines: add `ink-outline` to draw a box. Set `[--ink-line:var(--color-red-pen)]` to recolour it, and
`[--ink-echo:none]` to drop the faint second pen pass.

## Components

Every component takes `className`, merged with `cn()`. Use it for layout only.

| Component | File | Props |
|---|---|---|
| `Button` | `button.tsx` | All `<button>` attributes, plus `variant`: `primary` (filled ink) · `secondary` (drawn, default) · `ghost` (underlined, no outline) · `danger` (red pen). `size`: `sm` (min 40 px) · `md` (min 44 px, default). Also opens dialogs (`commandfor="id" command="show-modal"`) and popovers (`popoverTarget="id"`). |
| `LinkButton` | `button.tsx` | All `<a>` attributes, plus the same `variant` / `size` as `Button`. |
| `Input` | `input.tsx` | All `<input>` attributes. `className` goes to the drawn box and the rest to the input. Set `aria-invalid` and the box turns red. |
| `Textarea` | `input.tsx` | All `<textarea>` attributes, same split as `Input`. |
| `Select` | `input.tsx` | All `<select>` attributes, same split as `Input`. Children are `<option>`s. |
| `Checkbox` | `choice.tsx` | All `<input>` attributes except `type`, plus `label: ReactNode`. The checkbox is its own label, so it doesn't go inside `FormField`. |
| `RadioGroup` | `choice.tsx` | `legend: ReactNode`, `name`, `options: {value, label}[]`, `defaultValue?`, `required?`. Renders a `<fieldset>`. |
| `FormField` | `form-field.tsx` | `id`, `label: ReactNode`, `hint?`, `error?`, `children: (control) => ReactNode`. Spread `control` (`id`, `aria-describedby`, `aria-invalid`) onto the control: `{(control) => <Input {...control} name="title" />}`. The error is read before the hint. |
| `Card` | `card.tsx` | `heading?: ReactNode` (an `<h2>` on a paper-scrap tab), `tone`: `red` (default) · `ink`, `children`. A drawn `<section>`. |
| `Badge` | `badge.tsx` | `variant`: `outline` (default) · `highlight` · `pencil` (private / secondary), `children`. |
| `PostIt` | `post-it.tsx` | `color`: `yellow` · `pink` · `blue` · `green`. `tilt`: `left` · `right` · `none`. `size`: `sm` (56 px) · `md` (80 px) · `lg` (176 px). `fastening`: `pin` (default) · `tape` · `none`. `children`: a photo (`<img className="size-full object-cover">`) or a note. This is the item image frame. |
| `EmptyState` | `empty-state.tsx` | `title: ReactNode` (scrawled), `children?` (explanation), `action?` (usually a `Button` or `LinkButton`). |
| `Table` | `table.tsx` | `children` (`<thead>` / `<tbody>`). Wraps the table in a horizontal scroller and uses tabular numerals. |
| `Th` | `table.tsx` | `children`, `sort?: { href, direction: "ascending" \| "descending" \| "none" }`. A sortable header renders a plain link and sets `aria-sort`. |
| `Td` | `table.tsx` | All `<td>` attributes. |
| `TabLinks` | `tab-links.tsx` | `label` (the nav's accessible name), `tabs: {href, label, current?}[]`, `variant`: `tabs` (drawn, default; the current tab is filled with ink) · `nav` (plain links; the current one gets the highlighter). Tabs are links, and the current one gets `aria-current="page"`. |
| `Dialog` | `dialog.tsx` | `id`, `title: ReactNode`, `closeLabel: string` (accessible name of the × button), `children`. Open it with `<Button commandfor={id} command="show-modal">`. |
| `Popover` | `popover.tsx` | `id`, `children`. Open it with `<Button popoverTarget={id}>`. It sits under its button where CSS anchor positioning exists, and centred otherwise. Light dismiss and Escape come from the browser. |

## Client components

None yet. A component that needs state gets `'use client'` and goes in this table. Public routes must never import
one.
