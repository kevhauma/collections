# TICKET-UI-01: UI library foundation

- **Area:** UI
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Stack](../../technical-design.md#stack) (Styling, UI library rows)

## User story

As the developer, I want a small set of reusable, accessible components in `src/ui/`, so every screen looks
consistent and public pages stay free of client JavaScript.

## Description

The in-house UI library: design tokens, a `cn()` helper, and the primitives every later ticket uses. Server-safe by
default, with native HTML for interactivity.

## Current situation (as-is)

- Tailwind is wired up (TICKET-PLAT-02), with no components.

## Desired result (to-be)

- `src/ui/styles.css` holds Tailwind v4 `@theme` tokens (colours, radius, spacing scale, font) in one place.
- `src/ui/cn.ts` is `twMerge` over the truthy class strings.
- Components, variants via `cva`:
  - `Button` / `LinkButton`, with variants `primary`, `secondary`, `ghost`, `danger` and sizes `sm`, `md`
  - `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`
  - `FormField`, which wires label, hint and error to the control with `aria-describedby` / `aria-invalid`
  - `Card`, `Badge`, `EmptyState`
  - `Table`, `Th` (renders a sort link with `aria-sort`), `Td`
  - `TabLinks`, tabs as plain links with `aria-current="page"`
  - `Dialog` (native `<dialog>`, opened per the spike's finding) and `Popover` (Popover API)
  - added during the build: `PostIt` (the item image frame the direction calls for, also used by `EmptyState`) and
    `InkDefs` (the SVG wobble filter behind every drawn outline)
- Each file is a server component unless it needs state. Client components carry `'use client'` and are listed in
  `src/ui/README.md`, together with each component's props.

## UI requirements

- Visible focus rings (`focus-visible`) on all interactive elements.
- WCAG AA contrast for text and controls.
- Touch targets at least 40 px.
- Layouts work from 360 px wide.

## Acceptance criteria

- [x] All components above exist and are typed. Variants are declared with `cva`, with no inline conditionals for
      styling. (`src/ui/*.tsx`, `npm run typecheck` clean; variants in `cva` for Button, Card, Badge, PostIt; state
      styling via `aria-*` / `has-*` variants and lookup objects, e.g. `fastenings` in `post-it.tsx`)
- [x] No component in the list uses hooks or `'use client'` except `Dialog` / `Popover`, and only if the spike
      showed they need it. (none does, Dialog and Popover included: they open with invoker commands / the Popover
      API, verified opening by real click with JS disabled in Chrome over CDP)
- [x] `FormField` produces correct label association and error announcement. Checked with a screen reader or the
      accessibility tree in the browser. (Chrome accessibility tree: textbox "Title" with description "A hint under
      the control."; textbox "Year" with description "An error, announced with the field." and invalid=true)
- [x] Live browser check of each component on the placeholder route. There is deliberately **no** showcase page;
      remove the usages once real screens use them. (`src/routes/home.tsx`, prod build, Chrome headless at 1440 and
      360 px with JS off: no horizontal scroll at 360 px, dialog opens and closes, popover opens anchored under its
      button, dashed focus ring on keyboard focus for tabs, buttons and inputs, `aria-sort` and `aria-current`
      present. Every control is at least 40 px tall, and checkboxes/radios sit inside 40 px labels. Contrast
      measured: ink 9.89, ink-soft 6.03, pencil 6.63, red pen 4.76:1 on paper)
- [x] `src/ui/README.md` documents each component's props and which ones are client components. (none are)
- [x] Tokens and components implement the design direction in
      [.impeccable/surfaces/src-ui.md](../../../.impeccable/surfaces/src-ui.md): squared paper ground, ballpoint
      ink, red-pen and highlighter accents, hand-drawn outlines, post-it image frame. `DESIGN.md` is written from
      the result. (`src/ui/styles.css` tokens + `ink-outline`; `PostIt` frame; compared against
      `bp-drawn.html` in desktop and 360 px screenshots; [DESIGN.md](../../../DESIGN.md) and
      `.impeccable/design.json` written from the shipped code. Red pen also marks danger buttons and form errors,
      recorded in DESIGN.md. Kalam stayed legible at 360 px, closing the brief's open question)
- [x] Verified with the fallow skill. (`npx fallow@3.42.0 audit --base HEAD` → pass: dead-code 0, complexity 0,
      dupes 0, after `FormField` was refactored from a branchy body to a mapped message list to clear a CRAP finding;
      the impeccable detector also reported no findings)

## Notes

- Needs TICKET-PLAT-02, plus the dialog finding from TICKET-PLAT-01.
- No component tests, by decision. Only add tests if asked.
- Dark mode is not in scope.
- Extract to a separate package only if a second app needs it.
