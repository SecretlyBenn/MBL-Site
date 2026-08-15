import test from "node:test";
import assert from "node:assert/strict";
import {
  currentBases,
  deriveBoxScore,
  extraInningsRunner,
  startingBases,
} from "../app/derive-box-score.ts";

/**
 * Every column the batting and pitching tabs show has to be reachable from
 * what an umpire actually enters. These check the ones that were being
 * captured and then dropped - a stat that reaches the box score and no further
 * is indistinguishable, on the site, from one nobody recorded.
 */

let sequence = 0;
const pa = (overrides) => ({
  sequence: (sequence += 1),
  inning: 1,
  isHomeBatting: false,
  batterPlayerId: 1,
  pitcherPlayerId: 90,
  result: "GO",
  fielders: null,
  rbis: 0,
  batterScored: false,
  otherRunsScored: 0,
  unearnedRuns: 0,
  outsRecorded: 0,
  errorPosition: null,
  errorPlayerId: null,
  stolenBases: 0,
  ...overrides,
});

const away = (box, playerId) => box.awayBatting.find((line) => line.playerId === playerId);
const home = (box, playerId) => box.homeBatting.find((line) => line.playerId === playerId);

test("a sacrifice fly is a sacrifice fly and not an at-bat", () => {
  sequence = 0;
  const box = deriveBoxScore([pa({ result: "SF", outsRecorded: 1, rbis: 1 })]);
  const line = away(box, 1);
  assert.equal(line.sacFlies, 1);
  assert.equal(line.atBats, 0);
  assert.equal(line.plateAppearances, 1);
  assert.equal(line.rbis, 1);
});

test("a hit batsman is counted, so on-base percentage can see him", () => {
  sequence = 0;
  const box = deriveBoxScore([pa({ result: "HBP" })]);
  assert.equal(away(box, 1).hitByPitch, 1);
  assert.equal(away(box, 1).atBats, 0);
});

test("an error lands on the fielder who made it, not just the team", () => {
  sequence = 0;
  const box = deriveBoxScore([pa({ result: "E", errorPosition: 6, errorPlayerId: 55 })]);
  assert.equal(box.homeErrors, 1);
  assert.equal(home(box, 55).errors, 1);
});

test("a caught stealing reaches the runner and the putout reaches the catcher", () => {
  sequence = 0;
  const box = deriveBoxScore(
    [pa({ result: "1B" })],
    { runnerOuts: [{ runnerPlayerId: 1, kind: "CAUGHT_STEALING", putoutPlayerId: 72 }] },
  );
  assert.equal(away(box, 1).caughtStealing, 1);
  assert.equal(home(box, 72).putouts, 1);
});

test("a tag-play putout counts the same as one on a batted ball", () => {
  sequence = 0;
  const box = deriveBoxScore(
    [pa({ result: "1B" }), pa({ result: "GO", outsRecorded: 1, putoutPlayerId: 72, batterPlayerId: 2 })],
    { runnerOuts: [{ runnerPlayerId: 1, kind: "TAGGED", putoutPlayerId: 72 }] },
  );
  assert.equal(home(box, 72).putouts, 2);
});

test("the runners stranded in an inning go to the batter who ended it", () => {
  sequence = 0;
  const box = deriveBoxScore([
    pa({ result: "1B", batterPlayerId: 1 }),
    pa({ result: "1B", batterPlayerId: 2 }),
    pa({ result: "K", batterPlayerId: 3, outsRecorded: 3 }),
  ]);
  // Two men aboard when the strikeout ended it: two left on base, and against
  // that batter alone. The two who reached stranded nobody.
  assert.equal(away(box, 3).leftOnBase, 2);
  assert.equal(away(box, 1).leftOnBase, 0);
  assert.equal(away(box, 2).leftOnBase, 0);
});

test("an inning that ends with the bases empty strands nobody", () => {
  sequence = 0;
  const box = deriveBoxScore([
    pa({ result: "1B", batterPlayerId: 1 }),
    pa({ result: "HR", batterPlayerId: 2, batterScored: true, rbis: 2, otherRunsScored: 1 }),
    pa({ result: "K", batterPlayerId: 3, outsRecorded: 3 }),
  ]);
  assert.equal(away(box, 3).leftOnBase, 0);
});

test("each half-inning is charged separately", () => {
  sequence = 0;
  const box = deriveBoxScore([
    pa({ inning: 1, result: "1B", batterPlayerId: 1 }),
    pa({ inning: 1, result: "K", batterPlayerId: 2, outsRecorded: 3 }),
    pa({ inning: 2, result: "1B", batterPlayerId: 3 }),
    pa({ inning: 2, result: "1B", batterPlayerId: 4 }),
    pa({ inning: 2, result: "K", batterPlayerId: 5, outsRecorded: 3 }),
  ]);
  assert.equal(away(box, 2).leftOnBase, 1);
  assert.equal(away(box, 5).leftOnBase, 2);
});

test("defensive outs are served by whoever was standing there", () => {
  sequence = 0;
  const fielding = [
    { isHome: true, playerId: 60, position: "SS", fromSequence: 0 },
    { isHome: true, playerId: 61, position: "RF", fromSequence: 0 },
    // Swapped after the first play.
    { isHome: true, playerId: 60, position: "RF", fromSequence: 2 },
    { isHome: true, playerId: 61, position: "SS", fromSequence: 2 },
  ];
  const box = deriveBoxScore(
    [pa({ result: "GO", outsRecorded: 1 }), pa({ result: "GO", outsRecorded: 1 })],
    { fielding },
  );
  assert.deepEqual(home(box, 60).positionOuts, { SS: 1, RF: 1 });
  assert.deepEqual(home(box, 61).positionOuts, { RF: 1, SS: 1 });
});

test("a fielder who never batted still gets a line for his glove", () => {
  sequence = 0;
  const box = deriveBoxScore(
    [pa({ result: "GO", outsRecorded: 1, putoutPlayerId: 60 })],
    { fielding: [{ isHome: true, playerId: 60, position: "SS", fromSequence: 0 }] },
  );
  const line = home(box, 60);
  assert.equal(line.putouts, 1);
  assert.equal(line.plateAppearances, 0);
  assert.deepEqual(line.positionOuts, { SS: 1 });
});

test("the pitcher on when his side took the lead for good gets the win", () => {
  sequence = 0;
  const box = deriveBoxScore([
    // Away scores first and is caught; home then goes ahead to stay.
    pa({ result: "HR", batterScored: true, rbis: 1, pitcherPlayerId: 90 }),
    pa({ result: "HR", isHomeBatting: true, batterPlayerId: 20, batterScored: true, rbis: 1, pitcherPlayerId: 80 }),
    pa({ result: "HR", isHomeBatting: true, batterPlayerId: 21, batterScored: true, rbis: 1, pitcherPlayerId: 80 }),
  ]);
  const winner = box.homePitching.find((line) => line.playerId === 90);
  const loser = box.awayPitching.find((line) => line.playerId === 80);
  assert.equal(box.homeScore, 2);
  assert.equal(box.awayScore, 1);
  assert.equal(winner.wins, 1);
  assert.equal(winner.gamesStarted, 1);
  assert.equal(loser.losses, 1);
});

test("one pitcher the whole way with nothing scored on him is a shutout", () => {
  sequence = 0;
  const box = deriveBoxScore([
    pa({ result: "K", outsRecorded: 1, pitcherPlayerId: 90 }),
    pa({ result: "HR", isHomeBatting: true, batterPlayerId: 20, batterScored: true, rbis: 1, pitcherPlayerId: 80 }),
  ]);
  const shutout = box.homePitching.find((line) => line.playerId === 90);
  assert.equal(shutout.completeGames, 1);
  assert.equal(shutout.shutouts, 1);
  const scoredOn = box.awayPitching.find((line) => line.playerId === 80);
  assert.equal(scoredOn.completeGames, 1);
  assert.equal(scoredOn.shutouts, 0);
});

test("a tie leaves nobody with a decision", () => {
  sequence = 0;
  const box = deriveBoxScore([
    pa({ result: "HR", batterScored: true, rbis: 1, pitcherPlayerId: 90 }),
    pa({ result: "HR", isHomeBatting: true, batterPlayerId: 20, batterScored: true, rbis: 1, pitcherPlayerId: 80 }),
  ]);
  for (const line of [...box.homePitching, ...box.awayPitching]) {
    assert.equal(line.wins, 0);
    assert.equal(line.losses, 0);
  }
});

test("home runs allowed reach the pitching line", () => {
  sequence = 0;
  const box = deriveBoxScore([pa({ result: "HR", batterScored: true, rbis: 1 })]);
  assert.equal(box.homePitching.find((line) => line.playerId === 90).homeRuns, 1);
});

test("a stolen base goes to the runner, not to whoever was batting", () => {
  sequence = 0;
  // Runner 1 reached; runner 1 then stole while batter 2 was at the plate, and
  // the steal hangs off batter 2's play because that is the play standing.
  const box = deriveBoxScore([
    pa({ result: "1B", batterPlayerId: 1 }),
    pa({ result: "K", batterPlayerId: 2, outsRecorded: 1, stolenBases: 1, stolenBy: "[1]" }),
  ]);
  assert.equal(away(box, 1).stolenBases, 1);
  assert.equal(away(box, 2).stolenBases, 0);
});

test("an older play with no runner named still counts the base", () => {
  sequence = 0;
  const box = deriveBoxScore([pa({ result: "1B", stolenBases: 1 })]);
  assert.equal(away(box, 1).stolenBases, 1);
});

test("extra innings open with the last man out standing on second", () => {
  sequence = 0;
  const plays = [
    pa({ inning: 6, result: "1B", batterPlayerId: 1 }),
    pa({ inning: 6, result: "K", batterPlayerId: 2, outsRecorded: 3 }),
  ];
  assert.equal(extraInningsRunner(plays, 7, false), 2);
  assert.deepEqual(startingBases(plays, 7, false), { first: null, second: 2, third: null });
  // Each side gets its own runner, drawn from its own previous inning.
  assert.equal(extraInningsRunner(plays, 7, true), null);
});

test("regulation innings start with nobody on", () => {
  sequence = 0;
  const plays = [pa({ inning: 5, result: "K", batterPlayerId: 2, outsRecorded: 3 })];
  assert.equal(extraInningsRunner(plays, 6, false), null);
  assert.deepEqual(startingBases(plays, 6, false), { first: null, second: null, third: null });
});

test("the diamond shows the placed runner as soon as the sixth ends", () => {
  sequence = 0;
  const plays = [pa({ inning: 6, result: "K", batterPlayerId: 2, isHomeBatting: true, outsRecorded: 3 })];
  // The sixth is over, so what is on screen is the top of the seventh - and the
  // away side has nobody placed, because they have no sixth inning here.
  assert.deepEqual(currentBases(plays), { first: null, second: null, third: null });

  sequence = 0;
  const both = [
    pa({ inning: 6, result: "K", batterPlayerId: 9, outsRecorded: 3 }),
    pa({ inning: 6, result: "K", batterPlayerId: 29, isHomeBatting: true, outsRecorded: 3 }),
  ];
  assert.deepEqual(currentBases(both), { first: null, second: 9, third: null });
});

test("the placed runner scoring is not charged to the pitcher", () => {
  sequence = 0;
  const box = deriveBoxScore([
    pa({ inning: 6, result: "K", batterPlayerId: 9, outsRecorded: 3 }),
    pa({ inning: 6, result: "K", batterPlayerId: 29, isHomeBatting: true, outsRecorded: 3 }),
    // Player 9 opens the seventh on second and is driven in.
    pa({ inning: 7, result: "1B", batterPlayerId: 1, rbis: 1, otherRunsScored: 1, runnersScored: "[9]" }),
  ]);
  const pitcher = box.homePitching.find((line) => line.playerId === 90);
  assert.equal(pitcher.runs, 1);
  assert.equal(pitcher.earnedRuns, 0);
  // And the run belongs to the man who scored it.
  assert.equal(away(box, 9).runs, 1);
});

test("a runner driven in gets the run, not just the team", () => {
  sequence = 0;
  const box = deriveBoxScore([
    pa({ result: "1B", batterPlayerId: 1 }),
    pa({ result: "2B", batterPlayerId: 2, rbis: 1, otherRunsScored: 1, runnersScored: "[1]" }),
  ]);
  assert.equal(away(box, 1).runs, 1);
  assert.equal(away(box, 2).runs, 0);
  assert.equal(box.awayScore, 1);
});
