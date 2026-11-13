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
  // The collection's picture (TICKET-COL-06): an image id, files as for item images.
  image: string | null;
};

type CollectionSummary = Pick<Collection, "id" | "slug" | "name" | "isPublic" | "image"> & {
  haveCount: number;
  wantCount: number;
};

export type CollectionSettings = Pick<Collection, "name" | "slug" | "isPublic" | "defaultView">;

export const columns = `id, slug, name, is_public as isPublic, default_view as defaultView, title_field_id as titleFieldId,
  image`;

const summaries = (publicOnly: boolean): CollectionSummary[] =>
  db()
    .prepare(
      `select c.id, c.slug, c.name, c.is_public as isPublic, c.image,
         (select count(*) from items i where i.collection_id = c.id and i.status = 'have') as haveCount,
         (select count(*) from items i where i.collection_id = c.id and i.status = 'want') as wantCount
       from collections c where c.is_public = 1 or not ? order by c.name collate nocase`,
    )
    .all(publicOnly ? 1 : 0) as CollectionSummary[];

// Every collection, for the admin dashboard.
export const listCollections = (): CollectionSummary[] => summaries(false);

// Public collections only, for the visitors' index (TICKET-PUB-01). Private ones don't show up in any form.
export const listPublic = (): CollectionSummary[] => summaries(true);

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

// `image`: a new picture's id, null to remove it, undefined to keep it.
export const updateCollection = (id: number, settings: CollectionSettings, image?: string | null): void => {
  db()
    .prepare(
      `update collections set name = @name, slug = @slug, is_public = @isPublic, default_view = @defaultView,
         image = iif(@keepImage, image, @image), updated_at = unixepoch() where id = @id`,
    )
    .run({ ...settings, id, image: image ?? null, keepImage: image === undefined ? 1 : 0 });
};

// Fields and items go with it through ON DELETE CASCADE. Returns the ids of its picture and its items' images, whose
// files the caller deletes after this commits.
export const deleteCollection = (id: number): string[] =>
  db().transaction(() => {
    const images = db()
      .prepare(
        `select image from collections where id = @id and image is not null
         union all select image from items where collection_id = @id and image is not null`,
      )
      .pluck()
      .all({ id }) as string[];
    db().prepare("delete from collections where id = ?").run(id);
    return images;
  })();
