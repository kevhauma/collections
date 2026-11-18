-- TICKET-WSH-08: several wishlists, each named, ranked and public on its own. Ranks stay dense 1..n per wishlist.
create table wishlists (
  id integer primary key,
  name text not null,
  slug text unique not null,
  is_public integer not null default 0,
  show_reminders integer not null default 0,
  created_at integer default (unixepoch()),
  updated_at integer default (unixepoch())
);

-- The one wishlist so far becomes the first, looking as before: same visibility, collection reminders on.
insert into wishlists (id, name, slug, is_public, show_reminders)
values (1, 'Wishlist', 'wishlist', coalesce((select wishlist_public from settings where id = 1), 0), 1);

-- SQLite can't add a non-null foreign key column, so the items table is rebuilt with every item in that first list.
create table wishlist_items_new (
  id integer primary key,
  wishlist_id integer not null references wishlists on delete cascade,
  title text not null,
  link text,
  note text,
  price text,
  image text,
  rank integer not null check (rank >= 1),
  created_at integer default (unixepoch()),
  updated_at integer default (unixepoch())
);
insert into wishlist_items_new (id, wishlist_id, title, link, note, price, image, rank, created_at, updated_at)
select id, 1, title, link, note, price, image, rank, created_at, updated_at from wishlist_items;
drop table wishlist_items;
alter table wishlist_items_new rename to wishlist_items;
create index wishlist_items_by_rank on wishlist_items (wishlist_id, rank);

alter table settings drop column wishlist_public;
