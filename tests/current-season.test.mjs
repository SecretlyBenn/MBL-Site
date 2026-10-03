import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * The season being played is recorded per competition.
 *
 * It was one value for the whole site, from when the site held only the MBL.
 * The MCBA was imported afterwards and the two run at the same time, so one
 * answer could not describe both: an MCBA game published while the setting
 * said "MBL Season XII Playoffs" would have had its lines added to an MBL
 * season, which is the one thing historical_seasons.league_id exists to stop.
 *
 * This is read off the source rather than run. db/settings.ts reaches the
 * database through ./index, which Node cannot resolve from a test - and what
 * is worth pinning here is which season a given competition is asked about,
 * which is a question about the code rather than about the data.
 */

const settings = readFileSync("db/settings.ts", "utf8");
const publish = readFileSync("db/publish.ts", "utf8");
const seasonsRoute = readFileSync("app/api/seasons/route.ts", "utf8");
const scoreboard = readFileSync("db/scoreboard.ts", "utf8");
const umpire = readFileSync("app/umpire/page.tsx", "utf8");

/** One function's body, stopping at the next top-level declaration. */
function bodyOf(source, name) {
  const start = source.search(new RegExp(`(export )?(async )?function ${name}\\b`));
  assert.ok(start >= 0, `${name} is not declared`);
  const rest = source.slice(start);
  const next = rest.search(/\n(export )?(async )?function /);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

test("each competition has its own key", () => {
  // The slug is part of the key, so the two competitions cannot land on one
  // row. If this ever went back to a bare constant they would share a season
  // again and the bug would be back.
  const body = bodyOf(settings, "currentSeasonKey");
  assert.match(body, /\$\{CURRENT_SEASON\}:\$\{leagueSlug\}/, "the competition is not part of the key");
  assert.match(settings, /CURRENT_SEASON = "current_season"/);
});

test("only the MBL has a fallback season", () => {
  // A fallback is a guess about where somebody's game gets filed. The MBL's is
  // tolerable because it is the value the code itself used to carry; inventing
  // one for the MCBA would file its games into a season nobody chose.
  const body = bodyOf(settings, "currentSeasonName");
  assert.match(body, /FALLBACK_SEASON_LEAGUE/, "the fallback is no longer limited to one competition");
  assert.match(body, /return null/, "a competition with no season set must be able to say so");
  assert.match(settings, /FALLBACK_SEASON_NAME = "MBL /, "the fallback is an MBL season");
  assert.match(settings, /FALLBACK_SEASON_LEAGUE = "mbl"/);
});

test("publishing refuses rather than guessing a season", () => {
  const body = bodyOf(publish, "currentSeasonId");
  assert.match(body, /leagueSlugFor/, "the competition is not worked out from the game");
  assert.match(body, /throw new Error/, "a missing season is no longer refused");
  // The dangerous shape is falling back to whatever season exists, because the
  // only one to fall back to belongs to the other competition.
  assert.doesNotMatch(body, /\?\?\s*FALLBACK_SEASON_NAME/, "publishing falls back to a guess");
});

test("a season created while publishing is filed under a competition", () => {
  // A season with no league_id shows in neither league's archive, so it would
  // be created and then be invisible.
  const body = bodyOf(publish, "currentSeasonId");
  const insert = body.slice(body.indexOf(".values({"));
  assert.match(insert, /leagueId/, "a season is created without a competition");
});

test("the create-season route demands a competition", () => {
  assert.match(seasonsRoute, /Which competition is this season for\?/);
  assert.match(seasonsRoute, /leagueId: league\.id/, "the chosen competition is not stored");
});

test("a new season enters only its own competition's clubs", () => {
  // Entering all nineteen would put the MCBA in the MBL's standings at 0-0.
  const start = seasonsRoute.indexOf("payload.includeTeams");
  assert.ok(start >= 0, "the clubs are no longer entered here");
  const block = seasonsRoute.slice(start, start + 400);
  assert.match(block, /eq\(teams\.leagueId, league\.id\)/, "every club on the site is entered");
});

test("setting the current season takes the competition from the season", () => {
  // Otherwise an admin could make an MBL season the MCBA's current one by
  // picking from the wrong list.
  assert.match(seasonsRoute, /leagueSlugFor\(season\.leagueId\)/);
  assert.match(seasonsRoute, /setCurrentSeasonName\(slug, season\.name\)/);
});

test("the naming convention still decides a postseason", () => {
  // Every season imported from the old site was named this way, and the
  // archive has to read the same either side of the checkbox being added.
  assert.match(seasonsRoute, /payload\.isPlayoffs \?\? \/playoffs\?\$\/i\.test\(name\)/);
});

test("a stadium board reads its own competition's season", () => {
  assert.match(scoreboard, /leagueSlugFor\(leagueId\)/);
  // The guard against one league's figures appearing on the other's board
  // stays, because an admin can still point a competition at the wrong season.
  assert.match(scoreboard, /season\.leagueId !== leagueId/);
});

test("the umpire page numbers a series within its own competition", () => {
  // Numbering an MCBA fixture against the MBL's schedule would hand it
  // whatever series happened to sit at that position.
  assert.match(umpire, /positionOf\.get\(leagueId\)/);
  assert.doesNotMatch(
    umpire,
    /positionOf\.get\(game\.sourceGameId\)/,
    "fixtures are still numbered from one shared schedule",
  );
});
