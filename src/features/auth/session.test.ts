import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/connection";
import { createSession, destroySession, getSession, hashToken, sessionCookie } from "./session";

// db() opens DATA_DIR on first use; vitest isolates test files, so this file gets its own temp database.
// It stays open until the worker exits, so the temp dir is left for the OS to clean.
beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-session-"));
});

const day = 24 * 60 * 60;
const now = 1_800_000_000;
const expiresAt = (token: string) =>
  db().prepare("select expires_at from sessions where token_hash = ?").pluck().get(hashToken(token));

describe("sessions", () => {
  it("stores only the SHA-256 of the token, never the token itself", () => {
    const token = createSession(now);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const stored = db().prepare("select token_hash from sessions").pluck().all();
    expect(stored).toContain(hashToken(token));
    expect(stored).not.toContain(token);
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is valid for 30 days and gone after", () => {
    // Separate tokens: a check near the end renews the session.
    expect(getSession(createSession(now), now + 30 * day - 1)).toBeDefined();
    expect(getSession(createSession(now), now + 30 * day)).toBeUndefined();
  });

  it("renews only when fewer than 15 days remain", () => {
    const token = createSession(now);
    expect(getSession(token, now + 15 * day)).toEqual({ token, renewed: false });
    expect(expiresAt(token)).toBe(now + 30 * day);
    expect(getSession(token, now + 15 * day + 1)).toEqual({ token, renewed: true });
    expect(expiresAt(token)).toBe(now + 15 * day + 1 + 30 * day);
  });

  it("rejects unknown, missing and destroyed tokens", () => {
    const token = createSession(now);
    expect(getSession(undefined, now)).toBeUndefined();
    expect(getSession("not-a-token", now)).toBeUndefined();
    destroySession(token);
    expect(getSession(token, now)).toBeUndefined();
  });

  it("purges expired sessions when a new one is created", () => {
    const old = createSession(now);
    createSession(now + 31 * day);
    expect(expiresAt(old)).toBeUndefined();
  });
});

describe("sessionCookie", () => {
  it.each([
    ["https://collections.example.org/admin", true],
    ["http://collections.example.org/admin", true],
    ["http://localhost:3000/admin", false],
    ["http://127.0.0.1:3000/admin", false],
  ])("%s → Secure: %s", (url, secure) => {
    const cookie = sessionCookie("abc", new Request(url));
    expect(cookie).toMatch(/^sid=abc; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000/);
    expect(cookie.endsWith("; Secure")).toBe(secure);
  });
});
