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
> ≥ 22.19, and an older Node makes npm silently skip its native binary). Install with `npm ci --ignore-scripts`: npm 11
> otherwise runs node-gyp for better-sqlite3, whose prebuilds already ship in the tarball.

## Commands

```bash
npm run dev            # Vite dev server + Express, HMR
npm run build          # production build (rsc, ssr and browser environments)
npm start              # serve the production build
npm test               # vitest
npm run typecheck      # tsc --noEmit
npm run i18n:extract   # update src/i18n/locales/{en,nl}.json (--clean --overwrite: en.json always mirrors the code)
npm run reset-password # admin password recovery; --stdin for scripted use (scripts/reset-password.ts)
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
- The [Dockerfile](../../../Dockerfile) runtime stage copies `dist/`, all of `src/` and `scripts/`, `migrations/` and
  the pruned `node_modules`. Deploy guide: `docs/platform/deploy.md`.
- Code that plain `node` loads (`src/server.ts`, `scripts/*.ts` and everything they import) uses explicit `.ts`
  relative imports, which Node's type stripping needs. Vite doesn't care, so modules only Vite loads may omit them.
  Exemplar: [scripts/reset-password.ts](../../../scripts/reset-password.ts) → `src/features/auth/reset-password.ts`
  → `src/db/admin.ts`.
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
- Public routes sit under the server-only `public` layout route ([src/routes.ts](../../../src/routes.ts)). It has no
  client providers; `ClientI18nProvider` lives in the admin layout. `entry.ssr` omits `bootstrapScriptContent` when a
  match has id `public`, so these pages never hydrate. React Router's runtime is still preloaded (see TICKET-PUB-02).
- A layout route module exports `Layout` (its frame, which also wraps its `ErrorBoundary`), a default component
  rendering `<Outlet />`, and `ErrorBoundary = RouteError` ([src/routes/public-layout.tsx](../../../src/routes/public-layout.tsx)).
  Pages render their own `<title>`. A private or unknown resource answers 404 by throwing
  `data(null, { status: 404 })` from a route `loader`; `RouteError` shows the not-found page. `.fallowrc.json`
  `ignoreExports` covers these contract names in `src/routes/`.
- Props passed to a client component are serialized into the RSC payload. Never pass a row that may contain private
  fields or secrets. Pass the minimum view data.
- A client component never imports from `src/db/`, `src/features/*/` server-only modules, or `node:*`.

## Server actions

Every `'use server'` action follows the same shape:

1. `requireAdmin()` first ([src/features/auth/guard.ts](../../../src/features/auth/guard.ts)). Actions are public HTTP
   endpoints even when nothing links to them. Admin route loaders call it too: a parent layout's loader doesn't rerun
   on every client navigation. Without a session, `GET` redirects to the login at `/admin`, and anything else gets
   a thrown `Response` 401.
2. Parse input with zod (`FormData` → typed input). Never trust ids, ranks or statuses from the client: re-check
   that the target belongs to the collection in the URL.
3. Call a repository function. Multi-table changes run inside **one** transaction in the repository.
4. On validation failure, return field errors as **i18n ids**, translated via `actionI18n()` (Lingui's `setI18n`
   doesn't reach actions, Lingui #2615). Values go in the `msg` template (`i18n._(msg({ id, message: `…${n}` }))`).
   `i18n._(descriptor, values)` is a type error in Lingui 6.12.
5. On success, redirect (form flows) or return the minimal result (client-invoked actions such as reordering).

Plain forms (setup, login, settings) use a React Router route `action`: `<form method="post">`, and the route's server
component receives the result as `actionData`, so they need no client code and work without JS. Exemplars:
[src/routes/setup.tsx](../../../src/routes/setup.tsx) (public),
[src/routes/admin-settings.tsx](../../../src/routes/admin-settings.tsx) (admin: `requireAdmin()` in both `loader` and
`action`). Use a `'use server'` function bound with `<form action={…}>` when a client component needs the result
(e.g. `useActionState`, `useOptimistic`). Call actions from client code only
where a form doesn't fit, and pair that with `useOptimistic` and a revert on failure.

- **After a route `action`, React Router's RSC mode renders without rerunning loaders: `loaderData` is `null`.** A
  page with a form reads its data in the component (from `params`), and its `loader` only guards (`requireAdmin()`,
  404). Exemplar: [src/routes/admin-collection-settings.tsx](../../../src/routes/admin-collection-settings.tsx), with
  `requireCollection(params.slug)` from `src/features/collections/require-collection.ts`.
- An `/admin/c/:slug` route action is `collectionAction((collection, form, params) => …)` from the same file: it
  runs `requireAdmin()`, loads the collection (or 404) and reads the form; `params` carries the rest of the URL (an
  item id). A page with several forms posts an `intent`
  and dispatches through a lookup object; successful posts redirect back (to `#<anchor>` of the changed row). Exemplar:
  [src/routes/admin-collection-fields.tsx](../../../src/routes/admin-collection-fields.tsx).
- Form validation lives in `src/features/<area>/validation.ts` as zod schemas whose issue messages are **keys**, so
  vitest can test it (vitest has no Lingui plugin, so a module using `msg` can't be imported in a test). A sibling
  `form.ts` maps the keys to `msg` ids and returns `{ errors, values }`, echoing what was typed so a no-JS reload keeps
  it. Exemplar: [src/features/collections/](../../../src/features/collections/) (`parseCreate`, `rejected`).

## Data access (ADR 0003)

- All SQL lives in `src/db/*.ts` repository modules. **No SQL in routes, components or actions.**
- Repository tests open a temp DB. Either the function takes the connection as an optional last parameter
  (`connection = db()`, needed for two connections to one file, [src/db/admin.ts](../../../src/db/admin.ts)), or the
  test file sets `DATA_DIR` to a temp dir before the first `db()` call
  ([src/features/auth/session.test.ts](../../../src/features/auth/session.test.ts)). Prefer a single atomic
  statement (`INSERT … ON CONFLICT DO NOTHING`, then check `changes`) over check-then-insert.
- Bind a field id used in a JSON path as a **string** (`'$."' || @id || '"'`): better-sqlite3 binds JS numbers as
  REAL, which makes the path `$."3.0"`.
- Values always go through bound parameters. The only interpolated SQL is a **validated integer field id** that
  belongs to the collection (dynamic `ORDER BY` / `json_extract` paths), validated by `parseListParams` or the
  equivalent.
- Read a stored value with `values_json -> path` and `JSON.parse` when its JSON type matters: `json_extract` turns
  `true` into `1` (`fieldValues` in [src/db/fields.ts](../../../src/db/fields.ts)). A change that rewrites item data
  takes a `plan` callback and runs it inside its transaction, so the policy stays pure and tested in
  `src/features/` and the plan sees current data (`changeFieldType`).
- Item values live in `items.values_json`, keyed by field id as a string. Use SQLite JSON functions
  (`json_extract`, `json_each`, `json_set`, `json_remove`) rather than loading and rewriting rows in JS.
- Rank changes follow ADR 0004 (dense 1..n, shift + set in one transaction) and reuse `moveInList` from
  `src/lib/order.ts`. Status changes place the rank inside the item write's transaction (append at n+1, close the gap):
  [src/db/items.ts](../../../src/db/items.ts). A move loads the ordered ids, applies `moveInList` and renumbers
  (`moveField`, `moveWant`). Drag-and-drop is `SortableList` calling a bound `'use server'` action
  ([src/routes/item-actions.ts](../../../src/routes/item-actions.ts)); the no-JS twin (move buttons, rank inputs)
  posts the same move to the route action.
- The connection is `db()` from [src/db/connection.ts](../../../src/db/connection.ts) (WAL, `foreign_keys = ON`,
  migrated on open by [src/db/migrate.ts](../../../src/db/migrate.ts)). Repository tests open a temp DB with
  `openDatabase(tempDir)`, as in [src/db/migrate.test.ts](../../../src/db/migrate.test.ts).
- In CHECK constraints, wrap nullable columns in `coalesce`: CHECK only rejects FALSE, and a comparison with NULL is NULL.
- **Schema changes are a new numbered migration. Never edit a shipped one.** Update the hand-written row types and
  `docs/technical-design.md § Data model` in the same change.
- File writes paired with DB writes (images): write new files first, commit the DB transaction, delete old files
  after the commit, and delete the new files if the transaction fails: `prepareImage` then `commitImage` from
  [src/features/images/change.ts](../../../src/features/images/change.ts). Files live under `dataDir()`
  (`src/lib/env.ts`); image constants the browser needs too are in `src/features/images/shared.ts`.

## Public data and security

- Public routes read through `publicOnly: true` repository calls, which **strip private field keys at the query
  layer** and refuse private fields for search, sort and filter.
- Private and unknown collections both return the same 404.
- Check that private data stays out of a page against the **production build** (`npm run build && npm start`): in
  dev, React's debug rows in the inline RSC payload can carry other requests' data, such as an admin route's
  params. The production payload has none of that.
- Redirect targets are same-origin paths only: build them with `safeRedirectTarget`
  ([src/lib/redirect.ts](../../../src/lib/redirect.ts)). Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` outside local
  dev.
- Never log passwords, session tokens or full request bodies.
- The session is resolved once per request in `entry.rsc.tsx` (`requestContext().session`). To send a cookie from an
  action, push it onto `requestContext().setCookies`; `entry.rsc.tsx` adds them to whatever response goes out
  (`logIn()` / `logOut()` in [src/features/auth/session.ts](../../../src/features/auth/session.ts)). Cross-origin
  writes are refused with 403 in `src/server.ts` before app code runs.

## URL state

- List view state (`view`, `q`, `sort`, `dir`, `f.<fieldId>`) lives in the query string, parsed once at the route
  with zod (`parseListParams`) and passed down as props. Children never read the URL themselves. Links are built with
  `listQuery` (defaults left out), `switchTab` and `sortToggle` from
  [src/features/items/list-params.ts](../../../src/features/items/list-params.ts). The views are `ItemTable` /
  `ItemGrid` / `ItemToolbar` in `src/routes/item-views.tsx` and `item-toolbar.tsx`, with `mode: "admin" | "public"`.
- Invalid params are dropped, not turned into errors. Toolbars are GET forms, so every state is shareable and works
  without JS.

## i18n (ADR 0002)

- Every UI string uses an **explicit id** (`area.thing.action`) with text in **both** `en.json` and `nl.json`. Never
  use a source string as the id.
- Import Lingui runtime APIs through `src/i18n/`. Macros are imported from `@lingui/*/macro` directly.
- The seam is [src/i18n/index.ts](../../../src/i18n/index.ts): the root calls `setupRequestI18n()`, after which
  server components use `<Trans id>` / `useLingui()` from `@lingui/react/macro`. Client components get the same
  macros through `ClientI18nProvider` ([src/i18n/client-provider.tsx](../../../src/i18n/client-provider.tsx)),
  and actions use `actionI18n()._(msg({ id, message }))`. The locale is resolved once in `entry.rsc.tsx` by the
  pure `resolveLocale` ([src/i18n/locale.ts](../../../src/i18n/locale.ts)) and read from `requestContext().locale`.
- After adding a message: `npm run i18n:extract`, then fill in `nl.json`. `src/i18n/catalogs.test.ts` fails on a
  missing or empty translation, on placeholders that differ between locales, and on non-`area.thing` ids.
- A pure validation module whose errors outlive one form (item values, reused by the admin form and the CSV import)
  uses i18n ids as its zod messages (`validationIds` in [src/features/items/schema.ts](../../../src/features/items/schema.ts)),
  and a sibling `messages.ts` typed `Record<ValidationId, …>` holds their `msg` text.
- Interpolate plain variables (`const count = field.valueCount`), never expressions: an expression becomes a
  positional `{0}` placeholder that translators can't read.
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
- The library and each component's props are listed in [src/ui/README.md](../../../src/ui/README.md). Import from
  the component's own file (no barrel). The root shell renders `<InkDefs />` once, because every drawn outline
  references its `#ink-wobble` filter.
- A drawn box is the `ink-outline` utility (pen outline on `::before`/`::after`); recolour it with `--ink-line`.
  Controls that can't carry pseudo-elements (`<input>`, `<select>`) get it on a wrapper, as in
  [src/ui/input.tsx](../../../src/ui/input.tsx).
- A form built from field definitions maps `field.type → control` with a lookup object, posts with `noValidate` so
  the server's translated messages show, and lists every invalid input in an `ErrorSummary` at the top. Exemplar:
  [src/routes/admin-item.tsx](../../../src/routes/admin-item.tsx).
- `FormField` wires ids through a render prop (`{(control) => <Input {...control} />}`), so form components stay
  hook-free server components. Dialogs and popovers open with `commandfor`/`command` and `popoverTarget`, no JS.
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
