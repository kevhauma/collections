# TICKET-PLAT-01: Stack spike (throwaway)

- **Area:** Platform
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Stack](../../technical-design.md#stack), [ADR 0001](../../adr/0001-rsc-react-router-vite.md), [ADR 0002](../../adr/0002-lingui-explicit-ids.md)

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

Evidence below points to [spike-results.md](../../research/spike-results.md) (§ = its "Findings per criterion"
sections). The spike was checked with throwaway probe scripts: a no-JS multipart form client and Chrome 157 over raw
CDP. They ran against dev, the prod build and the Docker container on 2026-11-12.

- [x] React Router v8 RSC (data mode) on `@vitejs/plugin-rsc`, served by Express through
      `@remix-run/node-fetch-server`, renders a server component in `npm run dev` and after `build` + `start`.
      (§1: rendered in dev and prod. Prod needs `NODE_ENV=production` at runtime, or hydration silently hangs.)
- [x] A server component reads a row from `better-sqlite3`. (§2: `<p id="count">` rendered the row's value.)
- [x] A `'use server'` action bound to `<form action>` works **with JavaScript disabled** (`decodeAction` /
      `decodeFormState`) and with JS enabled, and the page revalidates afterwards. (§3: count went 4→5 in Chrome with
      scripts disabled. With JS: no full reload, count re-rendered.)
- [x] A server action receives a `File` from a multipart form. Note how the body is parsed, where a size limit can
      be enforced before buffering, and what happens past it. (§4: `got File a.txt, 5 bytes, text/plain`. Parsed by
      `request.formData()` inside `decodeAction`/`decodeReply`. Limit goes in `entry.rsc` before
      `matchRSCServerRequest` plus the proxy. Past it the client sees a connection reset, not the 413.)
- [x] A server action can read the incoming request's cookies and headers (through AsyncLocalStorage set in the RSC
      entry, or a React Router API). Record which one works. (§5: both AsyncLocalStorage and `unstable_getRequest()`
      returned the cookie and user agent, with and without JS. Recommendation: our own ALS context.)
- [x] A client component hydrates, and a client-invoked action with `useOptimistic` works. (§6: shows `3 (pending)` at
      once, settles at 3, in dev, prod and Docker.)
- [x] Lingui: `@lingui/vite-plugin` with `macroTransform: true` compiles in the rsc, ssr and browser environments.
      `<Trans id>` renders in a server component after a per-request `setI18n`. A client component renders under
      `I18nProvider`. A server action returns a message translated with an explicit `i18n` instance. (§7: NL cookie
      → `Teller staat op 1`, `Client zegt hoi`, action returned `Opgeslagen! Teller staat nu op 1`. ADR 0002 stands.)
- [x] Tailwind v4 (`@tailwindcss/vite`) classes apply in both server and client components. (§8: computed `h1` color
      and client `bg-green-100` matched the Tailwind oklch values.)
- [x] Measure the JS shipped for a page with no client components. Find out whether a route can skip hydration
      entirely. This decides how "no client JS" is met on public pages (TICKET-PUB-02). (§9: 346 KB raw / 107 KB gzip
      runtime by default. Skipping `bootstrapScriptContent` in `entry.ssr` gives 0 external scripts. Public routes
      need a layout without client providers.)
- [x] Check that native `<dialog>` can be opened without JS (invoker commands `commandfor` / `command`) in current
      ~~Chrome, Firefox and Safari~~ Chrome (live) and Firefox (compat data). Safari was dropped by the user on
      2026-11-12, and the installed Firefox is 82, too old to test live. If not, note the smallest client fallback.
      (§10: Chrome 157 opened and closed the dialog with scripts disabled. MDN BCD 8.1.9: Firefox 144+. No fallback
      needed.)
- [x] `sharp` and `better-sqlite3` install and load inside `node:<lts>-slim` in Docker. (§11: Node 26.13.1, libvips
      8.18.7, SQLite 3.54.1 loaded, and the app was built and served in the container. Needs `npm ci --ignore-scripts`.)
- [x] `docs/research/spike-results.md` written, with exact versions to pin. ([spike-results.md](../../research/spike-results.md)
      § "Versions to pin".)
- [x] Spike code deleted (or its branch abandoned) once findings are recorded. (`spike/` folder, Docker container and
      image removed. It was never committed.)

## Notes

- Do first. Every other ticket depends on the outcome.
- Timebox: two to three days. If a seam needs more than that, it's a finding, not a task to push through.
- Watch for React Router issue #12870: React Router's Vite plugin conflicts with adding `plugin-react` on top.
