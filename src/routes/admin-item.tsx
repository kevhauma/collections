import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { data, redirect, type LoaderFunctionArgs, type Params } from "react-router";
import { requestContext } from "../context";
import type { Collection } from "../db/collections";
import { listFields, type Field, type FieldType } from "../db/fields";
import { getItem, type Item, type ItemStatus } from "../db/items";
import { requireAdmin } from "../features/auth/guard";
import { collectionAction, requireCollection } from "../features/collections/require-collection";
import type { FormInput } from "../features/collections/validation";
import { prepareFormImage } from "../features/images/form";
import { removeItem, saveItem } from "../features/items/item-changes";
import { translateItemErrors } from "../features/items/messages";
import { parseItemForm } from "../features/items/schema";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox, RadioGroup } from "../ui/choice";
import { Dialog } from "../ui/dialog";
import { ErrorSummary } from "../ui/error-summary";
import { FormField, type ControlProps } from "../ui/form-field";
import { Input, Select } from "../ui/input";
import { Rating } from "../ui/rating";
import { ImageSection } from "./image-section";
import { listHref } from "./item-paths";

// /admin/c/:slug/items/new and /admin/c/:slug/items/:id (TICKET-ITM-02): the item form, built from the collection's
// fields, with save and delete. A plain form posting to the route action, so it all works without JS.

// The item named in the URL; undefined on the new-item form, the not-found page for an id outside this collection.
const requireItem = (collection: Collection, id: string | undefined): Item | undefined => {
  if (id === undefined) return undefined;
  const item = /^\d+$/.test(id) ? getItem(collection.id, Number(id)) : undefined;
  if (!item) throw data(null, { status: 404 });
  return item;
};

// Reads its data in the component: after a form post, RSC renders without rerunning loaders.
export const loader = ({ params }: LoaderFunctionArgs) => {
  requireAdmin();
  requireItem(requireCollection(params.slug), params.id);
  return null;
};

// Keyed by input name (`f.<fieldId>`, `status`, `quantity`, `image`, `imageUrl`).
type FormValues = Record<string, string>;
type Errors = Partial<Record<string, string>>;
type Rejected = { errors: Errors; values: FormValues };

// What was typed, so a no-JS reload keeps it. A chosen file can't be put back into a file input.
const typed = (form: FormInput): FormValues =>
  Object.fromEntries(Object.entries(form).filter((entry): entry is [string, string] => typeof entry[1] === "string"));

type Intent = (collection: Collection, form: FormInput, item: Item | undefined) => Promise<Response | Rejected>;

// Values are checked before any image work, so a form with errors never leaves image files behind.
const save: Intent = async (collection, form, item) => {
  const parsed = parseItemForm(form, listFields(collection.id));
  if (!parsed.success) return { errors: translateItemErrors(parsed.errors), values: typed(form) };
  const prepared = await prepareFormImage(form);
  if ("errors" in prepared) return { errors: prepared.errors, values: typed(form) };
  const id = await saveItem(collection.id, item, { ...parsed.data, image: prepared.image });
  // Back to the tab the item now lives on, scrolled to it.
  return redirect(`${listHref(collection.slug, parsed.data.status)}#item-${id}`);
};

const remove: Intent = async (collection, _form, item) => {
  if (!item) throw new Response(null, { status: 400 });
  await removeItem(collection.id, item);
  return redirect(listHref(collection.slug, item.status));
};

export const action = collectionAction((collection, form, params) =>
  (form.intent === "delete" ? remove : save)(collection, form, requireItem(collection, params.id)),
);

const inputValue = (value: unknown): string => (value === true ? "on" : value === false ? "" : String(value ?? ""));

type Shown = Pick<Item, "status" | "quantity" | "values" | "image">;

// What the new-item form starts from; it preselects the tab you came from (?status=want).
const blankItem = (): Shown => ({
  status: new URL(requestContext().request.url).searchParams.get("status") === "want" ? "want" : "have",
  quantity: 1,
  values: {},
  image: null,
});

const valuesOf = (fields: Field[], item: Shown): FormValues => ({
  ...Object.fromEntries(fields.map((field) => [`f.${field.id}`, inputValue(item.values[field.id])])),
  status: item.status,
  quantity: String(item.quantity ?? 1),
});

type Row = { field: Field; id: string; name: string; value: string; error?: string; required?: string };
type Props = ControlProps & { name: string; defaultValue: string };

const affixKeys = ["prefix", "suffix"] as const;

// The field's prefix and suffix (TICKET-COL-04) as static text beside the input, never part of the value. Screen
// readers hear them with the label through aria-describedby.
const Affixed = ({ row, props, control }: { row: Row; props: ControlProps; control: (props: ControlProps) => ReactNode }) => {
  const ids = affixKeys.filter((key) => row.field[key]).map((key) => `${row.id}-${key}`);
  const describedBy = [props["aria-describedby"], ...ids].filter(Boolean).join(" ") || undefined;
  const text = (key: (typeof affixKeys)[number]) =>
    row.field[key] && (
      <span id={`${row.id}-${key}`} className="shrink-0">
        {row.field[key]}
      </span>
    );
  return (
    <div className="flex items-center gap-2">
      {text("prefix")}
      <div className="min-w-0 flex-1">{control({ ...props, "aria-describedby": describedBy })}</div>
      {text("suffix")}
    </div>
  );
};

// A labelled, boxed control for one field type.
const boxed = (control: (props: Props, field: Field) => ReactNode) => (row: Row) => (
  <FormField id={row.id} label={row.field.label} error={row.error} required={row.required}>
    {(props) => (
      <Affixed
        row={row}
        props={props}
        control={(described) => control({ ...described, name: row.name, defaultValue: row.value }, row.field)}
      />
    )}
  </FormField>
);

// A rating (TICKET-COL-05): one radio per score drawn as symbols and read as "3 of 5", plus "No rating" to clear it.
// Native radios, so arrow keys move between them and it works without JS.
const RatingControl = ({ row }: { row: Row }) => {
  const { t } = useLingui();
  const max = row.field.ratingMax ?? 5;
  const symbol = row.field.ratingSymbol ?? "★";
  const scores = Array.from({ length: max }, (_, index) => index + 1);
  return (
    <RadioGroup
      id={row.id}
      legend={row.field.label}
      requiredWord={row.required}
      error={row.error}
      name={row.name}
      defaultValue={row.value}
      options={[
        { value: "", label: t({ id: "rating.none", message: "No rating" }) },
        ...scores.map((score) => ({
          value: String(score),
          label: (
            <Rating value={score} max={max} symbol={symbol} label={t({ id: "rating.label", message: `${score} of ${max}` })} />
          ),
        })),
      ]}
    />
  );
};

// Field type → control. A checkbox is its own label and always has a value, so it's never required or invalid.
const controls: Record<FieldType, (row: Row) => ReactNode> = {
  text: boxed((props) => <Input {...props} />),
  number: boxed((props) => <Input {...props} type="number" step="any" />),
  date: boxed((props) => <Input {...props} type="date" />),
  select: boxed((props, field) => (
    <Select {...props}>
      <option value="" />
      {field.options?.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </Select>
  )),
  checkbox: (row) => (
    <Checkbox id={row.id} name={row.name} defaultChecked={row.value === "on"} label={row.field.label} />
  ),
  url: boxed((props) => <Input {...props} type="url" />),
  rating: (row) => <RatingControl row={row} />,
};

const rowsOf = (fields: Field[], values: FormValues, errors: Errors, requiredWord: string): Row[] =>
  fields.map((field) => ({
    field,
    id: `item-${field.id}`,
    name: `f.${field.id}`,
    value: values[`f.${field.id}`] ?? "",
    error: errors[`f.${field.id}`],
    required: field.required ? requiredWord : undefined,
  }));

// One summary link per invalid input, in form order.
const errorLinks = (inputs: Array<{ id: string; label: string; error?: string }>) =>
  inputs.flatMap((input) => (input.error ? [{ href: `#${input.id}`, text: `${input.label}: ${input.error}` }] : []));

// Only an existing item can be deleted.
const DeleteDialog = ({ title, editing }: { title: string; editing: boolean }) => {
  const { t } = useLingui();
  return (
    editing && (
      <Dialog
        id="delete-item"
        title={t({ id: "items.delete.title", message: `Delete “${title}”?` })}
        closeLabel={t({ id: "collections.delete.close", message: "Close" })}
      >
        <form method="post" className="grid gap-4">
          <p>
            <Trans id="items.delete.confirmText">This item will be gone. This can't be undone.</Trans>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" type="submit" name="intent" value="delete">
              <Trans id="collections.delete.confirm">Delete for good</Trans>
            </Button>
            <Button type="button" commandfor="delete-item" command="close">
              <Trans id="collections.delete.cancel">Keep it</Trans>
            </Button>
          </div>
        </form>
      </Dialog>
    )
  );
};

// Save, plus Delete for an existing item. Its dialog sits outside the item form, because forms can't nest.
const SaveButtons = ({ editing }: { editing: boolean }) => (
  <div className="flex flex-wrap gap-2">
    <Button variant="primary" type="submit">
      {editing ? <Trans id="items.form.save">Save item</Trans> : <Trans id="items.form.create">Add item</Trans>}
    </Button>
    {editing && (
      <Button variant="danger" type="button" commandfor="delete-item" command="show-modal" className="ml-auto">
        <Trans id="collections.delete.card">Delete</Trans>
      </Button>
    )}
  </div>
);

type StatusFieldsProps = { values: FormValues; errors: Errors; labels: { status: string; quantity: string } };

const StatusFields = ({ values, errors, labels }: StatusFieldsProps) => {
  const { t } = useLingui();
  return (
    <>
      <div id="item-status">
        <RadioGroup
          legend={labels.status}
          name="status"
          defaultValue={values.status}
          options={[
            { value: "have", label: t({ id: "items.tab.have", message: "Have" }) },
            { value: "want", label: t({ id: "items.tab.want", message: "Want" }) },
          ]}
        />
      </div>
      {/* Only a have has a quantity: shown while "Have" is selected, CSS :has(), no JS. */}
      <FormField
        id="item-quantity"
        label={labels.quantity}
        error={errors.quantity}
        className="hidden group-has-[input[name=status][value=have]:checked]:grid"
      >
        {(control) => (
          <Input
            {...control}
            name="quantity"
            type="number"
            min={1}
            max={9999}
            step={1}
            defaultValue={values.quantity}
            className="w-32"
          />
        )}
      </FormField>
    </>
  );
};

export default function AdminItem({ params, actionData }: { params: Params; actionData?: Rejected }) {
  const { t } = useLingui();
  const collection = requireCollection(params.slug);
  const item = requireItem(collection, params.id);
  const shown = item ?? blankItem();
  const fields = listFields(collection.id);
  const { errors, values } = actionData ?? { errors: {}, values: valuesOf(fields, shown) };
  const name = collection.name;
  const title = inputValue(shown.values[collection.titleFieldId]);
  const rows = rowsOf(fields, values, errors, t({ id: "items.form.required", message: "required" }));
  const labels = {
    status: t({ id: "items.form.status", message: "Status" }),
    quantity: t({ id: "items.form.quantity", message: "How many" }),
    image: t({ id: "items.image.file", message: "Photo" }),
    imageUrl: t({ id: "items.image.url", message: "Or an image address" }),
  };
  const summary = errorLinks([
    ...rows.map((row) => ({ id: row.id, label: row.field.label, error: row.error })),
    { id: "item-status", label: labels.status, error: errors.status },
    { id: "item-quantity", label: labels.quantity, error: errors.quantity },
    { id: "item-image", label: labels.image, error: errors.image },
    { id: "item-image-url", label: labels.imageUrl, error: errors.imageUrl },
  ]);
  const editing = item !== undefined;
  const heading = editing ? title : t({ id: "items.new.heading", message: "New item" });
  return (
    <div className="grid max-w-xl gap-6">
      <title>{t({ id: "items.form.title", message: `${heading} · ${name}` })}</title>
      <div className="grid gap-1">
        <a href={listHref(collection.slug, shown.status)}>← {name}</a>
        <h1>{heading}</h1>
      </div>

      <Card tone="ink">
        {/* noValidate: the server's translated messages and the summary replace the browser's own bubbles. */}
        <form method="post" encType="multipart/form-data" noValidate className="group grid gap-4">
          <ErrorSummary title={t({ id: "items.form.errors", message: "Check these fields:" })} errors={summary} />
          {rows.map((row) => (
            <div key={row.id}>{controls[row.field.type](row)}</div>
          ))}
          <StatusFields values={values} errors={errors} labels={labels} />
          <ImageSection image={shown.image} title={title} url={values.imageUrl} errors={errors} labels={labels} />
          <SaveButtons editing={editing} />
        </form>
      </Card>
      <DeleteDialog title={title} editing={editing} />
    </div>
  );
}
