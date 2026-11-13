import { moveInList } from "../lib/order";
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
  // The id of the item's image files in uploads/ (TICKET-ITM-04), or null.
  image: string | null;
};

// What a save writes. Rank is never written by a caller: it follows from the status. `image` undefined keeps it.
export type ItemWrite = ({ status: "have"; quantity: number } | { status: "want" }) & {
  values: Record<string, unknown>;
  image?: string | null;
};

type ItemRow = Omit<Item, "values"> & { valuesJson: string };

const columns = "i.id, i.status, i.quantity, i.rank, i.values_json as valuesJson, i.image";

const toItem = ({ valuesJson, ...row }: ItemRow): Item => ({ ...row, values: JSON.parse(valuesJson) as Item["values"] });

export const getItem = (collectionId: number, itemId: number): Item | undefined => {
  const row = db()
    .prepare(`select ${columns} from items i where i.id = ? and i.collection_id = ?`)
    .get(itemId, collectionId) as ItemRow | undefined;
  return row && toItem(row);
};

// A field id sorts by that field's value; see TICKET-ITM-05.
export type ItemSort = "rank" | "created" | number;
export type ItemFilter = { fieldId: number; value: string | boolean };

export type ItemQuery = {
  collectionId: number;
  status: ItemStatus;
  q?: string;
  sort?: ItemSort;
  dir?: "asc" | "desc";
  filters?: ItemFilter[];
  // Visitors: private fields are never searched, sorted or filtered on, and their keys never leave this module.
  publicOnly?: boolean;
};

// The value of the field whose id is bound as `@<name>`: the id is a parameter, never spliced into the SQL. Bind it
// as a string: better-sqlite3 binds numbers as REAL, and `'$."' || 3.0` is the wrong path.
const valueOf = (name: string) => `json_extract(i.values_json, '$."' || @${name} || '"')`;

const sortExpressions = { rank: "i.rank", created: "i.created_at", field: valueOf("sortField") };
const directions = { asc: "asc", desc: "desc" };

// Text-like fields are the search scope, so a search never matches field ids, numbers or dates.
const searchScope = `select cast(f.id as text) from fields f where f.collection_id = i.collection_id
  and f.type in ('text', 'url', 'select') and (f.is_public = 1 or not @publicOnly)`;

const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;

const publicFieldIds = (collectionId: number): Set<string> =>
  new Set(
    (db().prepare("select id from fields where collection_id = ? and is_public = 1").pluck().all(collectionId) as number[]).map(String),
  );

const visibleOnly = (item: Item, visible: Set<string>): Item => ({
  ...item,
  values: Object.fromEntries(Object.entries(item.values).filter(([key]) => visible.has(key))),
});

// Search (case-insensitive, LIKE wildcards escaped), filters (AND), and sort with empty values last in both
// directions. Numbers compare numerically and text with NOCASE, because json_extract keeps each value's JSON type.
// shortcut: no pagination, every match is returned; add keyset pagination past ~1,000 items or when it feels slow.
export const listItems = ({ collectionId, status, q = "", sort = "created", dir = "asc", filters = [], publicOnly = false }: ItemQuery): Item[] => {
  const visible = publicOnly ? publicFieldIds(collectionId) : undefined;
  const allowed = (fieldId: number) => visible?.has(String(fieldId)) ?? true;
  const usable = filters.filter((filter) => allowed(filter.fieldId));
  const sortKey = typeof sort === "number" && allowed(sort) ? "field" : sort === "rank" ? "rank" : "created";
  const sortBy = sortExpressions[sortKey];
  const rows = db()
    .prepare(
      `select ${columns} from items i
       where i.collection_id = @collectionId and i.status = @status
         and (@q = '' or exists (select 1 from json_each(i.values_json) j
               where j.key in (${searchScope}) and j.value like @pattern escape '\\'))
         ${usable.map((_, n) => `and coalesce(${valueOf(`filterField${n}`)}, 0) = @filterValue${n}`).join(" ")}
       order by ${sortBy} is null, ${sortBy} collate nocase ${directions[dir]}, i.id`,
    )
    .all({
      collectionId,
      status,
      q,
      pattern: likePattern(q),
      publicOnly: publicOnly ? 1 : 0,
      sortField: typeof sort === "number" ? String(sort) : null,
      ...Object.fromEntries(
        usable.flatMap((filter, n) => [
          [`filterField${n}`, String(filter.fieldId)],
          // better-sqlite3 can't bind booleans; a checkbox is stored as JSON true/false, read back as 1/0.
          [`filterValue${n}`, typeof filter.value === "boolean" ? Number(filter.value) : filter.value],
        ]),
      ),
    }) as ItemRow[];
  return rows.map((row) => (visible ? visibleOnly(toItem(row), visible) : toItem(row)));
};

export const countItems = (collectionId: number): Record<ItemStatus, number> => ({
  have: 0,
  want: 0,
  ...Object.fromEntries(
    db()
      .prepare("select status, count(*) as n from items where collection_id = ? group by status")
      .raw()
      .all(collectionId) as Array<[ItemStatus, number]>,
  ),
});

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
          `insert into items (collection_id, status, quantity, rank, values_json, image)
           values (@collectionId, @status, @quantity, @rank, @values, @image)`,
        )
        .run({
          collectionId,
          status: item.status,
          ...placement(collectionId, item),
          values: JSON.stringify(item.values),
          image: item.image ?? null,
        })
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
           image = iif(@keepImage, image, @image), updated_at = unixepoch() where id = @itemId`,
      )
      .run({
        itemId,
        status: item.status,
        ...placement(collectionId, item, current),
        values: JSON.stringify(item.values),
        keepImage: item.image === undefined ? 1 : 0,
        image: item.image ?? null,
      });
    return true;
  })();

// Moves a want to `toRank` (clamped to 1..n) and renumbers the wants 1..n in one transaction (ADR 0004). False when
// the item isn't a want in this collection.
export const moveWant = (collectionId: number, itemId: number, toRank: number): boolean =>
  db().transaction(() => {
    const ids = db()
      .prepare("select id from items where collection_id = ? and status = 'want' order by rank")
      .pluck()
      .all(collectionId) as number[];
    if (!ids.includes(itemId)) return false;
    const setRank = db().prepare("update items set rank = ? where id = ?");
    moveInList(ids, ids.indexOf(itemId), toRank - 1).forEach((id, index) => setRank.run(index + 1, id));
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
