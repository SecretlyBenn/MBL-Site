import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extraInningsRunner as extraInningsRunnerRaw } from "../app/derive-box-score.ts";

/**
 * These are MBL games unless a test says otherwise, so a full game is six
 * innings. It is passed explicitly rather than defaulted, here and in the
 * site, because the MCBA plays five and a default is how one competition's
 * length ends up quietly applied to the other's games.
 */
const MBL = 6;
const extraInningsRunner = (plays, inning, isHome, innings = MBL) =>
  extraInningsRunnerRaw(plays, inning, isHome, innings);

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

/**
 * The MCBA plays five innings, not six. That decides two things an umpire sees
 * directly: when the game can be finished, and from which inning a runner is
 * placed on second to start the half. Scoring a college game on the MBL's six
 * would leave the sixth looking like regulation - no placed runner, and a game
 * that refuses to end when it is actually over.
 */

const MCBA = 5;

test("a five-inning game places a runner from the sixth, not the seventh", () => {
  const plays = [
    pa({ inning: 5, isHomeBatting: false, batterPlayerId: 11, outsRecorded: 1 }),
    pa({ inning: 5, isHomeBatting: true, batterPlayerId: 21, outsRecorded: 1 }),
  ];
  // Six is the first extra inning here, so the man who made the last out of
  // the fifth is standing on second.
  assert.equal(extraInningsRunner(plays, 6, false, MCBA), 11);
  assert.equal(extraInningsRunner(plays, 6, true, MCBA), 21);
  // The same card in the MBL is still in regulation in the sixth.
  assert.equal(extraInningsRunner(plays, 6, false, MBL), null);
});

test("the fifth is regulation in both, so nobody is placed in it", () => {
  const plays = [pa({ inning: 4, isHomeBatting: false, batterPlayerId: 11, outsRecorded: 1 })];
  assert.equal(extraInningsRunner(plays, 5, false, MCBA), null);
  assert.equal(extraInningsRunner(plays, 5, false, MBL), null);
});

test("the length of a game is asked for, never assumed", () => {
  // No default on any of these. A default is how the MBL's six ends up
  // silently applied to a college game, which is the bug this exists to stop.
  const source = read("../app/derive-box-score.ts");
  assert.doesNotMatch(
    source,
    /inningsPerGame(\s*:\s*number)?\s*=\s*REGULATION_INNINGS/,
    "a box-score function defaults the length of a game again",
  );
  assert.match(source, /inningsPerGame: number;/, "BoxContext no longer carries the length");
});

test("the umpire's board is told the length rather than assuming it", () => {
  const board = read("../app/umpire/[scorecardId]/ScoringBoard.tsx");
  assert.doesNotMatch(
    board,
    /REGULATION_INNINGS \+ 1|Math\.max\(REGULATION_INNINGS/,
    "the scoring board counts extra innings from a fixed six again",
  );
  assert.match(board, /inningsPerGame: number;/, "the board is no longer given the length");
});
