import type Database from "better-sqlite3";
import { db } from "./connection.ts";

// The single admin row (id = 1, enforced by a CHECK in migration 001).

export const adminExists = (connection: Database.Database = db()): boolean =>
  connection.prepare("select 1 from admin where id = 1").get() !== undefined;

export const getAdminPasswordHash = (connection: Database.Database = db()): string | undefined =>
  (connection.prepare("select password_hash from admin where id = 1").get() as { password_hash: string } | undefined)
    ?.password_hash;

// Password reset (scripts/reset-password.ts): set the hash, creating the admin if needed, and log out every session,
// in one transaction.
export const setAdminPassword = (passwordHash: string, connection: Database.Database = db()): void =>
  connection.transaction(() => {
    connection
      .prepare(
        "insert into admin (id, password_hash) values (1, ?) on conflict (id) do update set password_hash = excluded.password_hash",
      )
      .run(passwordHash);
    connection.prepare("delete from sessions").run();
  })();

// One atomic statement: if two setups race, exactly one insert wins and the other gets false.
export const createAdmin = (passwordHash: string, connection: Database.Database = db()): boolean =>
  connection
    .prepare("insert into admin (id, password_hash) values (1, ?) on conflict (id) do nothing")
    .run(passwordHash).changes === 1;
