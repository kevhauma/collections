import { msg } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { affixTypes, fieldTypes, type Field, type FieldType } from "../db/fields";
import type { FieldRejected } from "../features/collections/form";
import { Badge } from "../ui/badge";
import { Button, LinkButton } from "../ui/button";
import { Checkbox } from "../ui/choice";
import { Dialog } from "../ui/dialog";
import { FormField } from "../ui/form-field";
import { Input, Select, Textarea } from "../ui/input";

// The pieces of /admin/c/:slug/fields (TICKET-COL-02). Plain forms posting to the route action, so everything here
// works without JS; drag-and-drop is layered on top by SortableList.

type Values = FieldRejected["values"];
type Failed = FieldRejected | undefined;

export const typeLabels: Record<FieldType, ReturnType<typeof msg>> = {
  text: msg({ id: "fields.type.text", message: "Text" }),
  number: msg({ id: "fields.type.number", message: "Number" }),
  date: msg({ id: "fields.type.date", message: "Date" }),
  select: msg({ id: "fields.type.select", message: "Choice" }),
  checkbox: msg({ id: "fields.type.checkbox", message: "Yes/no" }),
  url: msg({ id: "fields.type.url", message: "Link" }),
};

const Hidden = ({ values }: { values: Record<string, string | number> }) =>
  Object.entries(values).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />);

const checked = (value: string) => value === "on";
const flag = (on: 0 | 1) => (on ? "on" : "");

const LabelField = ({ id, values, failed }: { id: string; values: Values; failed: Failed }) => {
  const { t } = useLingui();
  return (
    <FormField id={id} label={t({ id: "fields.label", message: "Label" })} error={failed?.errors.label}>
      {(control) => <Input {...control} name="label" defaultValue={values.label} maxLength={100} required />}
    </FormField>
  );
};

const Toggles = ({ values, locked }: { values: Values; locked?: boolean }) => {
  const { t } = useLingui();
  return (
    <div className="flex flex-wrap gap-x-6">
      <Checkbox
        name="required"
        defaultChecked={checked(values.required)}
        disabled={locked}
        label={t({ id: "fields.required", message: "Required" })}
      />
      <Checkbox
        name="isPublic"
        defaultChecked={checked(values.isPublic)}
        disabled={locked}
        label={t({ id: "fields.public", message: "Public" })}
      />
    </div>
  );
};

const OptionsField = ({ id, label, values, failed, className }: {
  id: string;
  label: string;
  values: Values;
  failed: Failed;
  className?: string;
}) => {
  const { t } = useLingui();
  return (
    <FormField
      id={id}
      label={label}
      hint={t({ id: "fields.options.hint", message: "One option per line." })}
      error={failed?.errors.options}
      className={className}
    >
      {(control) => <Textarea {...control} name="options" defaultValue={values.options} />}
    </FormField>
  );
};

// Prefix and suffix (TICKET-COL-04): display-only text around the value, never translated.
const AffixFields = ({ id, values, failed, className }: { id: string; values: Values; failed: Failed; className?: string }) => {
  const { t } = useLingui();
  const affixes = [
    {
      name: "prefix",
      label: t({ id: "fields.prefix", message: "Prefix" }),
      hint: t({ id: "fields.prefix.hint", message: "Shown before the value, like €." }),
    },
    {
      name: "suffix",
      label: t({ id: "fields.suffix", message: "Suffix" }),
      hint: t({ id: "fields.suffix.hint", message: "Shown after the value, like cm." }),
    },
  ] as const;
  return (
    <div className={className ?? "grid gap-4 sm:grid-cols-2"}>
      {affixes.map((affix) => (
        <FormField
          key={affix.name}
          id={`${id}-${affix.name}`}
          label={affix.label}
          hint={affix.hint}
          error={failed?.errors[affix.name]}
        >
          {(control) => <Input {...control} name={affix.name} defaultValue={values[affix.name]} maxLength={20} />}
        </FormField>
      ))}
    </div>
  );
};

const newValues: Values = {
  label: "",
  type: "text",
  options: "",
  required: "",
  isPublic: "on",
  prefix: "",
  suffix: "",
};

// The options box only shows while "Choice" is selected: CSS :has(), no JS.
export const AddFieldForm = ({ failed }: { failed: Failed }) => {
  const { t, i18n } = useLingui();
  const values = failed?.values ?? newValues;
  return (
    <form method="post" className="group grid gap-4">
      <Hidden values={{ intent: "add" }} />
      <LabelField id="new-field-label" values={values} failed={failed} />
      <FormField id="new-field-type" label={t({ id: "fields.type", message: "Type" })} error={failed?.errors.type}>
        {(control) => (
          <Select {...control} name="type" defaultValue={values.type}>
            {fieldTypes.map((type) => (
              <option key={type} value={type}>
                {i18n._(typeLabels[type])}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <OptionsField
        id="new-field-options"
        label={t({ id: "fields.options", message: "Options" })}
        values={values}
        failed={failed}
        className="hidden group-has-[option[value=select]:checked]:grid"
      />
      {/* Only for the types in affixTypes; other types ignore them server-side. */}
      <AffixFields
        id="new-field"
        values={values}
        failed={failed}
        className="hidden gap-4 sm:grid-cols-2 group-has-[option[value=text]:checked]:grid group-has-[option[value=number]:checked]:grid group-has-[option[value=select]:checked]:grid"
      />
      <Toggles values={values} />
      <div>
        <Button variant="primary" type="submit">
          <Trans id="fields.add.submit">Add field</Trans>
        </Button>
      </div>
    </form>
  );
};

const valuesOf = (field: Field): Values => ({
  label: field.label,
  type: field.type,
  options: "",
  required: flag(field.required),
  isPublic: flag(field.isPublic),
  prefix: field.prefix ?? "",
  suffix: field.suffix ?? "",
});

// A choice field's options (TICKET-COL-03): each renames in place through its own form, or opens the removal
// preview, which shows the items that would lose the value first.
const OptionList = ({ field, slug, failed }: { field: Field; slug: string; failed: Failed }) => {
  const { t } = useLingui();
  return (
    field.options && (
      <div className="mt-5 grid gap-2">
        <p className="font-bold">
          <Trans id="fields.options.list">Rename or remove options</Trans>
        </p>
        <ul className="grid gap-3">
          {field.options.map((option, index) => (
            <li key={option} className="flex flex-wrap items-end gap-2">
              <form method="post" className="flex min-w-0 flex-1 items-end gap-2">
                <Hidden values={{ intent: "renameOption", fieldId: field.id, option }} />
                <FormField
                  id={`field-${field.id}-option-${index}`}
                  label={option}
                  error={failed?.option === option ? failed.errors.to : undefined}
                  className="min-w-0 flex-1"
                >
                  {(control) => <Input {...control} name="to" defaultValue={option} maxLength={100} />}
                </FormField>
                <Button size="sm" type="submit">
                  <Trans id="fields.options.rename">Rename</Trans>
                </Button>
              </form>
              <LinkButton
                size="sm"
                variant="danger"
                href={`/admin/c/${slug}/fields/${field.id}/remove-option?option=${encodeURIComponent(option)}`}
                aria-label={t({ id: "fields.options.removeLabel", message: `Remove option ${option}` })}
              >
                <Trans id="fields.options.remove">Remove</Trans>
              </LinkButton>
            </li>
          ))}
        </ul>
      </div>
    )
  );
};

// An existing field shows the prefix and suffix inputs only when its type has them.
const EditAffixes = ({ field, values, failed }: { field: Field; values: Values; failed: Failed }) =>
  affixTypes.includes(field.type) && <AffixFields id={`field-${field.id}`} values={values} failed={failed} />;

// Opens by itself when its last save failed, so the error is visible after a no-JS reload.
const EditField = ({ field, slug, failed }: { field: Field; slug: string; failed: Failed }) => {
  const { t } = useLingui();
  const values = failed?.values ?? valuesOf(field);
  const id = `field-${field.id}`;
  const current = field.options?.join(", ");
  return (
    <details open={failed !== undefined} className="grid">
      <summary className="w-fit cursor-pointer text-sm font-bold">
        <Trans id="fields.edit">Edit</Trans>
      </summary>
      <form method="post" className="mt-3 grid gap-4">
        <Hidden values={{ intent: "edit", fieldId: field.id }} />
        <LabelField id={`${id}-label`} values={values} failed={failed} />
        {field.options && (
          <OptionsField
            id={`${id}-options`}
            label={t({ id: "fields.options.add", message: `Add options (now: ${current})` })}
            values={values}
            failed={failed}
          />
        )}
        <EditAffixes field={field} values={values} failed={failed} />
        <Toggles values={values} locked={field.isTitle === 1} />
        <div>
          <Button variant="primary" size="sm" type="submit">
            <Trans id="fields.edit.submit">Save field</Trans>
          </Button>
        </div>
      </form>
      <OptionList field={field} slug={slug} failed={failed} />
    </details>
  );
};

const DeleteDialog = ({ field }: { field: Field }) => {
  const { t } = useLingui();
  const label = field.label;
  const count = field.valueCount;
  return (
    <Dialog
      id={`delete-field-${field.id}`}
      title={t({ id: "fields.delete.title", message: `Delete “${label}”?` })}
      closeLabel={t({ id: "collections.delete.close", message: "Close" })}
    >
      <form method="post" className="grid gap-4">
        <Hidden values={{ intent: "delete", fieldId: field.id }} />
        <p>
          <Plural
            id="fields.delete.count"
            value={count}
            _0="No item has a value for this field."
            one="# item has a value for this field. It will be removed."
            other="# items have a value for this field. They will be removed."
          />
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" type="submit">
            <Trans id="collections.delete.confirm">Delete for good</Trans>
          </Button>
          <Button type="button" commandfor={`delete-field-${field.id}`} command="close">
            <Trans id="collections.delete.cancel">Keep it</Trans>
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

// One field: what it is, the no-JS move buttons, edit and delete. `last` is the highest position.
type FieldRowProps = { field: Field; slug: string; last: number; failed: Failed };

export const FieldRow = ({ field, slug, last, failed }: FieldRowProps) => {
  const { t, i18n } = useLingui();
  const label = field.label;
  const flags = [
    { on: field.isTitle, text: t({ id: "fields.flag.title", message: "Title field" }), variant: "outline" },
    { on: field.required, text: t({ id: "fields.required", message: "Required" }), variant: "highlight" },
    { on: 1 - field.isPublic, text: t({ id: "fields.flag.private", message: "Private" }), variant: "pencil" },
  ] as const;
  return (
    <article id={`field-${field.id}`} className="grid scroll-mt-6 gap-2 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="mr-1">{label}</strong>
        <Badge>{i18n._(typeLabels[field.type])}</Badge>
        {flags
          .filter((item) => item.on)
          .map((item) => (
            <Badge key={item.text} variant={item.variant}>
              {item.text}
            </Badge>
          ))}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <form method="post" className="flex gap-1">
            <Hidden values={{ intent: "move", fieldId: field.id }} />
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              name="to"
              value={field.position - 1}
              disabled={field.position === 1}
              aria-label={t({ id: "fields.moveUp", message: `Move ${label} up` })}
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              name="to"
              value={field.position + 1}
              disabled={field.position === last}
              aria-label={t({ id: "fields.moveDown", message: `Move ${label} down` })}
            >
              ↓
            </Button>
          </form>
          <LinkButton
            variant="ghost"
            size="sm"
            href={`/admin/c/${slug}/fields/${field.id}/type`}
            aria-label={t({ id: "fields.changeTypeLabel", message: `Change the type of ${label}` })}
          >
            <Trans id="fields.changeType">Change type</Trans>
          </LinkButton>
          <Button
            variant="danger"
            size="sm"
            commandfor={`delete-field-${field.id}`}
            command="show-modal"
            disabled={field.isTitle === 1}
            aria-label={t({ id: "fields.delete", message: `Delete ${label}` })}
          >
            <Trans id="collections.delete.card">Delete</Trans>
          </Button>
        </div>
      </div>
      <EditField field={field} slug={slug} failed={failed} />
      <DeleteDialog field={field} />
    </article>
  );
};
