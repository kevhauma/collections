import { getCollectionBySlug, listWishlistReminders } from "../../db/collections";
import { listFields, type Field } from "../../db/fields";
import { listItems } from "../../db/items";

// In-budget gift ideas for a public wishlist: want items drawn from the public collections shown on the wishlist
// (TICKET-WSH-06, the same set as the reminders), whose price sits in the wishlist's range. Each collection's price
// field is auto-detected; items are read with publicOnly, so private fields never reach a visitor.

export type Suggestion = { slug: string; collectionName: string; name: string; image: string | null };

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

// Up to `limit` matches, stopping as soon as that many are found.
// shortcut: scans every want item of those collections in memory; fine for a personal hoard, add SQL paging past a few thousand.
export const priceSuggestions = (min: number | null, max: number | null, limit: number): Suggestion[] => {
  const suggestions: Suggestion[] = [];
  for (const summary of listWishlistReminders()) {
    const collection = getCollectionBySlug(summary.slug);
    if (!collection) continue;
    const priceField = priceFieldOf(listFields(collection.id));
    if (!priceField) continue;
    const items = listItems({ collectionId: collection.id, status: "want", publicOnly: true });
    for (const item of items) {
      const amount = priceAmount(item.values[String(priceField.id)]);
      if (amount === null || !inRange(amount, min, max)) continue;
      const name = String(item.values[String(collection.titleFieldId)] ?? "");
      suggestions.push({ slug: collection.slug, collectionName: collection.name, name, image: item.image ?? collection.itemImage });
      if (suggestions.length >= limit) return suggestions;
    }
  }
  return suggestions;
};
