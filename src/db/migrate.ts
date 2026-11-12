import type Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Applies every migrations/NNN-name.sql numbered above PRAGMA user_version, in numeric order, each in its own
// transaction together with its user_version bump. A failing migration rolls back and throws, so startup aborts.
// Returns the applied file names.
export const migrate = (db: Database.Database, dir = "migrations"): string[] => {
  const current = db.pragma("user_version", { simple: true }) as number;
  return readdirSync(dir)
    .filter((file) => /^\d+-.+\.sql$/.test(file))
    .map((file) => ({ file, version: Number.parseInt(file, 10) }))
    .filter(({ version }) => version > current)
    .toSorted((a, b) => a.version - b.version)
    .map(({ file, version }) => {
      db.transaction(() => {
        db.exec(readFileSync(join(dir, file), "utf8"));
        // user_version lives in the database header, so it commits or rolls back with the migration.
        db.pragma(`user_version = ${version}`);
      })();
      return file;
    });
};
