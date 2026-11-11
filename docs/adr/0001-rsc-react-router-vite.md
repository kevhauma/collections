# 0001: React Server Components via React Router on Vite, not Next.js

Status: accepted (2026-11-11)

## Context

The app is partly an exercise in learning how React Server Components and server rendering actually work. Next.js
hides most of that and was ruled out. Every RSC option outside Next.js is experimental or pre-1.0 as of
2026-11-11. See [research/rsc-hosts.md](../research/rsc-hosts.md).

## Decision

Use **React Router v8 RSC support in data mode**, on **`@vitejs/plugin-rsc`**, served by **Express**.

- We write the three RSC entries (`entry.rsc`, `entry.ssr`, `entry.browser`) ourselves and can read the
  server-action round trip, including `decodeAction` / `decodeFormState` for forms that work before hydration.
- React Router handles route matching and revalidation after actions, so we don't build a router.

Rejected:

- **Raw plugin-rsc**: most learning, but it means writing a mini framework.
- **React Router framework mode / Waku**: hide the plumbing, which defeats the purpose.
- **Parcel, TanStack Start**: forms without JS are undocumented. TanStack centres on server functions, not
  `'use server'` form actions.

## Consequences

- **Pin exact versions** of `react`, `react-dom`, `react-server-dom-*`, `react-router`, `@vitejs/plugin-rsc`.
  react.dev states the bundler RSC APIs may break between minors, and React Router's RSC APIs are `unstable_*`.
- Upgrades are deliberate tickets, not drive-by bumps.
- A throwaway spike ([TICKET-PLAT-01](../platform/tickets/TICKET-PLAT-01-stack-spike.md)) proves the stack before feature work.
- If the stack becomes untenable, the fallback is React Router framework mode. Server components and actions stay
  the same; only the entries go away.
