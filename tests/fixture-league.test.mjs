import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * A fixture takes its league from the clubs playing it. One club from each
 * competition would put the game in both schedules and count it towards both
 * sets of standings, so it is refused when it is scheduled rather than
 * untangled afterwards.
 */

const queries = readFileSync("db/queries.ts", "utf8");
const gamesRoute = readFileSync("app/api/games/route.ts", "utf8");
const fixturesRoute = readFileSync("app/api/fixtures/route.ts", "utf8");

/** One exported function's body, stopping at the next export. */
function bodyOf(source, name) {
  const start = source.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} is not exported`);
  const rest = source.slice(start);
  const next = rest.indexOf("\nexport ", 1);
  return next === -1 ? rest : rest.slice(0, next);
}

test("two clubs only share a league when both actually have the same one", () => {
  const body = bodyOf(queries, "fixtureClubs");
  // Null on either side must not read as a match - two clubs with no league
  // would otherwise count as agreeing.
  assert.ok(body.includes("away.leagueId !== null"), "a club with no league counts as a match");
  assert.ok(body.includes("away.leagueId === home.leagueId"), "the two leagues are not compared");
});

test("a one-off game between competitions is refused before it is written", () => {
  const body = bodyOf(gamesRoute, "POST");
  const checked = body.indexOf("fixtureClubs");
  const inserted = body.indexOf(".insert(games)");
  assert.ok(checked >= 0, "the game route does not check the clubs' league");
  assert.ok(inserted >= 0, "the game route no longer inserts a game");
  assert.ok(checked < inserted, "the league is checked only after the game is written");
});

test("a season fixture is refused between competitions, and outside its own", () => {
  const body = bodyOf(fixturesRoute, "POST");
  const checked = body.indexOf("fixtureClubs");
  const inserted = body.indexOf(".insert(historicalGames)");
  assert.ok(checked >= 0, "the fixture route does not check the clubs' league");
  assert.ok(checked < inserted, "the league is checked only after the fixture is written");
  // A fixture must also belong to the season's own competition, or it lands in
  // a season neither club plays in.
  assert.ok(
    body.includes("season.leagueId !== leagueId"),
    "a fixture can be added to another competition's season",
  );
});
