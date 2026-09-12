/**
 * Points the built Worker config at the real D1 database.
 *
 *   node scripts/apply-d1-binding.mjs
 *
 * `vinext build` writes dist/server/wrangler.json with a placeholder database
 * id ("00000000-0000-4000-8000-000000000000"). Deploying that fails with
 * "D1 binding 'DB' references database ... which was not found", and declaring
 * the binding in the root wrangler.jsonc instead produces a duplicate one, so
 * the id is stamped in here after the build. Run by `npm run deploy`.
 */
import fs from "node:fs";
import path from "node:path";

const PLACEHOLDER = "00000000-0000-4000-8000-000000000000";
const DATABASE_ID = process.env.D1_DATABASE_ID ?? "367d7104-bb21-4f11-bf01-2338213f1ac8";

const configPath = path.join("dist", "server", "wrangler.json");
if (!fs.existsSync(configPath)) {
  console.error(`${configPath} is missing - run \`npm run build\` first.`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const bindings = config.d1_databases ?? [];
const stale = bindings.filter((binding) => binding.database_id === PLACEHOLDER);

if (stale.length === 0) {
  console.log("D1 binding already points at a real database - nothing to do.");
} else {
  for (const binding of stale) binding.database_id = DATABASE_ID;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Pointed ${stale.length} D1 binding(s) at ${DATABASE_ID}.`);
}
