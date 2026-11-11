# TICKET-PLAT-01: Stack spike (throwaway)

- **Area:** Platform
- **Released in:** _unreleased_
- **Traceability:** [design.md § Stack](../../design.md#stack), [ADR 0001](../../adr/0001-rsc-react-router-vite.md), [ADR 0002](../../adr/0002-lingui-explicit-ids.md)

## User story

As the developer, I want a throwaway end-to-end proof of the experimental RSC + Lingui stack, so I find blocking
incompatibilities before any feature is built on top of it.

## Description

Every layer of the chosen stack is officially experimental, and no one documents Lingui under `@vitejs/plugin-rsc`.
This spike builds the smallest app that exercises every risky seam, records what works, and pins the versions that
did. The code is deleted afterwards; only the findings are kept.

## Current situation (as-is)

- Greenfield: the repo contains only [docs/](../../README.md).
- Compatibility is known only from reading docs and issues ([research/rsc-hosts.md](../../research/rsc-hosts.md),
  [research/lingui-rsc.md](../../research/lingui-rsc.md)). Nothing has been built.

## Desired result (to-be)

- A `spike/` folder (or branch) proving each item in the acceptance criteria, in dev **and** in a production build.
- `docs/research/spike-results.md` with: exact versions that worked, what failed, workarounds, and code snippets
  worth keeping (entries, i18n setup, action request context).
- A go/no-go per layer. A no-go for Lingui means updating ADR 0002 to the hand-rolled dictionary fallback before
  TICKET-I18N-01.

## UI requirements

- None. Unstyled test pages are fine.

## Acceptance criteria

- [ ] React Router v8 RSC (data mode) on `@vitejs/plugin-rsc`, served by Express through
      `@remix-run/node-fetch-server`, renders a server component in `npm run dev` and after `build` + `start`.
- [ ] A server component reads a row from `better-sqlite3`.
- [ ] A `'use server'` action bound to `<form action>` works **with JavaScript disabled** (`decodeAction` /
      `decodeFormState`) and with JS enabled, and the page revalidates afterwards.
- [ ] A server action receives a `File` from a multipart form. Note how the body is parsed, where a size limit can
      be enforced before buffering, and what happens past it.
- [ ] A server action can read the incoming request's cookies and headers (through AsyncLocalStorage set in the RSC
      entry, or a React Router API). Record which one works.
- [ ] A client component hydrates, and a client-invoked action with `useOptimistic` works.
- [ ] Lingui: `@lingui/vite-plugin` with `macroTransform: true` compiles in the rsc, ssr and browser environments.
      `<Trans id>` renders in a server component after a per-request `setI18n`. A client component renders under
      `I18nProvider`. A server action returns a message translated with an explicit `i18n` instance.
- [ ] Tailwind v4 (`@tailwindcss/vite`) classes apply in both server and client components.
- [ ] Measure the JS shipped for a page with no client components. Find out whether a route can skip hydration
      entirely. This decides how "no client JS" is met on public pages (TICKET-PUB-02).
- [ ] Check that native `<dialog>` can be opened without JS (invoker commands `commandfor` / `command`) in current
      Chrome, Firefox and Safari. If not, note the smallest client fallback.
- [ ] `sharp` and `better-sqlite3` install and load inside `node:<lts>-slim` in Docker.
- [ ] `docs/research/spike-results.md` written, with exact versions to pin.
- [ ] Spike code deleted (or its branch abandoned) once findings are recorded.

## Notes

- Do first. Every other ticket depends on the outcome.
- Timebox: two to three days. If a seam needs more than that, it's a finding, not a task to push through.
- Watch for React Router issue #12870: React Router's Vite plugin conflicts with adding `plugin-react` on top.
