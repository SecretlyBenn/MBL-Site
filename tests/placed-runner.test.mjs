import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extraInningsRunner } from "../app/derive-box-score.ts";

/**
 * The extra-innings runner reaches second without batting, so nothing appears
 * on his line for that inning. If he came round to score, the run showed in
 * the inning total with no sign on the card of where it came from.
 */

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

let sequence = 0;
const pa = (overrides) => ({
  sequence: (sequence += 1),
  inning: 6,
  isHomeBatting: false,
  batterPlayerId: 1,
  pitcherPlayerId: 90,
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
  ...overrides,
});

test("the runner is whoever batted last in the inning before", () => {
  sequence = 0;
  const plays = [
    pa({ inning: 6, batterPlayerId: 7 }),
    pa({ inning: 6, batterPlayerId: 8 }),
    pa({ inning: 6, batterPlayerId: 9, outsRecorded: 3 }),
  ];
  assert.equal(extraInningsRunner(plays, 7, false), 9);
});

test("regulation innings place nobody", () => {
  sequence = 0;
  const plays = [pa({ inning: 5, batterPlayerId: 9, outsRecorded: 3 })];
  assert.equal(extraInningsRunner(plays, 6, false), null);
});

test("each side gets its own runner", () => {
  sequence = 0;
  const plays = [
    pa({ inning: 6, isHomeBatting: false, batterPlayerId: 4, outsRecorded: 3 }),
    pa({ inning: 6, isHomeBatting: true, batterPlayerId: 22, outsRecorded: 3 }),
  ];
  assert.equal(extraInningsRunner(plays, 7, false), 4);
  assert.equal(extraInningsRunner(plays, 7, true), 22);
});

test("the card marks him, and says whether he scored or was retired", () => {
  const grid = read("../app/umpire/[scorecardId]/ScoreGrid.tsx");
  assert.match(grid, /"ER \+ OUT"/);
  assert.match(grid, /"ER \+ R"/);
  assert.match(grid, /"ER"/);
});

test("his slot comes from the play he made, not from the lineup", () => {
  // The lineup row may have changed hands under him since - a substitution
  // takes the slot with it, and the mark would land on the wrong line.
  const board = read("../app/umpire/[scorecardId]/ScoringBoard.tsx");
  assert.match(board, /previous\.battingSlot/);
});

test("the marker never overwrites a real plate appearance", () => {
  const grid = read("../app/umpire/[scorecardId]/ScoreGrid.tsx");
  assert.match(grid, /entries\.length === 0 && placed/);
});
