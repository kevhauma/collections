import {
  createWishItem,
  createWishlist,
  deleteWishItem,
  deleteWishlist,
  listWishlistSlugs,
  updateWishItem,
  type WishItem,
  type Wishlist,
  type WishWrite,
} from "../../db/wishlist";
import { rejected, type Rejected } from "../collections/form";
import { parseCreate, type FormInput } from "../collections/validation";
import { commitImage } from "../images/change";
import { removeImage } from "../images/process";

// Saving and deleting wishlists and their items with the items' image files: the admin forms and the MCP tools
// (TICKET-WSH-07, TICKET-WSH-11) share these, like `saveItem` / `removeItem`. `input.image` is a prepared image (see
// commitImage): undefined keeps it.

// Creates the item when there is none yet, at the bottom of `wishlistId`. Returns its id.
export const saveWish = (wishlistId: number, item: WishItem | undefined, input: WishWrite): Promise<number> =>
  commitImage(input.image, item?.image, () => {
    if (!item) return createWishItem(wishlistId, input);
    updateWishItem(item.id, input);
    return item.id;
  });

// Its image files go once the row is gone.
export const removeWish = (item: WishItem): Promise<string | null> => commitImage(null, item.image, () => deleteWishItem(item.id));

// A new wishlist from its name (TICKET-WSH-09): private, reminders off, the slug generated with `uniqueSlug` among
// wishlist slugs. The new slug, or the translated errors.
export const addWishlist = (form: FormInput): { slug: string } | Rejected => {
  const parsed = parseCreate({ name: form.name ?? "" }, listWishlistSlugs());
  if (!parsed.success) return rejected(parsed.error, form);
  createWishlist(parsed.data.name, parsed.data.slug);
  return { slug: parsed.data.slug };
};

// Its items' image files go after the rows are gone.
export const removeWishlist = async (wishlist: Wishlist): Promise<void> => {
  await Promise.all(deleteWishlist(wishlist.id).map((image) => removeImage(image)));
};
