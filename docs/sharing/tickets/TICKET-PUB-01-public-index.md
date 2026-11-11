# TICKET-PUB-01: Public index of collections

- **Area:** Sharing
- **Released in:** _unreleased_
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

- [ ] Only public collections appear. Toggling a collection private removes it on the next load.
- [ ] Private collections don't affect anything visible (no counts, no hints).
- [ ] The page contains no client components and works with JavaScript disabled.
- [ ] Unit test on a temp DB: `listPublic` excludes private collections and returns correct counts.
- [ ] Live browser check at 360 px and desktop.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-COL-01 and TICKET-UI-02.
