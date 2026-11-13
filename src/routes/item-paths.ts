import type { ItemStatus } from "../db/items";

// The admin list tab of each status: /admin/c/:slug (have) and /admin/c/:slug/want.
export const listHref = (slug: string, status: ItemStatus) => `/admin/c/${slug}${status === "want" ? "/want" : ""}`;
