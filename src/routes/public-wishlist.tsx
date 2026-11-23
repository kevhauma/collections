import { useLingui } from "@lingui/react/macro";
import { data, type LoaderFunctionArgs, type Params } from "react-router";
import type { Item } from "../db/items";
import { getPublicWishlist, listWishlist, type WishItem, type Wishlist } from "../db/wishlist";
import { wishlistSuggestions, type CollectionSuggestions } from "../features/wishlist/suggestions";
import { wishView } from "../features/wishlist/view";
import { EmptyState } from "../ui/empty-state";
import { CollectionPicture } from "./collection-picture";
import { ItemGrid, Thumbnail } from "./item-views";
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
        itemsBase={`/admin/w/${slug}/items`}
      />
    )
  );
};

// How many of each collection's in-budget wants show before the "show more" reveal.
const previewCount = 10;

const titleOf = (item: Item, titleFieldId: number) => String(item.values[titleFieldId] ?? "");

// Small tiles, five across on a wide screen: each want's picture (enlarging to its public fields, TICKET-UI-10) and
// name. `idScope` is the collection slug so dialog ids stay unique across collections on the page.
const SuggestionTiles = ({ group, items }: { group: CollectionSuggestions; items: Item[] }) => (
  <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5">
    {items.map((item) => {
      const title = titleOf(item, group.titleFieldId);
      return (
        <li key={item.id} className="grid justify-items-center gap-1 text-center">
          <Thumbnail
            item={item}
            alt={title}
            fields={group.fields}
            titleFieldId={group.titleFieldId}
            fallback={group.itemImage}
            idScope={`-${group.slug}`}
            size="sm"
          />
          <span className="text-sm">{title}</span>
        </li>
      );
    })}
  </ul>
);

// One collection's in-budget wants, replacing its old reminder card (TICKET-WSH-06): its name links to the full want
// list, and "show more" reveals the wants past the first few in place.
const CollectionWants = ({ group }: { group: CollectionSuggestions }) => {
  const { t } = useLingui();
  const rest = group.items.slice(previewCount);
  return (
    <section className="grid gap-sq" aria-label={group.name}>
      <h3>
        <a href={`/${group.slug}/want`}>{group.name}</a>
      </h3>
      <SuggestionTiles group={group} items={group.items.slice(0, previewCount)} />
      {rest.length > 0 && (
        <details className="grid gap-sq">
          <summary className="cursor-pointer">{t({ id: "wishlist.collection.more", message: "Show more" })}</summary>
          <SuggestionTiles group={group} items={rest} />
        </details>
      )}
    </section>
  );
};

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
          <h2>{t({ id: "wishlist.reminders.heading", message: "More wants in my collections" })}</h2>
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
