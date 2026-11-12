import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// One connection per process, opened on first use. better-sqlite3 is synchronous, so sharing it is safe.
// TICKET-PLAT-03 adds pragmas and the migration runner here.
let connection: Database.Database | undefined;

export const db = (): Database.Database => (connection ??= open(process.env.DATA_DIR ?? "./data"));

const open = (dataDir: string) => {
  mkdirSync(dataDir, { recursive: true });
  return new Database(join(dataDir, "db.sqlite"));
};
