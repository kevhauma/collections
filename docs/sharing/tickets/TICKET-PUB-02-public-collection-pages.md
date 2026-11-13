# TICKET-PUB-02: Public have and want pages

- **Area:** Sharing
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Routes](../../technical-design.md#routes) (`/:slug`, `/:slug/want`), [technical-design.md § Field](../../technical-design.md#field) (private fields never leave the server), [ADR 0005](../../adr/0005-plain-public-slugs.md)

## User story

As the owner, I want to send someone a link to my want list (or what I already have), so friends and family can see
what to buy me and what I already own.

## Description

The shareable public pages: `/:slug` (have) and `/:slug/want`, reusing the collection views read-only, with private
fields stripped on the server and essentially no client JavaScript.

## Current situation (as-is)

- The query layer and `ItemTable` / `ItemGrid` support `publicOnly` and `mode: 'public'` (TICKET-ITM-05). Wants have
  ranks (TICKET-ITM-03). There are no public collection routes.

## Desired result (to-be)

- Routes `/:slug` and `/:slug/want` in `PublicLayout`:
  - an unknown slug, a private collection or a reserved slug → the 404 page with HTTP 404
  - header: collection name, `TabLinks` (Have · N / Want · N), view toggle, toolbar (search, filters on public
    select/checkbox fields only)
  - have tab: items with quantity (shown as "×2" when above 1)
  - want tab: ordered by rank by default, with the position number shown
- Data comes from `listItems({ …, publicOnly: true })`. Only public fields are passed to components, so private
  values are absent from both the HTML and the RSC payload.
- No `'use client'` component in the public tree. If the spike found a way to skip hydration on public routes, use
  it.
- `<title>` = "{collection} · Want list" etc. Basic Open Graph tags (title, first item image if any) so links
  preview nicely in chat apps.

## UI requirements

- Read-only versions of the table and grid. No edit links, rank inputs or drag handles.
- The view, search and filter state lives in the URL, so a filtered view is shareable.
- Empty states per tab ("Nothing on the want list yet").

## Acceptance criteria

- [x] `/:slug` of a private collection returns 404, the same as an unknown slug. (`requirePublicCollection`; live
      on the production build: `/secret`, `/secret/want`, `/nope`, `/nope/want`, `/vinyl/other` and `/api` → 404)
- [x] A private field's value (e.g. purchase price) appears nowhere in the response body, HTML or RSC payload.
      Verified by searching the raw responses for a known private value. (production build, no cookie: a private
      Paid = 731.42 and Condition = Scratchy on three items; `/vinyl`, `/vinyl/want`, both grid views, `?sort=<Paid>`,
      `/vinyl.rsc`, `/vinyl/want.rsc` and an `Accept: text/x-component` request contain neither value nor the private
      labels. On `?q=Scratchy` and `?f.<Condition>=Scratchy` the word appears only as the visitor's own query echoed
      in the search box, links and `location`)
- [x] Searching or filtering cannot match on private fields. (live: `?q=Scratchy` → "No items match your search";
      `?f.<Condition>=Scratchy` returns the same rows as no filter; the toolbar offers only public filters (Format,
      Signed). Tests in `src/features/items/view.test.ts` and `list-params.test.ts`)
- [x] The want tab shows items in rank order with their position. (live: 1 B, 2 E, 3 D, 4 G in the table, and red
      rank numerals on the grid's post-its; test "orders the want tab by rank")
- [x] The pages work with JavaScript disabled, and the public tree has no client components. (the public route uses
      only server components (`CollectionItems` gets no `ranking` in public mode, so no `SortableList`); the HTML has
      no `<script src>` or module script, no edit links, rank inputs or drag handles; the toolbar is a GET form and
      tabs, view toggle and sort headers are links)
- [x] Unit/integration test: render data for a collection with a private field through the public path, and assert
      the private key is absent from the rows given to the view. (`src/features/items/view.test.ts` "hands the view
      only public fields, and items without private keys": `itemView(…, { publicOnly: true })` is exactly what the
      page passes to `CollectionItems`; `npm test` 649 passed)
- [x] Live browser check of both tabs and both views, sharing a filtered URL in a private window. (Orca with the
      session cookie deleted, production build: `/vinyl/want?view=grid&f.4=Long+Play` opened as shared, with the
      filter kept and ranks shown; the have table at 360 px scrolls inside its box with no page overflow
      (360 = 360). Titles are plain text. `<title>` "Vinyl · Want list" / "Vinyl · Have list", `og:title`, and
      `og:image` with the first image's absolute URL)
- [x] Verified with the fallow skill. (`npx fallow audit --base HEAD` → pass: 0 dead code, 0 duplicates, 0
      complexity findings. The admin list and the public pages share `CollectionItems`, so there's one list
      implementation)

## Notes

- Needs TICKET-ITM-05, TICKET-ITM-03 and TICKET-PUB-01.
- Images are served from `/uploads` and are unlisted, not access-controlled (see design).
- Renaming a slug breaks shared links. No redirect, by decision (ADR 0005).
- Public pages don't hydrate (`entry.ssr.tsx` skips the bootstrap under the `public` route), but plugin-rsc still
  emits `modulepreload` hints for React Router's client runtime, about 350 KB that phones download and never run
  (found in TICKET-UI-02). Decide whether to strip them, for example by filtering the hints in `entry.ssr`.
  **Decided (2026-11-13): keep them for v1.** Stripping them means rewriting the HTML stream in `entry.ssr`, where a
  `<link>` can be split across chunks, for about 107 KB gzip that the browser caches as immutable hashed assets, so
  a visitor pays it once per release. Revisit if public pages get heavy mobile traffic.
