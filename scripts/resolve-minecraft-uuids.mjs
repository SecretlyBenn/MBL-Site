/**
 * Resolves every archived player name to a Minecraft UUID.
 *
 *   node scripts/resolve-minecraft-uuids.mjs [out.json]
 *
 * UUIDs are stable across renames, so storing one means a player's head keeps
 * resolving even after they change their username - the archive records
 * whatever name was in use at the time.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const D1_DIR = path.join(".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const outPath = process.argv[2] ?? path.join("dist", "minecraft-uuids.json");

const dbFile = fs
  .readdirSync(D1_DIR)
  .filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite")
  .map((name) => path.join(D1_DIR, name))
  .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];

const db = new DatabaseSync(dbFile);
const names = db
  .prepare("SELECT DISTINCT player_name FROM historical_player_stats ORDER BY player_name")
  .all()
  .map((row) => row.player_name);

const resolved = {};
const unresolved = [];
let done = 0;

/** Mojang rate-limits, so requests go out in small batches with a pause. */
const BATCH = 8;
const PAUSE_MS = 350;

for (let index = 0; index < names.length; index += BATCH) {
  const batch = names.slice(index, index + BATCH);
  await Promise.all(
    batch.map(async (name) => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch(
            `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`,
          );
          if (response.status === 200) {
            const body = await response.json();
            resolved[name] = { uuid: body.id, currentName: body.name };
            return;
          }
          // 404 is a real answer: no Minecraft account owns this name.
          if (response.status === 404 || response.status === 400) {
            unresolved.push(name);
            return;
          }
          // 429 and 5xx are worth retrying.
          await new Promise((wait) => setTimeout(wait, 1500 * (attempt + 1)));
        } catch {
          await new Promise((wait) => setTimeout(wait, 1500 * (attempt + 1)));
        }
      }
      unresolved.push(name);
    }),
  );
  done += batch.length;
  if (done % 80 === 0) console.error(`  ${done}/${names.length}`);
  await new Promise((wait) => setTimeout(wait, PAUSE_MS));
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ resolved, unresolved }, null, 2), "utf8");
console.error(`\nResolved ${Object.keys(resolved).length}/${names.length}`);
console.error(`Unresolved: ${unresolved.length}`);
console.error(`Wrote ${outPath}`);
