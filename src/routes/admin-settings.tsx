import { Trans, useLingui } from "@lingui/react/macro";
import { redirect, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { requestContext } from "../context";
import { listApprovedClients, revokeClient, type OAuthClient } from "../db/oauth";
import { getDefaultLocale, setDefaultLocale } from "../db/settings";
import { requireAdmin } from "../features/auth/guard";
import { resourceOf } from "../features/oauth/oauth";
import { formatDate } from "../i18n";
import { locales } from "../i18n/locale";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Dialog } from "../ui/dialog";
import { EmptyState } from "../ui/empty-state";
import { FormField } from "../ui/form-field";
import { Select } from "../ui/input";

// /admin/settings: the default language for visitors whose browser asks for neither Dutch nor English, and the apps
// connected through /api/mcp (TICKET-MCP-01), each with a Revoke that ends its access at once.

export const loader = () => {
  requireAdmin();
  return null;
};

const schema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("locale"), defaultLocale: z.enum(locales) }),
  z.object({ intent: z.literal("revoke"), clientId: z.string().min(1) }),
]);

type Saved = { saved: boolean };

export const action = async ({ request }: ActionFunctionArgs): Promise<Saved | Response> => {
  requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) return new Response(null, { status: 400 });
  const input = parsed.data;
  if (input.intent === "locale") {
    setDefaultLocale(input.defaultLocale);
    return { saved: true };
  }
  // A redirect, so a reload doesn't post again. An unknown or already revoked client changes nothing.
  revokeClient(input.clientId);
  return redirect("/admin/settings#apps");
};

export default function AdminSettings({ actionData }: { actionData?: Saved }) {
  const { t } = useLingui();
  return (
    <div className="grid max-w-xl gap-6">
      <title>{t({ id: "settings.title", message: "Settings · Collections" })}</title>
      <h1>
        <Trans id="settings.heading">Settings</Trans>
      </h1>
      <Card heading={t({ id: "settings.visitors", message: "Visitors" })} tone="ink">
        <form method="post" className="grid gap-4">
          <FormField
            id="settings-default-locale"
            label={t({ id: "settings.defaultLocale", message: "Default language" })}
            hint={t({
              id: "settings.defaultLocale.hint",
              message: "Used when a visitor's browser asks for neither English nor Dutch.",
            })}
          >
            {(control) => (
              <Select {...control} name="defaultLocale" defaultValue={getDefaultLocale()}>
                <option value="en" lang="en">
                  English
                </option>
                <option value="nl" lang="nl">
                  Nederlands
                </option>
              </Select>
            )}
          </FormField>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary" type="submit" name="intent" value="locale">
              <Trans id="settings.save">Save</Trans>
            </Button>
            <p role="status">{actionData?.saved && <Trans id="settings.saved">Saved.</Trans>}</p>
          </div>
        </form>
      </Card>
      <ConnectedApps />
    </div>
  );
}

function ConnectedApps() {
  const { t } = useLingui();
  const clients = listApprovedClients();
  const url = resourceOf(requestContext().request);
  return (
    <section id="apps">
      <Card heading={t({ id: "settings.apps", message: "Connected apps" })} tone="ink">
        {clients.length === 0 ? (
          <EmptyState title={t({ id: "settings.apps.empty", message: "No apps connected" })}>
            <Trans id="settings.apps.emptyHint">
              An AI agent such as Claude can add and edit items for you. Add this server address to it as an MCP
              server, then approve it here when it asks.
            </Trans>
          </EmptyState>
        ) : (
          <ul className="grid gap-3">
            {clients.map((client, index) => (
              <ClientRow key={client.id} client={client} dialogId={`revoke-app-${index}`} />
            ))}
          </ul>
        )}
        <p className="mt-4 grid gap-1">
          <span className="text-ink-soft">
            <Trans id="settings.apps.address">MCP server address</Trans>
          </span>
          <code className="break-all">{url}</code>
        </p>
      </Card>
    </section>
  );
}

const when = (seconds: number) => formatDate(seconds * 1000, { dateStyle: "medium", timeStyle: "short" });

function ClientRow({ client, dialogId }: { client: OAuthClient; dialogId: string }) {
  const { t } = useLingui();
  const name = client.name;
  const approved = when(client.approvedAt ?? 0);
  const used = client.lastUsedAt === null ? undefined : when(client.lastUsedAt);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3">
      <div className="grid gap-0.5">
        <strong>{name}</strong>
        <span className="text-ink-soft">
          <Trans id="settings.apps.approved">Approved {approved}</Trans>
          {" · "}
          {used ? (
            <Trans id="settings.apps.used">last used {used}</Trans>
          ) : (
            <Trans id="settings.apps.unused">not used yet</Trans>
          )}
        </span>
      </div>
      <Button variant="danger" size="sm" commandfor={dialogId} command="show-modal">
        <Trans id="settings.apps.revoke">Revoke</Trans>
      </Button>
      <Dialog
        id={dialogId}
        title={t({ id: "settings.apps.revokeTitle", message: `Revoke ${name}?` })}
        closeLabel={t({ id: "collections.delete.close", message: "Close" })}
      >
        <form method="post" className="grid gap-4">
          <input type="hidden" name="clientId" value={client.id} />
          <p>
            <Trans id="settings.apps.revokeText">
              It loses access at once. To use it again, connect it again and approve it.
            </Trans>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" type="submit" name="intent" value="revoke">
              <Trans id="settings.apps.revokeConfirm">Revoke access</Trans>
            </Button>
            <Button type="button" commandfor={dialogId} command="close">
              <Trans id="collections.delete.cancel">Keep it</Trans>
            </Button>
          </div>
        </form>
      </Dialog>
    </li>
  );
}
