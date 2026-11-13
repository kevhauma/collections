import { Trans } from "@lingui/react/macro";
import { Badge } from "../ui/badge";

export const VisibilityBadge = ({ isPublic }: { isPublic: 0 | 1 }) =>
  isPublic ? (
    <Badge variant="highlight">
      <Trans id="collections.public">Public</Trans>
    </Badge>
  ) : (
    <Badge variant="pencil">
      <Trans id="collections.private">Private</Trans>
    </Badge>
  );
