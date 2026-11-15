// The admin section a path belongs to: wishlist, export and settings by prefix, everything else is collections.
export const sectionOf = (pathname: string): string =>
  ["/admin/wishlist", "/admin/export", "/admin/settings"].find((href) => pathname === href || pathname.startsWith(`${href}/`)) ??
  "/admin";
