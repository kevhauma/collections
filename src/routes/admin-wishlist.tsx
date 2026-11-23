import { Trans, useLingui } from "@lingui/react/macro";
import { redirect, type LoaderFunctionArgs, type Params } from "react-router";
import { listWishlist, moveWishItem } from "../db/wishlist";
import { requireAdmin } from "../features/auth/guard";
import { requireWishlist, wishlistAction } from "../features/wishlist/require-wishlist";
import { wishMoveSchema } from "../features/wishlist/validation";
import { wishView } from "../features/wishlist/view";
import { LinkButton } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { AdminPageHeading } from "./admin-parts";
import { moveWishItemAction } from "./item-actions";
import { ItemTable } from "./item-views";

// /admin/w/:slug (TICKET-WSH-03, TICKET-WSH-09): one ranked wishlist in the want tab's table, reordered by drag or a
// typed rank. No view switch, search, sort or filter: the list stays short. Visibility lives in its settings.

export const loader = ({ params }: LoaderFunctionArgs) => {
  requireAdmin();
  requireWishlist(params.slug);
  return null;
};

// The typed rank posts here and redirects back, so a reload doesn't post again. A move of an item that isn't on this
// wishlist is a bad request.
export const action = wishlistAction((wishlist, form) => {
  const parsed = wishMoveSchema.safeParse(form);
  if (!parsed.success || !moveWishItem(wishlist.id, parsed.data.itemId, parsed.data.rank)) {
    throw new Response(null, { status: 400 });
  }
  return redirect(`/admin/w/${wishlist.slug}#item-${parsed.data.itemId}`);
});

export default function AdminWishlist({ params }: { params: Params }) {
  const { t } = useLingui();
  const wishlist = requireWishlist(params.slug);
  const base = `/admin/w/${wishlist.slug}`;
  const name = wishlist.name;
  const wishes = listWishlist(wishlist.id);
  const view = wishView(wishes, [
    ["title", t({ id: "wishlist.field.title", message: "Title" })],
    ["price", t({ id: "wishlist.field.price", message: "Price" })],
    ["link", t({ id: "wishlist.field.link", message: "Link" })],
  ]);
  const add = (
    <LinkButton variant="primary" href={`${base}/items/new`}>
      <Trans id="items.add">+ Add item</Trans>
    </LinkButton>
  );
  return (
    <div className="grid gap-sq">
      <title>{t({ id: "collections.page.title", message: `${name} · Hoardr` })}</title>
      <AdminPageHeading name={name} isPublic={wishlist.isPublic}>
        <LinkButton href={`${base}/settings`} size="sm">
          <Trans id="collections.link.settings">Settings</Trans>
        </LinkButton>
        {add}
      </AdminPageHeading>
      {wishes.length === 0 ? (
        <EmptyState title={t({ id: "wishlist.empty", message: "Nothing on the wishlist yet" })} action={add} />
      ) : (
        <ItemTable
          mode="admin"
          status="want"
          fields={view.fields}
          items={view.items}
          titleFieldId={view.titleFieldId}
          titleLinkFieldId={view.linkFieldId}
          featuredFieldId={view.priceFieldId}
          itemsBase={`${base}/items`}
          ranking={{ draggable: true, count: wishes.length, onMove: moveWishItemAction.bind(null, wishlist.slug) }}
        />
      )}
    </div>
  );
}
