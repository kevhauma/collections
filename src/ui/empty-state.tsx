import type { ReactNode } from "react";
import { PostIt } from "./post-it";

type EmptyStateProps = { title: ReactNode; children?: ReactNode; action?: ReactNode };

// Nothing here yet: a blank post-it beside a scrawled note and the one action that fills the space.
export const EmptyState = ({ title, children, action }: EmptyStateProps) => (
  <div className="flex flex-wrap items-center gap-5 py-6">
    <PostIt size="md" color="blue" fastening="tape" />
    <div className="grid max-w-prose gap-2">
      <p className="font-hand text-4xl leading-none">{title}</p>
      {children && <p className="text-ink-soft">{children}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  </div>
);
