import {
  createMcpHandler,
  getOAuthProtectedResourceMetadataUrl,
  OAuthError,
  oauthMetadataResponse,
  originValidationResponse,
  requireBearerAuth,
  type AuthMetadataOptions,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import { runWithContext } from "../../context";
import { deleteStaleClients, saveClient } from "../../db/oauth";
import { createRateLimiter } from "../auth/rate-limit";
import {
  exchangeCode,
  issuerOf,
  pkceVerifier,
  refreshTokens,
  registrationSchema,
  resourceOf,
  verifyAccessToken,
} from "../oauth/oauth";
import { mcpServer } from "./tools";

// Everything server.ts routes here, outside React Router (TICKET-MCP-01, ADR 0006): the OAuth discovery documents,
// client registration, the token endpoint and the MCP endpoint. None of it reads the session cookie: /api/mcp only
// accepts a Bearer token, and /admin pages never accept one.

const nowSeconds = () => Math.floor(Date.now() / 1000);

const metadataOptions = (request: Request): AuthMetadataOptions => {
  const issuer = issuerOf(request);
  return {
    resourceServerUrl: new URL(resourceOf(request)),
    resourceName: "Collections",
    oauthMetadata: {
      issuer,
      authorization_endpoint: `${issuer}/admin/authorize`,
      token_endpoint: `${issuer}/api/oauth/token`,
      registration_endpoint: `${issuer}/api/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      client_id_metadata_document_supported: true,
      authorization_response_iss_parameter_supported: true,
    },
  };
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const oauthError = (error: string, status = 400) => json({ error }, status);

const day = 24 * 60 * 60;
// Global, like the login limiter: registration is open to anyone, and a burst of failed exchanges is someone guessing.
const registerLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
const tokenLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

const register = async (request: Request) => {
  if (registerLimiter.blocked()) return oauthError("too_many_requests", 429);
  const parsed = registrationSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return oauthError("invalid_redirect_uri");
  registerLimiter.fail();
  const now = nowSeconds();
  deleteStaleClients(now - day);
  const client = { id: crypto.randomUUID(), name: parsed.data.client_name, redirectUris: parsed.data.redirect_uris };
  saveClient(client);
  return json(
    {
      client_id: client.id,
      client_id_issued_at: now,
      client_name: client.name,
      redirect_uris: client.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    201,
  );
};

const tokenRequest = z.discriminatedUnion("grant_type", [
  z.object({
    grant_type: z.literal("authorization_code"),
    code: z.string(),
    redirect_uri: z.string(),
    client_id: z.string(),
    code_verifier: pkceVerifier,
    resource: z.string().optional(),
  }),
  z.object({ grant_type: z.literal("refresh_token"), refresh_token: z.string(), client_id: z.string() }),
]);

const token = async (request: Request) => {
  if (tokenLimiter.blocked()) return oauthError("too_many_requests", 429);
  const form = await request.formData().catch(() => undefined);
  const parsed = tokenRequest.safeParse(form && Object.fromEntries(form));
  if (!parsed.success) return oauthError("invalid_request");
  const input = parsed.data;
  const now = nowSeconds();
  const issued =
    input.grant_type === "authorization_code"
      ? exchangeCode(
          {
            code: input.code,
            clientId: input.client_id,
            redirectUri: input.redirect_uri,
            codeVerifier: input.code_verifier,
            resource: input.resource,
          },
          now,
        )
      : refreshTokens(input.refresh_token, input.client_id, now);
  if (issued) return json(issued);
  tokenLimiter.fail();
  return oauthError("invalid_grant");
};

const verifier = {
  verifyAccessToken: async (value: string) => {
    const found = verifyAccessToken(value, nowSeconds());
    if (!found) throw new OAuthError("invalid_token", "The access token is unknown, expired or revoked.");
    return { token: value, clientId: found.clientId, scopes: [], expiresAt: found.expiresAt, resource: new URL(found.resource) };
  },
};

const handler = createMcpHandler(mcpServer, { responseMode: "json" });

// A browser page from another site (DNS rebinding) is refused; agents send no Origin. Then the Bearer token, bound to
// this server's resource URI; the tools run as the admin, with the UI's English messages.
const mcp = async (request: Request) => {
  const resource = new URL(resourceOf(request));
  const foreign = originValidationResponse(request, [resource.hostname]);
  if (foreign) return foreign;
  const gate = requireBearerAuth({
    verifier,
    expectedResource: resource,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(resource),
  });
  const authInfo = await gate(request);
  if (authInfo instanceof Response) return authInfo;
  return runWithContext({ request, locale: "en", setCookies: [] }, () => handler.fetch(request, { authInfo }));
};

const routes: Record<string, (request: Request) => Promise<Response>> = {
  "POST /api/oauth/register": register,
  "POST /api/oauth/token": token,
};

export const api = async (request: Request): Promise<Response> => {
  const { pathname } = new URL(request.url);
  if (pathname === "/api/mcp") return mcp(request);
  if (pathname.startsWith("/.well-known/")) {
    return oauthMetadataResponse(request, metadataOptions(request)) ?? new Response(null, { status: 404 });
  }
  return (routes[`${request.method} ${pathname}`] ?? (async () => new Response(null, { status: 404 })))(request);
};
