import Database from "better-sqlite3";
import { copyFileSync, mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./connection";
import { migrate } from "./migrate";

let dir: string;
let db: Database.Database | undefined;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "collections-db-"));
});
afterEach(() => {
  db?.close();
  db = undefined;
  rmSync(dir, { recursive: true, force: true });
});

const userVersion = (connection: Database.Database) => connection.pragma("user_version", { simple: true });
const tables = (connection: Database.Database) =>
  connection
    .prepare("select name from sqlite_master where type = 'table' order by name")
    .pluck()
    .all();

// A migrations folder holding the given files, next to an empty data dir.
const withMigrations = (files: Record<string, string>) => {
  const migrations = join(dir, "migrations");
  mkdirSync(migrations);
  Object.entries(files).forEach(([name, sql]) => writeFileSync(join(migrations, name), sql));
  return migrations;
};

describe("migrate", () => {
  it("applies migrations in numeric order and bumps user_version to the last one", () => {
    const migrations = withMigrations({
      "010-c.sql": "alter table b add column y;",
      "001-a.sql": "create table a (x);",
      "002-b.sql": "create table b (a_x references a);",
      "notes.txt": "ignored",
    });
    db = openDatabase(join(dir, "data"), migrations);
    expect(userVersion(db)).toBe(10);
    expect(tables(db)).toEqual(["a", "b"]);
  });

  it("applies nothing on a rerun", () => {
    const migrations = withMigrations({ "001-a.sql": "create table a (x);" });
    db = openDatabase(join(dir, "data"), migrations);
    expect(migrate(db, migrations)).toEqual([]);
    expect(userVersion(db)).toBe(1);
  });

  it("rolls back a failing migration, leaves user_version unchanged and throws", () => {
    const migrations = withMigrations({
      "001-a.sql": "create table a (x);",
      "002-broken.sql": "create table b (x); insert into nope values (1);",
    });
    expect(() => openDatabase(join(dir, "data"), migrations)).toThrow(/no such table: nope/);
    db = new Database(join(dir, "data", "db.sqlite"));
    expect(userVersion(db)).toBe(1);
    expect(tables(db)).toEqual(["a"]);
  });
});

describe("001-initial", () => {
  beforeEach(() => {
    db = openDatabase(join(dir, "data"));
  });

  it("creates db.sqlite at the latest user_version with the default locale seeded", () => {
    expect(userVersion(db!)).toBe(readdirSync("migrations").filter((file) => file.endsWith(".sql")).length);
    expect(db!.prepare("select default_locale from settings where id = 1").pluck().get()).toBe("en");
    expect(db!.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(db!.pragma("journal_mode", { simple: true })).toBe("wal");
  });

  const insertItem = (status: string, quantity: number | null, rank: number | null) =>
    db!
      .prepare("insert into items (collection_id, status, quantity, rank) values (1, ?, ?, ?)")
      .run(status, quantity, rank);

  describe("items CHECK constraint", () => {
    beforeEach(() => {
      db!.prepare("insert into collections (id, slug, name) values (1, 'records', 'Records')").run();
    });

    it.each([
      ["have", 1, null],
      ["want", null, 1],
    ])("accepts %s with quantity %j and rank %j", (status, quantity, rank) => {
      expect(() => insertItem(status, quantity, rank)).not.toThrow();
    });

    it.each([
      ["have", 1, 1],
      ["want", 1, 1],
      ["have", null, null],
      ["want", null, null],
      ["have", 0, null],
      ["want", null, 0],
      ["lost", 1, null],
    ])("rejects %s with quantity %j and rank %j", (status, quantity, rank) => {
      expect(() => insertItem(status, quantity, rank)).toThrow(/CHECK constraint failed/);
    });
  });

  it("cascades a collection delete to its fields and items", () => {
    db!.prepare("insert into collections (id, slug, name) values (1, 'records', 'Records')").run();
    db!.prepare("insert into fields (collection_id, label, type, position) values (1, 'Title', 'text', 1)").run();
    insertItem("have", 1, null);
    db!.prepare("delete from collections where id = 1").run();
    expect(db!.prepare("select (select count(*) from fields) + (select count(*) from items)").pluck().get()).toBe(0);
  });
});

// A database left at an older version by a previous release, then opened by this one.
const atVersion = (version: number) => {
  const old = join(dir, "old-migrations");
  mkdirSync(old);
  readdirSync("migrations")
    .filter((file) => Number.parseInt(file, 10) <= version)
    .forEach((file) => copyFileSync(join("migrations", file), join(old, file)));
  return openDatabase(join(dir, "data"), old);
};

describe("002-field-affixes", () => {
  it("adds prefix and suffix, null for fields that already exist", () => {
    db = atVersion(1);
    db.prepare("insert into collections (id, slug, name) values (1, 'records', 'Records')").run();
    db.prepare("insert into fields (collection_id, label, type, position) values (1, 'Price', 'number', 1)").run();
    expect(migrate(db)).toContain("002-field-affixes.sql");
    expect(db.prepare("select prefix, suffix from fields").get()).toEqual({ prefix: null, suffix: null });
  });
});

describe("003-field-rating", () => {
  it("adds rating_max and rating_symbol, null for fields that already exist", () => {
    db = atVersion(1);
    db.prepare("insert into collections (id, slug, name) values (1, 'records', 'Records')").run();
    db.prepare("insert into fields (collection_id, label, type, position) values (1, 'Price', 'number', 1)").run();
    expect(migrate(db)).toContain("003-field-rating.sql");
    expect(db.prepare("select rating_max, rating_symbol from fields").get()).toEqual({ rating_max: null, rating_symbol: null });
  });
});

describe("004-collection-image", () => {
  it("adds image to collections, null for collections that already exist", () => {
    db = atVersion(3);
    db.prepare("insert into collections (id, slug, name) values (1, 'records', 'Records')").run();
    expect(migrate(db)).toContain("004-collection-image.sql");
    expect(db.prepare("select image from collections").get()).toEqual({ image: null });
  });
});

describe("005-oauth", () => {
  it("adds the OAuth tables; a client's codes and tokens go with it", () => {
    const oauth = atVersion(4);
    db = oauth;
    expect(migrate(oauth)).toContain("005-oauth.sql");
    oauth.prepare("insert into oauth_clients (id, name, redirect_uris_json) values ('c', 'Agent', '[]')").run();
    oauth.prepare(
      "insert into oauth_codes (code_hash, client_id, redirect_uri, code_challenge, resource, expires_at) values ('h', 'c', 'u', 'x', 'r', 1)",
    ).run();
    oauth.prepare("insert into oauth_tokens (token_hash, client_id, kind, resource, expires_at) values ('t', 'c', 'access', 'r', 1)").run();
    expect(() =>
      oauth.prepare("insert into oauth_tokens (token_hash, client_id, kind, resource, expires_at) values ('u', 'c', 'other', 'r', 1)").run(),
    ).toThrow(/CHECK/);
    oauth.prepare("delete from oauth_clients").run();
    expect(oauth.prepare("select (select count(*) from oauth_codes) + (select count(*) from oauth_tokens)").pluck().get()).toBe(0);
  });
});

describe("006-default-sort", () => {
  it("adds default_sort (null, the title) and default_dir (asc) to collections that already exist", () => {
    db = atVersion(5);
    db.prepare("insert into collections (id, slug, name) values (1, 'records', 'Records')").run();
    expect(migrate(db)).toContain("006-default-sort.sql");
    expect(db.prepare("select default_sort, default_dir from collections").get()).toEqual({ default_sort: null, default_dir: "asc" });
    expect(() => db!.prepare("update collections set default_dir = 'up'").run()).toThrow(/CHECK/);
  });
});

describe("007-title-link", () => {
  it("adds title_link_field_id (null), set to null when its field is deleted", () => {
    db = atVersion(6);
    db.prepare("insert into collections (id, slug, name) values (1, 'records', 'Records')").run();
    expect(migrate(db)).toContain("007-title-link.sql");
    expect(db.prepare("select title_link_field_id from collections").get()).toEqual({ title_link_field_id: null });
    db.prepare("insert into fields (id, collection_id, label, type, position) values (9, 1, 'Shop', 'url', 1)").run();
    db.prepare("update collections set title_link_field_id = 9").run();
    db.prepare("delete from fields where id = 9").run();
    expect(db.prepare("select title_link_field_id from collections").get()).toEqual({ title_link_field_id: null });
  });
});

describe("008-default-item-image", () => {
  it("adds item_image to collections, null for collections that already exist", () => {
    db = atVersion(7);
    db.prepare("insert into collections (id, slug, name) values (1, 'records', 'Records')").run();
    expect(migrate(db)).toContain("008-default-item-image.sql");
    expect(db.prepare("select item_image from collections").get()).toEqual({ item_image: null });
  });
});

describe("009-wishlist", () => {
  it("adds wishlist_items and a private wishlist, leaving existing data untouched", () => {
    db = atVersion(8);
    db.prepare("insert into collections (id, slug, name) values (1, 'records', 'Records')").run();
    db.prepare("update settings set default_locale = 'nl'").run();
    expect(migrate(db)).toContain("009-wishlist.sql");
    expect(db.prepare("select slug, name from collections").all()).toEqual([{ slug: "records", name: "Records" }]);
    expect(db.prepare("select default_locale, wishlist_public from settings").get()).toEqual({ default_locale: "nl", wishlist_public: 0 });
    db.prepare("insert into wishlist_items (title, rank) values ('Lamp', 1)").run();
    expect(db.prepare("select created_at is not null from wishlist_items").pluck().get()).toBe(1);
    expect(() => db!.prepare("insert into wishlist_items (title, rank) values ('Bad', 0)").run()).toThrow(/CHECK/);
  });
});

describe("010-reserve-wishlist-slug", () => {
  const slugsAfter = (existing: string[]) => {
    db = atVersion(9);
    existing.forEach((slug, index) => db!.prepare("insert into collections (id, slug, name) values (?, ?, ?)").run(index + 1, slug, slug));
    expect(migrate(db)).toContain("010-reserve-wishlist-slug.sql");
    return db.prepare("select slug from collections order by id").pluck().all();
  };

  it("moves a collection at /wishlist to wishlist-2", () => {
    expect(slugsAfter(["vinyl", "wishlist"])).toEqual(["vinyl", "wishlist-2"]);
  });

  it("takes the next free number when wishlist-2 and -3 are taken", () => {
    expect(slugsAfter(["wishlist", "wishlist-2", "wishlist-3", "wishlist-5"])).toEqual(["wishlist-4", "wishlist-2", "wishlist-3", "wishlist-5"]);
  });

  it("changes nothing without a wishlist collection", () => {
    expect(slugsAfter(["vinyl", "wishlist-2"])).toEqual(["vinyl", "wishlist-2"]);
  });
});
