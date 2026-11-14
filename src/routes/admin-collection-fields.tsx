import { Trans, useLingui } from "@lingui/react/macro";
import { redirect, type LoaderFunctionArgs, type Params } from "react-router";
import { z } from "zod";
import type { Collection } from "../db/collections";
import { deleteField, listFields, moveField, renameOption } from "../db/fields";
import { requireAdmin } from "../features/auth/guard";
import { addField, editField } from "../features/collections/field-changes";
import { parseOptionRename } from "../features/collections/field-schema";
import { fieldRejected, type FieldRejected } from "../features/collections/form";
import { collectionAction, requireCollection } from "../features/collections/require-collection";
import type { FormInput } from "../features/collections/validation";
import { Card } from "../ui/card";
import { SortableList } from "../ui/sortable-list";
import { moveFieldAction } from "./field-actions";
import { AddFieldForm, FieldRow } from "./field-rows";

// /admin/c/:slug/fields (TICKET-COL-02): add, edit, reorder and delete a collection's fields. Type changes and
// option renames that touch item data are TICKET-COL-03.

// Reads its data in the component: after a form post, RSC renders without rerunning loaders.
export const loader = ({ params }: LoaderFunctionArgs) => {
  requireAdmin();
  requireCollection(params.slug);
  return null;
};

const badRequest = () => new Response(null, { status: 400 });

// Ids and positions come from the client, so a malformed one is refused, and the repository scopes every write to
// this collection.
const parseOrRefuse = <T,>(schema: z.ZodType<T>, form: FormInput): T => {
  const parsed = schema.safeParse(form);
  if (!parsed.success) throw badRequest();
  return parsed.data;
};

const fieldId = z.object({ fieldId: z.coerce.number().int() });
const move = fieldId.extend({ to: z.coerce.number().int() });

const fieldOf = (collection: Collection, form: FormInput) => {
  const { fieldId: id } = parseOrRefuse(fieldId, form);
  return listFields(collection.id).find((field) => field.id === id) ?? parseOrRefuse(z.never(), form);
};

// Back to the list, scrolled to the field that changed. A redirect, so a reload doesn't post again.
const back = (collection: Collection, id?: number) =>
  redirect(`/admin/c/${collection.slug}/fields${id === undefined ? "" : `#field-${id}`}`);

type Intent = (collection: Collection, form: FormInput) => Response | FieldRejected;

const intents: Record<string, Intent> = {
  add: (collection, form) => addField(collection, form) ?? back(collection),
  edit: (collection, form) => {
    const field = fieldOf(collection, form);
    return editField(collection, field, form) ?? back(collection, field.id);
  },
  // renameOption refuses an unknown option; an unchanged name just goes back.
  renameOption: (collection, form) => {
    const field = fieldOf(collection, form);
    const parsed = parseOptionRename(form, field);
    if (!parsed.success) return fieldRejected(parsed.error, form, field.id);
    const { option, to } = parsed.data;
    return to === option || renameOption(collection.id, field.id, option, to) ? back(collection, field.id) : badRequest();
  },
  move: (collection, form) => {
    const { fieldId: id, to } = parseOrRefuse(move, form);
    moveField(collection.id, id, to);
    return back(collection, id);
  },
  // deleteField refuses the title field and fields of other collections.
  delete: (collection, form) =>
    deleteField(collection.id, parseOrRefuse(fieldId, form).fieldId) ? back(collection) : badRequest(),
};

export const action = collectionAction((collection, form) =>
  (intents[String(form.intent)] ?? badRequest)(collection, form),
);

export default function CollectionFields({ params, actionData }: { params: Params; actionData?: FieldRejected }) {
  const { t } = useLingui();
  const collection = requireCollection(params.slug);
  const fields = listFields(collection.id);
  const name = collection.name;
  const failedFor = (target: number | "new") => (actionData?.target === target ? actionData : undefined);
  return (
    <div className="grid max-w-3xl gap-8">
      <title>{t({ id: "fields.title", message: `Fields · ${name}` })}</title>
      <div className="grid gap-1">
        <a href={`/admin/c/${collection.slug}`}>← {name}</a>
        <h1>
          <Trans id="fields.heading">Fields</Trans>
        </h1>
        <p className="text-ink-soft">
          <Trans id="fields.privateHint">
            Private fields are only for you: they never appear on public pages, not even hidden in the page source.
          </Trans>
        </p>
      </div>

      <Card heading={t({ id: "fields.list", message: "Fields in order" })}>
        <SortableList
          className="grid gap-2"
          items={fields.map((field) => ({
            id: field.id,
            content: <FieldRow field={field} slug={collection.slug} last={fields.length} failed={failedFor(field.id)} />,
          }))}
          onMove={moveFieldAction.bind(null, collection.slug)}
          handleLabel={t({ id: "fields.dragHandle", message: "Drag to reorder" })}
          failedMessage={t({ id: "order.moveFailed", message: "Couldn't save the new order. Try again." })}
        />
      </Card>

      <Card heading={t({ id: "fields.add", message: "Add a field" })} tone="ink">
        <AddFieldForm failed={failedFor("new")} />
      </Card>
    </div>
  );
}
