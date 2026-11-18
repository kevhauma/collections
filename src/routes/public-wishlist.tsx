import { useLingui } from "@lingui/react/macro";
import { data } from "react-router";
import { listWishlistReminders } from "../db/collections";
import { firstWishlist, listWishlist, type WishItem } from "../db/wishlist";
import { formatNumber } from "../i18n";
import { wishView } from "../features/wishlist/view";
import { LinkButton } from "../ui/button";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import { CollectionPicture } from "./collection-picture";
import { ItemGrid } from "./item-views";
import { LinkPreview } from "./public-collection";

// /wishlist (TICKET-WSH-04): the general wishlist for visitors, laid out like a collection's public want list (the
// same post-it grid with the rank on each post-it). Server components only, under the public layout, so the page
// ships no JS. A private wishlist answers the same 404 as a private collection. Reminders of the collections' want
// lists sit above the items (TICKET-WSH-06).

export const loader = () => {
  if (firstWishlist().isPublic !== 1) throw data(null, { status: 404 });
  return null;
};

type Reminder = ReturnType<typeof listWishlistReminders>[number];

// Small cards above the items, pointing to the collections' own want lists (TICKET-WSH-06) rather than listing their
// wants. Only public collections reach here, so private names stay off the page.
const Reminders = ({ reminders }: { reminders: Reminder[] }) => {
  const { t } = useLingui();
  return (
    reminders.length > 0 && (
      <section className="grid gap-sq">
        <h2>{t({ id: "wishlist.reminders.heading", message: "More wants in my collections" })}</h2>
        <ul className="grid items-start gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {reminders.map((collection) => {
            const wantCount = formatNumber(collection.wantCount);
            return (
              <li key={collection.id}>
                <Card heading={collection.name} tone="ink">
                  {/* Named after the collection so the repeated link texts stay distinguishable, as on the home page. */}
                  <nav aria-label={collection.name} className="flex items-center gap-4">
                    <CollectionPicture image={collection.image} name={collection.name} size="reminder" />
                    <LinkButton href={`/${collection.slug}/want`} size="sm">
                      {t({ id: "items.tab.wantCount", message: `Want · ${wantCount}` })}
                    </LinkButton>
                  </nav>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>
    )
  );
};

const Wishes = ({ wishes }: { wishes: WishItem[] }) => {
  const { t } = useLingui();
  const view = wishView(wishes, [
    ["title", t({ id: "wishlist.field.title", message: "Title" })],
    ["price", t({ id: "wishlist.field.price", message: "Price" })],
    ["note", t({ id: "wishlist.field.note", message: "Note" })],
  ]);
  return (
    wishes.length > 0 && (
      <ItemGrid
        mode="public"
        status="want"
        fields={view.fields}
        items={view.items}
        titleFieldId={view.titleFieldId}
        titleLinkFieldId={view.linkFieldId}
        itemsBase={`/admin/w/${firstWishlist().slug}/items`}
      />
    )
  );
};

export default function PublicWishlist() {
  const { t } = useLingui();
  const wishes = listWishlist(firstWishlist().id);
  const reminders = listWishlistReminders();
  const title = t({ id: "wishlist.heading", message: "Wishlist" });
  return (
    <div className="grid gap-sq-2">
      <title>{title}</title>
      <LinkPreview title={title} image={wishes.find((wish) => wish.image)?.image ?? undefined} />
      <h1>{title}</h1>
      <Reminders reminders={reminders} />
      <Wishes wishes={wishes} />
      {wishes.length + reminders.length === 0 && (
        <EmptyState title={t({ id: "wishlist.empty", message: "Nothing on the wishlist yet" })} />
      )}
    </div>
  );
}
