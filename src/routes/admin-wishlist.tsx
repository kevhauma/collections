import { Trans, useLingui } from "@lingui/react/macro";
import { redirect, type ActionFunctionArgs } from "react-router";
import { isWishlistPublic, listWishlist, moveWishItem, setWishlistPublic } from "../db/wishlist";
import { requireAdmin } from "../features/auth/guard";
import { wishlistIntentSchema } from "../features/wishlist/validation";
import { wishView } from "../features/wishlist/view";
import { Button, LinkButton } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/choice";
import { EmptyState } from "../ui/empty-state";
import { moveWishItemAction } from "./item-actions";
import { ItemTable } from "./item-views";
import { VisibilityBadge } from "./visibility-badge";

// /admin/wishlist (TICKET-WSH-03): the ranked general wishlist in the want tab's table, reordered by drag or a typed
// rank, and its public toggle. No view switch, search, sort or filter: the list stays short.

export const loader = () => {
  requireAdmin();
  return null;
};

// Both forms redirect back, so a reload doesn't post again. A move of an unknown item is a bad request.
export const action = async ({ request }: ActionFunctionArgs) => {
  requireAdmin();
  const parsed = wishlistIntentSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) throw new Response(null, { status: 400 });
  const input = parsed.data;
  if (input.intent === "visibility") {
    setWishlistPublic(input.isPublic);
    return redirect("/admin/wishlist");
  }
  if (!moveWishItem(input.itemId, input.rank)) throw new Response(null, { status: 400 });
  return redirect(`/admin/wishlist#item-${input.itemId}`);
};

const Visibility = ({ isPublic }: { isPublic: boolean }) => {
  const { t } = useLingui();
  return (
    <Card heading={t({ id: "settings.visitors", message: "Visitors" })} tone="ink">
      <form method="post" className="flex flex-wrap items-center gap-4">
        <input type="hidden" name="intent" value="visibility" />
        <Checkbox
          name="isPublic"
          defaultChecked={isPublic}
          label={t({ id: "collections.settings.public", message: "Public: anyone with the link can see it" })}
        />
        <Button type="submit" size="sm">
          <Trans id="collections.settings.save">Save</Trans>
        </Button>
      </form>
    </Card>
  );
};

export default function AdminWishlist() {
  const { t } = useLingui();
  const isPublic = isWishlistPublic();
  const wishes = listWishlist();
  const view = wishView(wishes, [
    ["title", t({ id: "wishlist.field.title", message: "Title" })],
    ["price", t({ id: "wishlist.field.price", message: "Price" })],
    ["link", t({ id: "wishlist.field.link", message: "Link" })],
  ]);
  const add = (
    <LinkButton variant="primary" href="/admin/wishlist/items/new">
      <Trans id="items.add">+ Add item</Trans>
    </LinkButton>
  );
  return (
    <div className="grid gap-sq">
      <title>{t({ id: "wishlist.page.title", message: "Wishlist · Hoardr" })}</title>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <h1>
          <Trans id="wishlist.heading">Wishlist</Trans>
        </h1>
        <VisibilityBadge isPublic={isPublic ? 1 : 0} />
        <div className="sm:ml-auto">{add}</div>
      </div>
      <Visibility isPublic={isPublic} />
      {wishes.length === 0 ? (
        <EmptyState title={t({ id: "wishlist.empty", message: "Nothing on the wishlist yet" })} action={add} />
      ) : (
        <ItemTable
          mode="admin"
          status="want"
          {...view}
          itemsBase="/admin/wishlist/items"
          ranking={{ draggable: true, count: wishes.length, onMove: moveWishItemAction }}
        />
      )}
    </div>
  );
}
