import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { locales } from "./locale";

// Catalog completeness: run `npm run i18n:extract` after adding a message, then translate it in every locale.
const catalogs = Object.fromEntries(
  locales.map((locale) => [
    locale,
    JSON.parse(readFileSync(new URL(`./locales/${locale}.json`, import.meta.url), "utf8")) as Record<string, string>,
  ]),
);
const ids = [...new Set(Object.values(catalogs).flatMap(Object.keys))];

describe("message catalogs", () => {
  it.each(ids)("%s has a non-empty message in every locale", (id) => {
    expect(locales.filter((locale) => !catalogs[locale]?.[id]?.trim())).toEqual([]);
  });

  // A placeholder the code no longer passes renders literally, e.g. "{0}" after a variable was renamed.
  const placeholders = (message = "") => [...message.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((match) => match[1]).sort();
  it.each(ids)("%s uses the same placeholders in every locale", (id) => {
    const source = placeholders(catalogs.en?.[id]);
    expect(locales.filter((locale) => placeholders(catalogs[locale]?.[id]).join() !== source.join())).toEqual([]);
  });

  it("uses explicit area.thing ids, never generated ones", () => {
    expect(ids.filter((id) => !/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9-]*)+$/.test(id))).toEqual([]);
  });
});
