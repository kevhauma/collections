-- TICKET-COL-09: a URL field the title links to. Deleting the field clears it; its type and visibility are checked
-- when rendering, so a field that stopped being a public url field just gives a plain title.
alter table collections add column title_link_field_id integer references fields (id) on delete set null;
