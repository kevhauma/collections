-- TICKET-WSH-04: /wishlist is the public wishlist, so "wishlist" is a reserved slug. A collection already there moves
-- to the first free wishlist-N (N >= 2), so it stays reachable under a new address.
update collections set slug = (
  with recursive n(i) as (
    select 2
    union all
    select i + 1 from n where exists (select 1 from collections where slug = 'wishlist-' || i)
  )
  select 'wishlist-' || max(i) from n
)
where slug = 'wishlist';
