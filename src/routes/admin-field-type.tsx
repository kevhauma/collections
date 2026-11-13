import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { redirect, type LoaderFunctionArgs, type Params } from "react-router";
import { z } from "zod";
import { requestContext } from "../context";
import {
  changeFieldType,
  fieldTypes,
  fieldValues,
  titleFieldTypes,
  type Field,
  type FieldType,
  type FieldValueRow,
} from "../db/fields";
import { requireAdmin } from "../features/auth/guard";
import { planTypeChange, typeChangeProblem, type TypeChangeProblem } from "../features/collections/convert";
import { collectionAction, requireCollection, requireField } from "../features/collections/require-collection";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { FormField } from "../ui/form-field";
import { Select } from "../ui/input";
import { Table, Td, Th } from "../ui/table";
import { typeLabels } from "./field-rows";

// /admin/c/:slug/fields/:fieldId/type (TICKET-COL-03): pick a new type (a GET form, ?to=), see what converts and what
// would be cleared, then confirm. The conversion runs again when confirmed, on the values as they are then.

export const loader = ({ params }: LoaderFunctionArgs) => {
  requireAdmin();
  requireField(requireCollection(params.slug), params.fieldId);
  return null;
};

// The types this field may change to: any other one, or for the title field the other text-like ones.
const targetsOf = (field: Field): FieldType[] =>
  fieldTypes.filter((type) => type !== field.type && (!field.isTitle || titleFieldTypes.includes(type)));

const targetOf = (field: Field, value: unknown): FieldType | undefined =>
  z
    .enum(targetsOf(field) as [FieldType, ...FieldType[]])
    .optional()
    .catch(undefined)
    .parse(value ?? undefined);

// The plan, or nothing when the change isn't allowed; changeFieldType runs it inside its transaction.
const allowedPlan = (field: Field, to: FieldType) => (rows: FieldValueRow[]) => {
  const plan = planTypeChange(rows, to);
  return typeChangeProblem(field, to, plan) ? undefined : plan;
};

export const action = collectionAction((collection, form, params) => {
  const field = requireField(collection, params.fieldId);
  const to = targetOf(field, form.to);
  if (!to) throw new Response(null, { status: 400 });
  const page = `/admin/c/${collection.slug}/fields`;
  // Refused at apply time (the data changed since the preview): back to the preview, which now says why.
  return changeFieldType(collection.id, field.id, to, allowedPlan(field, to))
    ? redirect(`${page}#field-${field.id}`)
    : redirect(`${page}/${field.id}/type?to=${to}`);
});

const ProblemText = ({ problem }: { problem: TypeChangeProblem }) =>
  ({
    same: <Trans id="fields.type.problem.same">The field already has this type.</Trans>,
    titleType: <Trans id="fields.type.problem.titleType">The title field can only be text, a link or a choice.</Trans>,
    titleBlank: (
      <Trans id="fields.type.problem.titleBlank">
        Every item needs its title, so the title field can't change to a type that would clear some.
      </Trans>
    ),
    noOptions: (
      <Trans id="fields.type.problem.noOptions">
        No item has a value to become an option. Delete this field and add a new choice field instead.
      </Trans>
    ),
  })[problem];

const Preview = ({ collectionId, field, to }: { collectionId: number; field: Field; to: FieldType }) => {
  const { t, i18n } = useLingui();
  const plan = planTypeChange(fieldValues(collectionId, field.id), to);
  const problem = typeChangeProblem(field, to, plan);
  const kept = plan.kept.length;
  const cleared = plan.blanked.length;
  const options = plan.options?.join(", ");
  const type = i18n._(typeLabels[to]);
  return (
    <Card heading={t({ id: "fields.type.preview", message: `As ${type}` })} tone="ink">
      <div className="grid gap-4">
        <p>
          <Plural
            id="fields.type.kept"
            value={kept}
            _0="No value converts."
            one="# value converts."
            other="# values convert."
          />{" "}
          <strong>
            <Plural
              id="fields.type.cleared"
              value={cleared}
              _0="Nothing will be cleared."
              one="# value will be cleared."
              other="# values will be cleared."
            />
          </strong>
        </p>
        {options && (
          <p>
            {t({
              id: "fields.type.options",
              message: `New options: ${options}`,
            })}
          </p>
        )}
        {cleared > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>{t({ id: "fields.type.item", message: "Item" })}</Th>
                <Th>
                  {t({
                    id: "fields.type.oldValue",
                    message: "Value that will be cleared",
                  })}
                </Th>
              </tr>
            </thead>
            <tbody>
              {plan.blanked.map((row) => (
                <tr key={row.id}>
                  <Td>{String(row.title ?? "")}</Td>
                  <Td>{String(row.value)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {problem ? (
          <p className="font-bold text-red-pen">
            <ProblemText problem={problem} />
          </p>
        ) : (
          <Confirm to={to} cleared={cleared} />
        )}
      </div>
    </Card>
  );
};

// Clearing values is a correction, so that confirm is the danger button; the export is the undo.
const Confirm = ({ to, cleared }: { to: FieldType; cleared: number }) => (
  <form method="post" className="grid justify-items-start gap-3">
    <input type="hidden" name="to" value={to} />
    {cleared > 0 && (
      <p className="text-ink-soft">
        <Trans id="fields.type.exportHint">
          Cleared values can't be brought back here. <a href="/admin/export">Download an export</a> first if you might
          want them.
        </Trans>
      </p>
    )}
    <Button variant={cleared > 0 ? "danger" : "primary"} type="submit">
      <Plural
        id="fields.type.confirm"
        value={cleared}
        _0="Change type"
        one="Change type and clear # value"
        other="Change type and clear # values"
      />
    </Button>
  </form>
);

export default function FieldTypePage({ params }: { params: Params }) {
  const { t, i18n } = useLingui();
  const collection = requireCollection(params.slug);
  const field = requireField(collection, params.fieldId);
  const to = targetOf(field, new URL(requestContext().request.url).searchParams.get("to"));
  const label = field.label;
  const current = i18n._(typeLabels[field.type]);
  return (
    <div className="grid max-w-3xl gap-8">
      <title>{t({ id: "fields.type.title", message: `Change type · ${label}` })}</title>
      <div className="grid gap-1">
        <a href={`/admin/c/${collection.slug}/fields#field-${field.id}`}>
          ← {t({ id: "fields.heading", message: "Fields" })}
        </a>
        <h1>
          {t({
            id: "fields.type.heading",
            message: `Change the type of “${label}”`,
          })}
        </h1>
        <p className="text-ink-soft">{t({ id: "fields.type.current", message: `Now: ${current}` })}</p>
      </div>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <FormField id="field-type-to" label={t({ id: "fields.type.new", message: "New type" })}>
          {(control) => (
            <Select {...control} name="to" defaultValue={to}>
              {targetsOf(field).map((type) => (
                <option key={type} value={type}>
                  {i18n._(typeLabels[type])}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <Button type="submit">{t({ id: "fields.type.show", message: "Show what changes" })}</Button>
      </form>
      {to && <Preview collectionId={collection.id} field={field} to={to} />}
    </div>
  );
}
