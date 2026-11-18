// The admin section a path belongs to: each nav tab's own paths by prefix, everything else is collections. The
// wishlists tab also covers each wishlist's pages under /admin/w/ (TICKET-WSH-09).
const sections = [
  { href: "/admin/wishlists", paths: ["/admin/wishlists", "/admin/w"] },
  { href: "/admin/export", paths: ["/admin/export"] },
  { href: "/admin/settings", paths: ["/admin/settings"] },
];

export const sectionOf = (pathname: string): string =>
  sections.find(({ paths }) => paths.some((path) => pathname === path || pathname.startsWith(`${path}/`)))?.href ?? "/admin";
