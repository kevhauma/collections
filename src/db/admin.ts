import type Database from "better-sqlite3";
import { db } from "./connection";

// The single admin row (id = 1, enforced by a CHECK in migration 001).

export const adminExists = (connection: Database.Database = db()): boolean =>
  connection.prepare("select 1 from admin where id = 1").get() !== undefined;

// One atomic statement: if two setups race, exactly one insert wins and the other gets false.
export const createAdmin = (passwordHash: string, connection: Database.Database = db()): boolean =>
  connection
    .prepare("insert into admin (id, password_hash) values (1, ?) on conflict (id) do nothing")
    .run(passwordHash).changes === 1;
