// Request bodies are capped before React Router parses them, because it buffers multipart forms whole
// (spike-results § 4): a 15 MB image plus the rest of the form. The reverse proxy enforces the real limit
// (docs/platform/deploy.md); this is defence in depth.
const maxBodyBytes = 16 * 1024 * 1024;

export const declaresTooLarge = (request: Request, limit = maxBodyBytes): boolean =>
  Number(request.headers.get("content-length")) > limit;

// For a body without a Content-Length (chunked): reading it fails once more than `limit` bytes have streamed.
export const limitBody = (request: Request, limit = maxBodyBytes): Request => {
  if (!request.body) return request;
  let size = 0;
  const counter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      size += chunk.byteLength;
      if (size > limit) controller.error(new Error("Request body too large"));
      else controller.enqueue(chunk);
    },
  });
  return new Request(request, { body: request.body.pipeThrough(counter), duplex: "half" } as RequestInit);
};
