import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * A player's competition used to come only from their club, which fell apart
 * the moment they were released: team_id went null and they belonged to no
 * league at all. That is why one competition could see the other's free
 * agents - there was nothing on a free agent saying whose they were.
 */

const schema = readFileSync("db/schema.ts", "utf8");
const gmPage = readFileSync("app/gm/page.tsx", "utf8");
const moves = readFileSync("app/api/roster-moves/route.ts", "utf8");
const playersRoute = readFileSync("app/api/players/route.ts", "utf8");

function tableOf(name) {
  const start = schema.indexOf(`export const ${name} = sqliteTable`);
  assert.ok(start >= 0, `${name} is not declared`);
  const rest = schema.slice(start);
  return rest.slice(0, rest.indexOf("});"));
}

test("a player carries their own competition, not just their club's", () => {
  assert.ok(tableOf("players").includes('integer("league_id")'), "players no longer carries a league");
});

test("only a competition with a minor league can send players down", () => {
  assert.ok(
    tableOf("leagues").includes('integer("has_minor_league"'),
    "leagues no longer says whether it has a minor league",
  );
  // The button being hidden is not the rule; the route is.
  assert.ok(
    moves.includes("hasMinorLeague"),
    "the roster-move route does not check for a minor league",
  );
  assert.ok(gmPage.includes("canSendDown"), "the GM page offers Triple-A to every club again");
});

test("a club cannot sign another competition's free agent", () => {
  assert.ok(
    moves.includes("player.leagueId !== null && player.leagueId !== landingTeam.leagueId"),
    "the signing check no longer compares the player's league with the club's",
  );
  assert.ok(
    gmPage.includes("eq(players.leagueId,"),
    "the free-agent list is not scoped to the club's competition",
  );
});

test("the guards run before the move is written", () => {
  const body = moves.slice(moves.indexOf("export async function POST"));
  const checked = body.indexOf("hasMinorLeague");
  const written = body.indexOf(".update(players)");
  assert.ok(checked >= 0 && written >= 0, "the route lost its check or its write");
  assert.ok(checked < written, "the league is checked only after the player is moved");
});

test("a GM can add a player the site has never seen, to their own club only", () => {
  const body = playersRoute.slice(playersRoute.indexOf("export async function POST"));
  assert.ok(body.includes('["ADMIN", "GM"]'), "a GM cannot add a player again");
  assert.ok(
    body.includes("You can only add players to your own club."),
    "a GM is not held to their own club",
  );
  assert.ok(body.includes("leagueId"), "a new player is created without a competition");
});
