import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inningAt } from "../app/derive-box-score.ts";

const grid = readFileSync(
  new URL("../app/umpire/[scorecardId]/ScoreGrid.tsx", import.meta.url),
  "utf8",
);

let sequence = 0;
const out = (inning, isHomeBatting = false) => ({
  sequence: (sequence += 1),
  inning,
  isHomeBatting,
  batterPlayerId: 1,
  pitcherPlayerId: 9,
  result: "K",
  fielders: null,
  rbis: 0,
  batterScored: false,
  otherRunsScored: 0,
  unearnedRuns: 0,
  outsRecorded: 1,
  errorPosition: null,
  errorPlayerId: null,
  stolenBases: 0,
});

/**
 * A position change is recorded against a sequence, not an inning. Keeping the
 * inning as well meant holding the same fact twice, and deleting an at-bat
 * left the two disagreeing.
 */

test("a change takes the inning of the play it was made after", () => {
  const card = [out(1), out(1), out(1), out(2, true)];
  assert.equal(inningAt(card, 3), 1);
});

test("a change never claims an inning the game has not reached", () => {
  // The seventh was scored, then wiped; the change made during it must fall
  // back to where the game actually stands rather than still saying seven.
  const played = [out(1), out(1), out(1)];
  assert.equal(inningAt(played, 99), 1);
});

test("a change made before the first pitch belongs to the first inning", () => {
  assert.equal(inningAt([], 0), 1);
});

/**
 * A player who is away from the field has their turn walked past. Nothing is
 * written, so the cell was blank - indistinguishable from an at-bat the umpire
 * had forgotten to enter.
 */

test("the grid marks the turns the order walked past", () => {
  assert.ok(grid.includes("passedOver"));
  assert.ok(grid.includes("skipped"));
});

test("a gap is only read inside one half-inning", () => {
  // Across the end of an inning there is no gap to read: the order simply
  // stopped. Reading one there would mark every slot that did not come up.
  assert.ok(grid.includes("previous.inning === atBat.inning"));
});
