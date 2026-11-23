import { useLingui } from "@lingui/react/macro";
import { data, type LoaderFunctionArgs, type Params } from "react-router";
import type { Field } from "../db/fields";
import { getPublicWishlist, listWishlist, type WishItem, type Wishlist } from "../db/wishlist";
import { wishlistSuggestions, type CollectionSuggestions } from "../features/wishlist/suggestions";
import { wishView } from "../features/wishlist/view";
import { EmptyState } from "../ui/empty-state";
import { CollectionPicture } from "./collection-picture";
import { ItemGrid } from "./item-views";
import { LinkPreview } from "./public-collection";

// /wishlist/:slug (TICKET-WSH-04, one page per wishlist since TICKET-WSH-10): a wishlist for visitors, laid out like
// a collection's public want list (the same post-it grid with the rank on each post-it). Server components only,
// under the public layout, so the page ships no JS. A private or unknown wishlist answers the same 404 as a private
// collection. When the wishlist has them on (TICKET-WSH-06), the collections' in-budget wants sit below the items,
// a few per collection with a "show more" that reveals the rest.

const requirePublicWishlist = (slug: string | undefined): Wishlist => {
  const wishlist = slug === undefined ? undefined : getPublicWishlist(slug);
  if (!wishlist) throw data(null, { status: 404 });
  return wishlist;
};

export const loader = ({ params }: LoaderFunctionArgs) => {
  requirePublicWishlist(params.slug);
  return null;
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
        featuredFieldId={view.priceFieldId}
        itemsBase={`/admin/w/${slug}/items`}
      />
    )
  );
};

// The price field first among the shown fields, so the card features it like the wishlist's own items do.
const cardFields = (group: CollectionSuggestions): Field[] => {
  const title = group.fields.find((field) => field.id === group.titleFieldId)!;
  const price = group.fields.find((field) => field.id === group.priceFieldId);
  const rest = group.fields.filter((field) => field.id !== group.titleFieldId && field.id !== group.priceFieldId);
  return [title, ...(price ? [price] : []), ...rest];
};

// One collection's in-budget wants, replacing its old reminder card (TICKET-WSH-06): its name links to the full want
// list, the wants laid out like the wishlist's own items. Their collection rank would be meaningless here, so it's
// cleared off the post-its.
const CollectionWants = ({ group }: { group: CollectionSuggestions }) => (
  <section className="grid gap-sq" aria-label={group.name}>
    <h3>
      <a href={`/${group.slug}/want`}>{group.name}</a>
    </h3>
    <ItemGrid
      mode="public"
      status="want"
      fields={cardFields(group)}
      items={group.items.map((item) => ({ ...item, rank: null }))}
      titleFieldId={group.titleFieldId}
      titleLinkFieldId={group.titleLinkFieldId ?? undefined}
      featuredFieldId={group.priceFieldId ?? undefined}
      itemImage={group.itemImage}
      idScope={`-${group.slug}`}
      itemsBase={`/${group.slug}`}
    />
  </section>
);

export default function PublicWishlist({ params }: { params: Params }) {
  const { t } = useLingui();
  const wishlist = requirePublicWishlist(params.slug);
  const wishes = listWishlist(wishlist.id);
  const groups = wishlist.showReminders ? wishlistSuggestions(wishlist.minPrice, wishlist.maxPrice) : [];
  const title = wishlist.name;
  return (
    <div className="grid gap-sq-2">
      <title>{title}</title>
      <LinkPreview title={title} image={wishlist.image ?? undefined} />
      <div className="flex items-center gap-4">
        <CollectionPicture image={wishlist.image} name={title} size="card" />
        <h1>{title}</h1>
      </div>
      <Wishes wishes={wishes} slug={wishlist.slug} />
      {groups.length > 0 && (
        <section className="grid gap-sq-2">
          {groups.map((group) => (
            <CollectionWants key={group.slug} group={group} />
          ))}
        </section>
      )}
      {wishes.length === 0 && groups.length === 0 && (
        <EmptyState title={t({ id: "wishlist.empty", message: "Nothing on the wishlist yet" })} />
      )}
    </div>
  );
}
