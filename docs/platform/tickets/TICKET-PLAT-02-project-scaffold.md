# TICKET-PLAT-02: Project scaffold

- **Area:** Platform
- **Released in:** _unreleased_
- **Traceability:** [design.md § Stack](../../design.md#stack), [ADR 0001](../../adr/0001-rsc-react-router-vite.md)

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

- [ ] `npm run dev` serves the placeholder route with HMR.
- [ ] `npm run build && npm start` serves the same route from the production build.
- [ ] Every dependency in the RSC/i18n layer is pinned to an exact version recorded in the spike results.
- [ ] Server components and server actions can read the request context (request, cookies) through `src/context.ts`.
- [ ] `/healthz` returns 200.
- [ ] `npm run typecheck` and `npm test` pass (one trivial vitest test proves the runner works).
- [ ] Verified with the fallow skill (no unused files or dependencies).

## Notes

- Needs TICKET-PLAT-01.
- Keep the entry files close to the spike and comment the *why* of each step. They're the RSC learning material.
- Upgrades of pinned packages get their own tickets.
