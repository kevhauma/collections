-- TICKET-WSH-06: whether a public collection with wants is reminded of on the wishlist. On by default.
alter table collections add column show_on_wishlist integer not null default 1;
