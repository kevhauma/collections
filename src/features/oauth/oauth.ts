import { createHash, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { BlockList } from "node:net";
import { z } from "zod";
import {
  findAccessToken,
  getClient,
  insertCode,
  insertTokens,
  rotateRefreshToken,
  takeCode,
  touchClient,
  type AccessToken,
  type NewToken,
  type OAuthClient,
} from "../../db/oauth";
import { readLimited } from "../images/fetch";
import { hashToken } from "../auth/session";

// The OAuth 2.1 authorization server behind /api/mcp (TICKET-MCP-01, ADR 0006): authorization codes with PKCE (S256
// only), refresh token rotation with reuse detection, and client lookup for registered clients and Client ID
// Metadata Documents. Tokens are random and opaque; only their SHA-256 is stored, like sessions.

const day = 24 * 60 * 60;
export const lifetimes = { code: 60, access: 60 * 60, refresh: 30 * day } as const;

// The issuer is this app's public origin: server.ts trusts the proxy's forwarded scheme and host, as for every page.
export const issuerOf = (request: Request): string => new URL(request.url).origin;

// The canonical URI of the MCP server (RFC 8707): every code and token is bound to it.
export const resourceOf = (request: Request): string => `${issuerOf(request)}/api/mcp`;

// Resource URIs compare without a trailing slash, and with the scheme and host lowercased (URL does that).
const canonical = (resource: string) => URL.parse(resource)?.href.replace(/\/$/, "");

export const sameResource = (a: string, b: string): boolean => canonical(a) !== undefined && canonical(a) === canonical(b);

const newSecret = () => randomBytes(32).toString("base64url");

// RFC 7636: the verifier's unreserved characters, 43 to 128 of them.
export const pkceVerifier = z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/);

export const pkceMatches = (verifier: string, challenge: string): boolean =>
  createHash("sha256").update(verifier).digest("base64url") === challenge;

const loopbackHosts = ["localhost", "127.0.0.1", "[::1]"];

// https anywhere, or plain http back to the client's own machine (a CLI's local callback). Never a fragment.
export const isAllowedRedirectUri = (uri: string): boolean => {
  const url = URL.parse(uri);
  if (!url || url.hash) return false;
  return url.protocol === "https:" || (url.protocol === "http:" && loopbackHosts.includes(url.hostname));
};

// RFC 8252 § 7.3: a native app's loopback redirect may use any port, because it listens on a free one per run (Claude
// Code's metadata document lists http://localhost/callback). Every other URI stays exactly as written.
const withoutLoopbackPort = (uri: string): string => {
  const url = URL.parse(uri);
  if (url?.protocol !== "http:" || !loopbackHosts.includes(url.hostname)) return uri;
  url.port = "";
  return url.href;
};

// The client's redirect URI list holds this string: no prefix, path or case leeway, and no port leeway beyond loopback.
export const redirectUriMatches = (client: Pick<OAuthClient, "redirectUris">, uri: string): boolean =>
  client.redirectUris.some((registered) => withoutLoopbackPort(registered) === withoutLoopbackPort(uri));

const clientName = z.string().trim().min(1).max(100);
const redirectUris = z.array(z.string().refine(isAllowedRedirectUri)).min(1).max(10);

// RFC 7591 registration. Every client is public (token_endpoint_auth_method "none"), whatever it asks for.
export const registrationSchema = z.object({
  client_name: clientName.catch("MCP client"),
  redirect_uris: redirectUris,
});

// A client_id that is a Client ID Metadata Document URL: https with a path.
export const isMetadataUrl = (clientId: string): boolean => {
  const url = URL.parse(clientId);
  return url?.protocol === "https:" && url.pathname !== "/" && url.href === clientId;
};

const metadataSchema = z.object({ client_id: z.string(), client_name: clientName, redirect_uris: redirectUris });

export type ClientInfo = Pick<OAuthClient, "id" | "name" | "redirectUris">;

// Loopback, private, link-local and CGNAT ranges: a metadata document URL must not reach the server's own network.
const internalRanges: [string, number, "ipv4" | "ipv6"][] = [
  ["0.0.0.0", 8, "ipv4"],
  ["10.0.0.0", 8, "ipv4"],
  ["100.64.0.0", 10, "ipv4"],
  ["127.0.0.0", 8, "ipv4"],
  ["169.254.0.0", 16, "ipv4"],
  ["172.16.0.0", 12, "ipv4"],
  ["192.168.0.0", 16, "ipv4"],
  ["::", 128, "ipv6"],
  ["::1", 128, "ipv6"],
  ["::ffff:0:0", 96, "ipv6"], // IPv4-mapped: refused outright rather than rechecked as IPv4
  ["fc00::", 7, "ipv6"],
  ["fe80::", 10, "ipv6"],
];
const internal = new BlockList();
internalRanges.forEach(([net, prefix, type]) => internal.addSubnet(net, prefix, type));

// fetch, refusing a host that resolves to an internal address (the CIMD spec asks for this).
// shortcut: fetch resolves the name again, so a DNS-rebinding host can still slip through; pin the checked address
// with a custom lookup if that matters.
export const publicFetch: typeof fetch = async (input, init) => {
  const addresses = await lookup(new URL(String(input)).hostname, { all: true });
  if (addresses.some(({ address, family }) => internal.check(address, family === 6 ? "ipv6" : "ipv4"))) {
    throw new Error("Internal address");
  }
  return fetch(input, init);
};

// Fetched on every authorization request, so a changed document applies at once. No redirects, 5 s, 10 kB.
// shortcut: no HTTP caching of metadata documents; add it if a client's host rate-limits us.
const fetchMetadata = async (clientId: string, fetcher: typeof fetch): Promise<ClientInfo | undefined> => {
  try {
    const response = await fetcher(clientId, { redirect: "error", signal: AbortSignal.timeout(5_000) });
    if (!response.ok || !response.body) return undefined;
    const parsed = metadataSchema.safeParse(JSON.parse((await readLimited(response.body, 10_000)).toString("utf8")));
    // The document must name itself: a copy hosted elsewhere is a different client.
    if (!parsed.success || parsed.data.client_id !== clientId) return undefined;
    return { id: clientId, name: parsed.data.client_name, redirectUris: parsed.data.redirect_uris };
  } catch {
    return undefined;
  }
};

// The client behind a client_id: its metadata document for a URL, its registration otherwise.
export const resolveClient = async (clientId: string, fetcher: typeof fetch = publicFetch): Promise<ClientInfo | undefined> =>
  isMetadataUrl(clientId) ? fetchMetadata(clientId, fetcher) : getClient(clientId);

// The client of an authorization request, when the redirect URI is one it registered: the only place a code may go.
export const authorizingClient = async (
  clientId: string,
  redirectUri: string,
  fetcher: typeof fetch = publicFetch,
): Promise<ClientInfo | undefined> => {
  const client = await resolveClient(clientId, fetcher);
  return client && redirectUriMatches(client, redirectUri) ? client : undefined;
};

export type CodeRequest = { clientId: string; redirectUri: string; codeChallenge: string; resource: string };

export const createCode = (request: CodeRequest, now: number): string => {
  const code = newSecret();
  insertCode({ ...request, codeHash: hashToken(code), expiresAt: now + lifetimes.code });
  return code;
};

export type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
};

// A fresh access and refresh token pair: what the client gets, and the hashes the database keeps.
const newTokens = (now: number): { body: TokenResponse; rows: NewToken[] } => {
  const [access, refresh] = [newSecret(), newSecret()];
  return {
    body: { access_token: access, token_type: "Bearer", expires_in: lifetimes.access, refresh_token: refresh },
    rows: [
      { hash: hashToken(access), kind: "access", expiresAt: now + lifetimes.access },
      { hash: hashToken(refresh), kind: "refresh", expiresAt: now + lifetimes.refresh },
    ],
  };
};

export type CodeExchange = { code: string; clientId: string; redirectUri: string; codeVerifier: string; resource?: string };

// Undefined for an unknown, used or expired code, another client, another redirect URI, a wrong PKCE verifier or
// another resource. The code is spent either way.
export const exchangeCode = (exchange: CodeExchange, now: number): TokenResponse | undefined => {
  const code = takeCode(hashToken(exchange.code));
  const valid =
    code !== undefined &&
    code.expiresAt > now &&
    code.clientId === exchange.clientId &&
    code.redirectUri === exchange.redirectUri &&
    pkceMatches(exchange.codeVerifier, code.codeChallenge) &&
    sameResource(exchange.resource ?? code.resource, code.resource);
  if (!valid) return undefined;
  const { body, rows } = newTokens(now);
  insertTokens(code.clientId, code.resource, rows);
  return body;
};

// Undefined for an unknown, expired or already rotated refresh token; the last one also revokes the client's tokens.
export const refreshTokens = (refreshToken: string, clientId: string, now: number): TokenResponse | undefined => {
  const { body, rows } = newTokens(now);
  return rotateRefreshToken(hashToken(refreshToken), clientId, now, rows).result === "rotated" ? body : undefined;
};

// The live access token behind a Bearer value, recording that its client was just used.
export const verifyAccessToken = (token: string, now: number): AccessToken | undefined => {
  const found = findAccessToken(hashToken(token), now);
  if (found) touchClient(found.clientId, now);
  return found;
};
