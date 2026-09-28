import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * A GM's competition comes from the club they manage. An official has no club,
 * so without a league of their own an MCBA umpire is shown MBL fixtures and a
 * head umpire reviews the other competition's cards.
 *
 * Null means both, and that is the common case - the same people call and
 * review games in either competition - so every check has to treat "no league"
 * as "all of them" rather than as "none".
 */

const read = (path) => readFileSync(path, "utf8");
const schema = read("db/schema.ts");
const umpire = read("app/umpire/page.tsx");
const headUmpire = read("app/head-umpire/page.tsx");
const usersRoute = read("app/api/users/route.ts");

test("an account can be narrowed to one competition", () => {
  const table = schema.slice(schema.indexOf("export const users = sqliteTable"));
  assert.ok(
    table.slice(0, table.indexOf("});")).includes('integer("league_id")'),
    "users no longer carries a league",
  );
});

test("an official with no league is shown both", () => {
  for (const [name, source] of [["umpire", umpire], ["head umpire", headUmpire]]) {
    assert.ok(
      source.includes("leagueUser.leagueId == null"),
      `the ${name} page does not treat "no league" as both`,
    );
  }
});

test("the umpire's lists are filtered rather than just the page title", () => {
  // Both the games waiting to be claimed and the cards already open have to be
  // narrowed; filtering one and not the other leaves the other competition
  // reachable.
  assert.ok(umpire.includes("scheduled.filter("), "scheduled fixtures are not filtered by league");
  assert.ok(umpire.includes("rows.filter("), "open scorecards are not filtered by league");
  assert.ok(headUmpire.includes("allPending.filter("), "the review queue is not filtered by league");
  assert.ok(headUmpire.includes("allApproved.filter("), "approved cards are not filtered by league");
});

test("a role with no use for a league does not keep one", () => {
  const body = usersRoute.slice(usersRoute.indexOf("export async function PATCH"));
  assert.ok(body.includes("scopedByLeague"), "the update does not decide who a league applies to");
  assert.ok(
    body.includes('["UMPIRE", "HEAD_UMPIRE", "WRITER"]'),
    "the roles a league applies to are no longer named",
  );
  assert.ok(body.includes("leagueId"), "the update never writes the league");
});
