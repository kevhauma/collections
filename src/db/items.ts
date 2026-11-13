import { db } from "./connection";

// All SQL for items (TICKET-ITM-02). Every statement is scoped to the collection. Status changes keep want ranks
// dense 1..n inside the same transaction as the item write (ADR 0004), so the items CHECK can't be violated from here.

export type ItemStatus = "have" | "want";

export type Item = {
  id: number;
  status: ItemStatus;
  quantity: number | null;
  rank: number | null;
  // Keyed by field id as a string.
  values: Record<string, unknown>;
};

// What a save writes. Rank is never written by a caller: it follows from the status.
export type ItemWrite = ({ status: "have"; quantity: number } | { status: "want" }) & {
  values: Record<string, unknown>;
};

type ItemListEntry = { id: number; title: unknown };

export const getItem = (collectionId: number, itemId: number): Item | undefined => {
  const row = db()
    .prepare("select id, status, quantity, rank, values_json as valuesJson from items where id = ? and collection_id = ?")
    .get(itemId, collectionId) as (Omit<Item, "values"> & { valuesJson: string }) | undefined;
  if (!row) return undefined;
  const { valuesJson, ...item } = row;
  return { ...item, values: JSON.parse(valuesJson) as Item["values"] };
};

// shortcut: titles only, wants by rank and haves oldest first, until TICKET-ITM-05 adds the views.
export const listItems = (collectionId: number, status: ItemStatus): ItemListEntry[] =>
  db()
    .prepare(
      `select i.id, json_extract(i.values_json, '$."' || c.title_field_id || '"') as title
       from items i join collections c on c.id = i.collection_id
       where i.collection_id = ? and i.status = ? order by i.rank, i.id`,
    )
    .all(collectionId, status) as ItemListEntry[];

// The rank a new want gets: the bottom, n+1.
const appendWant = (collectionId: number): number =>
  db()
    .prepare("select coalesce(max(rank), 0) + 1 from items where collection_id = ? and status = 'want'")
    .pluck()
    .get(collectionId) as number;

// After a want at `rank` leaves, every want below it moves up one.
const closeRankGap = (collectionId: number, rank: number): void => {
  db()
    .prepare("update items set rank = rank - 1 where collection_id = ? and status = 'want' and rank > ?")
    .run(collectionId, rank);
};

// Quantity and rank for the written status. A want that stays a want keeps its rank.
const placement = (collectionId: number, item: ItemWrite, current?: Pick<Item, "status" | "rank">) =>
  item.status === "have"
    ? { quantity: item.quantity, rank: null }
    : { quantity: null, rank: current?.status === "want" ? current.rank : appendWant(collectionId) };

export const createItem = (collectionId: number, item: ItemWrite): number =>
  db().transaction(() =>
    Number(
      db()
        .prepare(
          `insert into items (collection_id, status, quantity, rank, values_json)
           values (@collectionId, @status, @quantity, @rank, @values)`,
        )
        .run({ collectionId, status: item.status, ...placement(collectionId, item), values: JSON.stringify(item.values) })
        .lastInsertRowid,
    ),
  )();

// False when the item isn't in this collection.
export const updateItem = (collectionId: number, itemId: number, item: ItemWrite): boolean =>
  db().transaction(() => {
    const current = getItem(collectionId, itemId);
    if (!current) return false;
    if (current.rank !== null && item.status === "have") closeRankGap(collectionId, current.rank);
    db()
      .prepare(
        `update items set status = @status, quantity = @quantity, rank = @rank, values_json = @values,
           updated_at = unixepoch() where id = @itemId`,
      )
      .run({ itemId, status: item.status, ...placement(collectionId, item, current), values: JSON.stringify(item.values) });
    return true;
  })();

// False when the item isn't in this collection. shortcut: the image file stays on disk until TICKET-ITM-04.
export const deleteItem = (collectionId: number, itemId: number): boolean =>
  db().transaction(() => {
    const deleted = db()
      .prepare("delete from items where id = ? and collection_id = ? returning rank")
      .get(itemId, collectionId) as { rank: number | null } | undefined;
    if (deleted?.rank != null) closeRankGap(collectionId, deleted.rank);
    return deleted !== undefined;
  })();
