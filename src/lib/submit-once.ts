// The list toolbar's Apply (TICKET-UI-08): a GET form whose every submit is a page load. These functions are
// serialized into an inline <script> in the document (routes/root.tsx), because public pages ship no app JS, so they
// may only use their parameters and browser globals. Without JS the form is a plain GET.

// The same query string, ignoring parameter order.
export const sameQuery = (a: URLSearchParams, b: URLSearchParams) => {
  const key = (params: URLSearchParams) => [...params].map((entry) => JSON.stringify(entry)).sort().join();
  return key(a) === key(b);
};

// A `form[data-submit-once]` submit is dropped while one is loading (the form shows aria-busy) and when nothing
// changed since the page rendered it: a reset copy holds the values the server put in.
// shortcut: a load stopped by the user leaves the form busy until a reload, upgrade if that ever bites.
const guardSubmits = (doc: Document, same: typeof sameQuery) => {
  const query = (form: HTMLFormElement) => new URLSearchParams(new FormData(form) as unknown as string[][]);
  doc.addEventListener("submit", (event) => {
    const form = event.target as HTMLFormElement;
    if (!form.matches("form[data-submit-once]")) return;
    const rendered = form.cloneNode(true) as HTMLFormElement;
    rendered.reset();
    if (form.ariaBusy === "true" || same(query(form), query(rendered))) event.preventDefault();
    else form.ariaBusy = "true";
  });
  // Back and forward restore a page as it was left, busy form and all.
  addEventListener("pageshow", () => doc.querySelectorAll("form[aria-busy]").forEach((form) => form.removeAttribute("aria-busy")));
};

export const submitOnceScript = `(${guardSubmits})(document, ${sameQuery})`;
