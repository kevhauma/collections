# Research: running RSC without Next.js

As of 2026-11-11. Versions from the npm registry. Nothing was installed or built during this research.

**Question:** which way of running React Server Components outside Next.js lets us learn the plumbing and still
ship to production on a plain Node server?

## React itself

- Current version: **19.3.1**. `react-server-dom-webpack` / `-parcel` are on the same version.
- react.dev still warns that the bundler/framework RSC APIs "do not follow semver and may break between minors".
  Pin React.

## Candidates

| Option | Version / date | Status | Plumbing you see | Forms without JS | Plain Node |
|---|---|---|---|---|---|
| `@vitejs/plugin-rsc` (raw) | 0.5.39, 2026-11-05 | pre-1.0, frequent releases | All: you write `entry.rsc` (Request→Response), `entry.ssr`, `entry.browser` | Yes: starter uses `decodeAction` + `decodeFormState` before hydration | Yes, `examples/node-stream` |
| React Router v8 RSC, data mode | 8.5.1, 2026-10-27 (7.18.5 still maintained) | "experimental, subject to breaking changes in minor/patch", all `unstable_*` | You write the three entries; router does matching and revalidation | Yes: `unstable_matchRSCServerRequest` takes `decodeAction` / `decodeFormState` | Yes, via `@remix-run/node-fetch-server` under Express or `http` |
| React Router v8 RSC, framework mode | same | same | Hidden: routes export `ServerComponent` | Yes | Yes |
| Waku | 1.0.0-rc.5, 2026-11-11 | RC; APIs still renamed/removed | Almost all hidden | `<form action>` works; no-JS behaviour not documented | `waku start` |
| Parcel RSC | `@parcel/rsc` 2.16.4; 3.0.0-alpha.2 on 2026-11-04 | "beta" | Medium: Express + `renderRequest` / `callAction` | Not documented | Yes |
| TanStack Start RSC | `react-start-rsc` 0.1.66, 2026-11-08 | "experimental … into early v1" | Medium; server functions and loaders, not `'use server'` form actions | Not documented | Not documented |

## Conclusion

React Router v8 RSC in data mode on `@vitejs/plugin-rsc`, served by Express. Pin exact versions of React,
plugin-rsc and react-router. → [ADR 0001](../adr/0001-rsc-react-router-vite.md)

## Not checked

The React Router v8 changelog, GitHub commit activity (activity was judged from npm release dates), and other
frameworks such as RedwoodSDK.

## Sources

- https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc
- https://raw.githubusercontent.com/vitejs/vite-plugin-react/main/packages/plugin-rsc/examples/starter/src/framework/entry.rsc.tsx
- https://reactrouter.com/how-to/react-server-components
- https://reactrouter.com/api/rsc/matchRSCServerRequest
- https://github.com/wakujs/waku and https://github.com/wakujs/waku/releases
- https://parceljs.org/recipes/rsc/
- https://tanstack.com/start/latest/docs/framework/react/guide/server-components
- https://react.dev/reference/rsc/server-components
- npm registry (`npm view <pkg> time`)
