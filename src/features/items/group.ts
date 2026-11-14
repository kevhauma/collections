import type { Field } from "../../db/fields";
import type { Item } from "../../db/items";

// Grouping the item list by a field (TICKET-ITM-06), on the already searched, filtered and sorted list. Items keep
// that order inside each group, and only groups with items exist.
// shortcut: groups in memory, fine at personal-collection sizes; move to SQL (json_each) if lists get large.

// `value`: the group's text, true / false for a checkbox's Yes / No, or null for the items without a value (last).
export type ItemGroup = { value: string | boolean | null; items: Item[] };

type GroupField = Pick<Field, "id" | "type" | "options">;

// A text value lists several, comma-separated ("Jazz, Soul"): trimmed, empty parts dropped, case ignored.
const textParts = (value: unknown) =>
  typeof value === "string" ? value.split(",").map((part) => part.trim()).filter(Boolean) : [];

// Text: one group per value, merged case-insensitively under the first spelling seen, sorted by the locale.
const byText = (items: Item[], field: GroupField, locale?: string): ItemGroup[] => {
  const groups = new Map<string, ItemGroup>();
  for (const item of items) {
    // Reversed, so the first spelling within the item is the one the Map keeps.
    const keys = new Map(textParts(item.values[field.id]).toReversed().map((part) => [part.toLocaleLowerCase(locale), part]));
    for (const [key, part] of keys) {
      const group = groups.get(key) ?? groups.set(key, { value: part, items: [] }).get(key)!;
      group.items.push(item);
    }
  }
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  return [...groups.values()].sort((a, b) => collator.compare(String(a.value), String(b.value)));
};

// A choice in option order (a value no longer among the options after it), a checkbox Yes then No.
const byValue = (items: Item[], field: GroupField): ItemGroup[] => {
  const order = field.type === "checkbox" ? [true, false] : (field.options ?? []);
  const values = [...new Set([...order, ...items.map((item) => valueOf(item, field))])].filter((value) => value !== null);
  return values.map((value) => ({ value, items: items.filter((item) => valueOf(item, field) === value) }));
};

// An unticked checkbox is No, never "no value".
const valueOf = (item: Item, field: GroupField): string | boolean | null => {
  const value = item.values[field.id];
  if (field.type === "checkbox") return value === true;
  return typeof value === "string" && value !== "" ? value : null;
};

const hasNoValue = (item: Item, field: GroupField) =>
  field.type === "text" ? textParts(item.values[field.id]).length === 0 : valueOf(item, field) === null;

export const groupItems = (items: Item[], field: GroupField, locale?: string): ItemGroup[] => {
  const groups = field.type === "text" ? byText(items, field, locale) : byValue(items, field);
  const none = items.filter((item) => hasNoValue(item, field));
  return [...groups, ...(none.length > 0 ? [{ value: null, items: none }] : [])].filter((group) => group.items.length > 0);
};
