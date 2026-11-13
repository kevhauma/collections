import type { ItemStatus } from "../db/items";

// A collection's list tab: `base` for have, `base`/want for want. Admin base: /admin/c/:slug; public: /:slug.
export const tabUrl = (base: string, status: ItemStatus) => `${base}${status === "want" ? "/want" : ""}`;

// The admin list tab of each status: /admin/c/:slug (have) and /admin/c/:slug/want.
export const listHref = (slug: string, status: ItemStatus) => tabUrl(`/admin/c/${slug}`, status);
