import { Trans, useLingui } from "@lingui/react/macro";
import { requireAdmin } from "../features/auth/guard";
import { LinkButton } from "../ui/button";
import { Card } from "../ui/card";

// /admin/export (TICKET-BAK-01): what the export holds, and the download.

export const loader = () => {
  requireAdmin();
  return null;
};

export default function AdminExport() {
  const { t } = useLingui();
  return (
    <div className="grid max-w-2xl gap-8">
      <title>{t({ id: "export.title", message: "Export · Collections" })}</title>
      <h1>
        <Trans id="export.heading">Export</Trans>
      </h1>
      <Card heading={t({ id: "export.card", message: "Everything in one zip" })} tone="ink">
        <div className="grid justify-items-start gap-4">
          <ul className="grid list-disc gap-2 pl-5">
            <li>
              <Trans id="export.data">
                <strong>data.json</strong>: every collection with its fields and items, private fields included.
              </Trans>
            </li>
            <li>
              <Trans id="export.csv">
                <strong>csv/</strong>: one spreadsheet per collection, for Excel or LibreOffice.
              </Trans>
            </li>
            <li>
              <Trans id="export.images">
                <strong>images/</strong>: every item image.
              </Trans>
            </li>
          </ul>
          <p className="text-ink-soft">
            <Trans id="export.restore">
              Keep it somewhere safe. Restoring from an export comes in a later version.
            </Trans>
          </p>
          <LinkButton variant="primary" href="/admin/export.zip" download>
            <Trans id="export.download">Download export</Trans>
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}
