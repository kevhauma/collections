# TICKET-UI-09: Pin, tape or paperclip, picked at random per item

- **Area:** UI
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** [technical-design.md § Stack](../../technical-design.md#stack) (UI library), [.impeccable/surfaces/src-ui.md](../../../.impeccable/surfaces/src-ui.md) (post-it treatment), changes the fastening rule of [TICKET-UI-08](./TICKET-UI-08-notebook-polish.md)

## User story

As the admin or a visitor, I want each item's post-it held on by a pin, a strip of tape or a paperclip in no visible
pattern, so the page looks like a real, hand-assembled notebook.

## Description

Item thumbnails pick one of the three fastenings in a way that looks random, whether or not the item has a picture.
The pick stays the same for an item across reloads, sorts and pages.

## Current situation (as-is)

- `PostIt` in [src/ui/post-it.tsx](../../../src/ui/post-it.tsx) has the fastenings `pin`, `tape`, `paperclip`
  (TICKET-UI-08) and `none`.
- `postItLook` in [src/routes/item-views.tsx](../../../src/routes/item-views.tsx) gives every item with a picture the
  paperclip, and a blank post-it `item.id % 3 ? "pin" : "tape"`. So all pictures look the same, and blank post-its run
  pin, pin, tape when sorted by id.
- Colour (`id % 4`) and tilt (`id % 2`) also use plain modulo, so the three repeat in step.
- Single post-its keep their fixed fastening: the collection picture and the item form's image (paperclip, UI-08), the
  image field preview and the empty state (tape).

## Desired result (to-be)

- `postItLook` picks pin, tape or paperclip from a small hash of `item.id`, for items with and without a picture. It
  doesn't use `Math.random()`: the page is server-rendered, so a truly random value would change on every request and
  could differ between server and client.
- Each fastening shows up about a third of the time, and neighbouring ids don't follow a visible cycle.
- Colour and tilt come from the same hash (from different bits), so they no longer repeat in step with the fastening.

## UI requirements

- No new visuals. The three existing fastenings now mix in the table and grid, admin and public.
- In the grid, a want's rank numeral on the corner stays readable whichever fastening sits on top.

## Acceptance criteria

- [ ] In a collection of 30+ items, pictures and blank post-its both show all three fastenings mixed, with no
      repeating cycle in id order.
- [ ] An item has the same fastening, colour and tilt on every reload, in table and grid, admin and public.
- [ ] The collection picture, the item form's image, the image field preview and the empty state keep their fixed
      fastenings.
- [ ] Clicking a thumbnail to enlarge it (UI-08) still works with every fastening.
- [ ] Public pages still ship no client components (the pick happens on the server).
- [ ] Unit tests cover: the pick is deterministic for an id, and ids 1–300 give each fastening between 25% and 42%.
- [ ] UI follows the design direction in `.impeccable/surfaces/src-ui.md`; live browser check of the grid and table
      at 360 px and desktop, light and dark.
- [ ] Verified with the fallow skill.

## Notes

- Changes UI-08's "pictures are clipped on" rule, so land it after UI-08. Otherwise independent.
- "Random" here means stable per item. A new pick on every page load would make the page flicker on each visit and
  break hydration.
