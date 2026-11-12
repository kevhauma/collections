import type Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAdmin, getAdminPasswordHash } from "../../db/admin";
import { openDatabase } from "../../db/connection";
import { verifyPassword } from "./password";
import { resetPassword } from "./reset-password";

let dir: string;
let connection: Database.Database;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "collections-reset-"));
  connection = openDatabase(dir);
});
afterEach(() => {
  connection.close();
  rmSync(dir, { recursive: true, force: true });
});

const sessionCount = () => connection.prepare("select count(*) from sessions").pluck().get();
const addSession = (hash: string) =>
  connection.prepare("insert into sessions (token_hash, expires_at) values (?, 4102444800)").run(hash);

describe("resetPassword", () => {
  it("replaces the hash and logs out every session", async () => {
    createAdmin("scrypt$old", connection);
    addSession("a");
    addSession("b");
    await resetPassword(connection, "a brand new password");
    const stored = getAdminPasswordHash(connection) ?? "";
    expect(await verifyPassword("a brand new password", stored)).toBe(true);
    expect(sessionCount()).toBe(0);
  });

  it("creates the admin when setup never ran", async () => {
    await resetPassword(connection, "a brand new password");
    expect(getAdminPasswordHash(connection)).toMatch(/^scrypt\$/);
  });

  it("rejects a short password and changes nothing", async () => {
    createAdmin("scrypt$old", connection);
    addSession("a");
    await expect(resetPassword(connection, "too short")).rejects.toThrow(/at least 12/);
    expect(getAdminPasswordHash(connection)).toBe("scrypt$old");
    expect(sessionCount()).toBe(1);
  });
});
