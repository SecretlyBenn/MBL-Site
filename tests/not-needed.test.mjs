import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * A best-of-three that ends 2-0 leaves its third game on the schedule with no
 * score, which is how the archive stores a game that was never needed. Nothing
 * that reads "no score" as "still to come" may show it: a club swept out of the
 * playoffs was told it had another game to play.
 */

const home = readFileSync("app/[league]/page.tsx", "utf8");
const schedule = readFileSync("app/[league]/schedule/page.tsx", "utf8");
const game = readFileSync("app/[league]/games/[gameId]/page.tsx", "utf8");

test("a not-needed game is nobody's next game on the home page", () => {
  const upNext = home.slice(home.indexOf("const nextByTeam"), home.indexOf("const strip"));
  assert.ok(upNext.includes('game.status === "NOT_NEEDED"'));
});

test("the schedule says a game was not needed rather than upcoming", () => {
  assert.ok(schedule.includes('"NOT_NEEDED"'));
  assert.ok(schedule.includes("Not needed"));
});

test("the game's own page says the same", () => {
  assert.ok(game.includes('game.status === "NOT_NEEDED"'));
  assert.ok(game.includes('"Not needed"'));
});
