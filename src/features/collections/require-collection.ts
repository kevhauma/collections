import { data, type ActionFunctionArgs, type Params } from "react-router";
import { getCollectionBySlug, type Collection } from "../../db/collections";
import { listFields, type Field } from "../../db/fields";
import { requireAdmin } from "../auth/guard";
import type { FormInput } from "./validation";

// The collection named in an /admin/c/:slug URL, or the not-found page. Call after requireAdmin().
export const requireCollection = (slug: string | undefined): Collection => {
  const collection = slug === undefined ? undefined : getCollectionBySlug(slug);
  if (!collection) throw data(null, { status: 404 });
  return collection;
};

// The route action of an /admin/c/:slug page: requireAdmin() first, then the collection (or 404) and the posted
// form for `handle`, plus the other URL params (e.g. an item id).
export const collectionAction =
  <R,>(handle: (collection: Collection, form: FormInput, params: Params) => R) =>
  async ({ request, params }: ActionFunctionArgs) => {
    requireAdmin();
    const collection = requireCollection(params.slug);
    return handle(collection, Object.fromEntries(await request.formData()), params);
  };

// The field named in an /admin/c/:slug/fields/:fieldId URL, or the not-found page. Only this collection's fields match.
export const requireField = (collection: Collection, fieldId: string | undefined): Field => {
  const field = listFields(collection.id).find((candidate) => String(candidate.id) === fieldId);
  if (!field) throw data(null, { status: 404 });
  return field;
};
