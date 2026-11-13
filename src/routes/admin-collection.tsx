import { Trans, useLingui } from "@lingui/react/macro";
import type { LoaderFunctionArgs, Params } from "react-router";
import { requireAdmin } from "../features/auth/guard";
import { requireCollection } from "../features/collections/require-collection";
import { LinkButton } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { VisibilityBadge } from "./visibility-badge";

// /admin/c/:slug. shortcut: only the heading and links until TICKET-ITM-02 / ITM-05 add the item list and views.

export const loader = ({ params }: LoaderFunctionArgs) => {
  requireAdmin();
  requireCollection(params.slug);
  return null;
};

export default function AdminCollection({ params }: { params: Params }) {
  const { t } = useLingui();
  const collection = requireCollection(params.slug);
  const name = collection.name;
  return (
    <div className="grid gap-6">
      <title>{t({ id: "collections.page.title", message: `${name} · Collections` })}</title>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <h1>{name}</h1>
        <VisibilityBadge isPublic={collection.isPublic} />
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <LinkButton href={`/admin/c/${collection.slug}/fields`} size="sm">
            <Trans id="collections.link.fields">Fields</Trans>
          </LinkButton>
          <LinkButton href={`/admin/c/${collection.slug}/settings`} size="sm">
            <Trans id="collections.link.settings">Settings</Trans>
          </LinkButton>
        </div>
      </div>
      <EmptyState title={t({ id: "collections.page.empty", message: "No items yet" })} />
    </div>
  );
}
