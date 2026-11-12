import { data } from "react-router";
import { RouteError } from "./route-error";

// Catch-all for unknown URLs: responds 404 and renders the not-found page inside the public frame.
export const loader = () => {
  throw data(null, { status: 404 });
};

// Without a Component or ErrorBoundary, React Router would treat this as a resource route and answer with JSON.
export const ErrorBoundary = RouteError;
