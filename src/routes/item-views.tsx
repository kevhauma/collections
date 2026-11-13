import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import type { Field, FieldType } from "../db/fields";
import type { Item, ItemSort, ItemStatus } from "../db/items";
import { formatDate, formatNumber } from "../i18n";
import { PostIt } from "../ui/post-it";
import { Rank } from "../ui/rank";
import { Table, Td, Th } from "../ui/table";

// The item list as a table or a grid of post-its (TICKET-ITM-05). Server components, shared by the admin list and the
// public pages: `mode: "public"` renders read-only, and its caller passes only public fields and stripped items.

type SortLink = { href: string; direction: "ascending" | "descending" | "none" };

export type ItemViewProps = {
  mode: "admin" | "public";
  status: ItemStatus;
  items: Item[];
  // The fields to show, in position order.
  fields: Field[];
  titleFieldId: number;
  slug: string;
  sortLink: (sort: ItemSort) => SortLink;
};

const Yes = () => <Trans id="items.value.yes">Yes</Trans>;

// A stored date is a plain YYYY-MM-DD day; formatting it in UTC keeps it from shifting a day.
const valueRenderers: Record<FieldType, (value: unknown) => ReactNode> = {
  text: String,
  select: String,
  // No grouping: collection numbers are mostly years and catalogue numbers, and "1,959" reads wrong.
  number: (value) => formatNumber(Number(value), { useGrouping: false, maximumFractionDigits: 20 }),
  date: (value) => formatDate(new Date(`${String(value)}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" }),
  checkbox: (value) => value === true && <Yes />,
  url: (value) => (
    <a href={String(value)} rel="noreferrer">
      {URL.parse(String(value))?.hostname ?? String(value)}
    </a>
  ),
};

const FieldValue = ({ field, value }: { field: Field; value: unknown }) =>
  value === undefined || value === null || value === "" ? null : valueRenderers[field.type](value);

const titleOf = (item: Item, titleFieldId: number) => String(item.values[titleFieldId] ?? "");

type TitleProps = Pick<ItemViewProps, "mode" | "slug" | "titleFieldId"> & { item: Item };

// The admin edits an item from its title; visitors only read it.
const Title = ({ mode, slug, titleFieldId, item }: TitleProps) =>
  mode === "admin" ? (
    <a href={`/admin/c/${slug}/items/${item.id}`}>{titleOf(item, titleFieldId)}</a>
  ) : (
    titleOf(item, titleFieldId)
  );

const postItColors = ["yellow", "pink", "blue", "green"] as const;

// shortcut: always the blank post-it, until TICKET-ITM-04 puts the item's image (alt = title, loading="lazy") in it.
const Thumbnail = ({ item, className, size }: { item: Item; className?: string; size: "sm" | "md" }) => (
  <PostIt
    size={size}
    color={postItColors[item.id % postItColors.length]}
    tilt={item.id % 2 ? "left" : "right"}
    fastening={item.id % 3 ? "pin" : "tape"}
    className={className}
  />
);

export const ItemTable = ({ mode, slug, status, items, fields, titleFieldId, sortLink }: ItemViewProps) => {
  const { t } = useLingui();
  return (
    <Table>
      <thead>
        <tr>
          {status === "want" && <Th sort={sortLink("rank")}>#</Th>}
          <Th>
            <span className="sr-only">{t({ id: "items.column.image", message: "Image" })}</span>
          </Th>
          {fields.map((field) => (
            <Th key={field.id} sort={sortLink(field.id)}>
              {field.label}
            </Th>
          ))}
          {status === "have" && <Th>{t({ id: "items.form.quantity", message: "How many" })}</Th>}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} id={`item-${item.id}`} className="scroll-mt-6">
            {status === "want" && (
              <Td>
                <Rank>{item.rank}</Rank>
              </Td>
            )}
            <Td className="w-18">
              <Thumbnail item={item} size="sm" />
            </Td>
            {fields.map((field) => (
              <Td key={field.id}>
                {field.id === titleFieldId ? (
                  <strong>
                    <Title mode={mode} slug={slug} titleFieldId={titleFieldId} item={item} />
                  </strong>
                ) : (
                  <FieldValue field={field} value={item.values[field.id]} />
                )}
              </Td>
            ))}
            {status === "have" && <Td>{formatNumber(item.quantity ?? 1)}</Td>}
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

// Have: "×2" beside the title when there's more than one. Want: the rank on the post-it.
const Quantity = ({ quantity }: { quantity: number | null }) => {
  const count = formatNumber(quantity ?? 1);
  return (quantity ?? 1) > 1 && <span className="text-ink-soft"> ×{count}</span>;
};

export const ItemGrid = ({ mode, slug, status, items, fields, titleFieldId }: Omit<ItemViewProps, "sortLink">) => {
  // The title plus the first two other fields, as a ticketing default.
  const shown = fields.filter((field) => field.id !== titleFieldId).slice(0, 2);
  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <li key={item.id} id={`item-${item.id}`} className="grid scroll-mt-6 content-start gap-3">
          <div className="relative">
            <Thumbnail item={item} size="md" className="aspect-square size-auto w-full max-w-44" />
            {status === "want" && <Rank className="absolute -top-3 -left-1">{item.rank}</Rank>}
          </div>
          <div className="grid gap-0.5">
            <strong>
              <Title mode={mode} slug={slug} titleFieldId={titleFieldId} item={item} />
              {status === "have" && <Quantity quantity={item.quantity} />}
            </strong>
            {shown.map((field) => (
              <span key={field.id} className="text-sm text-ink-soft">
                <FieldValue field={field} value={item.values[field.id]} />
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
};
