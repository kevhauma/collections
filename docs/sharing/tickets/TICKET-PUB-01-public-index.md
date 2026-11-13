# TICKET-PUB-01: Public index of collections

- **Area:** Sharing
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Routes](../../technical-design.md#routes) (`/`), [ADR 0005](../../adr/0005-plain-public-slugs.md)

## User story

As a visitor, I want the home page to list the collections the owner has made public, so I can browse what they
have and want without needing a direct link.

## Description

The `/` route: a read-only index of public collections, server-rendered with no client components.

## Current situation (as-is)

- Collections have an `is_public` flag (TICKET-COL-01). `/` is still the scaffold placeholder.

## Desired result (to-be)

- `src/db/collections.ts` `listPublic()`: public collections only, ordered by name, with have/want counts.
- `/` renders in `PublicLayout`: one card per collection with name, have/want counts, a link to `/:slug` (have) and
  a link to `/:slug/want`.
- Empty state when nothing is public ("Nothing shared yet"). It doesn't reveal that private collections exist.
- `<title>` and a meta description.

## UI requirements

- Cards built from `src/ui/Card`, responsive grid, translated labels, counts formatted with `formatNumber`.
- No login link anywhere (`/admin` stays unlinked).

## Acceptance criteria

- [x] Only public collections appear. Toggling a collection private removes it on the next load. (`listPublic` in
      `src/db/collections.ts`; live as a visitor without cookies: Vinyl public → one card "Have · 11 / Want · 4",
      the private "Secret" absent; Vinyl made private → "Nothing shared yet")
- [x] Private collections don't affect anything visible (no counts, no hints). (private collections are filtered in
      SQL, so the page never reads them; the production page's HTML, including its inline RSC payload, has no
      mention of either private collection. The dev server's payload did carry an admin route's params from an
      earlier request: React's dev-only debug rows, absent from the production build, which was checked twice)
- [x] The page contains no client components and works with JavaScript disabled. (a server component under the
      public layout; the production HTML has only the inert `__FLIGHT_DATA` pushes and modulepreload links, no
      bootstrap script; all content and links are plain HTML)
- [x] Unit test on a temp DB: `listPublic` excludes private collections and returns correct counts.
      (`src/db/collections.test.ts` "lists only public collections, by name, with their have and want counts")
- [x] Live browser check at 360 px and desktop. (Orca, production build: drawn card with the red name tab and drawn
      Have / Want link buttons, no login link, no sideways scroll at 360 px (360 = 360). Screens match the notebook
      direction. The `/:slug` links lead to TICKET-PUB-02's pages)
- [x] Verified with the fallow skill. (`npx fallow audit --base HEAD` → pass: 0 dead code, 0 duplicates, 0 complexity
      findings)

## Notes

- Needs TICKET-COL-01 and TICKET-UI-02.
