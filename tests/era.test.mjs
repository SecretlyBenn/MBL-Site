import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { earnedRunAverage, ERA_INNINGS, perGame } from "../app/scoring.ts";

/**
 * An ERA here is runs per *whole game*, not per nine innings, because nobody
 * plays nine. How long a whole game is depends on the competition: the MBL
 * plays six innings and the MCBA five. That is not a detail - one number for
 * both put every MCBA pitcher on the site a fifth too high.
 *
 * The imported figures settle it and are not ambiguous. Of the archive's
 * pitching lines with innings behind them, 524 of the MBL's 525 match the
 * figure worked out over six, and all 490 of the MCBA's match the one worked
 * out over five. Walks per game split exactly the same way.
 */

const MBL = 6;
const MCBA = 5;

test("the fallback is six, for a figure with no competition behind it", () => {
  assert.equal(ERA_INNINGS, 6);
});

test("a complete game with three earned runs is an ERA of three", () => {
  // Six innings, three earned: he gives up three runs a game.
  assert.equal(earnedRunAverage(3, 6, MBL), 3);
  // The same outing is five innings' work in the college game.
  assert.equal(earnedRunAverage(3, 5, MCBA), 3);
});

test("the same line reads differently in the two competitions", () => {
  // Ten earned in 44 innings. maxlb_'s actual MCBA line, stored as 1.14.
  assert.equal(earnedRunAverage(10, 44, MCBA).toFixed(2), "1.14");
  // Divided by the MBL's six it would be a fifth higher, which is what the
  // site printed for every college pitcher until this was a per-league figure.
  assert.equal(earnedRunAverage(10, 44, MBL).toFixed(2), "1.36");
});

test("half a game with one earned run doubles to two", () => {
  assert.equal(earnedRunAverage(1, 3, MBL), 2);
});

test("nobody who has not pitched has an average", () => {
  assert.equal(earnedRunAverage(0, 0, MBL), null);
  assert.equal(earnedRunAverage(4, null, MBL), null);
});

test("a scoreless outing is zero, not nothing", () => {
  assert.equal(earnedRunAverage(0, 6, MBL), 0);
});

test("the length of a game is asked for, never assumed", () => {
  // No default on either rate function. A default is how one competition's
  // divisor ends up silently applied to the other's pitchers, which is the
  // bug this whole split exists to fix.
  const source = readFileSync(new URL("../app/scoring.ts", import.meta.url), "utf8");
  assert.doesNotMatch(
    source,
    /inningsPerGame\s*(:\s*number)?\s*=/,
    "a rate function has a default length of game again",
  );
});

test("nothing computes an average over nine any more", () => {
  // One formula, in one place - six copies of it drifted apart before.
  for (const path of [
    "../db/queries.ts",
    "../db/publish.ts",
    "../app/[league]/statistics/StatsTable.tsx",
    "../app/[league]/players/PlayerProfile.tsx",
    "../app/[league]/players/PlayerHistory.tsx",
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.ok(!/earnedRuns[^;]*\*\s*9/.test(source), `${path} still divides by nine`);
  }
});

/**
 * Walks and strikeouts per game are innings-based rates too, and the archive
 * already published them over six. The live path was dividing by appearances,
 * which put a scored season on a different footing from every imported one.
 */

test("walks per game go by innings, not by how many times he appeared", () => {
  // _littL_ in the archive: 5 walks in 19.2 innings across four games. The
  // stored value is 1.53 - six innings, not four appearances, and not nine.
  const innings = 19 + 2 / 3;
  assert.equal(perGame(5, innings, MBL).toFixed(2), "1.53");
});

test("strikeouts per game read the same way", () => {
  // Joshygg: 14 in 8.1 innings, stored as 10.08.
  assert.equal(perGame(14, 8 + 1 / 3, MBL).toFixed(2), "10.08");
});

test("the earned run average is the same rate applied to earned runs", () => {
  assert.equal(perGame(3, 6, MBL), earnedRunAverage(3, 6, MBL));
});

test("a pitcher with no innings has no rate at all", () => {
  assert.equal(perGame(4, 0, MBL), null);
});

test("nothing divides a pitching rate by appearances any more", () => {
  for (const path of ["../db/queries.ts", "../db/publish.ts"]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.ok(
      !/(walksAllowed|strikeoutsPitched)[^;]*\/\s*pitchingGames/.test(source),
      `${path} still divides by appearances`,
    );
  }
});

test("the length of a game is a column, not a constant", () => {
  // So a third competition is a row and not a deploy, and so an admin can see
  // what the site believes about their league.
  const schema = readFileSync(new URL("../db/schema.ts", import.meta.url), "utf8");
  assert.match(schema, /innings_per_game/, "the per-league length is back in the code");

  const migration = readFileSync(
    new URL("../drizzle/0065_innings_per_game.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /UPDATE leagues SET innings_per_game = 5 WHERE slug = 'mcba'/);
});
