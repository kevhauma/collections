import type Database from "better-sqlite3";
import { setAdminPassword } from "../../db/admin.ts";
import { hashPassword, passwordSchema } from "./password.ts";

// Core of scripts/reset-password.ts (TICKET-AUTH-03). Relative imports carry `.ts` so plain `node` can load it.
// Sets the admin password (creating the admin if setup never ran) and logs out every session. A rejected
// password changes nothing.
export const resetPassword = async (connection: Database.Database, password: string): Promise<void> => {
  if (!passwordSchema.safeParse(password).success) throw new Error("The password needs at least 12 characters.");
  setAdminPassword(await hashPassword(password), connection);
};
