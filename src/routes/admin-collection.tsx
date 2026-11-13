import { Trans, useLingui } from "@lingui/react/macro";
import { data, type LoaderFunctionArgs, type Params } from "react-router";
import { listItems, type ItemStatus } from "../db/items";
import { requireAdmin } from "../features/auth/guard";
import { requireCollection } from "../features/collections/require-collection";
import { LinkButton } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { TabLinks } from "../ui/tab-links";
import { listHref } from "./item-paths";
import { VisibilityBadge } from "./visibility-badge";

// /admin/c/:slug (have) and /admin/c/:slug/want. shortcut: a bare list of titles linking to the item form, until
// TICKET-ITM-05 adds the table and grid views, search, sort and filter.

const statusOf = (tab: string | undefined): ItemStatus => {
  if (tab === undefined || tab === "want") return tab ?? "have";
  throw data(null, { status: 404 });
};

export const loader = ({ params }: LoaderFunctionArgs) => {
  requireAdmin();
  requireCollection(params.slug);
  statusOf(params.tab);
  return null;
};

export default function AdminCollection({ params }: { params: Params }) {
  const { t } = useLingui();
  const collection = requireCollection(params.slug);
  const status = statusOf(params.tab);
  const items = listItems(collection.id, status);
  const name = collection.name;
  const itemHref = (id: number | "new") => `/admin/c/${collection.slug}/items/${id}`;
  const tabs = [
    { status: "have", label: t({ id: "items.tab.have", message: "Have" }) },
    { status: "want", label: t({ id: "items.tab.want", message: "Want" }) },
  ] as const;
  const List = status === "want" ? "ol" : "ul";
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
      <div className="flex flex-wrap items-center gap-3">
        <TabLinks
          label={t({ id: "items.tabs.label", message: "Have and want" })}
          tabs={tabs.map((tab) => ({ ...tab, href: listHref(collection.slug, tab.status), current: tab.status === status }))}
        />
        <LinkButton variant="primary" className="ml-auto" href={`${itemHref("new")}?status=${status}`}>
          <Trans id="items.add">+ Add item</Trans>
        </LinkButton>
      </div>
      {items.length > 0 ? (
        <List className={status === "want" ? "grid list-decimal gap-2 pl-8" : "grid gap-2"}>
          {items.map((item) => (
            <li key={item.id} id={`item-${item.id}`} className="scroll-mt-6">
              <a href={itemHref(item.id)}>{String(item.title ?? "")}</a>
            </li>
          ))}
        </List>
      ) : (
        <EmptyState title={t({ id: "collections.page.empty", message: "No items yet" })} />
      )}
    </div>
  );
}
