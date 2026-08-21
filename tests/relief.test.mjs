import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const board = read("../app/umpire/[scorecardId]/ScoringBoard.tsx");
const grid = read("../app/umpire/[scorecardId]/ScoreGrid.tsx");

/**
 * A reliever changes who every later at-bat is charged to, so the card marks
 * the batter he came in on - and the mound has to be read from where a player
 * is actually standing, not from a second record that can disagree with it.
 */

test("the mound is whoever is at P, not whoever holds the pitching order", () => {
  // A change made through the position panel before that counted as taking
  // the mound left the old pitcher holding the order while standing at first,
  // and every at-bat kept going on his line.
  assert.ok(board.includes('fieldingSide.find((row) => row.position === "P")?.playerId'));
});

test("the pitching order is still there as a fallback", () => {
  assert.ok(board.includes("row.pitchingOrder !== null"));
});

test("the play a reliever came in on is marked, and only that one", () => {
  assert.ok(board.includes("const reliefAt = useMemo("));
  assert.ok(board.includes("atBat.pitcherPlayerId !== onMound"));
  // The starter came in for nobody, so the first play of a side is never a
  // relief appearance.
  assert.ok(board.includes("onMound !== null &&"));
});

test("the grid draws it", () => {
  assert.ok(grid.includes("reliefAt: Map<number, string>"));
  assert.ok(grid.includes("reliefAt.get(entry.id)"));
});

test("a position change's inning is derived, never stored", () => {
  // Deleting the seventh and eighth left a change still claiming it happened
  // in the seventh, because the inning was frozen when it was entered.
  assert.ok(board.includes("const inningOf = (sequence: number)"));
  assert.ok(board.includes("Math.min("));
});
