/**
 * Points the built Worker config at the real D1 database and account.
 *
 *   node scripts/apply-d1-binding.mjs
 *
 * `vinext build` writes dist/server/wrangler.json with a placeholder database
 * id ("00000000-0000-4000-8000-000000000000"). Deploying that fails with
 * "D1 binding 'DB' references database ... which was not found", and declaring
 * the binding in the root wrangler.jsonc instead produces a duplicate one, so
 * the id is stamped in here after the build. Run by `npm run deploy`.
 *
 * The account is stamped in for the same reason: the Cloudflare login on this
 * machine can reach two accounts - the league's own, which the site runs in,
 * and the owner's personal one, which still holds a copy of the database - and
 * wrangler refuses to guess between them. Naming it here means a deploy cannot
 * land in the wrong account by accident. Both ids can be overridden by the
 * environment, which is how the site moved accounts and how it would move
 * again.
 *
 * The database id is re-stamped every run, not only when it is still the
 * build's placeholder. It used to be the placeholder only, and that turned a
 * second run into a trap: running this once without the environment set and
 * again with it left the right account beside the wrong database, because the
 * account is always overwritten and the id was not. That state is worse than
 * either default - a Worker in one account bound to a database id belonging to
 * the other, which is not a database it can reach - and it deploys without
 * complaint. Rewriting the id unconditionally makes the last run win, which is
 * what anybody re-running this expects.
 */
import fs from "node:fs";
import path from "node:path";

// The league's own account and its database: where the site actually runs.
const DATABASE_ID = process.env.D1_DATABASE_ID ?? "6cbca09f-19d3-424f-8b5c-ae86a3ae5eee";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "38532e1647aeaa4803a5457a769f8087";

const configPath = path.join("dist", "server", "wrangler.json");
if (!fs.existsSync(configPath)) {
  console.error(`${configPath} is missing - run \`npm run build\` first.`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const bindings = config.d1_databases ?? [];

for (const binding of bindings) binding.database_id = DATABASE_ID;
config.account_id = ACCOUNT_ID;
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log(`Pointed ${bindings.length} D1 binding(s) at ${DATABASE_ID}.`);
console.log(`Deploying to account ${ACCOUNT_ID}.`);
if (bindings.length === 0) {
  console.error("No D1 binding in the built config - the Worker would have no database.");
  process.exit(1);
}
