import type Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { adminExists, createAdmin } from "./admin";
import { openDatabase } from "./connection";

let dir: string;
let connections: Database.Database[];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "collections-admin-"));
  // Two connections to one file, like two requests racing through separate handles.
  connections = [openDatabase(dir), openDatabase(dir)];
});
afterEach(() => {
  connections.forEach((connection) => connection.close());
  rmSync(dir, { recursive: true, force: true });
});

describe("admin repository", () => {
  it("creates the admin once; a second setup is refused", () => {
    const [first, second] = connections as [Database.Database, Database.Database];
    expect(adminExists(first)).toBe(false);
    expect(createAdmin("scrypt$a", first)).toBe(true);
    expect(createAdmin("scrypt$b", second)).toBe(false);
    expect(adminExists(second)).toBe(true);
  });

  it("two concurrent setups through separate connections leave exactly one row", async () => {
    const results = await Promise.all(
      connections.map((connection, index) => Promise.resolve().then(() => createAdmin(`scrypt$${index}`, connection))),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    const rows = connections[0]!.prepare("select password_hash from admin").all();
    expect(rows).toHaveLength(1);
  });
});
