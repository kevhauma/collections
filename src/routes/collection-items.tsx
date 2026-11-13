import { useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { data } from "react-router";
import type { Collection } from "../db/collections";
import type { ItemStatus } from "../db/items";
import { listQuery, reorderable, sortToggle, switchTab, type ListParams } from "../features/items/list-params";
import type { itemView } from "../features/items/view";
import { formatNumber } from "../i18n";
import { EmptyState } from "../ui/empty-state";
import { TabLinks } from "../ui/tab-links";
import { tabUrl } from "./item-paths";
import { ItemToolbar } from "./item-toolbar";
import { ItemGrid, ItemTable, type ItemViewProps } from "./item-views";

// One tab of a collection's items, shared by the admin list (TICKET-ITM-05) and the public pages (TICKET-PUB-02):
// have/want tabs with counts, the toolbar, and the table or grid. Server components only, so a public page using it
// stays free of client code (ranking, the admin's drag-and-drop, is only passed in admin mode).

// The `tab` URL segment: none for have, "want" for want, anything else is the not-found page.
export const statusOf = (tab: string | undefined): ItemStatus => {
  if (tab === undefined || tab === "want") return tab ?? "have";
  throw data(null, { status: 404 });
};

type CollectionItemsProps = {
  mode: ItemViewProps["mode"];
  collection: Pick<Collection, "slug" | "defaultView" | "titleFieldId">;
  status: ItemStatus;
  view: ReturnType<typeof itemView>;
  counts: Record<ItemStatus, number>;
  // The have tab's URL; the want tab is the same plus /want.
  base: string;
  // The admin's "+ Add item": beside the tabs, and in an empty tab.
  addAction?: ReactNode;
  ranking?: Omit<NonNullable<ItemViewProps["ranking"]>, "draggable">;
  emptyTitle: string;
};

const views = { table: ItemTable, grid: ItemGrid };

// Rank inputs (and drag handles) when the admin passed ranking and the list can be reordered as shown.
const rankingOf = (list: ListParams, status: ItemStatus, ranking: CollectionItemsProps["ranking"]) => {
  const reorder = ranking && reorderable(list, status);
  return reorder && { ...reorder, ...ranking };
};

type ResultsProps = ItemViewProps & {
  view: ListParams["view"];
  total: number;
  emptyTitle: string;
  addAction?: ReactNode;
  resetHref: string;
};

// The items, or why there are none: an empty tab, or a search that matched nothing.
const Results = ({ view, total, emptyTitle, addAction, resetHref, ...props }: ResultsProps) => {
  const { t } = useLingui();
  const View = views[view];
  if (total === 0) return <EmptyState title={emptyTitle} action={addAction} />;
  return props.items.length > 0 ? (
    <View {...props} />
  ) : (
    <EmptyState
      title={t({ id: "items.empty.noMatch", message: "No items match your search" })}
      action={<a href={resetHref}>{t({ id: "items.filter.reset", message: "Reset" })}</a>}
    />
  );
};

export const CollectionItems = ({ collection, status, view, counts, base, addAction, ranking, ...props }: CollectionItemsProps) => {
  const { t } = useLingui();
  const { fields, context, list, items } = view;
  // A link to this tab with `next` params, or to the other tab carrying search, filters and view.
  const hrefFor = (next: ListParams) => tabUrl(base, status) + listQuery(next, context);
  const tabHref = (target: ItemStatus) => {
    const targetContext = { ...context, status: target };
    return tabUrl(base, target) + listQuery(switchTab(list, context, targetContext), targetContext);
  };
  const haveCount = formatNumber(counts.have);
  const wantCount = formatNumber(counts.want);
  const tabs = [
    { status: "have", label: t({ id: "items.tab.haveCount", message: `Have · ${haveCount}` }) },
    { status: "want", label: t({ id: "items.tab.wantCount", message: `Want · ${wantCount}` }) },
  ] as const;
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <TabLinks
          label={t({ id: "items.tabs.label", message: "Have and want" })}
          tabs={tabs.map((tab) => ({ href: tabHref(tab.status), label: tab.label, current: tab.status === status }))}
        />
        {addAction && <div className="ml-auto">{addAction}</div>}
      </div>
      {counts[status] > 0 && (
        <ItemToolbar
          params={list}
          fields={fields}
          status={status}
          resetHref={tabUrl(base, status)}
          viewHref={(next) => hrefFor({ ...list, view: next })}
        />
      )}
      <Results
        {...props}
        slug={collection.slug}
        status={status}
        items={items}
        fields={fields}
        titleFieldId={collection.titleFieldId}
        sortLink={(sort) => {
          const { next, direction } = sortToggle(list, sort);
          return { href: hrefFor(next), direction };
        }}
        ranking={rankingOf(list, status, ranking)}
        view={list.view}
        total={counts[status]}
        addAction={addAction}
        resetHref={tabUrl(base, status)}
      />
    </>
  );
};
