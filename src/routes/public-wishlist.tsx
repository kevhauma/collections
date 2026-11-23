import { useLingui } from "@lingui/react/macro";
import { data, type LoaderFunctionArgs, type Params } from "react-router";
import { getPublicWishlist, listWishlist, type WishItem, type Wishlist } from "../db/wishlist";
import { wishlistSuggestions, type CollectionSuggestions, type SuggestionItem } from "../features/wishlist/suggestions";
import { wishView } from "../features/wishlist/view";
import { thumbUrl } from "../features/images/shared";
import { LinkButton } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { PostIt } from "../ui/post-it";
import { CollectionPicture } from "./collection-picture";
import { ItemGrid } from "./item-views";
import { LinkPreview } from "./public-collection";

// /wishlist/:slug (TICKET-WSH-04, one page per wishlist since TICKET-WSH-10): a wishlist for visitors, laid out like
// a collection's public want list (the same post-it grid with the rank on each post-it). Server components only,
// under the public layout, so the page ships no JS. A private or unknown wishlist answers the same 404 as a private
// collection. When the wishlist has them on (TICKET-WSH-06), the collections' in-budget wants sit below the items,
// a few per collection with a link to the rest.

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

// How many of each collection's in-budget wants show before the "show more" link to its full want list.
const perCollectionLimit = 10;

// Small tiles, five across on a wide screen: each want's picture and name.
const SuggestionTiles = ({ items }: { items: SuggestionItem[] }) => (
  <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5">
    {items.map((item, index) => (
      <li key={`${item.name}-${index}`} className="grid justify-items-center gap-1 text-center">
        <PostIt size="sm" tilt={index % 2 === 0 ? "right" : "left"} fastening="paperclip">
          {item.image && <img src={thumbUrl(item.image)} alt="" className="size-full object-cover" />}
        </PostIt>
        <span className="text-sm">{item.name}</span>
      </li>
    ))}
  </ul>
);

// One collection's in-budget wants, replacing its old reminder card (TICKET-WSH-06): its name links to the full want
// list, with a "show more" link too when more wants fit the budget than are shown.
const CollectionWants = ({ group }: { group: CollectionSuggestions }) => {
  const { t } = useLingui();
  const wantList = `/${group.slug}/want`;
  return (
    <section className="grid gap-sq" aria-label={group.name}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3>
          <a href={wantList}>{group.name}</a>
        </h3>
        {group.more && (
          <LinkButton href={wantList} size="sm" variant="ghost">
            {t({ id: "wishlist.collection.more", message: "Show more" })}
          </LinkButton>
        )}
      </div>
      <SuggestionTiles items={group.items} />
    </section>
  );
};

export default function PublicWishlist({ params }: { params: Params }) {
  const { t } = useLingui();
  const wishlist = requirePublicWishlist(params.slug);
  const wishes = listWishlist(wishlist.id);
  const groups = wishlist.showReminders ? wishlistSuggestions(wishlist.minPrice, wishlist.maxPrice, perCollectionLimit) : [];
  const title = wishlist.name;
  return (
    <div className="grid gap-sq-2">
      <title>{title}</title>
      <LinkPreview title={title} image={wishlist.image ?? undefined} />
      <h1>{title}</h1>
      <CollectionPicture image={wishlist.image} name={title} size="page" />
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
