import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Who is on a club right now.
 *
 * One rule decides it in three places: the umpire's lineup pool, the public
 * rosters page, and the roster a GM is shown. If they ever disagree, the
 * symptom is a player who is plainly on the roster and cannot be put in the
 * lineup, which is discovered at the plate. So the rule is asserted here
 * rather than trusted to stay in step.
 */

const queries = readFileSync("db/queries.ts", "utf8");
const umpire = readFileSync("app/umpire/[scorecardId]/page.tsx", "utf8");
const rosters = readFileSync("app/[league]/rosters/page.tsx", "utf8");

function bodyOf(source, name) {
  const start = source.indexOf(`export async function ${name}(`);
  assert.ok(start > 0, `${name} is gone`);
  return source.slice(start, source.indexOf("\n}", start));
}

test("both roster queries use the same two branches", () => {
  for (const name of ["getTeamRoster", "getLeagueRosters"]) {
    const body = bodyOf(queries, name);
    assert.match(body, /eq\(players\.status, "ACTIVE"\)/, `${name}: own club must require ACTIVE`);
    assert.match(body, /rosterSpots/, `${name}: must count players holding a spot`);
    assert.match(body, /ne\(players\.status, "RELEASED"\)/, `${name}: a released player holds nothing`);
  }
});

test("a sent-down player is off his own club and on the affiliate", () => {
  // TRIPLE_A is not ACTIVE, so the first branch drops him from the club he
  // belongs to; the spot on the affiliate is what puts him anywhere at all.
  // Both halves have to stay true for the rule to mean anything.
  const body = bodyOf(queries, "getTeamRoster");
  assert.doesNotMatch(
    body,
    /or\(\s*and\(eq\(players\.teamId, teamId\), ne\(/,
    "the own-club branch must not be loosened to anything-but-released",
  );
});

test("the umpire page no longer reads every player on the site", () => {
  // It used to be db.select().from(players) with no filter, which went from
  // 400 rows to about 1,200 when the pool was backfilled from the archive -
  // on a page already over its CPU budget.
  assert.doesNotMatch(
    umpire,
    /await db\.select\(\)\.from\(players\)\s*;/,
    "the whole players table is being read again",
  );
  assert.match(umpire, /getTeamRoster\(/, "the pool should come from the shared rule");
  // Names for players already on the card are fetched by id, not by reading
  // everybody, and must stay under D1's cap of 100 bound parameters.
  assert.match(umpire, /inArray\(players\.id, onCard\)/);
});

test("the lineup pool and the bench come from the same squad", () => {
  // Two filters over one list. If the bench filtered by teamId again it would
  // silently exclude anyone holding a spot, which is every sent-down player.
  assert.match(umpire, /const rosterOf = /);
  assert.equal(
    umpire.split("rosterOf(teamId)").length - 1,
    2,
    "the pool and the bench should both read rosterOf",
  );
  assert.doesNotMatch(umpire, /player\.teamId === teamId/, "filtering by club again misses spot-holders");
});

test("an old season link lands on the archive, not on today's roster", () => {
  // /rosters?season=13&team=89 used to mean the archive. It must not quietly
  // answer with this week's roster instead.
  assert.match(rosters, /if \(asked\.season\)/);
  const guard = rosters.slice(rosters.indexOf("if (asked.season)"));
  assert.match(guard.slice(0, 220), /redirect\(`\/\$\{league\.slug\}\/seasons\?season=/);
});
