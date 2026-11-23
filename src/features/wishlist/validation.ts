import { z } from "zod";
import { checkbox, nameAndSlug, type FormInput } from "../collections/validation";
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

// The list page's typed rank (TICKET-WSH-03), the no-JS twin of dragging. An emptied input coerces to 0 and is
// refused rather than moving the item to the top.
export const wishMoveSchema = z.object({ itemId: z.coerce.number().int(), rank: z.coerce.number().int().min(1) });

// A price-range bound: blank, non-numeric or negative all mean "no bound" (null) rather than an error, since the range
// is a filter the admin can leave open-ended.
const optionalPrice = z
  .string()
  .trim()
  .optional()
  .transform((text) => {
    const amount = Number(text);
    return text && Number.isFinite(amount) && amount >= 0 ? amount : null;
  });

// A wishlist's settings (TICKET-WSH-09): name and slug like a collection's, but `taken` holds the other wishlists'
// slugs. Unticked checkboxes send nothing. The price range picks the in-budget ideas on its public page.
export const parseWishlistSettings = (form: FormInput, taken: ReadonlySet<string>) =>
  z
    .object({
      ...nameAndSlug(taken, { takenKey: "wishlistTaken", reserved: new Set() }),
      isPublic: checkbox,
      showReminders: checkbox,
      minPrice: optionalPrice,
      maxPrice: optionalPrice,
    })
    .safeParse(form);
