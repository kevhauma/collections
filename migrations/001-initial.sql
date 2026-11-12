-- v1 schema (docs/technical-design.md § Data model). Shipped: never edit, add a new numbered migration instead.

CREATE TABLE admin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_locale TEXT NOT NULL DEFAULT 'en'
);
INSERT INTO settings (id, default_locale) VALUES (1, 'en');

CREATE TABLE collections (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  default_view TEXT NOT NULL DEFAULT 'table',
  title_field_id INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE fields (
  id INTEGER PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES collections ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  options_json TEXT,
  required INTEGER NOT NULL DEFAULT 0,
  is_public INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL
);
CREATE INDEX fields_collection_position ON fields (collection_id, position);

CREATE TABLE items (
  id INTEGER PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES collections ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('have', 'want')),
  quantity INTEGER,
  rank INTEGER,
  values_json TEXT NOT NULL DEFAULT '{}',
  image TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  -- coalesce: a bare `quantity >= 1` is NULL for a NULL quantity, and CHECK only rejects FALSE.
  CHECK ((status = 'have' AND coalesce(quantity, 0) >= 1 AND rank IS NULL)
      OR (status = 'want' AND coalesce(rank, 0) >= 1 AND quantity IS NULL))
);
CREATE INDEX items_collection_status_rank ON items (collection_id, status, rank);
