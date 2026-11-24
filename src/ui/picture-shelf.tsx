import type { ReactNode } from "react";
import { HoverMark } from "./hover-mark";

// A link to a list with a fan of its post-its after the label (the cards on the visitors' index): the post-its spread
// out while a pointer rests on it. `more` follows the fan, e.g. "+3" for the items it doesn't picture.
export const PictureShelf = ({ href, label, more, children }: { href: string; label: ReactNode; more?: ReactNode; children?: ReactNode }) => (
  <a href={href} className="relative -mx-2 flex items-center gap-3 rounded-[2px] px-2 py-sq-half font-bold text-ink no-underline">
    <span className="min-w-14 shrink-0 text-sm">{label}</span>
    <span className="picture-fan">
      {children}
      {more && <span className="ms-2 font-hand text-3xl leading-none font-normal">{more}</span>}
    </span>
    <HoverMark />
  </a>
);
