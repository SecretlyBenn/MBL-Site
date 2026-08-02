/**
 * Applies the generated Drizzle migrations (and optionally the historical seed)
 * directly to the local miniflare D1 sqlite file used by `npm run dev`.
 *
 *   node scripts/apply-local-db.mjs
 *
 * This is a local-development convenience only - the real deployment applies
 * migrations through the hosting platform.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const D1_DIR = path.join(".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");

const dbFile = fs
  .readdirSync(D1_DIR)
  .filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite")
  .map((name) => path.join(D1_DIR, name))
  .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];

if (!dbFile) {
  console.error(
    `No local D1 sqlite file found under ${D1_DIR}. Start the dev server once first so miniflare creates it.`,
  );
  process.exit(1);
}

console.log(`Using local D1 file: ${dbFile}`);
const db = new DatabaseSync(dbFile);

/** Splits a .sql file into individual statements, ignoring drizzle's breakpoints. */
function statementsFrom(file) {
  return fs
    .readFileSync(file, "utf8")
    .split(/;\s*(?:--> statement-breakpoint)?\r?\n/)
    .map((statement) => statement.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);
}

const migrations = fs
  .readdirSync("drizzle")
  .filter((name) => /^\d+_.*\.sql$/.test(name))
  .sort();

for (const migration of migrations) {
  const file = path.join("drizzle", migration);
  let applied = 0;
  let skipped = 0;

  for (const statement of statementsFrom(file)) {
    try {
      db.exec(statement);
      applied += 1;
    } catch (error) {
      // Re-running a migration is fine; anything else is a real failure.
      if (String(error.message).includes("already exists")) {
        skipped += 1;
        continue;
      }
      console.error(`\n${migration} failed on:\n${statement.slice(0, 200)}\n`);
      throw error;
    }
  }
  console.log(`  ${migration}: ${applied} applied, ${skipped} already present`);
}

const seedFile = path.join("drizzle", "seed-historical.sql");
if (fs.existsSync(seedFile)) {
  let count = 0;
  db.exec("BEGIN");
  for (const statement of statementsFrom(seedFile)) {
    db.exec(statement);
    count += 1;
  }
  db.exec("COMMIT");
  console.log(`  seed-historical.sql: ${count} statements`);
}

for (const table of ["historical_seasons", "historical_teams", "historical_player_stats"]) {
  const [row] = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).all();
  console.log(`  ${table}: ${row.n} rows`);
}

db.close();
console.log("Local database ready.");
