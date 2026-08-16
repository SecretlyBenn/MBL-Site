import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { earnedRunAverage, ERA_INNINGS } from "../app/scoring.ts";

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
