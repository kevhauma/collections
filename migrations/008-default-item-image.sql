-- TICKET-COL-08: one optional image shown for a collection's items that have none, an image id like items.image.
alter table collections add column item_image text;
