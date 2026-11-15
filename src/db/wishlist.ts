import { moveInList } from "../lib/order";
import { db } from "./connection";

// All SQL for the general wishlist (TICKET-WSH-01). Ranks stay dense 1..n like collection wants (ADR 0004): every
// write that changes them runs in one transaction.

export type WishItem = {
  id: number;
  title: string;
  link: string | null;
  note: string | null;
  price: string | null;
  // The id of the item's image files in uploads/, or null.
  image: string | null;
  rank: number;
};

// What a save writes. Rank is never written by a save: a new item goes to the bottom. `image` undefined keeps it.
export type WishWrite = Pick<WishItem, "title" | "link" | "note" | "price"> & { image?: string | null };

const columns = "id, title, link, note, price, image, rank";

export const listWishlist = (): WishItem[] =>
  db().prepare(`select ${columns} from wishlist_items order by rank`).all() as WishItem[];

export const getWishItem = (id: number): WishItem | undefined =>
  db().prepare(`select ${columns} from wishlist_items where id = ?`).get(id) as WishItem | undefined;

export const createWishItem = (item: WishWrite): number =>
  Number(
    db()
      .prepare(
        `insert into wishlist_items (title, link, note, price, image, rank)
         values (@title, @link, @note, @price, @image, (select coalesce(max(rank), 0) + 1 from wishlist_items))`,
      )
      .run({ ...item, image: item.image ?? null }).lastInsertRowid,
  );

// Keeps the rank. False when there is no such item.
export const updateWishItem = (id: number, item: WishWrite): boolean =>
  db()
    .prepare(
      `update wishlist_items set title = @title, link = @link, note = @note, price = @price,
         image = iif(@keepImage, image, @image), updated_at = unixepoch() where id = @id`,
    )
    .run({ ...item, id, keepImage: item.image === undefined ? 1 : 0, image: item.image ?? null }).changes > 0;

// Closes the rank gap. Returns the deleted item's image id so the caller can remove its files; null when it had none
// or there was no such item.
export const deleteWishItem = (id: number): string | null =>
  db().transaction(() => {
    const deleted = db().prepare("delete from wishlist_items where id = ? returning rank, image").get(id) as
      | Pick<WishItem, "rank" | "image">
      | undefined;
    if (deleted) db().prepare("update wishlist_items set rank = rank - 1 where rank > ?").run(deleted.rank);
    return deleted?.image ?? null;
  })();

// Moves an item to `toRank` (clamped to 1..n) and renumbers 1..n in one transaction, like `moveWant`. False when
// there is no such item.
export const moveWishItem = (id: number, toRank: number): boolean =>
  db().transaction(() => {
    const ids = db().prepare("select id from wishlist_items order by rank").pluck().all() as number[];
    if (!ids.includes(id)) return false;
    const setRank = db().prepare("update wishlist_items set rank = ? where id = ?");
    moveInList(ids, ids.indexOf(id), toRank - 1).forEach((itemId, index) => setRank.run(index + 1, itemId));
    return true;
  })();

export const isWishlistPublic = (): boolean =>
  db().prepare("select wishlist_public from settings where id = 1").pluck().get() === 1;

export const setWishlistPublic = (isPublic: boolean): void => {
  db().prepare("update settings set wishlist_public = ? where id = 1").run(isPublic ? 1 : 0);
};
