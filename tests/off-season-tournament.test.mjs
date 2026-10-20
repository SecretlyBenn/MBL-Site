import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * The off-season tournament is a third competition that borrows its players.
 *
 * Everything else about it is an ordinary league row - its tab, its pages,
 * its schedule, its own career statistics - and needs no test, because it is
 * the same code the MBL and the MCBA already run. What is new is the one
 * promise the tournament makes: that running it does not touch a single MBL
 * or MCBA roster. These are the places that promise could be broken.
 */

const schema = readFileSync("db/schema.ts", "utf8");
const queries = readFileSync("db/queries.ts", "utf8");
const moves = readFileSync("app/api/roster-moves/route.ts", "utf8");
const gmPage = readFileSync("app/gm/page.tsx", "utf8");
const backfill = readFileSync("drizzle/0099_everyone_who_played_is_in_the_pool.sql", "utf8");

function functionOf(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} is not declared`);
  const rest = source.slice(start);
  // Declarations here are top level, so the next one at column zero ends it.
  const end = rest.slice(1).search(/\n(?:async function|function|export)/);
  return end < 0 ? rest : rest.slice(0, end + 1);
}

test("a competition says whether it borrows its players", () => {
  const start = schema.indexOf("export const leagues = sqliteTable");
  const table = schema.slice(start, schema.indexOf("});", start));
  assert.ok(table.includes('integer("is_tournament"'), "leagues no longer says what is a tournament");
});

test("a tournament move never touches the player", () => {
  const body = functionOf(moves, "tournamentMove");
  // The whole point. A signing here is a roster spot and nothing else: the
  // moment this writes to `players` it is taking somebody off their MBL club.
  assert.ok(!/update\(players\)/.test(body), "a tournament move writes to the players table");
  assert.ok(body.includes("insert(rosterSpots)"), "a tournament signing no longer creates a spot");
  assert.ok(body.includes("delete(rosterSpots)"), "a tournament release no longer removes the spot");
});

test("a tournament has no farm team", () => {
  const body = functionOf(moves, "tournamentMove");
  assert.ok(
    body.includes('payload.moveType !== "SIGN" && payload.moveType !== "RELEASE"'),
    "a tournament club now accepts send-downs and recalls",
  );
});

test("a man plays for one club in a tournament", () => {
  const body = functionOf(moves, "tournamentMove");
  assert.ok(body.includes("elsewhere"), "nothing stops two tournament clubs sharing a player");
  assert.ok(body.includes("held.length === 0"), "picking the same player twice would give him two spots");
});

test("a GM picks for their own club and nobody else's", () => {
  const body = functionOf(moves, "tournamentMove");
  assert.ok(
    body.includes('hasRole(leagueUser, "GM") && leagueUser.teamId !== team.id'),
    "a tournament GM can act on another club",
  );
});

test("a spot puts you on the roster whatever your own club has you down as", () => {
  const start = queries.indexOf("export async function getTeamRoster");
  const body = queries.slice(start, queries.indexOf("\n}", start));
  // A tournament player is a free agent, or active on an MBL club - almost
  // never "ACTIVE on this one". Filtering the spots by ACTIVE emptied every
  // tournament roster on the site.
  assert.ok(body.includes('ne(players.status, "RELEASED")'), "a spot is filtered by status again");
  assert.ok(
    body.includes('and(eq(players.teamId, teamId), eq(players.status, "ACTIVE"))'),
    "belonging to a club no longer requires being active on it",
  );
});

test("the pool is capped, because it is now everybody", () => {
  assert.ok(gmPage.includes("POOL_LIMIT"), "the GM page lists the whole pool again");
  assert.ok(gmPage.includes("like(players.displayName"), "the pool cannot be searched");
});

test("the free agent backfill can be run twice", () => {
  const inserts = backfill.match(/INSERT INTO players/g) ?? [];
  assert.equal(inserts.length, 2, "the backfill is no longer the two inserts this checks");
  // Both are guarded, so a second run inserts nothing. A `fetch failed` from
  // D1 can be a lost response to a write that went through, so every one of
  // these has to be safe to repeat.
  const guards = backfill.match(/NOT IN \(SELECT LOWER\(/g) ?? [];
  assert.equal(guards.length, 4, "the backfill no longer guards against inserting a name twice");
  // The MBL runs first, which is the whole of "played in the MCBA and never
  // in the MBL": by the time the second insert runs, those men are already in.
  assert.ok(
    backfill.indexOf("s.league_id = 1") < backfill.indexOf("s.league_id = 2"),
    "the MCBA insert now runs before the MBL one, so a man in both is filed as a college player",
  );
});
