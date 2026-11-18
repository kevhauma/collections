import { data, redirect } from "react-router";
import { listPublicWishlists } from "../db/wishlist";

// /wishlist (TICKET-WSH-10): the address of the one wishlist before there were several. It redirects (302) to the
// first public wishlist by name, so links shared back then keep working; with none public, the same 404 as a private
// one.
export const loader = () => {
  const first = listPublicWishlists()[0];
  if (!first) throw data(null, { status: 404 });
  return redirect(`/wishlist/${first.slug}`);
};

// Never rendered: the loader always redirects or throws. A page module, so the 404 gets the public not-found page.
export default function PublicWishlistFirst() {
  return null;
}
