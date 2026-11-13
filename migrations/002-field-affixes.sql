-- TICKET-COL-04: optional display-only texts around a field's value (e.g. "€", "cm").
alter table fields add column prefix text;
alter table fields add column suffix text;
