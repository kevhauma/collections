import { z } from "zod";
import type { Field } from "../../db/fields";
import type { ItemFilter, ItemSort, ItemStatus } from "../../db/items";

// The item list's state in the query string (TICKET-ITM-05): `view`, `q`, `sort`, `dir`, `f.<fieldId>`. Parsed once
// at the route, shared by the admin list and the public pages. Invalid params are dropped, never an error.

export const views = ["table", "grid"] as const;
type View = (typeof views)[number];
const directions = ["asc", "desc"] as const;

export const maxQueryLength = 200;

export type ListParams = {
  view: View;
  q: string;
  sort: ItemSort;
  dir: (typeof directions)[number];
  filters: ItemFilter[];
};

export type ListContext = { status: ItemStatus; defaultView: View; titleFieldId: number; publicOnly?: boolean };

type ListField = Pick<Field, "id" | "type" | "options" | "isPublic">;

// Wants follow their rank; haves read alphabetically by title.
const defaultsOf = (context: ListContext): Pick<ListParams, "view" | "sort" | "dir"> => ({
  view: context.defaultView,
  sort: context.status === "want" ? "rank" : context.titleFieldId,
  dir: "asc",
});

const oneOf = <T extends string>(options: readonly [T, ...T[]], value: string | null, fallback: T): T =>
  z.enum(options).catch(fallback).parse(value);

const sortOf = (value: string | null, fields: ListField[], status: ItemStatus): ItemSort | undefined => {
  if (value === "created" || (value === "rank" && status === "want")) return value;
  return fields.find((field) => String(field.id) === value)?.id;
};

// Only choice and yes/no fields filter: an option of the field, or yes / no.
const filterValues: Partial<Record<Field["type"], (value: string, field: ListField) => ItemFilter["value"] | undefined>> = {
  select: (value, field) => (field.options?.includes(value) ? value : undefined),
  checkbox: (value) => (value === "yes" ? true : value === "no" ? false : undefined),
};

export const filterableFields = <F extends ListField>(fields: F[]): F[] =>
  fields.filter((field) => filterValues[field.type]);

const filterOf = (field: ListField, value: string | null): ItemFilter[] => {
  const parsed = value === null ? undefined : filterValues[field.type]?.(value, field);
  return parsed === undefined ? [] : [{ fieldId: field.id, value: parsed }];
};

// `fields` are the collection's own, so a foreign field id never matches. With publicOnly, private fields are left
// out before anything else, so they can't be sorted or filtered on.
export const parseListParams = (search: URLSearchParams, fields: ListField[], context: ListContext): ListParams => {
  const usable = fields.filter((field) => field.isPublic || !context.publicOnly);
  const defaults = defaultsOf(context);
  return {
    view: oneOf(views, search.get("view"), defaults.view),
    q: (search.get("q") ?? "").trim().slice(0, maxQueryLength),
    sort: sortOf(search.get("sort"), usable, context.status) ?? defaults.sort,
    dir: oneOf(directions, search.get("dir"), defaults.dir),
    filters: filterableFields(usable).flatMap((field) => filterOf(field, search.get(`f.${field.id}`))),
  };
};

const filterText = (value: ItemFilter["value"]) => (typeof value === "string" ? value : value ? "yes" : "no");

// What a filter's control shows: the option, "yes" / "no", or "" for any.
export const filterInput = (params: ListParams, fieldId: number): string => {
  const filter = params.filters.find((candidate) => candidate.fieldId === fieldId);
  return filter ? filterText(filter.value) : "";
};

// The query string for `params` on the tab of `context`, leaving that tab's defaults out.
export const listQuery = (params: ListParams, context: ListContext): string => {
  const defaults = defaultsOf(context);
  const entries: Array<[string, string | false]> = [
    ["view", params.view !== defaults.view && params.view],
    ["q", params.q],
    ["sort", params.sort !== defaults.sort && String(params.sort)],
    ["dir", params.dir !== defaults.dir && params.dir],
    ...params.filters.map((filter): [string, string] => [`f.${filter.fieldId}`, filterText(filter.value)]),
  ];
  const query = new URLSearchParams(entries.filter((entry): entry is [string, string] => Boolean(entry[1])));
  return query.size > 0 ? `?${query}` : "";
};

// Wants can be reordered when the want tab is sorted by rank (rank inputs). Dragging also needs the rows shown to be
// the whole rank order, ascending and unfiltered, so a row's position is its rank.
export const reorderable = (params: ListParams, status: ItemStatus): { draggable: boolean } | undefined =>
  status === "want" && params.sort === "rank"
    ? { draggable: params.dir === "asc" && params.q === "" && params.filters.length === 0 }
    : undefined;

type SortDirection = "ascending" | "descending" | "none";

// A sortable column header: its current aria-sort, and the params its link leads to (ascending first, then a click on
// the active column flips the direction).
export const sortToggle = (params: ListParams, sort: ItemSort): { next: ListParams; direction: SortDirection } => {
  const active = params.sort === sort;
  const ascending = params.dir === "asc";
  return {
    next: { ...params, sort, dir: active && ascending ? "desc" : "asc" },
    direction: active ? (ascending ? "ascending" : "descending") : "none",
  };
};

// Search, filters, view and a chosen sort carry over to the other tab; the default sort (title or rank) becomes the
// other tab's default.
export const switchTab = (params: ListParams, from: ListContext, to: ListContext): ListParams =>
  params.sort === defaultsOf(from).sort ? { ...params, sort: defaultsOf(to).sort } : params;
