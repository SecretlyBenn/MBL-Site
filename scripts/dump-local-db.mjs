/**
 * Dumps the local miniflare D1 database to SQL for loading into the deployed
 * D1 database.
 *
 *   node scripts/dump-local-db.mjs [outDir]
 *
 * The local database - not the seed files - is the source of truth: it carries
 * corrections applied by hand after seeding (team abbreviations, forfeits,
 * removed phantom games) that the seeds do not reproduce.
 *
 * Output is split into chunks because D1 rejects oversized single files.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const D1_DIR = path.join(".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const outDir = process.argv[2] ?? path.join("dist", "d1-dump");
const MAX_BYTES = 900_000;

const dbFile = fs
  .readdirSync(D1_DIR)
  .filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite")
  .map((name) => path.join(D1_DIR, name))
  .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];

const db = new DatabaseSync(dbFile);
const lit = (value) => {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "bigint") return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
};

// `_cf_*` are D1's own bookkeeping tables. Miniflare creates them locally, but
// the remote database owns them and rejects any statement touching one with
// SQLITE_AUTH - which aborts the entire file, not just that statement.
const objects = db
  .prepare(
    "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\'",
  )
  .all();

const tables = objects.filter((row) => row.type === "table");

// D1 enforces foreign keys and offers no way to switch that off for a bulk
// load, so parents have to be created and filled before their children.
// Order the tables by their dependencies rather than by name.
const dependencies = new Map(
  tables.map((table) => [
    table.name,
    db
      .prepare(`PRAGMA foreign_key_list("${table.name}")`)
      .all()
      .map((row) => row.table)
      .filter((name) => name !== table.name),
  ]),
);

const ordered = [];
const placed = new Set();
const visit = (name, seen = new Set()) => {
  if (placed.has(name) || seen.has(name)) return;
  seen.add(name);
  for (const parent of dependencies.get(name) ?? []) {
    if (dependencies.has(parent)) visit(parent, seen);
  }
  placed.add(name);
  ordered.push(tables.find((table) => table.name === name));
};
for (const table of tables) visit(table.name);

const statements = [];
// Children are dropped first - the reverse of creation order.
for (const table of [...ordered].reverse()) {
  statements.push(`DROP TABLE IF EXISTS "${table.name}";`);
}
for (const table of ordered) {
  statements.push(`${table.sql};`);
}

for (const object of ordered) {
  const rows = db.prepare(`SELECT * FROM "${object.name}"`).all();
  if (rows.length === 0) continue;
  const columns = Object.keys(rows[0]);
  const columnList = columns.map((name) => `"${name}"`).join(", ");
  for (const row of rows) {
    statements.push(
      `INSERT INTO "${object.name}" (${columnList}) VALUES (${columns.map((name) => lit(row[name])).join(", ")});`,
    );
  }
}

for (const object of objects.filter((row) => row.type === "index")) {
  statements.push(`${object.sql};`);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

let chunk = [];
let size = 0;
let index = 0;
const flush = () => {
  if (chunk.length === 0) return;
  fs.writeFileSync(path.join(outDir, `chunk-${String(index).padStart(3, "0")}.sql`), chunk.join("\n"), "utf8");
  index += 1;
  chunk = [];
  size = 0;
};
for (const statement of statements) {
  if (size + statement.length > MAX_BYTES) flush();
  chunk.push(statement);
  size += statement.length + 1;
}
flush();

console.log(`Source: ${dbFile}`);
console.log(`Statements: ${statements.length}`);
console.log(`Chunks: ${index} in ${outDir}`);
