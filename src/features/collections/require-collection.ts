import { data } from "react-router";
import { getCollectionBySlug, type Collection } from "../../db/collections";

// The collection named in an /admin/c/:slug URL, or the not-found page. Call after requireAdmin().
export const requireCollection = (slug: string | undefined): Collection => {
  const collection = slug === undefined ? undefined : getCollectionBySlug(slug);
  if (!collection) throw data(null, { status: 404 });
  return collection;
};
