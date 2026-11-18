import { Trans, useLingui } from "@lingui/react/macro";
import { listPublic } from "../db/collections";
import { firstWishlist, listWishlist, type WishItem } from "../db/wishlist";
import { formatNumber } from "../i18n";
import { LinkButton } from "../ui/button";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import { CollectionPicture } from "./collection-picture";

// / (TICKET-PUB-01): the collections the owner has made public, below the wishlist when that's public too
// (TICKET-WSH-05). A server component with no client code; private collections and a private wishlist aren't read at
// all, so nothing here hints that they exist.

// Full width above the collection cards, so it's the first thing a visitor sees.
const WishlistCard = ({ wishes }: { wishes: WishItem[] }) => {
  const { t } = useLingui();
  const title = t({ id: "wishlist.heading", message: "Wishlist" });
  const count = formatNumber(wishes.length);
  return (
    <Card heading={title}>
      <div className="flex items-start gap-4">
        <CollectionPicture image={wishes.find((wish) => wish.image)?.image ?? null} name={title} size="card" />
        <LinkButton href="/wishlist" variant="primary">
          {t({ id: "home.wishlist.count", message: `Wishlist · ${count}` })}
        </LinkButton>
      </div>
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

type Shared = { collections: ReturnType<typeof listPublic>; wishes?: WishItem[] };

// The wishlist card, then the collection cards; "Nothing shared yet" only when neither is public.
const SharedCards = ({ collections, wishes }: Shared) => {
  const { t } = useLingui();
  if (!wishes && collections.length === 0) return <EmptyState title={t({ id: "home.empty", message: "Nothing shared yet" })} />;
  return (
    <>
      {wishes && <WishlistCard wishes={wishes} />}
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
      <SharedCards collections={listPublic()} wishes={firstWishlist().isPublic === 1 ? listWishlist(firstWishlist().id) : undefined} />
    </div>
  );
}
