import { Trans, useLingui } from "@lingui/react/macro";
import { listPublic } from "../db/collections";
import { formatNumber } from "../i18n";
import { LinkButton } from "../ui/button";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import { CollectionPicture } from "./collection-picture";

// / (TICKET-PUB-01): the collections the owner has made public. A server component with no client code; private
// collections aren't read at all, so nothing here hints that they exist.
export default function Home() {
  const { t } = useLingui();
  const collections = listPublic();
  return (
    <div className="grid gap-8">
      <title>{t({ id: "app.name", message: "Collections" })}</title>
      <meta
        name="description"
        content={t({ id: "home.description", message: "Shared collections: what the owner has, and what they want." })}
      />
      <h1>
        <Trans id="home.heading">Shared collections</Trans>
      </h1>
      {collections.length === 0 ? (
        <EmptyState title={t({ id: "home.empty", message: "Nothing shared yet" })} />
      ) : (
        <ul className="grid items-start gap-x-8 gap-y-10 sm:grid-cols-2">
          {collections.map((collection) => {
            const haveCount = formatNumber(collection.haveCount);
            const wantCount = formatNumber(collection.wantCount);
            return (
              <li key={collection.id}>
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
