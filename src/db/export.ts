import { columns, type Collection } from "./collections";
import { db } from "./connection";
import { listFields, type Field } from "./fields";
import type { Item } from "./items";
import { getDefaultLocale } from "./settings";

// Everything the export needs (TICKET-BAK-01), private fields included: it's the owner's backup.

type SnapshotItem = Omit<Item, "id"> & { createdAt: number; updatedAt: number };

export type SnapshotCollection = Omit<Collection, "id"> & {
  fields: Array<Omit<Field, "valueCount" | "isTitle">>;
  items: SnapshotItem[];
};

export type Snapshot = { defaultLocale: string; collections: SnapshotCollection[] };

const itemsOf = (collectionId: number): SnapshotItem[] =>
  (
    db()
      .prepare(
        `select status, quantity, rank, values_json as valuesJson, image, created_at as createdAt,
           updated_at as updatedAt
         from items where collection_id = ? order by status, rank, id`,
      )
      .all(collectionId) as Array<Omit<SnapshotItem, "values"> & { valuesJson: string }>
  ).map(({ valuesJson, ...item }) => ({ ...item, values: JSON.parse(valuesJson) as Item["values"] }));

const collectionsOf = (): Collection[] =>
  db()
    .prepare(`select ${columns} from collections order by name collate nocase`)
    .all() as Collection[];

// One read transaction, so every statement sees the same state even while someone saves an item.
export const readSnapshot = (): Snapshot =>
  db().transaction(() => ({
    defaultLocale: getDefaultLocale(),
    collections: collectionsOf().map(({ id, ...collection }) => ({
      ...collection,
      fields: listFields(id).map(({ valueCount: _count, isTitle: _title, ...field }) => field),
      items: itemsOf(id),
    })),
  }))();
