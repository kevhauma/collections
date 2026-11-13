# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Decided in [docs/technical-design.md § Stack](docs/technical-design.md#stack): React 19 Server Components via React Router v8 RSC
(data mode) on `@vitejs/plugin-rsc`, Express, `better-sqlite3`, Tailwind v4, own components in `src/ui/` (native
`<dialog>` / Popover API, `cva` + `tailwind-merge`), Lingui (NL + EN). One Docker image behind the owner's TLS
reverse proxy.

## Users

- **The owner (primary, single admin).** The developer themself, running a personal instance on their own server.
  Catalogues their own collections (vinyl, LEGO, card decks, …) and keeps a ranked want list. Uses the admin side on
  desktop and phone. There are no other accounts and no other installers to onboard.
- **Visitors (anonymous, read-only).** Mostly non-technical family and friends who tap a shared have/want link in a
  chat app on their phone, typically ahead of a birthday or holiday, to see what to buy and what the owner already
  has.

## Product Purpose

Manage collections of anything with user-defined fields, and share a **have** and a **want** list per collection by
link. Success: the owner can model any collection without code, and a relative on a phone can open the want link and
pick a gift in under a minute without buying a duplicate.

## Positioning

One self-hosted app for every collection, where each collection is its own schema (no fixed catalogue per hobby),
with a shareable, ranked want list that needs no account to view. Private fields (price, storage location) never
leave the server.

## Operating Context

- Admin: setting up a collection's fields, adding items with one photo (upload or pasted URL), switching
  have ↔ want, reordering wants by drag or by typing a rank, exporting a zip backup.
- Public: a link opened from WhatsApp/Signal-style chat apps, so the Open Graph preview is the first impression.
  Pages must work without JavaScript and on 360 px screens.
- Locale from cookie, then `Accept-Language`, then the owner's default. User-typed content is never translated.

## Capabilities and Constraints

- Full domain, routes, data model and security rules: [docs/technical-design.md](docs/technical-design.md). Build order:
  [docs/releases/v1/overview.md](docs/releases/v1/overview.md).
- v1: first-run setup, admin login, collections with field editor and public toggle, items (one image, `have` +
  quantity, `want` + dense rank), table and grid views with search / sort / filter in the URL, public index and
  public collection pages, full zip export, NL + EN UI.
- v2 (parked): restore from export, mapped CSV import (design open), catalog lookups (Discogs, Rebrickable,
  Scryfall).
- Field types: `text`, `number`, `date`, `select`, `checkbox`, `url`. One title field per collection, always public.
- Public pages ship no client components. Admin pages may.
- Private or unknown collections return 404, never a login prompt. Admin login is unlinked from the public site.
- No pagination in v1. Grid cards show the title plus the first two fields.
- Dark mode follows the device, with a System / Light / Dark switch in both headers (TICKET-UI-03).
- Terminology: collection, field, item, have, want, rank, title field, public / private.

## Brand Commitments

- App name: **Collections** (EN) / **Verzamelingen** (NL), a fixed translated string, not a setting.
- Personal tool: no marketing, no onboarding aimed at strangers.

## Evidence on Hand

- No real collection data, item photos, logo or brand assets exist yet. Do not invent sample collections as if they
  were the owner's; placeholder content must read as placeholder.

## Product Principles

1. **The want list is the product's public face.** Optimise the shared link for a non-technical person on a phone:
   rank order obvious, duplicates impossible to miss, nothing to log into.
2. **Any collection, no assumptions.** Nothing in the UI may presume a hobby; field labels and values are the
   owner's own words.
3. **Private means server-side.** A hidden field is stripped before render, never just visually hidden.
4. **Works without JavaScript in public, freely interactive in admin.**
5. **Built for one owner.** Prefer the direct, fast path for the owner over configurability nobody else needs.

## Accessibility & Inclusion

- WCAG AA contrast for text and controls, visible `focus-visible` rings, touch targets at least 40 px, layouts from
  360 px wide (TICKET-UI-01).
- Skip link to `<main>`, `<html lang>` matching the locale, `aria-current` on tabs and nav, `aria-sort` on sortable
  headers, `FormField` wiring labels, hints and errors (TICKET-UI-01, TICKET-UI-02).
- Every UI string in EN and NL with explicit i18n ids.
