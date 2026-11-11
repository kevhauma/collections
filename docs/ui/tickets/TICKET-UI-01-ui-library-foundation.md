# TICKET-UI-01: UI library foundation

- **Area:** UI
- **Released in:** _unreleased_
- **Traceability:** [design.md § Stack](../../design.md#stack) (Styling, UI library rows)

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
- Each file is a server component unless it needs state. Client components carry `'use client'` and are listed in
  `src/ui/README.md`, together with each component's props.

## UI requirements

- Visible focus rings (`focus-visible`) on all interactive elements.
- WCAG AA contrast for text and controls.
- Touch targets at least 40 px.
- Layouts work from 360 px wide.

## Acceptance criteria

- [ ] All components above exist and are typed. Variants are declared with `cva`, with no inline conditionals for
      styling.
- [ ] No component in the list uses hooks or `'use client'` except `Dialog` / `Popover`, and only if the spike
      showed they need it.
- [ ] `FormField` produces correct label association and error announcement. Checked with a screen reader or the
      accessibility tree in the browser.
- [ ] Live browser check of each component on the placeholder route. There is deliberately **no** showcase page;
      remove the usages once real screens use them.
- [ ] `src/ui/README.md` documents each component's props and which ones are client components.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-PLAT-02, plus the dialog finding from TICKET-PLAT-01.
- No component tests, by decision. Only add tests if asked.
- Dark mode is not in scope.
- Extract to a separate package only if a second app needs it.
