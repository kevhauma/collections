# TICKET-WSH-07: MCP tools for the wishlist

- **Area:** Wishlist
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Feature
- **Traceability:** extends [TICKET-MCP-01](../../mcp/tickets/TICKET-MCP-01-admin-mcp-server.md),
  [TICKET-MCP-02](../../mcp/tickets/TICKET-MCP-02-create-collections-and-item-images.md),
  [technical-design.md § API](../../technical-design.md#api-ticket-mcp-01-adr-0006)

## User story

As the admin, I want my AI agent to read and edit the wishlist, so I can add a wish from a chat ("put this on my
wishlist at #2") the same way I already do for collection items.

## Description

MCP tools to list, add, edit, delete and move wishlist items, and to set an item's image from a URL. They go through
the same repository and validation as the admin page.

## Current situation (as-is)

- [src/features/mcp/tools.ts](../../../src/features/mcp/tools.ts) defines the `tools` map that `mcpServer` registers:
  collections, fields and items, including `move_want` and setting an item image from a URL (MCP-02). Errors go
  through `refuse` / `refuseErrors`.
- The wishlist has a repository and zod schema (TICKET-WSH-01) but no tools.

## Desired result (to-be)

- New tools in the same `tools` map and style:
  - `list_wishlist`: items in rank order, plus whether the wishlist is public.
  - `create_wishlist_item`: title, link, note, price, optional `rank` and optional `imageUrl`. Without a rank it goes
    to the bottom.
  - `update_wishlist_item`: partial update of the same fields, keeping the rank unless one is given.
  - `delete_wishlist_item`: deletes the item and its image file. Annotated as destructive.
  - `move_wishlist_item`: to a rank, with the same clamping as `move_want`.
- Inputs validated with the WSH-01 schema. Images through the same URL fetch and processing as MCP-02.
- Toggling the wishlist's visibility stays admin-UI only, the same as collection visibility today.
- [technical-design.md § API](../../technical-design.md#api-ticket-mcp-01-adr-0006) lists the tools.

## UI requirements

- None.

## Acceptance criteria

- [x] An agent can add an item at rank 2, list the wishlist and see it at #2 with the others shifted. (`api.test.ts` "adds a wishlist item at rank 2 and lists it there…": through `/api/mcp` with a token, `create_wishlist_item` with `rank: 2` then `list_wishlist` gives `1:Lamp | 2:Grinder | 3:Mug`)
- [x] `update_wishlist_item` with only a price changes only the price. An unknown id is refused with a clear message. ("updates only what is given, keeping the rank…" changes the price alone; "refuses an unknown id clearly": `No wishlist item has the id 999999. list_wishlist shows them.`)
- [x] `delete_wishlist_item` closes the rank gap and removes the image file. ("deletes an item, closing the gap and removing its image files": ranks `1:Lamp | 2:Grinder` and both `.webp` files gone; annotated `destructiveHint`)
- [x] A `javascript:` link, an empty title or a bad image URL is refused with the validation message, and nothing is
      saved. ("refuses a javascript: link, an empty title and a bad image URL…": the form's `link:` / `title:` messages, `imageUrl: This isn't an image that can be read.`, an internal address refused, the list and uploads unchanged)
- [x] Persistence goes through `src/db/wishlist.ts`. Tools run behind the existing OAuth bearer check. (the tools use `saveWish` / `removeWish` and the repository; they sit in the same `tools` map, so `/api/mcp`'s bearer check covers them (the API test gets 401 without a token and nothing is written))
- [x] Unit tests in `tools.test.ts` cover: create with and without rank, update partial, delete, move clamped, and the
      refusals above. (the `wishlist tools` block: create with and without rank, partial update, delete, move clamped at both ends, and the refusals above)
- [x] Verified with the fallow skill. (`fallow audit --base HEAD`: dead code 0, complexity 0, duplication 0)

## Notes

- Deliberately one of the last wishlist tickets, by decision. It only needs WSH-01, so it can move earlier if wanted.
