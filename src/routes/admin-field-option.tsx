import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { data, redirect, type LoaderFunctionArgs, type Params } from "react-router";
import { requestContext } from "../context";
import type { Collection } from "../db/collections";
import { itemsWithOption, removeOption, type Field } from "../db/fields";
import { requireAdmin } from "../features/auth/guard";
import { collectionAction, requireCollection, requireField } from "../features/collections/require-collection";
import { Button, LinkButton } from "../ui/button";
import { Card } from "../ui/card";

// /admin/c/:slug/fields/:fieldId/remove-option?option=… (TICKET-COL-03): which items would lose the value, then
// confirm. The option travels in the query string (preview) and the form (confirm).

const fieldAndOption = (collection: Collection, fieldId: string | undefined, option: unknown) => {
  const field = requireField(collection, fieldId);
  if (typeof option !== "string" || !field.options?.includes(option)) throw data(null, { status: 404 });
  return { field, option };
};

const optionParam = () => new URL(requestContext().request.url).searchParams.get("option");

export const loader = ({ params }: LoaderFunctionArgs) => {
  requireAdmin();
  fieldAndOption(requireCollection(params.slug), params.fieldId, optionParam());
  return null;
};

const fieldsPage = (collection: Collection, field: Field) => `/admin/c/${collection.slug}/fields#field-${field.id}`;

// removeOption refuses the last option.
export const action = collectionAction((collection, form, params) => {
  const { field, option } = fieldAndOption(collection, params.fieldId, form.option);
  if (!removeOption(collection.id, field.id, option)) throw new Response(null, { status: 400 });
  return redirect(fieldsPage(collection, field));
});

// The items that would lose the value.
const Users = ({ users }: { users: Array<{ id: number; title: unknown }> }) =>
  users.length > 0 && (
    <ul className="grid list-disc gap-1 pl-5">
      {users.map((item) => (
        <li key={item.id}>{String(item.title ?? "")}</li>
      ))}
    </ul>
  );

const ExportHint = ({ count }: { count: number }) =>
  count > 0 && (
    <p className="text-ink-soft">
      <Trans id="fields.type.exportHint">
        Cleared values can't be brought back here. <a href="/admin/export">Download an export</a> first if you might
        want them.
      </Trans>
    </p>
  );

export default function RemoveOption({ params }: { params: Params }) {
  const { t } = useLingui();
  const collection = requireCollection(params.slug);
  const { field, option } = fieldAndOption(collection, params.fieldId, optionParam());
  const users = itemsWithOption(collection.id, field.id, option);
  const count = users.length;
  const label = field.label;
  const last = field.options?.length === 1;
  return (
    <div className="grid max-w-2xl gap-8">
      <title>
        {t({
          id: "fields.removeOption.title",
          message: `Remove option · ${label}`,
        })}
      </title>
      <div className="grid gap-1">
        <a href={fieldsPage(collection, field)}>← {t({ id: "fields.heading", message: "Fields" })}</a>
        <h1>
          {t({
            id: "fields.removeOption.heading",
            message: `Remove “${option}” from ${label}?`,
          })}
        </h1>
      </div>
      <Card tone="ink">
        <div className="grid justify-items-start gap-4">
          <p>
            <strong>
              <Plural
                id="fields.removeOption.count"
                value={count}
                _0="No item has this value."
                one="# item has this value. It will be cleared."
                other="# items have this value. They will be cleared."
              />
            </strong>
          </p>
          <Users users={users} />
          {last ? (
            <p className="font-bold text-red-pen">
              <Trans id="fields.removeOption.last">
                A choice field needs at least one option. Add another option first, or change the field's type.
              </Trans>
            </p>
          ) : (
            <form method="post" className="grid justify-items-start gap-3">
              <input type="hidden" name="option" value={option} />
              <ExportHint count={count} />
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" type="submit">
                  <Trans id="fields.removeOption.confirm">Remove option</Trans>
                </Button>
                <LinkButton href={fieldsPage(collection, field)}>
                  <Trans id="collections.delete.cancel">Keep it</Trans>
                </LinkButton>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
