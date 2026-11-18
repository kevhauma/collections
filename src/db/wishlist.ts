import { moveInList } from "../lib/order";
import { db } from "./connection";

// All SQL for the wishlists (TICKET-WSH-01, several since TICKET-WSH-08). Ranks stay dense 1..n per wishlist like
// collection wants (ADR 0004): every write that changes them runs in one transaction. is_public stays SQLite's 0 | 1.

export type Wishlist = {
  id: number;
  name: string;
  slug: string;
  isPublic: 0 | 1;
  // Whether the collections' want lists are reminded of on its public page (TICKET-WSH-06).
  showReminders: 0 | 1;
};

type WishlistSummary = Wishlist & {
  itemCount: number;
  // The first image by rank, for its card.
  image: string | null;
};

export type WishlistSettings = Omit<Wishlist, "id">;

export type WishItem = {
  id: number;
  wishlistId: number;
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

const wishlistColumns = "id, name, slug, is_public as isPublic, show_reminders as showReminders";
const columns = "id, wishlist_id as wishlistId, title, link, note, price, image, rank";

const summaries = (publicOnly: boolean): WishlistSummary[] =>
  db()
    .prepare(
      `select ${wishlistColumns},
         (select count(*) from wishlist_items i where i.wishlist_id = w.id) as itemCount,
         (select image from wishlist_items i where i.wishlist_id = w.id and image is not null order by rank limit 1) as image
       from wishlists w where is_public = 1 or not ? order by name collate nocase`,
    )
    .all(publicOnly ? 1 : 0) as WishlistSummary[];

// Every wishlist by name, like collections.
export const listWishlists = (): WishlistSummary[] => summaries(false);

// shortcut: the pages and MCP tools built for one wishlist use the first by name, until TICKET-WSH-09..11 replace them.
// The migration always leaves one.
export const firstWishlist = (): Wishlist => listWishlists()[0]!;

export const getWishlist = (id: number): Wishlist | undefined =>
  db().prepare(`select ${wishlistColumns} from wishlists where id = ?`).get(id) as Wishlist | undefined;

export const getWishlistBySlug = (slug: string): Wishlist | undefined =>
  db().prepare(`select ${wishlistColumns} from wishlists where slug = ?`).get(slug) as Wishlist | undefined;

export const listWishlistSlugs = (): Set<string> =>
  new Set(db().prepare("select slug from wishlists").pluck().all() as string[]);

// Private, reminders off. A taken slug throws (unique constraint): get a free one from `uniqueSlug` first.
export const createWishlist = (name: string, slug: string): number =>
  Number(db().prepare("insert into wishlists (name, slug) values (?, ?)").run(name, slug).lastInsertRowid);

export const updateWishlist = (id: number, settings: WishlistSettings): void => {
  db()
    .prepare(
      `update wishlists set name = @name, slug = @slug, is_public = @isPublic, show_reminders = @showReminders,
         updated_at = unixepoch() where id = @id`,
    )
    .run({ ...settings, id });
};

// Its items go with it through ON DELETE CASCADE. Returns their image ids, whose files the caller deletes after this
// commits.
export const deleteWishlist = (id: number): string[] =>
  db().transaction(() => {
    const images = db()
      .prepare("select image from wishlist_items where wishlist_id = ? and image is not null")
      .pluck()
      .all(id) as string[];
    db().prepare("delete from wishlists where id = ?").run(id);
    return images;
  })();

export const listWishlist = (wishlistId: number): WishItem[] =>
  db().prepare(`select ${columns} from wishlist_items where wishlist_id = ? order by rank`).all(wishlistId) as WishItem[];

export const getWishItem = (id: number): WishItem | undefined =>
  db().prepare(`select ${columns} from wishlist_items where id = ?`).get(id) as WishItem | undefined;

export const createWishItem = (wishlistId: number, item: WishWrite): number =>
  Number(
    db()
      .prepare(
        `insert into wishlist_items (wishlist_id, title, link, note, price, image, rank)
         values (@wishlistId, @title, @link, @note, @price, @image,
           (select coalesce(max(rank), 0) + 1 from wishlist_items where wishlist_id = @wishlistId))`,
      )
      .run({ ...item, wishlistId, image: item.image ?? null }).lastInsertRowid,
  );

// Keeps the rank. False when there is no such item.
export const updateWishItem = (id: number, item: WishWrite): boolean =>
  db()
    .prepare(
      `update wishlist_items set title = @title, link = @link, note = @note, price = @price,
         image = iif(@keepImage, image, @image), updated_at = unixepoch() where id = @id`,
    )
    .run({ ...item, id, keepImage: item.image === undefined ? 1 : 0, image: item.image ?? null }).changes > 0;

// Closes the rank gap inside the item's wishlist. Returns the deleted item's image id so the caller can remove its
// files; null when it had none or there was no such item.
export const deleteWishItem = (id: number): string | null =>
  db().transaction(() => {
    const deleted = db().prepare("delete from wishlist_items where id = ? returning wishlist_id as wishlistId, rank, image").get(id) as
      | Pick<WishItem, "wishlistId" | "rank" | "image">
      | undefined;
    if (deleted) {
      db().prepare("update wishlist_items set rank = rank - 1 where wishlist_id = ? and rank > ?").run(deleted.wishlistId, deleted.rank);
    }
    return deleted?.image ?? null;
  })();

// Moves an item to `toRank` (clamped to 1..n) inside its wishlist and renumbers 1..n in one transaction, like
// `moveWant`. False when the item isn't on that wishlist.
export const moveWishItem = (wishlistId: number, id: number, toRank: number): boolean =>
  db().transaction(() => {
    const ids = db()
      .prepare("select id from wishlist_items where wishlist_id = ? order by rank")
      .pluck()
      .all(wishlistId) as number[];
    if (!ids.includes(id)) return false;
    const setRank = db().prepare("update wishlist_items set rank = ? where id = ?");
    moveInList(ids, ids.indexOf(id), toRank - 1).forEach((itemId, index) => setRank.run(index + 1, itemId));
    return true;
  })();
