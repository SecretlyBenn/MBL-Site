/**
 * Takes an offsite snapshot of the live database.
 *
 *   node scripts/backup-db.mjs
 *
 * D1's own Time Travel already covers the ordinary accident: it restores the
 * whole database to any point in the last 30 days and needs nothing from
 * anybody. This is for the two things it cannot do - going back further than
 * 30 days, and surviving the loss of the Cloudflare account itself, which is
 * where Time Travel's copies live too.
 *
 * It writes a gzipped .sql dump, which is the schema and every row as
 * statements, so it can be replayed into a brand new database with
 * `wrangler d1 execute --file`. About 25MB of SQL, three or four compressed.
 *
 * The default destination is a OneDrive folder, because that is already
 * syncing on this machine and so "offsite" costs nothing and needs no new
 * account. Override it with MBL_BACKUP_DIR.
 *
 * **A snapshot is checked before it is kept.** An export that was truncated by
 * a dropped connection is still a file, and a file is exactly what a backup
 * looks like until the day somebody needs it. So the dump has to contain the
 * schema and a plausible number of rows before it replaces anything, and a
 * short one is left behind with a .rejected name rather than deleted, so there
 * is something to look at.
 */
import { execFileSync } from "node:child_process";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import os from "node:os";

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID ?? "38532e1647aeaa4803a5457a769f8087";
const DATABASE = "mbl-site-db";
const DESTINATION = process.env.MBL_BACKUP_DIR ?? path.join(os.homedir(), "OneDrive", "MBL-backups");
/** How many snapshots to keep. Daily, this is a fortnight of them. */
const KEEP = Number(process.env.MBL_BACKUP_KEEP ?? 14);

/**
 * The floor a dump has to clear to count as one.
 *
 * The archive alone is tens of thousands of rows and only ever grows, so a
 * dump with fewer than this did not finish. It is deliberately far below the
 * real figure - this is here to catch a truncated file, not to notice a
 * quiet season.
 */
const LEAST_ROWS = 20000;

/**
 * Wrangler's own entry point, run with this Node.
 *
 * Not `npx`: on Windows that is `npx.cmd`, and Node refuses to execFile a .cmd
 * without a shell - it answers EINVAL - while passing `shell: true` hands the
 * arguments to cmd unescaped, which is a worse trade for a script that takes a
 * path. Calling the bin directly has neither problem and skips a process.
 */
const WRANGLER = path.join("node_modules", "wrangler", "bin", "wrangler.js");

function run(args) {
  return execFileSync(process.execPath, [WRANGLER, ...args], {
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT },
    stdio: ["ignore", "pipe", "inherit"],
    encoding: "utf8",
  });
}

const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
mkdirSync(DESTINATION, { recursive: true });
const raw = path.join(os.tmpdir(), `${DATABASE}-${stamp}.sql`);

console.log(`Exporting ${DATABASE} from ${ACCOUNT}...`);
// Wrangler answers `fetch failed` often enough that a snapshot run unattended
// would otherwise end in a stack trace nobody reads. Said plainly and tried
// again, because the next line is the only one that knows whether it worked.
let exported = false;
for (let attempt = 1; attempt <= 3 && !exported; attempt += 1) {
  try {
    run(["d1", "export", DATABASE, "--remote", "--output", raw]);
    exported = true;
  } catch (error) {
    const reason = String(error?.stdout ?? error?.message ?? error).match(/fetch failed|Authentication error|\[code: \d+\]/)?.[0];
    console.error(`Export attempt ${attempt} of 3 failed${reason ? ` (${reason})` : ""}.`);
  }
}
if (!exported) {
  console.error("Could not export after three attempts. The snapshots already kept are untouched.");
  process.exit(1);
}
if (!existsSync(raw)) {
  console.error("The export wrote no file. Nothing has been changed.");
  process.exit(1);
}

// Counted by reading rather than loading: the dump is bigger than it is worth
// holding in memory, and all that is wanted is two facts about it.
let rows = 0;
let hasSchema = false;
await pipeline(createReadStream(raw, { encoding: "utf8" }), async function* (chunks) {
  let tail = "";
  for await (const chunk of chunks) {
    const text = tail + chunk;
    const lines = text.split("\n");
    tail = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("INSERT INTO")) rows += 1;
      else if (line.startsWith("CREATE TABLE")) hasSchema = true;
    }
  }
  if (tail.startsWith("INSERT INTO")) rows += 1;
  yield "";
});

const megabytes = (statSync(raw).size / 1_000_000).toFixed(1);
if (!hasSchema || rows < LEAST_ROWS) {
  const rejected = path.join(DESTINATION, `${DATABASE}-${stamp}.sql.rejected`);
  createReadStream(raw).pipe(createWriteStream(rejected));
  console.error(
    `That dump is not a backup: ${rows} rows, schema ${hasSchema ? "present" : "MISSING"}, ${megabytes}MB.\n` +
      `Kept at ${rejected} to look at. The snapshots already in ${DESTINATION} are untouched.`,
  );
  process.exit(1);
}

const kept = path.join(DESTINATION, `${DATABASE}-${stamp}.sql.gz`);
await pipeline(createReadStream(raw), createGzip({ level: 9 }), createWriteStream(kept));
rmSync(raw, { force: true });
const compressed = (statSync(kept).size / 1_000_000).toFixed(1);
console.log(`Kept ${kept} - ${rows} rows, ${megabytes}MB of SQL, ${compressed}MB compressed.`);

// Oldest first by name, which sorts chronologically because the stamp does.
const snapshots = readdirSync(DESTINATION)
  .filter((name) => name.startsWith(`${DATABASE}-`) && name.endsWith(".sql.gz"))
  .sort();
for (const old of snapshots.slice(0, Math.max(0, snapshots.length - KEEP))) {
  rmSync(path.join(DESTINATION, old), { force: true });
  console.log(`Removed ${old}, past the last ${KEEP}.`);
}
console.log(`${Math.min(snapshots.length, KEEP)} snapshot(s) in ${DESTINATION}.`);
