-- TICKET-COL-07: the have tab's default order per collection. default_sort holds what the `sort` list param takes
-- ("created" or a field id); null is the title. Checked on read, so a deleted or private field falls back to the title.
alter table collections add column default_sort text;
alter table collections add column default_dir text not null default 'asc' check (default_dir in ('asc', 'desc'));
