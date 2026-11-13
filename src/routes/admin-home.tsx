import { Trans, useLingui } from "@lingui/react/macro";
import type { ActionFunctionArgs } from "react-router";
import { requestContext } from "../context";
import { listCollections } from "../db/collections";
import { formatNumber } from "../i18n";
import { LinkButton } from "../ui/button";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import { LoginForm, loginAction, type LoginResult } from "./admin-login";
import { VisibilityBadge } from "./visibility-badge";

// /admin: the login form without a session, the dashboard (every collection) with one.

export const action = ({ request }: ActionFunctionArgs) => loginAction(request);

export default function AdminHome({ actionData }: { actionData?: LoginResult }) {
  return requestContext().session ? <Dashboard /> : <LoginForm error={actionData?.error} />;
}

function Dashboard() {
  const { t } = useLingui();
  const collections = listCollections();
  const newHref = "/admin/collections/new";
  return (
    <div className="grid gap-8">
      <title>{t({ id: "app.name", message: "Collections" })}</title>
      <div className="flex flex-wrap items-end gap-4">
        <h1>
          <Trans id="app.name">Collections</Trans>
        </h1>
        {collections.length > 0 && (
          <LinkButton href={newHref} variant="primary" className="sm:ml-auto">
            <Trans id="collections.new.action">+ New collection</Trans>
          </LinkButton>
        )}
      </div>
      {collections.length === 0 ? (
        <EmptyState
          title={t({ id: "collections.empty.title", message: "No collections yet" })}
          action={
            <LinkButton href={newHref} variant="primary">
              <Trans id="collections.empty.action">Create your first collection</Trans>
            </LinkButton>
          }
        >
          <Trans id="collections.empty.text">A collection is anything you keep a list of: records, LEGO sets, books.</Trans>
        </EmptyState>
      ) : (
        <ul className="grid items-start gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => {
            const have = formatNumber(collection.haveCount);
            const want = formatNumber(collection.wantCount);
            const base = `/admin/c/${collection.slug}`;
            return (
              <li key={collection.id}>
                <Card heading={collection.name}>
                  <div className="grid gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <VisibilityBadge isPublic={collection.isPublic} />
                      <p>
                        <Trans id="collections.counts">
                          {have} have · {want} want
                        </Trans>
                      </p>
                    </div>
                    {/* Named after the collection so the repeated link texts stay distinguishable. */}
                    <nav aria-label={collection.name} className="flex flex-wrap gap-2">
                      <LinkButton href={base} size="sm">
                        <Trans id="collections.link.items">Items</Trans>
                      </LinkButton>
                      <LinkButton href={`${base}/fields`} size="sm" variant="ghost">
                        <Trans id="collections.link.fields">Fields</Trans>
                      </LinkButton>
                      <LinkButton href={`${base}/settings`} size="sm" variant="ghost">
                        <Trans id="collections.link.settings">Settings</Trans>
                      </LinkButton>
                    </nav>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
