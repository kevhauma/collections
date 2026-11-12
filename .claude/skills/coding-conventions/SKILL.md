---
name: coding-conventions
description: Coding conventions for this collections app (React Server Components via React Router on Vite, Express, better-sqlite3 plain SQL, zod, Lingui, Tailwind + own UI library). Use when writing or reviewing any code in src/, migrations/ or scripts/, and when a ticket asks to be "verified via the coding-conventions skill".
paths: "**/*.ts,**/*.tsx,**/*.css,**/*.sql"
---

# Coding conventions

The design is the source of truth: [docs/technical-design.md](../../../docs/technical-design.md), with the *why* in
[docs/adr/](../../../docs/adr/). This skill turns those decisions into rules for code. When a ticket establishes or
changes a pattern, update this file in the same change (one or two sentences, in the matching section), and prefer
linking an exemplar file over describing it.

> The scaffold (TICKET-PLAT-02) exists: commands and paths below are real unless a later ticket is named. The spike's
> proven Lingui and Dockerfile snippets and the pinned versions are in
> [docs/research/spike-results.md](../../../docs/research/spike-results.md). Node is `>=26` (`engines`; Lingui needs
> ≥ 22.19, and an older Node makes npm silently skip its native binary).

## Commands

```bash
npm run dev            # Vite dev server + Express, HMR
npm run build          # production build (rsc, ssr and browser environments)
npm start              # serve the production build
npm test               # vitest
npm run typecheck      # tsc --noEmit
npm run i18n:extract   # update src/i18n/locales/{en,nl}.json
npm run reset-password # admin password recovery (TICKET-AUTH-03)
```

## Layout

```
src/
  entry.rsc.tsx  entry.ssr.tsx  entry.browser.tsx  # RSC entries: the learning surface, keep readable and commented
  server.ts        # Express: static assets, /uploads, /healthz, /locale, Origin check, RSC handler
  routes.ts        # React Router route config
  context.ts       # AsyncLocalStorage request context: request, locale, session
  routes/          # route modules: server components + their 'use server' actions
  features/<area>/ # domain logic per area (auth, collections, items, images, backup, …), pure where possible
  db/              # connection, migration runner, one repository module per table/aggregate
  ui/              # own UI library (see src/ui/README.md)
  i18n/            # the only place Lingui runtime APIs are wired (ADR 0002)
  lib/             # small shared pure helpers (e.g. order.ts: moveInList)
migrations/        # NNN-name.sql
scripts/           # CLI scripts, run with plain `node` (native TS type stripping)
```

- [src/server.ts](../../../src/server.ts) runs under plain `node` (dev: Vite middleware mode; `--prod`: serves `dist/`
  and sets `NODE_ENV=production` before loading it). Anything it needs from the app (e.g. `healthz`) is a named export
  of [src/entry.rsc.tsx](../../../src/entry.rsc.tsx), so app code stays inside the Vite bundle. Its own relative
  imports need the `.ts` extension.
- Env: `PORT` (3000), `DATA_DIR` (`./data`, holds `db.sqlite`), `TRUST_PROXY` (parsed by `src/lib/env.ts`).
- Files loaded only by string path (the RSC entries, `lingui.config.ts`) are listed as `entry` in `.fallowrc.json`.
  Add new ones there instead of suppressing fallow findings.
- Server-component HMR depends on the `rsc:update` → router `revalidate()` hook in
  [src/entry.browser.tsx](../../../src/entry.browser.tsx).

## General style

- **Declarative over imperative.** Map from data to output: field type → control via a lookup object, variants via
  `cva`, conditional form sections via CSS `:has()`, list state via URL params. Avoid `if` ladders, mutable
  accumulators and manual DOM work when a mapping or a platform feature does the job.
- `type` over `interface`. Strict TypeScript. No `any`. Use `unknown` and narrow it with zod at trust boundaries.
- Files are `kebab-case.ts(x)`. Components are `PascalCase`. Functions and values are `camelCase`. Tests are
  `*.test.ts` next to the file they test.
- `const` arrow functions for helpers. Named exports only, no default exports (except where React Router or Vite
  require one).
- Comment only the *why* the code can't show. Known limits get `// shortcut: <limit>, <when to upgrade>`.
- No dependency for a few lines. Check the ticket and design before adding one.

## Server and client components

- **Server components by default.** Data is read in server components straight from `src/db/` repositories, with
  no fetch-to-own-API layer.
- `'use client'` only where interaction needs it (drag-and-drop, live previews, optimistic updates, the field
  editor). **Admin routes may use client components. Public routes (`/`, `/:slug`, `/:slug/want`) must not**, and
  must work fully without JavaScript.
- Public routes sit under their own server-only layout (no client providers such as the Lingui `I18nProvider`
  wrapper), and `entry.ssr` omits `bootstrapScriptContent` for them, so they ship zero external JS (spike § 9).
- Props passed to a client component are serialized into the RSC payload. Never pass a row that may contain private
  fields or secrets. Pass the minimum view data.
- A client component never imports from `src/db/`, `src/features/*/` server-only modules, or `node:*`.

## Server actions

Every `'use server'` action follows the same shape:

1. `requireAdmin()` first. Actions are public HTTP endpoints even when nothing links to them.
2. Parse input with zod (`FormData` → typed input). Never trust ids, ranks or statuses from the client: re-check
   that the target belongs to the collection in the URL.
3. Call a repository function. Multi-table changes run inside **one** transaction in the repository.
4. On validation failure, return field errors as **i18n ids**, translated via `actionI18n()` (Lingui's `setI18n`
   doesn't reach actions, Lingui #2615). Values go in the `msg` template (`i18n._(msg({ id, message: `…${n}` }))`).
   `i18n._(descriptor, values)` is a type error in Lingui 6.12.
5. On success, redirect (form flows) or return the minimal result (client-invoked actions such as reordering).

Forms bind actions with `<form action={…}>` so they work before hydration. Call actions from client code only
where a form doesn't fit, and pair that with `useOptimistic` and a revert on failure.

## Data access (ADR 0003)

- All SQL lives in `src/db/*.ts` repository modules. **No SQL in routes, components or actions.**
- Values always go through bound parameters. The only interpolated SQL is a **validated integer field id** that
  belongs to the collection (dynamic `ORDER BY` / `json_extract` paths), validated by `parseListParams` or the
  equivalent.
- Item values live in `items.values_json`, keyed by field id as a string. Use SQLite JSON functions
  (`json_extract`, `json_each`, `json_set`, `json_remove`) rather than loading and rewriting rows in JS.
- Rank changes follow ADR 0004 (dense 1..n, shift + set in one transaction) and reuse `moveInList` from
  `src/lib/order.ts`.
- **Schema changes are a new numbered migration. Never edit a shipped one.** Update the hand-written row types and
  `docs/technical-design.md § Data model` in the same change.
- File writes paired with DB writes (images): write new files first, commit the DB transaction, delete old files
  after the commit, and delete the new files if the transaction fails.

## Public data and security

- Public routes read through `publicOnly: true` repository calls, which **strip private field keys at the query
  layer** and refuse private fields for search, sort and filter.
- Private and unknown collections both return the same 404.
- Redirect targets are same-origin paths only. Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` outside local
  dev.
- Never log passwords, session tokens or full request bodies.

## URL state

- List view state (`view`, `q`, `sort`, `dir`, `f.<fieldId>`) lives in the query string, parsed once at the route
  with zod (`parseListParams`) and passed down as props. Children never read the URL themselves.
- Invalid params are dropped, not turned into errors. Toolbars are GET forms, so every state is shareable and works
  without JS.

## i18n (ADR 0002)

- Every UI string uses an **explicit id** (`area.thing.action`) with text in **both** `en.json` and `nl.json`. Never
  use a source string as the id.
- Import Lingui runtime APIs through `src/i18n/`. Macros are imported from `@lingui/*/macro` directly.
- Catalogs are imported compiled through the Vite plugin (`./locales/nl.json?lingui`). There's no `lingui compile`
  step.
- Format numbers and dates with `formatNumber` / `formatDate` from `src/i18n/`, never `toFixed` or string
  concatenation.
- User-typed content (collection names, field labels, options, values) is never translated.

## UI library and styling

- **Every screen follows the design direction** in [.impeccable/surfaces/src-ui.md](../../../.impeccable/surfaces/src-ui.md)
  (ballpoint on squared paper, hand-drawn outlines, post-it item images), and `DESIGN.md` once it exists, which then
  wins. New UI uses its palette, type, outlines and states; a screen that looks like a generic grey app is a bug.
  Work on UI through the `impeccable` skill.
- Use `src/ui/` components before writing markup. If a pattern appears twice, it belongs in `src/ui/`.
- Variants are declared with `cva`. Callers pick `variant` / `size` props, never colour or variant classes. Merge a
  caller's `className` with `cn()` (tailwind-merge).
- Outside `src/ui/`, only layout utilities (flex, grid, gap, margin, padding, width) go on elements.
- Colours, radius and spacing come from the Tailwind `@theme` tokens in `src/ui/styles.css`. No hex values in
  components.
- Interactivity uses native HTML first: `<dialog>`, the Popover API, `<details>`, `:has()`.
- Accessibility is not optional: labelled controls (`FormField`), visible `focus-visible` rings, `aria-current` /
  `aria-sort` / `aria-invalid` where they apply, and image `alt` = item title.

## Testing

- vitest **unit tests** for logic: validators, parsers, slug and rank functions, conversions, repositories against a
  **temp SQLite file per test**. Name the cases the ticket lists.
- No component tests unless a ticket or the user asks for them.
- vitest uses its own [vitest.config.ts](../../../vitest.config.ts), so tests don't start the RSC environments.
  Exemplar: [src/context.test.ts](../../../src/context.test.ts).
- Test pure functions directly. Run repository tests against real SQLite, never mocks.

## Verification (Definition of Done)

Before a change is complete:

1. `npm run typecheck`: clean.
2. `npm test`: clean.
3. `npm run build`: compiles all three environments.
4. The **fallow** skill: no new dead code, no complexity hotspots. Fix the code rather than suppressing findings.
5. For UI changes, a live browser check (the `run` or `supermatt:qa` skill), including **with JavaScript disabled**
   for public pages and form flows.
