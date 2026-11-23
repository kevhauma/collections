import { getCollectionBySlug, listWishlistReminders } from "../../db/collections";
import { listFields, type Field } from "../../db/fields";
import { listItems, type Item } from "../../db/items";

// The in-budget want items of each collection shown on a public wishlist (TICKET-WSH-06): per collection, its want
// items whose price sits in the wishlist's range, with the collection's public fields so the page can show a small
// grid (picture and title) that enlarges to the item's other fields. Items are read with publicOnly, so private
// fields never reach a visitor.

export type CollectionSuggestions = {
  slug: string;
  name: string;
  titleFieldId: number;
  // The collection's default item image (TICKET-COL-08), for wants without a picture.
  itemImage: string | null;
  // Public fields in position order, for the enlarged-picture panel.
  fields: Field[];
  // Every in-budget want, oldest first; the page shows the first few and reveals the rest.
  items: Item[];
};

// A collection's price field: its first number field carrying a currency prefix or suffix (TICKET-COL-04).
// shortcut: with several affixed number fields the first wins; add an explicit price-field setting if that bites.
const priceFieldOf = (fields: Field[]): Field | undefined =>
  fields.find((field) => field.type === "number" && (field.prefix !== null || field.suffix !== null));

// The numeric part of a stored price (e.g. "€12.50" → 12.5), or null when it holds no number.
export const priceAmount = (raw: unknown): number | null => {
  if (raw === null || raw === undefined) return null;
  const digits = String(raw).replace(/[^0-9.]/g, "");
  const amount = Number(digits);
  return digits === "" || Number.isNaN(amount) ? null : amount;
};

const inRange = (amount: number, min: number | null, max: number | null): boolean =>
  (min === null || amount >= min) && (max === null || amount <= max);

// A collection without a price field only matches an open-ended range, since its items carry no comparable price.
// shortcut: scans every want item of those collections in memory; fine for a personal hoard, add SQL paging past a few thousand.
export const wishlistSuggestions = (min: number | null, max: number | null): CollectionSuggestions[] => {
  const groups: CollectionSuggestions[] = [];
  for (const summary of listWishlistReminders()) {
    const collection = getCollectionBySlug(summary.slug);
    if (!collection) continue;
    const fields = listFields(collection.id);
    const priceField = priceFieldOf(fields);
    const wants = listItems({ collectionId: collection.id, status: "want", publicOnly: true });
    const items = wants.filter((item) => {
      if (!priceField) return min === null && max === null;
      const amount = priceAmount(item.values[String(priceField.id)]);
      return amount !== null && inRange(amount, min, max);
    });
    if (items.length === 0) continue;
    groups.push({
      slug: collection.slug,
      name: collection.name,
      titleFieldId: collection.titleFieldId,
      itemImage: collection.itemImage,
      fields: fields.filter((field) => field.isPublic === 1),
      items,
    });
  }
  return groups;
};
