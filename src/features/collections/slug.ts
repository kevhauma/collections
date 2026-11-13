// Public URL slugs (technical-design.md § Slugs, ADR 0005). Pure, so the admin's slug preview can import it too.

export const maxSlugLength = 60;

// Paths the app itself answers; a collection there would be unreachable or shadow the app.
export const reservedSlugs: ReadonlySet<string> = new Set(["admin", "setup", "uploads", "api", "locale", "theme", "assets"]);

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const trimDashes = (slug: string) => slug.replace(/^-+|-+$/g, "");

// Cut at the last dash that keeps the slug within the limit, or hard-cut a single over-long word.
const truncate = (slug: string, length: number) => {
  if (slug.length <= length) return slug;
  const boundary = slug.slice(0, length + 1).lastIndexOf("-");
  return trimDashes(boundary > 0 ? slug.slice(0, boundary) : slug.slice(0, length));
};

export const slugify = (name: string): string =>
  truncate(
    trimDashes(
      name
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-"),
    ),
    maxSlugLength,
  ) || "collection";

const candidate = (base: string, n: number) =>
  n === 1 ? base : `${truncate(base, maxSlugLength - `-${n}`.length)}-${n}`;

// For generated slugs only: the first of base, base-2, base-3, … that is neither taken nor reserved.
export const uniqueSlug = (base: string, taken: ReadonlySet<string>): string => {
  let n = 1;
  while (taken.has(candidate(base, n)) || reservedSlugs.has(candidate(base, n))) n++;
  return candidate(base, n);
};
