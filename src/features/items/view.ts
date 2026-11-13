import type { Collection } from "../../db/collections";
import { listFields } from "../../db/fields";
import { listItems, type ItemStatus } from "../../db/items";
import { parseListParams, type ListContext } from "./list-params";

// Everything one tab of a collection's item list shows (TICKET-ITM-05, TICKET-PUB-02): the fields the viewer may
// see, the list params read from the URL, and the matching items. With `publicOnly` (visitors), private fields are
// dropped here and their values stripped by the repository, so a page can't hand them to a view by accident.
export const itemView = (
  collection: Pick<Collection, "id" | "defaultView" | "titleFieldId">,
  status: ItemStatus,
  search: URLSearchParams,
  { publicOnly = false } = {},
) => {
  const fields = listFields(collection.id).filter((field) => field.isPublic || !publicOnly);
  const context: ListContext = {
    status,
    defaultView: collection.defaultView,
    titleFieldId: collection.titleFieldId,
    publicOnly,
  };
  const list = parseListParams(search, fields, context);
  return { fields, context, list, items: listItems({ collectionId: collection.id, status, ...list, publicOnly }) };
};
