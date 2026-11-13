import { existsSync } from "node:fs";
import { join } from "node:path";
import { ZipFile } from "yazl";
import type { Snapshot, SnapshotCollection } from "../../db/export";
import { toCsv } from "./csv";

// The full export (TICKET-BAK-01): data.json (the contract TICKET-BAK-02's restore reads; change it only by bumping
// `version`), csv/<slug>.csv for spreadsheets, and images/<uuid>.webp at display size. Restore regenerates thumbnails.

const version = 1;

const imagePath = (id: string) => `images/${id}.webp`;
const iso = (unixSeconds: number) => new Date(unixSeconds * 1000).toISOString();

export const exportFilename = (now = new Date()): string => `collections-export-${now.toISOString().slice(0, 10)}.zip`;

// A value as plain text: numbers as typed, checkbox true/false, dates ISO (as stored), nothing for a missing value.
const plain = (value: unknown) => (value === undefined || value === null ? "" : String(value));

type ExportedCollection = ReturnType<typeof exportCollection>;

const exportCollection = (collection: SnapshotCollection, imageOf: (id: string | null) => string | null) => ({
  slug: collection.slug,
  name: collection.name,
  isPublic: collection.isPublic === 1,
  defaultView: collection.defaultView,
  titleFieldId: collection.titleFieldId,
  image: imageOf(collection.image),
  fields: collection.fields.map((field) => ({ ...field, required: field.required === 1, isPublic: field.isPublic === 1 })),
  items: collection.items.map((item) => ({
    status: item.status,
    quantity: item.quantity,
    rank: item.rank,
    values: item.values,
    image: imageOf(item.image),
    createdAt: iso(item.createdAt),
    updatedAt: iso(item.updatedAt),
  })),
});

// Columns: field labels in position order, then status, quantity, rank and image.
const csvRows = (collection: ExportedCollection): string[][] => [
  [...collection.fields.map((field) => field.label), "status", "quantity", "rank", "image"],
  ...collection.items.map((item) => [
    ...collection.fields.map((field) => plain(item.values[field.id])),
    item.status,
    plain(item.quantity),
    plain(item.rank),
    plain(item.image),
  ]),
];

// Every image the snapshot points at: collection pictures (TICKET-COL-06) and item images.
const imagesOf = (collection: SnapshotCollection) => [collection.image, ...collection.items.map((item) => item.image)];

// Builds the zip from one snapshot. An image whose file is gone is left out: whatever pointed at it gets `image: null`
// and its id is listed under `missingImages`, so every path in the zip's data points at a file that's there.
export const buildExport = (snapshot: Snapshot, uploads: string, now = new Date()): ZipFile => {
  const referenced = [...new Set(snapshot.collections.flatMap(imagesOf).filter((id) => id !== null))];
  const present = new Set(referenced.filter((id) => existsSync(join(uploads, `${id}.webp`))));
  const imageOf = (id: string | null) => (id && present.has(id) ? imagePath(id) : null);
  const collections = snapshot.collections.map((collection) => exportCollection(collection, imageOf));
  const data = {
    version,
    exportedAt: now.toISOString(),
    settings: { defaultLocale: snapshot.defaultLocale },
    collections,
    missingImages: referenced.filter((id) => !present.has(id)),
  };
  const zip = new ZipFile();
  zip.addBuffer(Buffer.from(JSON.stringify(data, null, 2)), "data.json");
  collections.forEach((collection) => zip.addBuffer(Buffer.from(toCsv(csvRows(collection))), `csv/${collection.slug}.csv`));
  present.forEach((id) => zip.addFile(join(uploads, `${id}.webp`), imagePath(id)));
  zip.end();
  return zip;
};
