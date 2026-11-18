import { Trans, useLingui } from "@lingui/react/macro";
import { listPublic } from "../db/collections";
import { listPublicWishlists } from "../db/wishlist";
import { formatNumber } from "../i18n";
import { LinkButton } from "../ui/button";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import { CollectionPicture } from "./collection-picture";

// / (TICKET-PUB-01): the collections the owner has made public, below the public wishlists (TICKET-WSH-05, one card
// each since TICKET-WSH-10). A server component with no client code; private collections and wishlists aren't read at
// all, so nothing here hints that they exist.

type Wishlists = ReturnType<typeof listPublicWishlists>;

// Full width above the collection cards, so they're the first thing a visitor sees.
const WishlistCard = ({ wishlist }: { wishlist: Wishlists[number] }) => {
  const { t } = useLingui();
  const count = formatNumber(wishlist.itemCount);
  return (
    <Card heading={wishlist.name}>
      {/* Named after the wishlist so the repeated link texts stay distinguishable. */}
      <nav aria-label={wishlist.name} className="flex items-start gap-4">
        <CollectionPicture image={wishlist.image} name={wishlist.name} size="card" />
        <LinkButton href={`/wishlist/${wishlist.slug}`} variant="primary">
          {t({ id: "home.wishlist.count", message: `Wishlist · ${count}` })}
        </LinkButton>
      </nav>
    </Card>
  );
};

const CollectionCard = ({ collection }: { collection: Shared["collections"][number] }) => {
  const { t } = useLingui();
  const haveCount = formatNumber(collection.haveCount);
  const wantCount = formatNumber(collection.wantCount);
  return (
    <Card heading={collection.name}>
      <div className="flex items-start gap-4">
        <CollectionPicture image={collection.image} name={collection.name} size="card" />
        {/* Named after the collection so the repeated link texts stay distinguishable. */}
        <nav aria-label={collection.name} className="flex min-w-0 flex-1 flex-wrap gap-2">
          <LinkButton href={`/${collection.slug}`} size="sm">
            {t({ id: "items.tab.haveCount", message: `Have · ${haveCount}` })}
          </LinkButton>
          <LinkButton href={`/${collection.slug}/want`} size="sm">
            {t({ id: "items.tab.wantCount", message: `Want · ${wantCount}` })}
          </LinkButton>
        </nav>
      </div>
    </Card>
  );
};

type Shared = { collections: ReturnType<typeof listPublic>; wishlists: Wishlists };

// The wishlist cards, then the collection cards; "Nothing shared yet" only when nothing is public.
const SharedCards = ({ collections, wishlists }: Shared) => {
  const { t } = useLingui();
  if (wishlists.length + collections.length === 0) return <EmptyState title={t({ id: "home.empty", message: "Nothing shared yet" })} />;
  return (
    <>
      <ul className="grid gap-8 empty:hidden">
        {wishlists.map((wishlist) => (
          <li key={wishlist.id}>
            <WishlistCard wishlist={wishlist} />
          </li>
        ))}
      </ul>
      <ul className="grid items-start gap-x-8 gap-y-10 empty:hidden sm:grid-cols-2">
        {collections.map((collection) => (
          <li key={collection.id}>
            <CollectionCard collection={collection} />
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
      <SharedCards collections={listPublic()} wishlists={listPublicWishlists()} />
    </div>
  );
}
