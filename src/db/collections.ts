import { db } from "./connection";

// All SQL for collections (TICKET-COL-01). is_public stays SQLite's 0 | 1.

export const defaultViews = ["table", "grid"] as const;
type DefaultView = (typeof defaultViews)[number];

export type Collection = {
  id: number;
  slug: string;
  name: string;
  isPublic: 0 | 1;
  defaultView: DefaultView;
  titleFieldId: number;
};

type CollectionSummary = Pick<Collection, "id" | "slug" | "name" | "isPublic"> & {
  haveCount: number;
  wantCount: number;
};

export type CollectionSettings = Pick<Collection, "name" | "slug" | "isPublic" | "defaultView">;

const columns = `id, slug, name, is_public as isPublic, default_view as defaultView, title_field_id as titleFieldId`;

export const listCollections = (): CollectionSummary[] =>
  db()
    .prepare(
      `select c.id, c.slug, c.name, c.is_public as isPublic,
         (select count(*) from items i where i.collection_id = c.id and i.status = 'have') as haveCount,
         (select count(*) from items i where i.collection_id = c.id and i.status = 'want') as wantCount
       from collections c order by c.name collate nocase`,
    )
    .all() as CollectionSummary[];

export const getCollectionBySlug = (slug: string): Collection | undefined =>
  db().prepare(`select ${columns} from collections where slug = ?`).get(slug) as Collection | undefined;

export const listSlugs = (): Set<string> => new Set(db().prepare("select slug from collections").pluck().all() as string[]);

// The collection and its required, public title field, linked through title_field_id.
export const createCollection = (name: string, slug: string, titleLabel: string): void =>
  db().transaction(() => {
    const collection = db().prepare("insert into collections (name, slug) values (?, ?)").run(name, slug);
    const field = db()
      .prepare(
        `insert into fields (collection_id, label, type, required, is_public, position) values (?, ?, 'text', 1, 1, 1)`,
      )
      .run(collection.lastInsertRowid, titleLabel);
    db().prepare("update collections set title_field_id = ? where id = ?").run(field.lastInsertRowid, collection.lastInsertRowid);
  })();

export const updateCollection = (id: number, settings: CollectionSettings): void => {
  db()
    .prepare(
      `update collections set name = @name, slug = @slug, is_public = @isPublic, default_view = @defaultView,
         updated_at = unixepoch() where id = @id`,
    )
    .run({ ...settings, id });
};

// Fields and items go with it through ON DELETE CASCADE.
// shortcut: item image files are not removed yet, TICKET-ITM-04 adds that.
export const deleteCollection = (id: number): void => {
  db().prepare("delete from collections where id = ?").run(id);
};
