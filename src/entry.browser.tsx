// Browser entry: hydrates the server-rendered HTML from the RSC payload that entry.ssr inlined in the page.
import {
  createFromReadableStream,
  createTemporaryReferenceSet,
  encodeReply,
  setServerCallback,
} from "@vitejs/plugin-rsc/browser";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import {
  unstable_createCallServer as createCallServer,
  unstable_getRSCStream as getRSCStream,
  unstable_RSCHydratedRouter as RSCHydratedRouter,
  type unstable_RSCPayload as RSCPayload,
} from "react-router/dom";

// After hydration, server actions are called with fetch: arguments encoded by encodeReply, the response decoded
// as an RSC stream, and React Router revalidates the current route with it.
setServerCallback(createCallServer({ createFromReadableStream, createTemporaryReferenceSet, encodeReply }));

// Dev only: an edited server component reloads in the rsc environment, but the browser keeps the old RSC payload
// until something refetches it. Revalidating the router (registered on window by RSCHydratedRouter) does that.
import.meta.hot?.on("rsc:update", () =>
  (window as unknown as { __reactRouterDataRouter?: { revalidate: () => unknown } }).__reactRouterDataRouter?.revalidate(),
);

// getRSCStream reads the inline __FLIGHT_DATA chunks, so hydration needs no extra request.
createFromReadableStream<RSCPayload>(getRSCStream()).then((payload) => {
  startTransition(async () => {
    // Same formState as the server used, so a no-JS form result survives hydration.
    const formState = payload.type === "render" ? await payload.formState : undefined;
    hydrateRoot(
      document,
      <StrictMode>
        <RSCHydratedRouter createFromReadableStream={createFromReadableStream} payload={payload} />
      </StrictMode>,
      { formState },
    );
  });
});
