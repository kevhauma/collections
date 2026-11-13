import { useLingui } from "@lingui/react/macro";
import type { Field } from "../db/fields";
import type { ItemStatus } from "../db/items";
import { filterableFields, filterInput, maxQueryLength, views, type ListParams } from "../features/items/list-params";
import { Button } from "../ui/button";
import { FormField } from "../ui/form-field";
import { Input, Select } from "../ui/input";
import { TabLinks } from "../ui/tab-links";

// Search, filters and sort as a GET form, plus the table/grid toggle as links (TICKET-ITM-05). The URL holds all of
// it, so it works without JS and a filtered view can be shared. Shared by the admin list and the public pages.

type ItemToolbarProps = {
  params: ListParams;
  // The fields the viewer may see, in position order.
  fields: Field[];
  status: ItemStatus;
  resetHref: string;
  viewHref: (view: ListParams["view"]) => string;
};

const FilterField = ({ field, value }: { field: Field; value: string }) => {
  const { t } = useLingui();
  const options =
    field.type === "checkbox"
      ? [
          { value: "yes", label: t({ id: "items.value.yes", message: "Yes" }) },
          { value: "no", label: t({ id: "items.value.no", message: "No" }) },
        ]
      : (field.options ?? []).map((option) => ({ value: option, label: option }));
  return (
    <FormField id={`list-f-${field.id}`} label={field.label}>
      {(control) => (
        <Select {...control} name={`f.${field.id}`} defaultValue={value}>
          <option value="">{t({ id: "items.filter.any", message: "Any" })}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      )}
    </FormField>
  );
};

export const ItemToolbar = ({ params, fields, status, resetHref, viewHref }: ItemToolbarProps) => {
  const { t } = useLingui();
  const sortOptions = [
    ...(status === "want" ? [{ value: "rank", label: t({ id: "items.sort.rank", message: "Rank" }) }] : []),
    ...fields.map((field) => ({ value: String(field.id), label: field.label })),
    { value: "created", label: t({ id: "items.sort.created", message: "Date added" }) },
  ];
  const viewLabels = {
    table: t({ id: "collections.view.table", message: "Table" }),
    grid: t({ id: "collections.view.grid", message: "Grid" }),
  };
  return (
    <div className="grid gap-3">
      <form method="get" role="search" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="view" value={params.view} />
        <FormField id="list-q" label={t({ id: "items.search", message: "Search" })} className="min-w-52 flex-1">
          {(control) => <Input {...control} type="search" name="q" defaultValue={params.q} maxLength={maxQueryLength} />}
        </FormField>
        {filterableFields(fields).map((field) => (
          <FilterField key={field.id} field={field} value={filterInput(params, field.id)} />
        ))}
        <FormField id="list-sort" label={t({ id: "items.sort", message: "Sort by" })}>
          {(control) => (
            <Select {...control} name="sort" defaultValue={String(params.sort)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField id="list-dir" label={t({ id: "items.sort.order", message: "Order" })}>
          {(control) => (
            <Select {...control} name="dir" defaultValue={params.dir}>
              <option value="asc">{t({ id: "items.sort.asc", message: "Ascending" })}</option>
              <option value="desc">{t({ id: "items.sort.desc", message: "Descending" })}</option>
            </Select>
          )}
        </FormField>
        <div className="flex items-center gap-3">
          <Button type="submit">{t({ id: "items.filter.apply", message: "Apply" })}</Button>
          <a href={resetHref}>{t({ id: "items.filter.reset", message: "Reset" })}</a>
        </div>
      </form>
      <TabLinks
        variant="nav"
        label={t({ id: "items.view.label", message: "View" })}
        tabs={views.map((view) => ({ href: viewHref(view), label: viewLabels[view], current: view === params.view }))}
      />
    </div>
  );
};
