import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { earnedRunAverage, ERA_INNINGS, perGame } from "../app/scoring.ts";

/**
 * A game here is six innings, so an ERA over nine describes a game nobody
 * plays and reads a half higher than the truth for every pitcher.
 */

test("the average is expressed over a full game, which is six innings", () => {
  assert.equal(ERA_INNINGS, 6);
});

test("a complete game with three earned runs is an ERA of three", () => {
  // Six innings, three earned: he gives up three runs a game.
  assert.equal(earnedRunAverage(3, 6), 3);
});

test("half a game with one earned run doubles to two", () => {
  assert.equal(earnedRunAverage(1, 3), 2);
});

test("nobody who has not pitched has an average", () => {
  assert.equal(earnedRunAverage(0, 0), null);
  assert.equal(earnedRunAverage(4, null), null);
});

test("a scoreless outing is zero, not nothing", () => {
  assert.equal(earnedRunAverage(0, 6), 0);
});

test("nothing computes an average over nine any more", () => {
  // One formula, in one place - six copies of it drifted apart before.
  for (const path of [
    "../db/queries.ts",
    "../db/publish.ts",
    "../app/statistics/StatsTable.tsx",
    "../app/players/PlayerProfile.tsx",
    "../app/players/PlayerHistory.tsx",
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
  assert.equal(perGame(5, innings).toFixed(2), "1.53");
});

test("strikeouts per game read the same way", () => {
  // Joshygg: 14 in 8.1 innings, stored as 10.08.
  assert.equal(perGame(14, 8 + 1 / 3).toFixed(2), "10.08");
});

test("the earned run average is the same rate applied to earned runs", () => {
  assert.equal(perGame(3, 6), earnedRunAverage(3, 6));
});

test("a pitcher with no innings has no rate at all", () => {
  assert.equal(perGame(4, 0), null);
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
