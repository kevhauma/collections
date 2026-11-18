import { createWishItem, deleteWishItem, updateWishItem, type WishItem, type WishWrite } from "../../db/wishlist";
import { commitImage } from "../images/change";

// Saving and deleting a wishlist item with its image files: the admin form and the MCP tools (TICKET-WSH-07) share
// these, like `saveItem` / `removeItem`. `input.image` is a prepared image (see commitImage): undefined keeps it.

// Creates the item when there is none yet, at the bottom of `wishlistId`. Returns its id.
export const saveWish = (wishlistId: number, item: WishItem | undefined, input: WishWrite): Promise<number> =>
  commitImage(input.image, item?.image, () => {
    if (!item) return createWishItem(wishlistId, input);
    updateWishItem(item.id, input);
    return item.id;
  });

// Its image files go once the row is gone.
export const removeWish = (item: WishItem): Promise<string | null> => commitImage(null, item.image, () => deleteWishItem(item.id));
