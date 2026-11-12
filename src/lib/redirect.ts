// Where to send the browser back to: the Referer's path and query when it's on this site, otherwise "/".
// Never an absolute or protocol-relative URL, so a crafted Referer can't redirect off-site.
export const safeRedirectTarget = (referer: string | null | undefined, requestUrl: string): string => {
  const target = referer && URL.canParse(referer, requestUrl) ? new URL(referer, requestUrl) : undefined;
  if (!target || target.origin !== new URL(requestUrl).origin) return "/";
  // "//evil.example" as a Location is protocol-relative, so collapse leading slashes.
  return `${target.pathname.replace(/^\/+/, "/")}${target.search}`;
};
