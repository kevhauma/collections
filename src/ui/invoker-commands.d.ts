// React 19.3's types don't know invoker commands yet (spike-results § 10). React passes them through as-is.
import "react";

declare module "react" {
  interface ButtonHTMLAttributes<T> {
    commandfor?: string;
    command?: "show-modal" | "close" | "request-close" | "toggle-popover" | "show-popover" | "hide-popover";
  }
  // Light dismiss for a dialog (TICKET-UI-08), not in the types either.
  interface DialogHTMLAttributes<T> {
    closedby?: "any" | "closerequest" | "none";
  }
}
