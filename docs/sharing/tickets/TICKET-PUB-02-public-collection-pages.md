# TICKET-PUB-02: Public have and want pages

- **Area:** Sharing
- **Released in:** _unreleased_
- **Traceability:** [design.md § Routes](../../design.md#routes) (`/:slug`, `/:slug/want`), [design.md § Field](../../design.md#field) (private fields never leave the server), [ADR 0005](../../adr/0005-plain-public-slugs.md)

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

- [ ] `/:slug` of a private collection returns 404, the same as an unknown slug.
- [ ] A private field's value (e.g. purchase price) appears nowhere in the response body, HTML or RSC payload.
      Verified by searching the raw responses for a known private value.
- [ ] Searching or filtering cannot match on private fields.
- [ ] The want tab shows items in rank order with their position.
- [ ] The pages work with JavaScript disabled, and the public tree has no client components.
- [ ] Unit/integration test: render data for a collection with a private field through the public path, and assert
      the private key is absent from the rows given to the view.
- [ ] Live browser check of both tabs and both views, sharing a filtered URL in a private window.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-ITM-05, TICKET-ITM-03 and TICKET-PUB-01.
- Images are served from `/uploads` and are unlisted, not access-controlled (see design).
- Renaming a slug breaks shared links. No redirect, by decision (ADR 0005).
