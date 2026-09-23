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
 * machine can now reach two accounts - the one the site runs in and the
 * league's own - and wrangler refuses to guess between them. Naming it here
 * means a deploy cannot land in the wrong account by accident. Both ids can be
 * overridden by the environment, which is how the site moves accounts.
 */
import fs from "node:fs";
import path from "node:path";

const PLACEHOLDER = "00000000-0000-4000-8000-000000000000";
const DATABASE_ID = process.env.D1_DATABASE_ID ?? "367d7104-bb21-4f11-bf01-2338213f1ac8";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "b690333da05f8e1aea40b7e68f6ff519";

const configPath = path.join("dist", "server", "wrangler.json");
if (!fs.existsSync(configPath)) {
  console.error(`${configPath} is missing - run \`npm run build\` first.`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const bindings = config.d1_databases ?? [];
const stale = bindings.filter((binding) => binding.database_id === PLACEHOLDER);

for (const binding of stale) binding.database_id = DATABASE_ID;
config.account_id = ACCOUNT_ID;
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log(
  stale.length === 0
    ? "D1 binding already points at a real database."
    : `Pointed ${stale.length} D1 binding(s) at ${DATABASE_ID}.`,
);
console.log(`Deploying to account ${ACCOUNT_ID}.`);
