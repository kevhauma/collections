// Admin password recovery (TICKET-AUTH-03). Run on the server: `npm run reset-password`, or in Docker
// `docker compose exec collections npm run reset-password`. Pipe the password in with `--stdin` for scripted use.
// It's never taken as an argument, so it can't end up in shell history or the process list.
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { openDatabase } from "../src/db/connection.ts";
import { dataDir } from "../src/lib/env.ts";
import { resetPassword } from "../src/features/auth/reset-password.ts";

// Readline echoes typed characters to its output; give it a silent one and write the prompts ourselves.
const askHidden = async (prompts: string[]): Promise<string[]> => {
  const silent = new Writable({ write: (_chunk, _encoding, done) => done() });
  const rl = createInterface({ input: process.stdin, output: silent, terminal: true });
  // The line iterator buffers, so piped input doesn't lose lines that arrive before the next prompt.
  const lines = rl[Symbol.asyncIterator]();
  const answers: string[] = [];
  for (const prompt of prompts) {
    process.stdout.write(prompt);
    answers.push(((await lines.next()).value as string | undefined) ?? "");
    process.stdout.write("\n");
  }
  rl.close();
  return answers;
};

const readStdinLine = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8").split(/\r?\n/)[0] ?? "";
};

const readPassword = async (): Promise<string> => {
  if (process.argv.includes("--stdin")) return readStdinLine();
  const [password = "", confirm] = await askHidden(["New admin password: ", "Repeat it: "]);
  if (password !== confirm) throw new Error("The two passwords don't match.");
  return password;
};

try {
  const password = await readPassword();
  const db = openDatabase(dataDir());
  await resetPassword(db, password);
  db.close();
  console.log("Admin password reset. Every session is logged out.");
} catch (error) {
  console.error(`Password not changed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
