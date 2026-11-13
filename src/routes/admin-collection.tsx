import { Trans, useLingui } from "@lingui/react/macro";
import { data, type LoaderFunctionArgs, type Params } from "react-router";
import { requestContext } from "../context";
import type { Collection } from "../db/collections";
import { listFields } from "../db/fields";
import { countItems, listItems, type ItemStatus } from "../db/items";
import { requireAdmin } from "../features/auth/guard";
import { requireCollection } from "../features/collections/require-collection";
import {
  listQuery,
  parseListParams,
  sortToggle,
  switchTab,
  type ListContext,
  type ListParams,
} from "../features/items/list-params";
import { formatNumber } from "../i18n";
import { LinkButton } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { TabLinks } from "../ui/tab-links";
import { listHref } from "./item-paths";
import { ItemToolbar } from "./item-toolbar";
import { ItemGrid, ItemTable, type ItemViewProps } from "./item-views";
import { VisibilityBadge } from "./visibility-badge";

// /admin/c/:slug (have) and /admin/c/:slug/want (TICKET-ITM-05): the items as a table or grid, with search, sort and
// filters in the query string.

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

const contextOf = (collection: Collection, status: ItemStatus): ListContext => ({
  status,
  defaultView: collection.defaultView,
  titleFieldId: collection.titleFieldId,
});

const views = { table: ItemTable, grid: ItemGrid };

type ResultsProps = ItemViewProps & { view: ListParams["view"]; total: number; addHref: string; resetHref: string };

// The items, or why there are none: an empty tab, or a search that matched nothing.
const Results = ({ view, total, addHref, resetHref, ...props }: ResultsProps) => {
  const { t } = useLingui();
  const View = views[view];
  if (total === 0) {
    return (
      <EmptyState
        title={t({ id: "collections.page.empty", message: "No items yet" })}
        action={
          <LinkButton variant="primary" href={addHref}>
            <Trans id="items.add">+ Add item</Trans>
          </LinkButton>
        }
      />
    );
  }
  return props.items.length > 0 ? (
    <View {...props} />
  ) : (
    <EmptyState
      title={t({ id: "items.empty.noMatch", message: "No items match your search" })}
      action={<a href={resetHref}>{t({ id: "items.filter.reset", message: "Reset" })}</a>}
    />
  );
};

export default function AdminCollection({ params }: { params: Params }) {
  const { t } = useLingui();
  const collection = requireCollection(params.slug);
  const status = statusOf(params.tab);
  const fields = listFields(collection.id);
  const context = contextOf(collection, status);
  const list = parseListParams(new URL(requestContext().request.url).searchParams, fields, context);
  const items = listItems({ collectionId: collection.id, status, ...list });
  const counts = countItems(collection.id);
  const slug = collection.slug;
  const name = collection.name;
  // A link to this tab with `next` params, or to the other tab carrying search, filters and view.
  const hrefFor = (next: ListParams) => listHref(slug, status) + listQuery(next, context);
  const tabHref = (target: ItemStatus) => {
    const targetContext = contextOf(collection, target);
    return listHref(slug, target) + listQuery(switchTab(list, context, targetContext), targetContext);
  };
  const haveCount = formatNumber(counts.have);
  const wantCount = formatNumber(counts.want);
  const tabs = [
    { status: "have", label: t({ id: "items.tab.haveCount", message: `Have · ${haveCount}` }) },
    { status: "want", label: t({ id: "items.tab.wantCount", message: `Want · ${wantCount}` }) },
  ] as const;
  const addHref = `/admin/c/${slug}/items/new?status=${status}`;
  return (
    <div className="grid gap-6">
      <title>{t({ id: "collections.page.title", message: `${name} · Collections` })}</title>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <h1>{name}</h1>
        <VisibilityBadge isPublic={collection.isPublic} />
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <LinkButton href={`/admin/c/${slug}/fields`} size="sm">
            <Trans id="collections.link.fields">Fields</Trans>
          </LinkButton>
          <LinkButton href={`/admin/c/${slug}/settings`} size="sm">
            <Trans id="collections.link.settings">Settings</Trans>
          </LinkButton>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <TabLinks
          label={t({ id: "items.tabs.label", message: "Have and want" })}
          tabs={tabs.map((tab) => ({ href: tabHref(tab.status), label: tab.label, current: tab.status === status }))}
        />
        <LinkButton variant="primary" className="ml-auto" href={addHref}>
          <Trans id="items.add">+ Add item</Trans>
        </LinkButton>
      </div>
      {counts[status] > 0 && (
        <ItemToolbar
          params={list}
          fields={fields}
          status={status}
          resetHref={listHref(slug, status)}
          viewHref={(view) => hrefFor({ ...list, view })}
        />
      )}
      <Results
        mode="admin"
        slug={slug}
        status={status}
        items={items}
        fields={fields}
        titleFieldId={collection.titleFieldId}
        sortLink={(sort) => {
          const { next, direction } = sortToggle(list, sort);
          return { href: hrefFor(next), direction };
        }}
        view={list.view}
        total={counts[status]}
        addHref={addHref}
        resetHref={listHref(slug, status)}
      />
    </div>
  );
}
