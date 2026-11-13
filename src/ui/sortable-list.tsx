"use client";
import { startTransition, useOptimistic, useState, type DragEvent, type ReactNode } from "react";
import { moveInList } from "../lib/order";
import { cn } from "./cn";

// The dragged id travels in the drag data, not in state, so a drop never depends on a re-render in between. A
// private type also means drops from elsewhere (text, files) are ignored.
const dragType = "application/x-sortable-id";

// `list`: an <ol> of blocks. `table`: the <tbody> of a table, each row's content being its own <td> cells; the
// handle gets a cell of its own, so the table's header needs one more column.
const layouts = {
  list: {
    Container: "ol",
    Row: "li",
    row: "flex items-start gap-2",
    handle: (handle: ReactNode) => handle,
    content: (content: ReactNode) => <div className="min-w-0 flex-1">{content}</div>,
    alert: (text: string) => (
      <li role="alert" className="font-bold text-red-pen">
        {text}
      </li>
    ),
  },
  table: {
    Container: "tbody",
    Row: "tr",
    row: "scroll-mt-6",
    handle: (handle: ReactNode) => <td className="w-6 border-b border-dashed border-rule">{handle}</td>,
    content: (content: ReactNode) => content,
    alert: (text: string) => (
      <tr>
        <td colSpan={99} role="alert" className="py-2 font-bold text-red-pen">
          {text}
        </td>
      </tr>
    ),
  },
} as const;

type SortableListProps = {
  // `anchor`: the row's HTML id, for links like #item-12.
  items: Array<{ id: number; content: ReactNode; anchor?: string }>;
  // A server action: persist moving `id` to the 1-based position `to`. The page re-renders with the saved order.
  onMove: (id: number, to: number) => Promise<void>;
  // Tooltip of the drag handle. The handle is hidden from assistive tech: rows need their own move controls.
  handleLabel: string;
  // Shown when saving a move fails and the order falls back.
  failedMessage: string;
  layout?: keyof typeof layouts;
  className?: string;
};

// Drag-and-drop reordering on top of rows that can already be moved without JS. Only the handle starts a drag, so
// inputs inside a row stay usable. The new order shows at once and falls back, with a message, if saving fails.
export const SortableList = ({
  items,
  onMove,
  handleLabel,
  failedMessage,
  layout = "list",
  className,
}: SortableListProps) => {
  const [order, setOrder] = useOptimistic(items.map((item) => item.id));
  const [dragged, setDragged] = useState<number>();
  const [over, setOver] = useState<number>();
  const [failed, setFailed] = useState(false);
  const byId = new Map(items.map((item) => [item.id, item]));
  const { Container, Row, ...parts } = layouts[layout];

  const start = (id: number) => (event: DragEvent<HTMLElement>) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(dragType, String(id));
    event.dataTransfer.setDragImage(event.currentTarget.closest("li, tr") ?? event.currentTarget, 16, 16);
    setDragged(id);
  };

  const end = () => {
    setDragged(undefined);
    setOver(undefined);
  };

  const drop = (index: number) => (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    end();
    const moved = Number(event.dataTransfer.getData(dragType));
    if (!order.includes(moved)) return;
    setFailed(false);
    startTransition(async () => {
      setOrder(moveInList(order, order.indexOf(moved), index));
      // A failed save ends the transition, so the optimistic order falls back to the server's.
      await onMove(moved, index + 1).catch(() => setFailed(true));
    });
  };

  // The dragged row fades; the drop target gets the highlighter.
  const rowClass = (id: number, index: number) =>
    cn(parts.row, dragged === id && "opacity-40", over === index && "bg-highlighter");

  const dragOver = (index: number) => (event: DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes(dragType)) return;
    event.preventDefault();
    setOver(index);
  };

  return (
    <Container className={className}>
      {failed && parts.alert(failedMessage)}
      {order.map((id, index) => (
        <Row
          key={id}
          id={byId.get(id)?.anchor}
          onDragOver={dragOver(index)}
          onDrop={drop(index)}
          className={rowClass(id, index)}
        >
          {parts.handle(
            <span
              draggable
              onDragStart={start(id)}
              onDragEnd={end}
              title={handleLabel}
              aria-hidden="true"
              className="inline-block cursor-grab px-1 py-2 text-xl leading-none text-pencil select-none active:cursor-grabbing"
            >
              ⠿
            </span>,
          )}
          {parts.content(byId.get(id)?.content)}
        </Row>
      ))}
    </Container>
  );
};
