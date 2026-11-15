-- TICKET-WSH-01: one general wishlist, not bound to a collection. Ranks are dense 1..n like collection wants (ADR 0004).
create table wishlist_items (
  id integer primary key,
  title text not null,
  link text,
  note text,
  price text,
  image text,
  rank integer not null check (rank >= 1),
  created_at integer default (unixepoch()),
  updated_at integer default (unixepoch())
);

-- The wishlist starts private.
alter table settings add column wishlist_public integer not null default 0;
