import { Readable } from "node:stream";
import { readSnapshot } from "../db/export";
import { requireAdmin } from "../features/auth/guard";
import { buildExport, exportFilename } from "../features/backup/export";
import { uploadsDir } from "../features/images/process";

// GET /admin/export.zip (TICKET-BAK-01): the full export, streamed as it's zipped. Admin only: without a session
// requireAdmin() redirects to the login.
export const loader = () => {
  requireAdmin();
  const zip = buildExport(readSnapshot(), uploadsDir());
  return new Response(Readable.toWeb(zip.outputStream) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${exportFilename()}"`,
      "Cache-Control": "no-store",
    },
  });
};
