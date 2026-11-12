import { Outlet } from "react-router";
import "../ui/styles.css";

// Document shell. TICKET-UI-02 replaces it with the real admin/public shells.
export default function Root() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Collections</title>
      </head>
      <body>
        <Outlet />
      </body>
    </html>
  );
}
