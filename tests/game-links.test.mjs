import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";

/**
 * `/games/<id>` is the address from before the site held two competitions. It
 * still answers, by redirecting to whichever league is first - the MBL - so a
 * link to it from inside a league is wrong twice over: an MCBA score opens
 * under MBL chrome, and the redirect adds a history entry that sends the back
 * button somewhere the reader never was.
 */

/** Every .tsx under `dir`, with "/" separators whatever the platform. */
function tsxFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = dir + "/" + entry;
    if (statSync(path).isDirectory()) out.push(...tsxFiles(path));
    else if (entry.endsWith(".tsx")) out.push(path);
  }
  return out;
}

test("no page links a game at the pre-two-league address", () => {
  const offenders = [];
  for (const file of tsxFiles("app")) {
    // app/games/[gameId] is the old address itself, which has to keep its name.
    if (file.startsWith("app/games/")) continue;
    const source = readFileSync(file, "utf8");
    if (/href=\{?["'`]\/games\//.test(source)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `these link straight to the redirect: ${offenders.join(", ")}`);
});

test("a player's game log links each score to its own league's game page", () => {
  const profile = readFileSync("app/[league]/players/PlayerProfile.tsx", "utf8");
  assert.match(
    profile,
    /href=\{`\/\$\{game\.leagueSlug\}\/games\/\$\{game\.gameId\}`\}/,
    "the score is not a link, or does not carry the game's own league",
  );
});

test("the pre-two-league game address looks the league up instead of guessing", () => {
  // It used to send every old link to the MBL, so an MCBA game posted in
  // Discord a year ago opened under the wrong competition's crests.
  const page = readFileSync("app/games/[gameId]/page.tsx", "utf8");
  assert.match(page, /leagueSlugForGame/, "the old address still guesses which league a game is in");
  assert.ok(
    page.indexOf("leagueSlugForGame") < page.indexOf("toDefaultLeague("),
    "the guess runs before the lookup, so the lookup never decides anything",
  );
  // A game that does not exist must still land somewhere: 404ing a link
  // someone posted is worse than showing the default league's missing page.
  assert.match(page, /toDefaultLeague/, "an unknown game id now dead-ends");
});

test("a game's league comes from its season, which is where the archive records it", () => {
  const queries = readFileSync("db/queries.ts", "utf8");
  const start = queries.indexOf("export async function leagueSlugForGame");
  assert.ok(start > 0, "leagueSlugForGame is not exported");
  const body = queries.slice(start, queries.indexOf("\nexport ", start + 1));
  assert.ok(body.includes("historicalSeasons"), "the lookup does not go through the season");
  assert.ok(body.includes("leagues"), "the lookup never reaches the leagues table");
});
