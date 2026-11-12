import { db } from "./connection";

// Sessions are keyed by the SHA-256 of their token; the raw token only ever lives in the cookie.
type SessionRow = { expires_at: number };

export const insertSession = (tokenHash: string, expiresAt: number): void => {
  db().prepare("insert into sessions (token_hash, expires_at) values (?, ?)").run(tokenHash, expiresAt);
};

export const findSession = (tokenHash: string): SessionRow | undefined =>
  db().prepare("select expires_at from sessions where token_hash = ?").get(tokenHash) as SessionRow | undefined;

export const renewSession = (tokenHash: string, expiresAt: number): void => {
  db().prepare("update sessions set expires_at = ? where token_hash = ?").run(expiresAt, tokenHash);
};

export const deleteSession = (tokenHash: string): void => {
  db().prepare("delete from sessions where token_hash = ?").run(tokenHash);
};

export const deleteExpiredSessions = (now: number): void => {
  db().prepare("delete from sessions where expires_at <= ?").run(now);
};
