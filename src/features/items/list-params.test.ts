import { describe, expect, it } from "vitest";
import { filterInput, listQuery, parseListParams, sortToggle, switchTab, type ListContext } from "./list-params";

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

});

describe("switchTab", () => {
  it("keeps search, filters, view and a chosen sort, and swaps a default sort for the other tab's", () => {
    const onWant = parse("view=grid&q=blue&f.3=LP", want);
    expect(listQuery(switchTab(onWant, want, have), have)).toBe("?view=grid&q=blue&f.3=LP");
    expect(listQuery(switchTab(parse("q=blue"), have, want), want)).toBe("?q=blue");
    const byYear = parse("sort=2&dir=desc");
    expect(listQuery(switchTab(byYear, have, want), want)).toBe("?sort=2&dir=desc");
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
