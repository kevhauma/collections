import type { Field } from "../../db/fields";
import type { Item } from "../../db/items";
import type { WishItem } from "../../db/wishlist";

// Wishlist items in the shape of collection wants (TICKET-WSH-03), so the want tab's table and post-it grid render
// them as they are (`ItemTable`, `ItemGrid`) instead of a parallel set of views. Fixed field ids stand in for a
// collection's fields.

const wishFieldIds = { title: 1, price: 2, note: 3, link: 4 } as const;
type WishField = keyof typeof wishFieldIds;

const fieldOf = (key: WishField, label: string, position: number): Field => ({
  id: wishFieldIds[key],
  label,
  type: key === "link" ? "url" : "text",
  options: null,
  required: key === "title" ? 1 : 0,
  isPublic: 1,
  prefix: null,
  suffix: null,
  ratingMax: null,
  ratingSymbol: null,
  position,
  isTitle: key === "title" ? 1 : 0,
  valueCount: 0,
});

const itemOf = (wish: WishItem): Item => ({
  id: wish.id,
  status: "want",
  quantity: null,
  rank: wish.rank,
  values: Object.fromEntries(
    Object.entries(wishFieldIds).flatMap(([key, id]) => (wish[key as WishField] ? [[String(id), wish[key as WishField]]] : [])),
  ),
  image: wish.image,
});

// `shown`: the columns in order, each with its translated label.
export const wishView = (wishes: WishItem[], shown: Array<[WishField, string]>) => ({
  fields: shown.map(([key, label], index) => fieldOf(key, label, index + 1)),
  items: wishes.map(itemOf),
  titleFieldId: wishFieldIds.title,
  // For the public page, whose titles open the item's link (TICKET-WSH-04).
  linkFieldId: wishFieldIds.link,
  // Featured in the enlarged-picture header (TICKET-UI-10).
  priceFieldId: wishFieldIds.price,
});
