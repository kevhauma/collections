import { useLingui } from "@lingui/react/macro";
import { data } from "react-router";
import { isWishlistPublic, listWishlist } from "../db/wishlist";
import { wishView } from "../features/wishlist/view";
import { EmptyState } from "../ui/empty-state";
import { ItemGrid } from "./item-views";
import { LinkPreview } from "./public-collection";

// /wishlist (TICKET-WSH-04): the general wishlist for visitors, laid out like a collection's public want list (the
// same post-it grid with the rank on each post-it). Server components only, under the public layout, so the page
// ships no JS. A private wishlist answers the same 404 as a private collection.

export const loader = () => {
  if (!isWishlistPublic()) throw data(null, { status: 404 });
  return null;
};

export default function PublicWishlist() {
  const { t } = useLingui();
  const wishes = listWishlist();
  const title = t({ id: "wishlist.heading", message: "Wishlist" });
  const view = wishView(wishes, [
    ["title", t({ id: "wishlist.field.title", message: "Title" })],
    ["price", t({ id: "wishlist.field.price", message: "Price" })],
    ["note", t({ id: "wishlist.field.note", message: "Note" })],
  ]);
  return (
    <div className="grid gap-sq">
      <title>{title}</title>
      <LinkPreview title={title} image={wishes.find((wish) => wish.image)?.image ?? undefined} />
      <h1>{title}</h1>
      {wishes.length === 0 ? (
        <EmptyState title={t({ id: "wishlist.empty", message: "Nothing on the wishlist yet" })} />
      ) : (
        <ItemGrid
          mode="public"
          status="want"
          fields={view.fields}
          items={view.items}
          titleFieldId={view.titleFieldId}
          titleLinkFieldId={view.linkFieldId}
          itemsBase="/admin/wishlist/items"
        />
      )}
    </div>
  );
}
