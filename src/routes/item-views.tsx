import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import type { Field, FieldType } from "../db/fields";
import type { Item, ItemSort, ItemStatus } from "../db/items";
import { affixes, isBlank } from "../features/collections/affixes";
import { postItLook } from "../features/items/post-it-look";
import { isHttpUrl } from "../features/items/schema";
import { imageUrl, thumbUrl } from "../features/images/shared";
import { formatDate, formatNumber } from "../i18n";
import { Dialog } from "../ui/dialog";
import { HoverMark } from "../ui/hover-mark";
import { PostIt } from "../ui/post-it";
import { Rating } from "../ui/rating";
import { Input } from "../ui/input";
import { Rank } from "../ui/rank";
import { SortableList } from "../ui/sortable-list";
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
  // The url field the title links to (TICKET-COL-09), only when it's one of `fields` and still a url field.
  titleLinkFieldId?: number;
  // The collection's default item image (TICKET-COL-08), for items without one.
  itemImage?: string | null;
  // Makes row and dialog ids unique when an item shows in several groups (TICKET-ITM-06), e.g. "-g2".
  idScope?: string;
  // Where the admin's item links go: /admin/c/<slug>/items, or /admin/wishlist/items (TICKET-WSH-03).
  itemsBase: string;
  // Sortable headers; the wishlist has none.
  sortLink?: (sort: ItemSort) => SortLink;
  // Admin want tab sorted by rank (TICKET-ITM-03): rank inputs, plus drag handles when the rows shown are the whole
  // rank order (ascending, unfiltered), so a row's position is its rank.
  ranking?: Ranking;
};

type Ranking = { draggable: boolean; count: number; onMove: (id: number, to: number) => Promise<void> };

const Yes = () => <Trans id="items.value.yes">Yes</Trans>;

const RatingValue = ({ value: score, field }: { value: number; field: Field }) => {
  const { t } = useLingui();
  const max = field.ratingMax ?? score;
  return (
    <Rating value={score} max={max} symbol={field.ratingSymbol ?? "★"} label={t({ id: "rating.label", message: `${score} of ${max}` })} />
  );
};

// A stored date is a plain YYYY-MM-DD day; formatting it in UTC keeps it from shifting a day.
const valueRenderers: Record<FieldType, (value: unknown, field: Field) => ReactNode> = {
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
  rating: (value, field) => <RatingValue value={Number(value)} field={field} />,
};

// `children` replaces the type's rendering (the title, which links to the item) but keeps the prefix and suffix.
const FieldValue = ({ field, value, children }: { field: Field; value: unknown; children?: ReactNode }) => {
  const { before, after } = affixes(field);
  return (
    !isBlank(value) && (
      <>
        {before}
        {children ?? valueRenderers[field.type](value, field)}
        {after}
      </>
    )
  );
};

const titleOf = (item: Item, titleFieldId: number) => String(item.values[titleFieldId] ?? "");

type TitleProps = Pick<ItemViewProps, "mode" | "itemsBase" | "titleFieldId" | "titleLinkFieldId"> & { item: Item };

// The item's source link (TICKET-COL-09): its value in the title link field, if it's an http(s) address.
const sourceOf = (item: Item, titleLinkFieldId?: number) => {
  const value = titleLinkFieldId === undefined ? undefined : item.values[titleLinkFieldId];
  return typeof value === "string" && isHttpUrl(value) ? value : undefined;
};

// The admin edits an item from its title, with a small ↗ to its source; for visitors the title opens the source.
const Title = ({ mode, itemsBase, titleFieldId, titleLinkFieldId, item }: TitleProps) => {
  const { t } = useLingui();
  const title = titleOf(item, titleFieldId);
  const source = sourceOf(item, titleLinkFieldId);
  if (mode === "public") return source ? <a href={source} rel="noreferrer">{title}</a> : title;
  const label = t({ id: "items.title.source", message: `Source of ${title}` });
  return (
    <>
      <a href={`${itemsBase}/${item.id}`}>{title}</a>
      {source && (
        <a
          href={source}
          rel="noreferrer"
          aria-label={label}
          title={label}
          className="ml-1 inline-flex min-h-6 min-w-6 items-center justify-center no-underline"
        >
          ↗
        </a>
      )}
    </>
  );
};

type ThumbnailProps = {
  item: Item;
  alt: string;
  fallback?: string | null;
  idScope?: string;
  className?: string;
  size: "sm" | "md";
};

// The item's picture opens at display size in a native dialog (TICKET-UI-08): invoker commands and `closedby="any"`
// (Escape, the × and a backdrop click), so it works without JS and on public pages.
type EnlargeableProps = { item: Item; image: string; title: string; idScope?: string; children: ReactNode };

const Enlargeable = ({ item, image, title, idScope = "", children }: EnlargeableProps) => {
  const { t } = useLingui();
  const dialog = `picture${idScope}-${item.id}`;
  return (
    <>
      <button
        type="button"
        commandfor={dialog}
        command="show-modal"
        aria-label={t({ id: "items.picture.open", message: `Show ${title} larger` })}
        className="relative block cursor-zoom-in"
      >
        {children}
        <HoverMark />
      </button>
      <Dialog
        id={dialog}
        title={title}
        closeLabel={t({ id: "items.picture.close", message: "Close" })}
        closedby="any"
        className="w-[min(48rem,calc(100vw-2rem))]"
      >
        <img src={imageUrl(image)} alt={title} loading="lazy" className="max-h-[75dvh] w-full object-contain" />
      </Dialog>
    </>
  );
};

// The item's image on a post-it, which opens it large; without one, the collection's default item image (decorative,
// not a picture of this item, so no alt and nothing to enlarge, TICKET-COL-08) or the blank post-it. Pinned, taped or
// clipped by a hash of the id (TICKET-UI-09).
const Thumbnail = ({ item, alt, fallback, idScope, className, size }: ThumbnailProps) => {
  const postIt = (image: string | null | undefined, imageAlt: string) => (
    <PostIt size={size} {...postItLook(item.id)} className={className}>
      {image && <img src={thumbUrl(image)} alt={imageAlt} loading="lazy" className="size-full object-cover" />}
    </PostIt>
  );
  return item.image ? (
    <Enlargeable item={item} image={item.image} title={alt} idScope={idScope}>
      {postIt(item.image, alt)}
    </Enlargeable>
  ) : (
    postIt(fallback, "")
  );
};

// Type a new rank and press Enter: a plain form posting to the list route's action, so it works without JS.
const RankForm = ({ item, title, count }: { item: Item; title: string; count: number }) => {
  const { t } = useLingui();
  return (
    <form method="post">
      <input type="hidden" name="intent" value="move" />
      <input type="hidden" name="itemId" value={item.id} />
      <Input
        type="number"
        name="rank"
        min={1}
        max={count}
        step={1}
        defaultValue={item.rank ?? ""}
        aria-label={t({ id: "items.rank.label", message: `Priority of ${title}` })}
        className="w-20"
      />
    </form>
  );
};

type RankCellProps = { item: Item; titleFieldId: number; ranking?: Ranking; className?: string };

// The rank input while reordering, the scrawled numeral otherwise.
const RankCell = ({ item, titleFieldId, ranking, className }: RankCellProps) =>
  ranking ? (
    // Keyed by rank, so after a reorder the input shows the new number rather than keeping the old one.
    <RankForm key={`${item.id}-${item.rank}`} item={item} title={titleOf(item, titleFieldId)} count={ranking.count} />
  ) : (
    <Rank className={className}>{item.rank}</Rank>
  );

// One sortable list of rows, or a plain one. The handle and its failure message are the same for table and grid.
const Rows = ({ items, ranking, layout, className, idScope = "", row }: {
  items: Item[];
  idScope?: string;
  ranking?: Ranking;
  layout: "table" | "list";
  className?: string;
  row: (item: Item) => ReactNode;
}) => {
  const { t } = useLingui();
  return ranking?.draggable ? (
    <SortableList
      layout={layout}
      className={className}
      items={items.map((item) => ({ id: item.id, anchor: `item${idScope}-${item.id}`, content: row(item) }))}
      onMove={ranking.onMove}
      handleLabel={t({ id: "items.dragHandle", message: "Drag to reorder" })}
      failedMessage={t({ id: "order.moveFailed", message: "Couldn't save the new order. Try again." })}
    />
  ) : (
    <PlainRows layout={layout} className={className} items={items} idScope={idScope} row={row} />
  );
};

const PlainRows = ({ layout, className, items, idScope, row }: {
  layout: "table" | "list";
  idScope: string;
  className?: string;
  items: Item[];
  row: (item: Item) => ReactNode;
}) =>
  layout === "table" ? (
    <tbody className={className}>
      {items.map((item) => (
        <tr key={item.id} id={`item${idScope}-${item.id}`} className="scroll-mt-6">
          {row(item)}
        </tr>
      ))}
    </tbody>
  ) : (
    <ul className={className}>
      {items.map((item) => (
        <li key={item.id} id={`item${idScope}-${item.id}`} className="scroll-mt-6">
          {row(item)}
        </li>
      ))}
    </ul>
  );

const TableCells = ({ item, ...props }: ItemViewProps & { item: Item }) => (
  <>
    {props.status === "want" && (
      <Td>
        <RankCell item={item} titleFieldId={props.titleFieldId} ranking={props.ranking} />
      </Td>
    )}
    {/* Four squares tall, so a row with a picture stays on the grid. */}
    <Td className="h-sq-4 w-18">
      <Thumbnail item={item} alt={titleOf(item, props.titleFieldId)} fallback={props.itemImage} idScope={props.idScope} size="sm" />
    </Td>
    {props.fields.map((field) => (
      <Td key={field.id}>
        {field.id === props.titleFieldId ? (
          <strong>
            <FieldValue field={field} value={item.values[field.id]}>
              <Title {...props} item={item} />
            </FieldValue>
          </strong>
        ) : (
          <FieldValue field={field} value={item.values[field.id]} />
        )}
      </Td>
    ))}
    {props.status === "have" && <Td>{formatNumber(item.quantity ?? 1)}</Td>}
  </>
);

// The drag handles' column, when there are handles.
const HandleHeader = ({ ranking }: { ranking?: Ranking }) => {
  const { t } = useLingui();
  return (
    ranking?.draggable && (
      <Th>
        <span className="sr-only">{t({ id: "items.dragHandle", message: "Drag to reorder" })}</span>
      </Th>
    )
  );
};

const TableHead = ({ status, fields, sortLink, ranking }: ItemViewProps) => {
  const { t } = useLingui();
  return (
    <thead>
      <tr>
        <HandleHeader ranking={ranking} />
        {status === "want" && <Th sort={sortLink?.("rank")}>#</Th>}
        <Th>
          <span className="sr-only">{t({ id: "items.column.image", message: "Image" })}</span>
        </Th>
        {fields.map((field) => (
          <Th key={field.id} sort={sortLink?.(field.id)}>
            {field.label}
          </Th>
        ))}
        {status === "have" && <Th>{t({ id: "items.form.quantity", message: "How many" })}</Th>}
      </tr>
    </thead>
  );
};

export const ItemTable = (props: ItemViewProps) => (
  <Table>
    <TableHead {...props} />
    <Rows
      items={props.items}
      ranking={props.ranking}
      layout="table"
      idScope={props.idScope}
      row={(item) => <TableCells {...props} item={item} />}
    />
  </Table>
);

// Have: "×2" beside the title when there's more than one. Want: the rank on the post-it.
const Quantity = ({ quantity }: { quantity: number | null }) => {
  const count = formatNumber(quantity ?? 1);
  return (quantity ?? 1) > 1 && <span className="text-ink-soft"> ×{count}</span>;
};

// A want's numeral sits on its post-it's corner; its rank input, while reordering, under the title.
const GridCard = ({ item, shown, titleField, ...props }: ItemViewProps & { item: Item; shown: Field[]; titleField: Field }) => (
  <div className="relative grid content-start gap-sq">
    <Thumbnail
      item={item}
      alt={titleOf(item, props.titleFieldId)}
      fallback={props.itemImage}
      idScope={props.idScope}
      size="md"
      // A whole number of squares wide (and so tall), at most 8.
      className="aspect-square size-auto w-[min(round(down,100%,var(--grid-square)),11rem)]"
    />
    <div className="grid">
      <strong>
        <FieldValue field={titleField} value={item.values[titleField.id]}>
          <Title {...props} item={item} />
        </FieldValue>
        {props.status === "have" && <Quantity quantity={item.quantity} />}
      </strong>
      {shown.map((field) => (
        <span key={field.id} className="text-sm text-ink-soft">
          <FieldValue field={field} value={item.values[field.id]} />
        </span>
      ))}
      {props.status === "want" && (
        <RankCell
          item={item}
          titleFieldId={props.titleFieldId}
          ranking={props.ranking}
          className="absolute -top-3 -left-1"
        />
      )}
    </div>
  </div>
);

export const ItemGrid = (props: ItemViewProps) => {
  // The title plus the first two other fields, as a ticketing default.
  const shown = props.fields.filter((field) => field.id !== props.titleFieldId).slice(0, 2);
  // The title field is always public, so it's in the list on public pages too.
  const titleField = props.fields.find((field) => field.id === props.titleFieldId)!;
  return (
    <Rows
      items={props.items}
      ranking={props.ranking}
      idScope={props.idScope}
      layout="list"
      className="grid grid-cols-2 gap-x-5 gap-y-sq-2 sm:grid-cols-3 lg:grid-cols-5"
      row={(item) => <GridCard {...props} item={item} shown={shown} titleField={titleField} />}
    />
  );
};
