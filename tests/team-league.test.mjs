import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * A club decides the league of everything pointing at it - its players, its
 * fixtures and the standings it appears in. A club created without one would
 * belong to neither competition and show up in no standings at all, and moving
 * it afterwards means moving everything that refers to it.
 */

const route = readFileSync("app/api/teams/route.ts", "utf8");
const schema = readFileSync("db/schema.ts", "utf8");

/** The body of the exported handler, stopping at the next export. */
function handler(name) {
  const start = route.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} is not exported from the teams route`);
  const rest = route.slice(start);
  const next = rest.indexOf("\nexport ", 1);
  return next === -1 ? rest : rest.slice(0, next);
}

test("a club records which league it plays in", () => {
  const table = schema.slice(schema.indexOf("export const teams = sqliteTable"));
  assert.ok(
    table.slice(0, table.indexOf("});")).includes('integer("league_id")'),
    "teams no longer carries a league",
  );
});

test("creating a club without a league is refused", () => {
  const body = handler("POST");
  assert.ok(body.includes("leagueId"), "the create handler ignores the league");
  const checked = body.indexOf("Choose which league");
  const inserted = body.indexOf(".insert(teams)");
  assert.ok(checked >= 0, "nothing rejects a club with no league");
  assert.ok(inserted >= 0, "the create handler no longer inserts a club");
  assert.ok(checked < inserted, "the league is checked only after the club is written");
});

test("the league is confirmed to exist, not just to be a number", () => {
  const body = handler("POST");
  assert.ok(
    body.includes("leagues.id") && body.indexOf("leagues.id") < body.indexOf(".insert(teams)"),
    "any number is accepted as a league id",
  );
});
