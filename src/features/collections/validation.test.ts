import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parseCreate, parseSettings } from "./validation";

// validation.ts imports defaultViews from the repository module, which opens no database until called.
beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-validation-"));
});

const taken = new Set(["magic-the-gathering", "vinyl"]);
const errorKeys = (result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }) =>
  result.error?.issues.map((issue) => `${String(issue.path[0])}:${issue.message}`);

describe("parseCreate", () => {
  it("derives the slug from the name when it's left empty", () => {
    expect(parseCreate({ name: "Café Ölé", slug: "" }, taken).data).toEqual({ name: "Café Ölé", slug: "cafe-ole" });
  });

  it("suffixes a derived slug that is taken or reserved", () => {
    expect(parseCreate({ name: "Magic: The Gathering", slug: "" }, taken).data?.slug).toBe("magic-the-gathering-2");
    expect(parseCreate({ name: "Admin", slug: "" }, taken).data?.slug).toBe("admin-2");
  });

  it("refuses a typed slug that is taken or reserved instead of suffixing it", () => {
    expect(errorKeys(parseCreate({ name: "Records", slug: "vinyl" }, taken))).toEqual(["slug:taken"]);
    expect(errorKeys(parseCreate({ name: "Records", slug: "uploads" }, taken))).toEqual(["slug:reserved"]);
  });

  it("refuses a malformed typed slug and an empty name", () => {
    expect(errorKeys(parseCreate({ name: "Records", slug: "My Records" }, taken))).toEqual(["slug:format"]);
    expect(errorKeys(parseCreate({ name: "  ", slug: "records" }, taken))).toEqual(["name:name"]);
  });
});

describe("parseSettings", () => {
  const base = { name: "Vinyl", slug: "vinyl", defaultView: "grid", defaultSort: "", defaultDir: "asc" };
  // The collection's own fields 6 and 7, plus date added (TICKET-COL-07).
  const sortable = new Set(["created", "6", "7"]);
  const settings = (form: Record<string, string>, slugs = new Set<string>()) => parseSettings(form, slugs, sortable);

  it("reads the public checkbox as 1 when ticked and 0 when absent", () => {
    expect(settings({ ...base, isPublic: "on" }).data).toEqual({ ...base, defaultSort: null, isPublic: 1 });
    expect(settings(base).data?.isPublic).toBe(0);
  });

  it("refuses another collection's slug and an unknown view", () => {
    expect(errorKeys(settings(base, taken))).toEqual(["slug:taken"]);
    expect(settings({ ...base, defaultView: "list" }).success).toBe(false);
  });

  it("reads the default sort: empty is the title, else date added or one of the collection's fields", () => {
    expect(settings(base).data).toMatchObject({ defaultSort: null, defaultDir: "asc" });
    expect(settings({ ...base, defaultSort: "7", defaultDir: "desc" }).data).toMatchObject({ defaultSort: "7", defaultDir: "desc" });
    expect(settings({ ...base, defaultSort: "created" }).data?.defaultSort).toBe("created");
  });

  it("refuses a forged default sort: another collection's field, rank, junk, or an unknown direction", () => {
    for (const defaultSort of ["99", "rank", "title", "6 or 1=1"]) expect(settings({ ...base, defaultSort }).success).toBe(false);
    expect(settings({ ...base, defaultDir: "up" }).success).toBe(false);
  });
});
