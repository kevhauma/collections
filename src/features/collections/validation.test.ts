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
  const base = { name: "Vinyl", slug: "vinyl", defaultView: "grid" };

  it("reads the public checkbox as 1 when ticked and 0 when absent", () => {
    expect(parseSettings({ ...base, isPublic: "on" }, new Set()).data).toEqual({ ...base, isPublic: 1 });
    expect(parseSettings(base, new Set()).data?.isPublic).toBe(0);
  });

  it("refuses another collection's slug and an unknown view", () => {
    expect(errorKeys(parseSettings(base, taken))).toEqual(["slug:taken"]);
    expect(parseSettings({ ...base, defaultView: "list" }, new Set()).success).toBe(false);
  });
});
