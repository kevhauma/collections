import { data, type ActionFunctionArgs, type Params } from "react-router";
import { getWishItem, getWishlistBySlug, type WishItem, type Wishlist } from "../../db/wishlist";
import { requireAdmin } from "../auth/guard";
import type { FormInput } from "../collections/validation";

// The wishlist named in an /admin/w/:slug URL (TICKET-WSH-09), or the not-found page. Call after requireAdmin().
export const requireWishlist = (slug: string | undefined): Wishlist => {
  const wishlist = slug === undefined ? undefined : getWishlistBySlug(slug);
  if (!wishlist) throw data(null, { status: 404 });
  return wishlist;
};

// The item named in an /admin/w/:slug/items/:id URL; undefined on the new-item form. An unknown id, or one of another
// wishlist, is the not-found page.
export const requireWish = (wishlist: Wishlist, id: string | undefined): WishItem | undefined =>
  id === undefined ? undefined : wishOn(wishlist, id);

// The id must be written exactly as the item's (no "03" or "3.0").
const wishOn = (wishlist: Wishlist, id: string): WishItem => {
  const item = getWishItem(Number(id));
  if (!item || item.wishlistId !== wishlist.id || String(item.id) !== id) throw data(null, { status: 404 });
  return item;
};

// The route action of an /admin/w/:slug page: requireAdmin() first, then the wishlist (or 404) and the posted form for
// `handle`, plus the other URL params (an item id). Like `collectionAction`.
export const wishlistAction =
  <R,>(handle: (wishlist: Wishlist, form: FormInput, params: Params) => R) =>
  async ({ request, params }: ActionFunctionArgs) => {
    requireAdmin();
    const wishlist = requireWishlist(params.slug);
    return handle(wishlist, Object.fromEntries(await request.formData()), params);
  };
