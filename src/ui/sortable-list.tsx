"use client";
import { startTransition, useOptimistic, useState, type DragEvent, type ReactNode } from "react";
import { moveInList } from "../lib/order";
import { cn } from "./cn";

// The dragged id travels in the drag data, not in state, so a drop never depends on a re-render in between. A
// private type also means drops from elsewhere (text, files) are ignored.
const dragType = "application/x-sortable-id";

type SortableListProps = {
  items: Array<{ id: number; content: ReactNode }>;
  // A server action: persist moving `id` to the 1-based position `to`. The page re-renders with the saved order.
  onMove: (id: number, to: number) => Promise<void>;
  // Tooltip of the drag handle. The handle is hidden from assistive tech: rows need their own move buttons.
  handleLabel: string;
  className?: string;
};

// Drag-and-drop reordering on top of rows that can already be moved without JS. Only the handle starts a drag, so
// inputs inside a row stay selectable. The new order shows at once and falls back if saving fails.
export const SortableList = ({ items, onMove, handleLabel, className }: SortableListProps) => {
  const [order, setOrder] = useOptimistic(items.map((item) => item.id));
  const [dragged, setDragged] = useState<number>();
  const content = new Map(items.map((item) => [item.id, item.content]));

  const start = (id: number) => (event: DragEvent<HTMLElement>) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(dragType, String(id));
    event.dataTransfer.setDragImage(event.currentTarget.closest("li") ?? event.currentTarget, 16, 16);
    setDragged(id);
  };

  const drop = (index: number) => (event: DragEvent<HTMLLIElement>) => {
    event.preventDefault();
    const moved = Number(event.dataTransfer.getData(dragType));
    if (!order.includes(moved)) return;
    startTransition(async () => {
      setOrder(moveInList(order, order.indexOf(moved), index));
      // A failed save ends the transition and the optimistic order falls back to the server's.
      await onMove(moved, index + 1).catch(() => undefined);
    });
  };

  return (
    <ol className={className}>
      {order.map((id, index) => (
        <li
          key={id}
          onDragOver={(event) => event.dataTransfer.types.includes(dragType) && event.preventDefault()}
          onDrop={drop(index)}
          className={cn("flex items-start gap-2", dragged === id && "opacity-40")}
        >
          <span
            draggable
            onDragStart={start(id)}
            onDragEnd={() => setDragged(undefined)}
            title={handleLabel}
            aria-hidden="true"
            className="mt-3 cursor-grab px-1 text-xl leading-none text-pencil select-none active:cursor-grabbing"
          >
            ⠿
          </span>
          <div className="min-w-0 flex-1">{content.get(id)}</div>
        </li>
      ))}
    </ol>
  );
};
