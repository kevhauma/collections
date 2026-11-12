import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { migrate } from "./migrate";

// Opens DATA_DIR/db.sqlite (creating the folder if missing) and brings its schema up to date.
export const openDatabase = (dataDir: string, migrationsDir?: string): Database.Database => {
  mkdirSync(dataDir, { recursive: true });
  const connection = new Database(join(dataDir, "db.sqlite"));
  connection.pragma("journal_mode = WAL");
  connection.pragma("foreign_keys = ON");
  try {
    migrate(connection, migrationsDir);
  } catch (error) {
    connection.close();
    throw error;
  }
  return connection;
};

// One connection per process, opened on first use. better-sqlite3 is synchronous, so sharing it is safe.
let connection: Database.Database | undefined;

export const db = (): Database.Database => (connection ??= openDatabase(process.env.DATA_DIR ?? "./data"));
