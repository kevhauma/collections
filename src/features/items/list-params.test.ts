import { describe, expect, it } from "vitest";
import {
  defaultSortOf,
  filterInput,
  listQuery,
  parseListParams,
  reorderable,
  sortToggle,
  switchTab,
  type ListContext,
} from "./list-params";

const fields = [
  { id: 1, type: "text", options: null, isPublic: 1 },
  { id: 2, type: "number", options: null, isPublic: 1 },
  { id: 3, type: "select", options: ["LP", "EP"], isPublic: 1 },
  { id: 4, type: "checkbox", options: null, isPublic: 1 },
  { id: 5, type: "select", options: ["Mint", "Worn"], isPublic: 0 },
] as const satisfies Parameters<typeof parseListParams>[1];

const have: ListContext = { status: "have", defaultView: "table", titleFieldId: 1 };
const want: ListContext = { ...have, status: "want" };
const parse = (query: string, context = have) => parseListParams(new URLSearchParams(query), [...fields], context);

describe("parseListParams", () => {
  it("reads valid params", () => {
    expect(parse("view=grid&q=+blue+&sort=2&dir=desc&f.3=EP&f.4=no")).toEqual({
      view: "grid",
      q: "blue",
      sort: 2,
      dir: "desc",
      filters: [
        { fieldId: 3, value: "EP" },
        { fieldId: 4, value: false },
      ],
    });
  });

  it("falls back to the tab's defaults: title on have, rank on want, the collection's view", () => {
    expect(parse("")).toEqual({ view: "table", q: "", sort: 1, dir: "asc", filters: [] });
    expect(parse("", { ...want, defaultView: "grid" })).toMatchObject({ view: "grid", sort: "rank" });
  });

  it("drops a foreign field id, invalid values and filters on non-filter fields", () => {
    expect(parse("sort=99&f.99=LP&f.3=CD&f.4=maybe&f.2=5&f.1=x&view=list&dir=up")).toEqual(parse(""));
  });

  it("drops a private field for sort and filter when publicOnly", () => {
    expect(parse("sort=5&f.5=Mint").sort).toBe(5);
    expect(parse("sort=5&f.5=Mint").filters).toEqual([{ fieldId: 5, value: "Mint" }]);
    const visitor = parse("sort=5&f.5=Mint", { ...have, publicOnly: true });
    expect(visitor.sort).toBe(1);
    expect(visitor.filters).toEqual([]);
  });

  it("accepts a rank sort on the want tab only", () => {
    expect(parse("sort=rank", want).sort).toBe("rank");
    expect(parse("sort=rank").sort).toBe(1);
    expect(parse("sort=created").sort).toBe("created");
  });

  it("truncates an overlong search to 200 characters", () => {
    expect(parse(`q=${"a".repeat(300)}`).q).toHaveLength(200);
  });
});

describe("listQuery", () => {
  it("round-trips: the URL alone reproduces the params", () => {
    const params = parse("view=grid&q=blue&sort=2&dir=desc&f.3=EP&f.4=yes");
    expect(parse(listQuery(params, have).slice(1))).toEqual(params);
  });

  it("leaves defaults out", () => {
    expect(listQuery(parse(""), have)).toBe("");
    expect(listQuery(parse("", want), want)).toBe("");
  });

  it("uses the collection's default sort on the have tab (TICKET-COL-07): left out of the URL, any other sort kept", () => {
    const byYear: ListContext = { ...have, defaultSort: 2, defaultDir: "desc" };
    expect(parse("", byYear)).toMatchObject({ sort: 2, dir: "desc" });
    expect(listQuery(parse("", byYear), byYear)).toBe("");
    expect(listQuery(parse("sort=1&dir=asc", byYear), byYear)).toBe("?sort=1&dir=asc");
    expect(listQuery(parse("sort=2&dir=asc", byYear), byYear)).toBe("?dir=asc");
    expect(parse("", { ...want, defaultSort: 2, defaultDir: "desc" })).toMatchObject({ sort: "rank", dir: "asc" });
  });
});

describe("group", () => {
  it("takes one of the collection's own choice, yes/no or text fields, not the title", () => {
    expect(parse("group=3").group).toBe(3);
    expect(parse("group=4").group).toBe(4);
    expect(parse("group=1").group).toBeUndefined();
    expect(parse("group=2").group).toBeUndefined();
  });

  it("drops a private field on a public page, another collection's field and junk", () => {
    expect(parse("group=5").group).toBe(5);
    expect(parse("group=5", { ...have, publicOnly: true }).group).toBeUndefined();
    for (const group of ["99", "", "3.0", "3 or 1=1", "rank"]) expect(parse(`group=${group}`).group).toBeUndefined();
  });

  it("stays in the URL and carries over to the other tab", () => {
    expect(listQuery(parse("group=3&q=blue"), have)).toBe("?q=blue&group=3");
    expect(listQuery(switchTab(parse("group=3"), have, want), want)).toBe("?group=3");
  });

  it("turns dragging off on a grouped want tab, keeping the rank inputs", () => {
    expect(reorderable(parse("group=3", want), "want")).toEqual({ draggable: false });
  });
});

describe("defaultSortOf", () => {
  it("keeps date added and a field the viewer may see, and falls back to the title otherwise", () => {
    expect(defaultSortOf("created", [...fields], 1)).toBe("created");
    expect(defaultSortOf("2", [...fields], 1)).toBe(2);
    expect(defaultSortOf(null, [...fields], 1)).toBe(1);
    // Deleted (not among the fields), or private on a public page (left out of the fields before the call).
    expect(defaultSortOf("99", [...fields], 1)).toBe(1);
    expect(defaultSortOf("5", fields.filter((field) => field.isPublic), 1)).toBe(1);
    expect(defaultSortOf("rank", [...fields], 1)).toBe(1);
  });
});

describe("switchTab", () => {
  it("keeps search, filters, view and a chosen sort, and swaps a default sort for the other tab's", () => {
    const onWant = parse("view=grid&q=blue&f.3=LP", want);
    expect(listQuery(switchTab(onWant, want, have), have)).toBe("?view=grid&q=blue&f.3=LP");
    expect(listQuery(switchTab(parse("q=blue"), have, want), want)).toBe("?q=blue");
    const byYear = parse("sort=2&dir=desc");
    expect(listQuery(switchTab(byYear, have, want), want)).toBe("?sort=2&dir=desc");
  });

  it("swaps a custom default order for rank and back (TICKET-COL-07)", () => {
    const custom: ListContext = { ...have, defaultSort: 2, defaultDir: "desc" };
    expect(listQuery(switchTab(parse("q=blue", custom), custom, want), want)).toBe("?q=blue");
    expect(listQuery(switchTab(parse("q=blue", want), want, custom), custom)).toBe("?q=blue");
    expect(listQuery(switchTab(parse("sort=3&dir=asc", custom), custom, want), want)).toBe("?sort=3");
    expect(listQuery(switchTab(parse("dir=asc", custom), custom, want), want)).toBe("");
  });
});

describe("sortToggle", () => {
  it("sorts a new column ascending and flips the active one", () => {
    const params = parse("sort=2");
    expect(sortToggle(params, 3)).toEqual({ next: { ...params, sort: 3, dir: "asc" }, direction: "none" });
    expect(sortToggle(params, 2)).toEqual({ next: { ...params, dir: "desc" }, direction: "ascending" });
    expect(sortToggle({ ...params, dir: "desc" }, 2)).toMatchObject({ next: { dir: "asc" }, direction: "descending" });
  });
});

describe("filterInput", () => {
  it("shows the option, yes / no, or empty for any", () => {
    const params = parse("f.3=EP&f.4=no");
    expect([3, 4, 1].map((fieldId) => filterInput(params, fieldId))).toEqual(["EP", "no", ""]);
    expect(filterInput(parse("f.4=yes"), 4)).toBe("yes");
  });
});

describe("reorderable", () => {
  it("offers rank inputs on the want tab sorted by rank, and drag only for the whole ascending order", () => {
    expect(reorderable(parse("", want), "want")).toEqual({ draggable: true });
    expect(reorderable(parse("dir=desc", want), "want")).toEqual({ draggable: false });
    expect(reorderable(parse("q=blue", want), "want")).toEqual({ draggable: false });
    expect(reorderable(parse("f.3=LP", want), "want")).toEqual({ draggable: false });
    expect(reorderable(parse("sort=2", want), "want")).toBeUndefined();
    expect(reorderable(parse(""), "have")).toBeUndefined();
  });
});
