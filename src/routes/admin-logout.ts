import { redirect } from "react-router";
import { logOut } from "../features/auth/session";

// POST /admin/logout: an action-only route, so the header's plain form works with and without JS.
export const action = () => {
  logOut();
  return redirect("/admin");
};
