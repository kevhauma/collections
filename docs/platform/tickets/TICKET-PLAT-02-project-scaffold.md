# TICKET-PLAT-02: Project scaffold

- **Area:** Platform
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Stack](../../technical-design.md#stack), [ADR 0001](../../adr/0001-rsc-react-router-vite.md)

## User story

As the developer, I want a production-shaped project skeleton with the proven stack wired up, so every feature
ticket starts from the same conventions and scripts.

## Description

Turns the spike's findings into the real project: pinned dependencies, the three RSC entries, an Express server,
a per-request context, Tailwind, vitest and the folder layout every later ticket builds into.

## Current situation (as-is)

- Greenfield. Spike findings live in `docs/research/spike-results.md` (TICKET-PLAT-01).

## Desired result (to-be)

- `package.json` with **exact** versions (no `^`/`~`) for `react`, `react-dom`, `react-server-dom-*`, `react-router`,
  `@vitejs/plugin-rsc` and `@lingui/*`. `engines.node` is pinned to the LTS used in Docker.
- TypeScript in strict mode.
- Layout:

  ```
  src/
    entry.rsc.tsx  entry.ssr.tsx  entry.browser.tsx   # RSC entries, kept readable: they're the learning surface
    server.ts                                        # Express: static assets, /uploads, /healthz, RSC handler
    routes.ts                                        # React Router route config
    context.ts                                       # AsyncLocalStorage request context (request, locale, session)
    routes/        # route modules (server components + actions)
    features/      # feature code grouped by area (collections, items, auth, …)
    db/            # connection, migrations runner, repositories
    ui/            # own UI library (TICKET-UI-01)
    i18n/          # Lingui seam (TICKET-I18N-01)
  migrations/      # NNN-name.sql
  scripts/         # CLI scripts (reset-password)
  ```

- Env: `PORT` (default 3000), `DATA_DIR` (default `./data`), `TRUST_PROXY` (Express `trust proxy`).
- Scripts: `dev`, `build`, `start`, `test`, `typecheck`, `i18n:extract`.
- `GET /healthz` returns 200 when the DB opens (used by the Docker healthcheck).

## UI requirements

- A placeholder home route rendering one server component, styled with a Tailwind class.

## Acceptance criteria

Verified on 2026-11-12 with a throwaway probe script (fetch + Chrome 157 over raw CDP), on Node 22.18 locally.

- [x] `npm run dev` serves the placeholder route with HMR. (`<h1 class="text-2xl font-bold">Collections</h1>` served. Editing
      `src/routes/home.tsx` updated the h1 in Chrome with no full reload. That needed the `rsc:update` →
      router `revalidate()` hook in [src/entry.browser.tsx](../../../src/entry.browser.tsx).)
- [x] `npm run build && npm start` serves the same route from the production build. (Same h1, Tailwind CSS from
      `/assets/root-*.css` contains `.text-2xl`, and [src/server.ts](../../../src/server.ts) sets `NODE_ENV=production`.)
- [x] Every dependency in the RSC/i18n layer is pinned to an exact version recorded in the spike results. (`package.json`:
      react/react-dom 19.3.1, react-router 8.5.1, @vitejs/plugin-rsc 0.5.39, @lingui/cli, conf and format-json 6.12.0, with no
      `^`/`~`. `@lingui/core`, `@lingui/react` and `@lingui/vite-plugin` are added in TICKET-I18N-01, the first ticket that
      uses them, at 6.12.0. `engines.node` is `>=26`, the Docker LTS.)
- [x] Server components and server actions can read the request context (request, cookies) through `src/context.ts`.
      (`getCookie("probe")` returned `hello world` in a server component and in a `'use server'` action, after a no-JS
      form post, in dev and prod. The temporary probe route was removed afterwards. Unit-tested in
      [src/context.test.ts](../../../src/context.test.ts).)
- [x] `/healthz` returns 200. (200 in dev and prod. It also returned 200 with `PORT=3005 DATA_DIR=<tmp>`, which created
      `<tmp>/db.sqlite`.)
- [x] `npm run typecheck` and `npm test` pass (one trivial vitest test proves the runner works). (tsc is clean. vitest:
      2 files, 13 tests, covering `parseCookies`/`getCookie`/`requestContext` and `parseTrustProxy`.)
- [x] Verified with the fallow skill (no unused files or dependencies). (fallow 3.42.0: dead-code 0, dupes 0, health 0.
      The plugin-rsc entries and `lingui.config.ts` are declared as entry points in `.fallowrc.json`, because they are loaded by
      string path. `@vitejs/plugin-rsc` moved to `dependencies` because the entries import its runtime.)

## Notes

- Needs TICKET-PLAT-01.
- Keep the entry files close to the spike and comment the *why* of each step. They're the RSC learning material.
- Upgrades of pinned packages get their own tickets.
