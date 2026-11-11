# TICKET-IMP-02: Catalog lookups (v2, needs design)

- **Area:** Import
- **Released in:** _unreleased_ (planned for v2)
- **Traceability:** [technical-design.md § Scope](../../technical-design.md#scope) (v2)

## User story

As the admin, I want to look up an item in an external catalog (Discogs for vinyl, Rebrickable for LEGO, Scryfall
for Magic cards) and have its details and cover image filled in, so adding items is fast and accurate.

## Description

Fetch metadata and images from an external catalog into the item form. Each source has its own API, rate limits,
auth and field mapping, so this needs its own design pass before work starts.

## Current situation (as-is)

- Items are entered by hand (TICKET-ITM-02). Images can be downloaded from a URL (TICKET-ITM-04), which a lookup can
  reuse.

## Desired result (to-be)

Open questions:

1. Which source first? The design session suggested adding one source once the core works.
2. How is a collection linked to a source, and how are source attributes (artist, year, set number, piece count)
   mapped onto the collection's user-defined fields? Per collection, stored as a mapping?
3. Search by what: barcode, catalog number, free text?
4. API keys and tokens: where are they stored (env vars vs admin settings), and what about rate limiting and caching?
5. Should lookups also enrich CSV imports (TICKET-IMP-01)?

## UI requirements

- To be defined: likely a "Look up" button on the item form that opens a search dialog and pre-fills fields and the
  image URL.

## Acceptance criteria

- [ ] Design session held and the open questions answered.
- [ ] To-be and acceptance criteria rewritten before implementation starts.

## Notes

- Needs TICKET-ITM-04. Planned for v2.
- Each external API's terms of use (attribution, caching limits) must be checked when choosing the source.
