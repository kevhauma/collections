-- A wishlist's cover picture (image id, files as for item images) and the price range that picks the in-budget ideas
-- shown on its public page. All nullable: existing wishlists start without a cover or a range.
alter table wishlists add column image text;
alter table wishlists add column min_price real;
alter table wishlists add column max_price real;
