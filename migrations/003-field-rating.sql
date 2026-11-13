-- TICKET-COL-05: a rating field's maximum (2..10) and its one symbol. Null for every other type.
alter table fields add column rating_max integer;
alter table fields add column rating_symbol text;
