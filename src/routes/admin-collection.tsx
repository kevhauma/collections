import { Trans, useLingui } from "@lingui/react/macro";
import { redirect, type LoaderFunctionArgs, type Params } from "react-router";
import { z } from "zod";
import { requestContext } from "../context";
import type { Collection } from "../db/collections";
import { countItems, moveWant, type ItemStatus } from "../db/items";
import { requireAdmin } from "../features/auth/guard";
import { collectionAction, requireCollection } from "../features/collections/require-collection";
import { listQuery } from "../features/items/list-params";
import { itemView } from "../features/items/view";
import { LinkButton } from "../ui/button";
import { CollectionItems, statusOf } from "./collection-items";
import { moveWantAction } from "./item-actions";
import { listHref } from "./item-paths";
import { CollectionPicture } from "./collection-picture";
import { VisibilityBadge } from "./visibility-badge";

// /admin/c/:slug (have) and /admin/c/:slug/want (TICKET-ITM-05): the items as a table or grid, with search, sort and
// filters in the query string, and want reordering (TICKET-ITM-03).

export const loader = ({ params }: LoaderFunctionArgs) => {
  requireAdmin();
  requireCollection(params.slug);
  statusOf(params.tab);
  return null;
};

const viewOf = (collection: Collection, status: ItemStatus) =>
  itemView(collection, status, new URL(requestContext().request.url).searchParams);

const moveInput = z.object({ intent: z.literal("move"), itemId: z.coerce.number().int(), rank: z.coerce.number().int() });

// The rank inputs post here (no JS needed). The item must be a want of this collection; back to the same list after.
export const action = collectionAction((collection, form, params) => {
  const parsed = moveInput.safeParse(form);
  const status = statusOf(params.tab);
  if (!parsed.success || !moveWant(collection.id, parsed.data.itemId, parsed.data.rank)) {
    throw new Response(null, { status: 400 });
  }
  const { context, list } = viewOf(collection, status);
  return redirect(`${listHref(collection.slug, status)}${listQuery(list, context)}#item-${parsed.data.itemId}`);
});

export default function AdminCollection({ params }: { params: Params }) {
  const { t } = useLingui();
  const collection = requireCollection(params.slug);
  const status = statusOf(params.tab);
  const counts = countItems(collection.id);
  const slug = collection.slug;
  const name = collection.name;
  const add = (
    <LinkButton variant="primary" href={`/admin/c/${slug}/items/new?status=${status}`}>
      <Trans id="items.add">+ Add item</Trans>
    </LinkButton>
  );
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
      <CollectionPicture image={collection.image} name={name} size="page" />
      <CollectionItems
        mode="admin"
        collection={collection}
        status={status}
        view={viewOf(collection, status)}
        counts={counts}
        base={`/admin/c/${slug}`}
        addAction={add}
        ranking={{ count: counts.want, onMove: moveWantAction.bind(null, slug) }}
        emptyTitle={t({ id: "collections.page.empty", message: "No items yet" })}
      />
    </div>
  );
}
