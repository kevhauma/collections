import { db } from "./connection";

// All SQL for OAuth clients, codes and tokens (TICKET-MCP-01). Codes and tokens are looked up by the SHA-256 of their
// value; the raw value is never stored.

export type OAuthClient = {
  id: string;
  name: string;
  redirectUris: string[];
  approvedAt: number | null;
  lastUsedAt: number | null;
};

type ClientRow = Omit<OAuthClient, "redirectUris"> & { redirectUrisJson: string };

const clientColumns =
  "id, name, redirect_uris_json as redirectUrisJson, approved_at as approvedAt, last_used_at as lastUsedAt";

const toClient = ({ redirectUrisJson, ...row }: ClientRow): OAuthClient => ({
  ...row,
  redirectUris: JSON.parse(redirectUrisJson) as string[],
});

export const getClient = (id: string): OAuthClient | undefined => {
  const row = db().prepare(`select ${clientColumns} from oauth_clients where id = ?`).get(id) as ClientRow | undefined;
  return row && toClient(row);
};

// Registers a client, or refreshes the name and redirect URIs of a known one (a metadata document can change).
export const saveClient = ({ id, name, redirectUris }: Pick<OAuthClient, "id" | "name" | "redirectUris">): void => {
  db()
    .prepare(
      `insert into oauth_clients (id, name, redirect_uris_json) values (@id, @name, @uris)
       on conflict (id) do update set name = excluded.name, redirect_uris_json = excluded.redirect_uris_json`,
    )
    .run({ id, name, uris: JSON.stringify(redirectUris) });
};

// Registrations nobody approved within a day, so open registration can't pile up rows.
export const deleteStaleClients = (createdBefore: number): void => {
  db().prepare("delete from oauth_clients where approved_at is null and created_at < ?").run(createdBefore);
};

export const listApprovedClients = (): OAuthClient[] =>
  (
    db()
      .prepare(`select ${clientColumns} from oauth_clients where approved_at is not null order by approved_at desc`)
      .all() as ClientRow[]
  ).map(toClient);

// Keeps the first approval time.
export const approveClient = (id: string, now: number): void => {
  db().prepare("update oauth_clients set approved_at = coalesce(approved_at, ?) where id = ?").run(now, id);
};

export const touchClient = (id: string, now: number): void => {
  db().prepare("update oauth_clients set last_used_at = ? where id = ?").run(now, id);
};

// Its codes and tokens go at once, and it leaves the approved list. False for an unknown or unapproved client.
export const revokeClient = (id: string): boolean =>
  db().transaction(() => {
    const revoked = db()
      .prepare("update oauth_clients set approved_at = null where id = ? and approved_at is not null")
      .run(id).changes;
    db().prepare("delete from oauth_codes where client_id = ?").run(id);
    db().prepare("delete from oauth_tokens where client_id = ?").run(id);
    return revoked > 0;
  })();

export type AuthorizationCode = {
  codeHash: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  resource: string;
  expiresAt: number;
};

export const insertCode = (code: AuthorizationCode): void => {
  db()
    .prepare(
      `insert into oauth_codes (code_hash, client_id, redirect_uri, code_challenge, resource, expires_at)
       values (@codeHash, @clientId, @redirectUri, @codeChallenge, @resource, @expiresAt)`,
    )
    .run(code);
};

// Single use: the code is deleted by the lookup itself, expired or not, so a second exchange never finds it.
export const takeCode = (codeHash: string): AuthorizationCode | undefined =>
  db()
    .prepare(
      `delete from oauth_codes where code_hash = ? returning code_hash as codeHash, client_id as clientId,
         redirect_uri as redirectUri, code_challenge as codeChallenge, resource, expires_at as expiresAt`,
    )
    .get(codeHash) as AuthorizationCode | undefined;

export type NewToken = { hash: string; kind: "access" | "refresh"; expiresAt: number };

const insertToken = `insert into oauth_tokens (token_hash, client_id, kind, resource, expires_at)
  values (@hash, @clientId, @kind, @resource, @expiresAt)`;

export const insertTokens = (clientId: string, resource: string, tokens: NewToken[]): void =>
  db().transaction(() => {
    const insert = db().prepare(insertToken);
    tokens.forEach((token) => insert.run({ ...token, clientId, resource }));
  })();

export type AccessToken = { clientId: string; resource: string; expiresAt: number };

// A live access token; expired, revoked and refresh tokens don't match.
export const findAccessToken = (hash: string, now: number): AccessToken | undefined =>
  db()
    .prepare(
      `select client_id as clientId, resource, expires_at as expiresAt from oauth_tokens
       where token_hash = ? and kind = 'access' and expires_at > ?`,
    )
    .get(hash, now) as AccessToken | undefined;

// Refresh token rotation in one transaction: the presented token is marked used and `next` is issued to the same client
// and resource. A token that was already used means a copy leaked, so every token of that client is revoked.
export const rotateRefreshToken = (
  hash: string,
  clientId: string,
  now: number,
  next: NewToken[],
): { result: "rotated" | "invalid" | "reused" } =>
  db().transaction(() => {
    const row = db()
      .prepare(
        `select resource, used_at as usedAt from oauth_tokens
         where token_hash = ? and client_id = ? and kind = 'refresh' and expires_at > ?`,
      )
      .get(hash, clientId, now) as { resource: string; usedAt: number | null } | undefined;
    if (!row) return { result: "invalid" as const };
    if (row.usedAt !== null) {
      db().prepare("delete from oauth_tokens where client_id = ?").run(clientId);
      return { result: "reused" as const };
    }
    db().prepare("update oauth_tokens set used_at = ? where token_hash = ?").run(now, hash);
    insertTokens(clientId, row.resource, next);
    return { result: "rotated" as const };
  })();

export const deleteExpiredOAuth = (now: number): void =>
  db().transaction(() => {
    db().prepare("delete from oauth_codes where expires_at <= ?").run(now);
    db().prepare("delete from oauth_tokens where expires_at <= ?").run(now);
  })();
