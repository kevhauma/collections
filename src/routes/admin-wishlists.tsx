import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { listWishlists } from "../db/wishlist";
import { requireAdmin } from "../features/auth/guard";
import { LinkButton } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { AdminListCard } from "./admin-parts";

// /admin/wishlists (TICKET-WSH-09): every wishlist by name, read like the admin collection list.

export const loader = () => {
  requireAdmin();
  return null;
};

const newHref = "/admin/wishlists/new";

export default function AdminWishlists() {
  const { t } = useLingui();
  const wishlists = listWishlists();
  return (
    <div className="grid gap-8">
      <title>{t({ id: "wishlists.page.title", message: "Wishlists · Hoardr" })}</title>
      <div className="flex flex-wrap items-end gap-4">
        <h1>
          <Trans id="admin.nav.wishlists">Wishlists</Trans>
        </h1>
        {wishlists.length > 0 && (
          <LinkButton href={newHref} variant="primary" className="sm:ml-auto">
            <Trans id="wishlists.new.action">+ New wishlist</Trans>
          </LinkButton>
        )}
      </div>
      {wishlists.length === 0 ? (
        <EmptyState
          title={t({ id: "wishlists.empty.title", message: "No wishlists yet" })}
          action={
            <LinkButton href={newHref} variant="primary">
              <Trans id="wishlists.new.action">+ New wishlist</Trans>
            </LinkButton>
          }
        />
      ) : (
        <ul className="grid items-start gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((wishlist) => {
            const base = `/admin/w/${wishlist.slug}`;
            const count = wishlist.itemCount;
            return (
              <li key={wishlist.id}>
                <AdminListCard
                  name={wishlist.name}
                  image={wishlist.image}
                  isPublic={wishlist.isPublic}
                  count={<Plural id="wishlists.count" value={count} one="# wish" other="# wishes" />}
                >
                  <LinkButton href={base} size="sm">
                    <Trans id="collections.link.items">Items</Trans>
                  </LinkButton>
                  <LinkButton href={`${base}/settings`} size="sm" variant="ghost">
                    <Trans id="collections.link.settings">Settings</Trans>
                  </LinkButton>
                </AdminListCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
