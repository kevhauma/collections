import { useLingui } from "@lingui/react/macro";
import { isRouteErrorResponse } from "react-router";
import { LinkButton } from "../ui/button";
import { PostIt } from "../ui/post-it";

// The not-found and error pages, shown by every layout's ErrorBoundary. Collection routes reuse the 404 by
// throwing `data(null, { status: 404 })` for private and unknown slugs. The error page never shows the error
// itself: no message, no stack, in any environment.
export const RouteError = ({ error }: { error?: unknown }) => {
  const { t } = useLingui();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const page = notFound
    ? {
        code: "404",
        title: t({ id: "error.notFound.title", message: "Page not found" }),
        body: t({ id: "error.notFound.body", message: "This page doesn't exist, or it isn't shared." }),
      }
    : {
        code: "500",
        title: t({ id: "error.server.title", message: "Something went wrong" }),
        body: t({ id: "error.server.body", message: "The page couldn't be shown. Try again in a moment." }),
      };
  return (
    <div className="flex flex-wrap items-center gap-8 py-10">
      <title>{`${page.title} · ${t({ id: "app.name", message: "Collections" })}`}</title>
      <PostIt size="lg" color="pink" tilt="right">
        <span className="font-hand text-7xl leading-none text-red-pen">{page.code}</span>
      </PostIt>
      <div className="grid max-w-prose min-w-64 flex-1 gap-4">
        <h1>{page.title}</h1>
        <p>{page.body}</p>
        <div>
          <LinkButton href="/">{t({ id: "error.backHome", message: "Back to the start" })}</LinkButton>
        </div>
      </div>
    </div>
  );
};
