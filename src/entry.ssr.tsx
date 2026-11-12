// SSR entry: runs in Vite's "ssr" environment (regular React, no react-server condition). It decodes the RSC
// stream from entry.rsc back into React elements and renders them to HTML, the same way the browser will.
import { createFromReadableStream } from "@vitejs/plugin-rsc/ssr";
import { renderToReadableStream as renderHTMLToReadableStream } from "react-dom/server.edge";
import {
  unstable_routeRSCServerRequest as routeRSCServerRequest,
  unstable_RSCStaticRouter as RSCStaticRouter,
} from "react-router";

export const generateHTML = (request: Request, serverResponse: Response): Promise<Response> =>
  // Passes RSC (non-document) responses through untouched. For documents it renders HTML and injects the RSC
  // payload as inline <script> chunks (self.__FLIGHT_DATA) so the browser can hydrate without a second fetch.
  routeRSCServerRequest({
    request,
    serverResponse,
    createFromReadableStream,
    async renderHTML(getPayload, options) {
      const payload = await getPayload();
      // After a no-JS form post, formState carries the action's result so useActionState renders it in the HTML.
      const formState = payload.type === "render" ? await payload.formState : undefined;
      const bootstrapScriptContent = await import.meta.viteRsc.loadBootstrapScriptContent("index");
      return renderHTMLToReadableStream(<RSCStaticRouter getPayload={getPayload} />, {
        ...options,
        bootstrapScriptContent,
        formState,
        signal: request.signal,
      });
    },
  });
