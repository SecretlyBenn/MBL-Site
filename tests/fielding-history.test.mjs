import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deriveBoxScore } from "../app/derive-box-score.ts";
import { BENCH, fieldingHistory } from "../app/fielding-history.ts";

/**
 * Time in the field has to come from where players started and every move
 * after, never from the lineup as it stands at the end. Panthers @ Knights on
 * September 11 credited its pitcher and catcher, who swapped for the last two
 * outs, with each other's position for the whole game.
 */

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

let sequence = 0;
// Home fields while away bats; one out a play.
const out = () => ({
  sequence: (sequence += 1), inning: 1, isHomeBatting: false, batterPlayerId: 1, pitcherPlayerId: 60,
  result: "GO", fielders: null, rbis: 0, batterScored: false, otherRunsScored: 0, unearnedRuns: 0,
  outsRecorded: 1, errorPosition: null, errorPlayerId: null, stolenBases: 0,
});
const row = (playerId, position, extra = {}) => ({
  isHome: true, playerId, position, isStarter: true, startingPlayerId: playerId, startingPosition: position,
  leftAtSequence: null, ...extra,
});
const outsFor = (box, playerId) => box.homeBatting.find((line) => line.playerId === playerId)?.positionOuts;

test("a swap at the end of the game counts only from when it happened", () => {
  sequence = 0;
  const plays = [out(), out(), out(), out()];
  // The lineup as the card ends: 60 at catcher, 61 pitching. They started the
  // other way round and swapped after the third out.
  const lineups = [
    row(60, "C", { startingPosition: "P" }),
    row(61, "P", { startingPosition: "C" }),
  ];
  const moves = [
    { isHome: true, playerId: 61, position: "P", appliedAtSequence: 3 },
    { isHome: true, playerId: 60, position: "C", appliedAtSequence: 3 },
  ];
  const box = deriveBoxScore(plays, { fielding: fieldingHistory(lineups, moves) });
  assert.deepEqual(outsFor(box, 60), { P: 3, C: 1 });
  assert.deepEqual(outsFor(box, 61), { C: 3, P: 1 });
});

test("a substitute's outs start when he came in, and the starter keeps his", () => {
  sequence = 0;
  const plays = [out(), out(), out()];
  // The row now belongs to 71, who replaced 70 after the second out.
  const lineups = [row(71, "1B", { startingPlayerId: 70 })];
  const moves = [
    { isHome: true, playerId: 70, position: BENCH, appliedAtSequence: 2 },
    { isHome: true, playerId: 71, position: "1B", appliedAtSequence: 2 },
  ];
  const box = deriveBoxScore(plays, { fielding: fieldingHistory(lineups, moves) });
  assert.deepEqual(outsFor(box, 70), { "1B": 2 });
  assert.deepEqual(outsFor(box, 71), { "1B": 1 });
});

test("a player who walks off and comes back misses the outs in between", () => {
  sequence = 0;
  const plays = [out(), out(), out(), out()];
  const lineups = [row(80, "SS")];
  const moves = [
    { isHome: true, playerId: 80, position: BENCH, appliedAtSequence: 1 },
    { isHome: true, playerId: 80, position: "SS", appliedAtSequence: 3 },
  ];
  const box = deriveBoxScore(plays, { fielding: fieldingHistory(lineups, moves) });
  assert.deepEqual(outsFor(box, 80), { SS: 2 });
});

test("a card scored before starting positions were kept reads as it always did", () => {
  const slots = fieldingHistory([{ ...row(90, "LF"), startingPlayerId: null, startingPosition: null }], []);
  assert.deepEqual(slots, [{ isHome: true, playerId: 90, position: "LF", fromSequence: 0, untilSequence: null }]);
});

test("publishing reads the history, not the lineup's current positions", () => {
  const publish = read("../db/publish.ts");
  assert.ok(publish.includes("fielding: fieldingHistory(lineups, changes)"));
  assert.ok(!publish.includes("fromSequence: row.appliedAtSequence,"));
});

test("substituting, leaving and coming back are all written down as moves", () => {
  const substitute = read("../app/api/scorecards/[id]/substitute/route.ts");
  assert.ok(substitute.includes("position: BENCH"));
  assert.ok(substitute.includes("deleteFieldingChangeIds"));
  const withdraw = read("../app/api/scorecards/[id]/withdraw/route.ts");
  assert.ok(withdraw.includes("await recordMove(left.id, BENCH)"));
  assert.ok(withdraw.includes("await recordMove(returning.id"));
  const lineup = read("../app/api/scorecards/[id]/lineup/route.ts");
  assert.ok(lineup.includes("startingPosition: scored ? (previous?.startingPosition ?? null) : row.position"));
});
