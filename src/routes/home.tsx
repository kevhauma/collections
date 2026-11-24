import { Trans, useLingui } from "@lingui/react/macro";
import { listPublic, listPublicPreviews, type Preview } from "../db/collections";
import { listPublicWishlists } from "../db/wishlist";
import { thumbUrl } from "../features/images/shared";
import { postItLook } from "../features/items/post-it-look";
import { formatNumber } from "../i18n";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import { PostIt } from "../ui/post-it";
import { PictureShelf } from "../ui/picture-shelf";
import { CollectionPicture } from "./collection-picture";

// / (TICKET-PUB-01): the collections the owner has made public, below the public wishlists (TICKET-WSH-05, one card
// each since TICKET-WSH-10). A server component with no client code; private collections and wishlists aren't read at
// all, so nothing here hints that they exist.

type Wishlists = ReturnType<typeof listPublicWishlists>;

// Just the cover image and name, so the wishlists stay secondary to the collections below them.
const WishlistCard = ({ wishlist }: { wishlist: Wishlists[number] }) => (
  <a href={`/wishlist/${wishlist.slug}`} className="flex items-center gap-4">
    <CollectionPicture image={wishlist.image} name={wishlist.name} size="reminder" />
    <span className="min-w-0 truncate font-medium">{wishlist.name}</span>
  </a>
);

// A pictured item on a collection's shelf: a small post-it, coloured and turned like its own on the list pages.
const Thumb = ({ preview }: { preview: Preview }) => {
  const { color, tilt } = postItLook(preview.id);
  return (
    <PostIt color={color} tilt={tilt} fastening="none" className="size-11 p-[3px]">
      <img src={thumbUrl(preview.image)} alt={preview.title ?? ""} width={300} height={300} loading="lazy" className="size-full object-cover" />
    </PostIt>
  );
};

const CollectionCard = ({ collection, previews }: { collection: Shared["collections"][number]; previews: Preview[] }) => {
  const { t } = useLingui();
  const shelves = [
    { href: `/${collection.slug}`, label: t({ id: "items.tab.have", message: "Have" }), count: collection.haveCount, status: "have" },
    { href: `/${collection.slug}/want`, label: t({ id: "items.tab.want", message: "Want" }), count: collection.wantCount, status: "want" },
  ]
    .filter((shelf) => shelf.count > 0)
    .map((shelf) => ({ ...shelf, items: previews.filter((preview) => preview.status === shelf.status).slice(0, 5) }));
  return (
    <Card heading={collection.name} className="h-full">
      <div className="flex items-start gap-4">
        <CollectionPicture image={collection.image} name={collection.name} size="card" />
        {/* Named after the collection so the repeated link texts stay distinguishable. */}
        <nav aria-label={collection.name} className="grid min-w-0 flex-1">
          {shelves.map(({ href, label, count, items }) => {
            const more = formatNumber(count - items.length);
            return (
              <PictureShelf key={href} href={href} label={label} more={count > items.length && `+${more}`}>
                {items.map((preview) => (
                  <Thumb key={preview.id} preview={preview} />
                ))}
              </PictureShelf>
            );
          })}
        </nav>
      </div>
    </Card>
  );
};

type Shared = { collections: ReturnType<typeof listPublic>; wishlists: Wishlists; previews: Preview[] };

// The wishlist cards, then the collection cards; "Nothing shared yet" only when nothing is public.
const SharedCards = ({ collections, wishlists, previews }: Shared) => {
  const { t } = useLingui();
  if (wishlists.length + collections.length === 0) return <EmptyState title={t({ id: "home.empty", message: "Nothing shared yet" })} />;
  return (
    <>
      <ul className="grid gap-4 empty:hidden sm:grid-cols-2">
        {wishlists.map((wishlist) => (
          <li key={wishlist.id}>
            <WishlistCard wishlist={wishlist} />
          </li>
        ))}
      </ul>
      <ul className="grid gap-x-8 gap-y-10 empty:hidden sm:grid-cols-2">
        {collections.map((collection) => (
          <li key={collection.id}>
            <CollectionCard collection={collection} previews={previews.filter((preview) => preview.collectionId === collection.id)} />
          </li>
        ))}
      </ul>
    </>
  );
};

export default function Home() {
  const { t } = useLingui();
  return (
    <div className="grid gap-8">
      <title>{t({ id: "app.name", message: "Hoardr" })}</title>
      <meta
        name="description"
        content={t({ id: "home.description", message: "Shared collections: what the owner has, and what they want." })}
      />
      <h1>
        <Trans id="home.heading">Shared collections</Trans>
      </h1>
      <SharedCards collections={listPublic()} wishlists={listPublicWishlists()} previews={listPublicPreviews(5)} />
    </div>
  );
}
