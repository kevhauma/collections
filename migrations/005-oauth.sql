-- TICKET-MCP-01: OAuth for AI agents on /api/mcp. Codes and tokens are stored as the SHA-256 of their value, like
-- sessions; the raw value only ever lives with the client.

-- A registered (DCR) or metadata-document (CIMD, id = its URL) client. approved_at is set when the admin approves it,
-- and cleared again by Revoke.
CREATE TABLE oauth_clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  redirect_uris_json TEXT NOT NULL,
  approved_at INTEGER,
  last_used_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE oauth_codes (
  code_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES oauth_clients ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  resource TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

-- A refresh token gets used_at when it is rotated; presenting it again revokes all of its client's tokens.
CREATE TABLE oauth_tokens (
  token_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES oauth_clients ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('access', 'refresh')),
  resource TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX oauth_tokens_client ON oauth_tokens (client_id);
