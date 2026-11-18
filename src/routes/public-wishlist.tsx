import { useLingui } from "@lingui/react/macro";
import { data, type LoaderFunctionArgs, type Params } from "react-router";
import { listWishlistReminders } from "../db/collections";
import { getPublicWishlist, listWishlist, type WishItem, type Wishlist } from "../db/wishlist";
import { formatNumber } from "../i18n";
import { wishView } from "../features/wishlist/view";
import { LinkButton } from "../ui/button";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import { CollectionPicture } from "./collection-picture";
import { ItemGrid } from "./item-views";
import { LinkPreview } from "./public-collection";

// /wishlist/:slug (TICKET-WSH-04, one page per wishlist since TICKET-WSH-10): a wishlist for visitors, laid out like
// a collection's public want list (the same post-it grid with the rank on each post-it). Server components only,
// under the public layout, so the page ships no JS. A private or unknown wishlist answers the same 404 as a private
// collection. Reminders of the collections' want lists sit above the items when the wishlist has them on
// (TICKET-WSH-06).

const requirePublicWishlist = (slug: string | undefined): Wishlist => {
  const wishlist = slug === undefined ? undefined : getPublicWishlist(slug);
  if (!wishlist) throw data(null, { status: 404 });
  return wishlist;
};

export const loader = ({ params }: LoaderFunctionArgs) => {
  requirePublicWishlist(params.slug);
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

const Wishes = ({ wishes, slug }: { wishes: WishItem[]; slug: string }) => {
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
        itemsBase={`/admin/w/${slug}/items`}
      />
    )
  );
};

// The collection reminders, only on a wishlist that has them on.
const remindersOf = (wishlist: Wishlist): Reminder[] => (wishlist.showReminders ? listWishlistReminders() : []);

// The link preview's picture: the first wish that has one.
const previewImage = (wishes: WishItem[]) => wishes.find((wish) => wish.image)?.image ?? undefined;

export default function PublicWishlist({ params }: { params: Params }) {
  const { t } = useLingui();
  const wishlist = requirePublicWishlist(params.slug);
  const wishes = listWishlist(wishlist.id);
  const reminders = remindersOf(wishlist);
  const title = wishlist.name;
  return (
    <div className="grid gap-sq-2">
      <title>{title}</title>
      <LinkPreview title={title} image={previewImage(wishes)} />
      <h1>{title}</h1>
      <Reminders reminders={reminders} />
      <Wishes wishes={wishes} slug={wishlist.slug} />
      {wishes.length + reminders.length === 0 && (
        <EmptyState title={t({ id: "wishlist.empty", message: "Nothing on the wishlist yet" })} />
      )}
    </div>
  );
}
