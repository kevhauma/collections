import { useLingui } from "@lingui/react/macro";
import type { LoaderFunctionArgs, Params } from "react-router";
import { requestContext } from "../context";
import { countItems, firstImage, type ItemStatus } from "../db/items";
import { requirePublicCollection } from "../features/collections/require-collection";
import { imageUrl } from "../features/images/shared";
import { itemView } from "../features/items/view";
import { CollectionItems, statusOf } from "./collection-items";
import { CollectionPicture } from "./collection-picture";

// /:slug (have) and /:slug/want (TICKET-PUB-02): a public collection, read-only. Only public fields reach the view
// (itemView with publicOnly), so private values are in neither the HTML nor the RSC payload. Server components only,
// under the public layout, so the page ships no JS.

export const loader = ({ params }: LoaderFunctionArgs) => {
  requirePublicCollection(params.slug);
  statusOf(params.tab);
  return null;
};

// Link previews in chat apps: the page title and, when there is one, the collection's picture or else the tab's first
// image (absolute).
const LinkPreview = ({ title, image }: { title: string; image?: string }) => (
  <>
    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    {image && <meta property="og:image" content={new URL(imageUrl(image), requestContext().request.url).href} />}
  </>
);

export default function PublicCollection({ params }: { params: Params }) {
  const { t } = useLingui();
  const collection = requirePublicCollection(params.slug);
  const status: ItemStatus = statusOf(params.tab);
  const name = collection.name;
  const titles = {
    have: t({ id: "public.title.have", message: `${name} · Have list` }),
    want: t({ id: "public.title.want", message: `${name} · Want list` }),
  };
  const empty = {
    have: t({ id: "public.empty.have", message: "Nothing on the have list yet" }),
    want: t({ id: "public.empty.want", message: "Nothing on the want list yet" }),
  };
  const search = new URL(requestContext().request.url).searchParams;
  return (
    <div className="grid gap-6">
      <title>{titles[status]}</title>
      <LinkPreview title={titles[status]} image={collection.image ?? firstImage(collection.id, status)} />
      <h1>{name}</h1>
      <CollectionPicture image={collection.image} name={name} size="page" />
      <CollectionItems
        mode="public"
        collection={collection}
        status={status}
        view={itemView(collection, status, search, { publicOnly: true })}
        counts={countItems(collection.id)}
        base={`/${collection.slug}`}
        emptyTitle={empty[status]}
      />
    </div>
  );
}
