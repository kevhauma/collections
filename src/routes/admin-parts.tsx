import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { CollectionPicture } from "./collection-picture";
import { VisibilityBadge } from "./visibility-badge";

// Pieces collections and wishlists (TICKET-WSH-09) share on their admin pages.

type Listed = { name: string; isPublic: 0 | 1 };

// A card in the admin list: picture, visibility, a count, and links named after it so repeated link texts stay
// distinguishable.
export const AdminListCard = ({ name, image, isPublic, count, children }: Listed & { image: string | null; count: ReactNode; children: ReactNode }) => (
  <Card heading={name}>
    <div className="flex items-start gap-4">
      <CollectionPicture image={image} name={name} size="card" />
      <div className="grid min-w-0 flex-1 gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <VisibilityBadge isPublic={isPublic} />
          <p>{count}</p>
        </div>
        <nav aria-label={name} className="flex flex-wrap gap-2">
          {children}
        </nav>
      </div>
    </div>
  </Card>
);

// A list page's heading: the name, its visibility and the page's buttons.
export const AdminPageHeading = ({ name, isPublic, children }: Listed & { children: ReactNode }) => (
  <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
    <h1>{name}</h1>
    <VisibilityBadge isPublic={isPublic} />
    <div className="flex flex-wrap gap-2 sm:ml-auto">{children}</div>
  </div>
);

// A settings form's Save button with its "Saved." status.
export const SaveRow = ({ saved }: { saved?: boolean }) => (
  <div className="flex flex-wrap items-center gap-4">
    <Button variant="primary" type="submit">
      <Trans id="collections.settings.save">Save</Trans>
    </Button>
    <p role="status">{saved && <Trans id="collections.settings.saved">Saved.</Trans>}</p>
  </div>
);
