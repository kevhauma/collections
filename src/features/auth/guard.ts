import { redirect } from "react-router";
import { requestContext } from "../../context";

// First line of every admin route loader and every admin server action. Without a session, a page view (GET) is
// sent to the login at /admin, and anything else, such as a direct POST to an action, gets 401.
export const requireAdmin = (): void => {
  const { request, session } = requestContext();
  if (session) return;
  // A real Response, not data(): React Router returns a thrown Response from a server action as the response
  // itself, but treats anything else as a render error and re-renders the page with status 200.
  throw request.method === "GET" ? redirect("/admin") : new Response(null, { status: 401 });
};
