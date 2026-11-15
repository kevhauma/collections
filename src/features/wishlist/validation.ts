import { z } from "zod";
import { isHttpUrl } from "../items/schema";

// A wishlist item as the admin form and the MCP tools post it (TICKET-WSH-01). Issue messages are keys that form.ts
// translates. Blank optional text becomes null.

export type WishErrorKey = "title" | "link" | "note" | "price";
const key = (errorKey: WishErrorKey) => errorKey;

const optionalText = (max: number, errorKey: WishErrorKey) =>
  z
    .string()
    .trim()
    .max(max, key(errorKey))
    .optional()
    .transform((text) => text || null);

export const wishSchema = z.object({
  title: z.string(key("title")).trim().min(1, key("title")).max(200, key("title")),
  link: optionalText(2000, "link").refine((link) => link === null || isHttpUrl(link), key("link")),
  note: optionalText(2000, "note"),
  price: optionalText(50, "price"),
});

// The list page's two small forms (TICKET-WSH-03): a typed rank (the no-JS twin of dragging; an emptied input
// coerces to 0 and is refused rather than moving the item to the top) and the public toggle,
// whose unticked checkbox sends nothing.
export const wishlistIntentSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("move"), itemId: z.coerce.number().int(), rank: z.coerce.number().int().min(1) }),
  z.object({ intent: z.literal("visibility"), isPublic: z.literal("on").optional().transform((on) => on === "on") }),
]);
