import { Trans, useLingui } from "@lingui/react/macro";
import { redirect, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { requestContext } from "../context";
import { approveClient, saveClient } from "../db/oauth";
import { requireAdmin } from "../features/auth/guard";
import {
  authorizingClient,
  createCode,
  issuerOf,
  resourceOf,
  sameResource,
  type ClientInfo,
} from "../features/oauth/oauth";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";

// /admin/authorize (TICKET-MCP-01): the OAuth consent page. An agent's client sends the admin here; Approve sends a
// one-minute authorization code back to the client's registered redirect URI, Deny sends access_denied. A plain form,
// so it works without JS. A request that can't be verified never redirects anywhere: it shows an error instead.

export const loader = () => {
  requireAdmin();
  return null;
};

const authorizationRequest = z.object({
  response_type: z.literal("code"),
  client_id: z.string().min(1).max(2000),
  redirect_uri: z.string().max(2000),
  // A base64url SHA-256: PKCE with S256 is the only method.
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  code_challenge_method: z.literal("S256"),
  state: z.string().max(2000).optional(),
  resource: z.string(),
});

type Authorization = { client: ClientInfo; params: z.infer<typeof authorizationRequest> };

// The authorization request in the URL, once its resource is this server and its redirect URI is one the client
// registered; undefined otherwise.
const readAuthorization = async (request: Request): Promise<Authorization | undefined> => {
  const parsed = authorizationRequest.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success || !sameResource(parsed.data.resource, resourceOf(request))) return;
  const client = await authorizingClient(parsed.data.client_id, parsed.data.redirect_uri);
  return client && { client, params: parsed.data };
};

// Back to the client with `answer`, the state it sent and our issuer (RFC 9207).
const answer = ({ params }: Authorization, request: Request, response: Record<string, string>) => {
  const target = new URL(params.redirect_uri);
  const query = { ...response, ...(params.state === undefined ? {} : { state: params.state }), iss: issuerOf(request) };
  Object.entries(query).forEach(([name, value]) => target.searchParams.set(name, value));
  return redirect(target.href);
};

const decision = z.object({ intent: z.enum(["approve", "deny"]) });

export const action = async ({ request }: ActionFunctionArgs) => {
  requireAdmin();
  const posted = decision.safeParse(Object.fromEntries(await request.formData()));
  const authorization = await readAuthorization(request);
  if (!posted.success || !authorization) return new Response(null, { status: 400 });
  if (posted.data.intent === "deny") return answer(authorization, request, { error: "access_denied" });
  const now = Math.floor(Date.now() / 1000);
  const { client, params } = authorization;
  saveClient(client);
  approveClient(client.id, now);
  const code = createCode(
    { clientId: client.id, redirectUri: params.redirect_uri, codeChallenge: params.code_challenge, resource: resourceOf(request) },
    now,
  );
  return answer(authorization, request, { code });
};

// Reads the request in the component: after a form post, RSC renders without rerunning loaders.
export default async function Authorize() {
  const authorization = await readAuthorization(requestContext().request);
  return authorization ? <Consent authorization={authorization} /> : <Invalid />;
}

function Consent({ authorization }: { authorization: Authorization }) {
  const { t } = useLingui();
  const name = authorization.client.name;
  const host = new URL(authorization.params.redirect_uri).host;
  return (
    <div className="mx-auto grid max-w-xl gap-6 py-6">
      <title>{t({ id: "authorize.title", message: "Connect an app · Collections" })}</title>
      <h1>
        <Trans id="authorize.heading">Connect {name}?</Trans>
      </h1>
      <Card heading={t({ id: "authorize.card", message: "Access" })} tone="ink">
        <form method="post" className="grid gap-4">
          <p>
            <Trans id="authorize.access">
              <strong>{name}</strong> can read and edit all your collections: their fields and items, private fields
              included.
            </Trans>
          </p>
          <p className="text-ink-soft">
            <Trans id="authorize.returnsTo">Approving sends you back to {host}.</Trans>{" "}
            <Trans id="authorize.revoke">You can disconnect it at any time under Settings.</Trans>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" type="submit" name="intent" value="approve">
              <Trans id="authorize.approve">Approve</Trans>
            </Button>
            <Button type="submit" name="intent" value="deny">
              <Trans id="authorize.deny">Deny</Trans>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function Invalid() {
  const { t } = useLingui();
  return (
    <div className="mx-auto grid max-w-xl gap-6 py-6">
      <title>{t({ id: "authorize.title", message: "Connect an app · Collections" })}</title>
      <EmptyState title={t({ id: "authorize.invalid", message: "This connection request doesn't work." })}>
        <Trans id="authorize.invalid.hint">
          It is incomplete, or the app isn't known here. Start connecting again from the app.
        </Trans>
      </EmptyState>
    </div>
  );
}
