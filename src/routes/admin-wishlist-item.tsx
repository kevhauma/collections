import { useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { data, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type Params } from "react-router";
import { getWishItem, type WishItem } from "../db/wishlist";
import { requireAdmin } from "../features/auth/guard";
import { prepareFormImage } from "../features/images/form";
import { wishErrors } from "../features/wishlist/form";
import { wishSchema } from "../features/wishlist/validation";
import { removeWish, saveWish } from "../features/wishlist/wish-changes";
import { Card } from "../ui/card";
import { ErrorSummary } from "../ui/error-summary";
import { FormField, type ControlProps } from "../ui/form-field";
import { Input, Textarea } from "../ui/input";
import { DeleteDialog, errorLinks, SaveButtons } from "./admin-item";
import { ImageSection } from "./image-section";

// /admin/wishlist/items/new and /admin/wishlist/items/:id (TICKET-WSH-03): a wishlist item's fixed fields and its
// image, with save and delete. A plain multipart form posting to the route action, so it works without JS.

// The item named in the URL; undefined on the new-item form, the not-found page for an unknown id.
const requireWish = (id: string | undefined): WishItem | undefined => {
  if (id === undefined) return undefined;
  const item = /^\d+$/.test(id) ? getWishItem(Number(id)) : undefined;
  if (!item) throw data(null, { status: 404 });
  return item;
};

// Reads its data in the component: after a form post, RSC renders without rerunning loaders.
export const loader = ({ params }: LoaderFunctionArgs) => {
  requireAdmin();
  requireWish(params.id);
  return null;
};

type Form = Record<string, FormDataEntryValue>;
const inputs = ["title", "link", "note", "price", "imageUrl"] as const;
type Values = Record<(typeof inputs)[number], string>;
type Rejected = { errors: Partial<Record<string, string>>; values: Values };

// What was typed, so a no-JS reload keeps it (a chosen file can't be put back into a file input), or the saved item.
const typed = (form: Record<string, unknown>): Values =>
  Object.fromEntries(inputs.map((name) => [name, typeof form[name] === "string" ? form[name] : ""])) as Values;

// Values are checked before any image work, so a form with errors never leaves image files behind.
const save = async (form: Form, item: WishItem | undefined): Promise<Response | Rejected> => {
  const parsed = wishSchema.safeParse(form);
  if (!parsed.success) return { errors: wishErrors(parsed.error), values: typed(form) };
  const prepared = await prepareFormImage(form);
  if ("errors" in prepared) return { errors: prepared.errors, values: typed(form) };
  const id = await saveWish(item, { ...parsed.data, image: prepared.image });
  return redirect(`/admin/wishlist#item-${id}`);
};

const remove = async (item: WishItem | undefined): Promise<Response> => {
  if (!item) throw new Response(null, { status: 400 });
  await removeWish(item);
  return redirect("/admin/wishlist");
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  requireAdmin();
  const item = requireWish(params.id);
  const form = Object.fromEntries(await request.formData());
  return form.intent === "delete" ? remove(item) : save(form, item);
};

type Labels = Record<"title" | "link" | "note" | "price" | "image" | "imageUrl", string>;
type ControlOf = (props: ControlProps & { name: string; defaultValue: string }) => ReactNode;

// Input name → control, in form order.
const rows: Array<{ name: "title" | "link" | "note" | "price"; control: ControlOf; required?: true }> = [
  { name: "title", control: (props) => <Input {...props} />, required: true },
  { name: "link", control: (props) => <Input {...props} type="url" /> },
  { name: "note", control: (props) => <Textarea {...props} rows={3} /> },
  { name: "price", control: (props) => <Input {...props} className="w-40" /> },
];

const idOf = (name: string) => `wish-${name}`;

type FieldsProps = { errors: Rejected["errors"]; values: Values; labels: Labels };

const WishFields = ({ errors, values, labels }: FieldsProps) => {
  const { t } = useLingui();
  const requiredWord = t({ id: "items.form.required", message: "required" });
  return rows.map((row) => (
    <FormField
      key={row.name}
      id={idOf(row.name)}
      label={labels[row.name]}
      error={errors[row.name]}
      required={row.required && requiredWord}
    >
      {(control) => row.control({ ...control, name: row.name, defaultValue: values[row.name] })}
    </FormField>
  ));
};

export default function AdminWishlistItem({ params, actionData }: { params: Params; actionData?: Rejected }) {
  const { t } = useLingui();
  const item = requireWish(params.id);
  const { errors, values } = actionData ?? { errors: {}, values: typed({ ...item }) };
  const labels: Labels = {
    title: t({ id: "wishlist.field.title", message: "Title" }),
    link: t({ id: "wishlist.field.link", message: "Link" }),
    note: t({ id: "wishlist.field.note", message: "Note" }),
    price: t({ id: "wishlist.field.price", message: "Price" }),
    image: t({ id: "items.image.file", message: "Photo" }),
    imageUrl: t({ id: "items.image.url", message: "Or an image address" }),
  };
  const summary = errorLinks([
    ...rows.map((row) => ({ id: idOf(row.name), label: labels[row.name], error: errors[row.name] })),
    { id: "item-image", label: labels.image, error: errors.image },
    { id: "item-image-url", label: labels.imageUrl, error: errors.imageUrl },
  ]);
  const { title, image } = item ?? { title: "", image: null };
  const editing = item !== undefined;
  const heading = editing ? title : t({ id: "wishlist.new.heading", message: "New wish" });
  const name = t({ id: "wishlist.heading", message: "Wishlist" });
  return (
    <div className="grid max-w-xl gap-6">
      <title>{t({ id: "items.form.title", message: `${heading} · ${name}` })}</title>
      <div className="grid gap-1">
        <a href="/admin/wishlist">← {name}</a>
        <h1>{heading}</h1>
      </div>
      <Card tone="ink">
        {/* noValidate: the server's translated messages and the summary replace the browser's own bubbles. */}
        <form method="post" encType="multipart/form-data" noValidate className="grid gap-4">
          <ErrorSummary title={t({ id: "items.form.errors", message: "Check these fields:" })} errors={summary} />
          <WishFields errors={errors} values={values} labels={labels} />
          <ImageSection image={image} title={title} url={values.imageUrl} errors={errors} labels={labels} />
          <SaveButtons editing={editing} />
        </form>
      </Card>
      <DeleteDialog title={title} editing={editing} />
    </div>
  );
}
