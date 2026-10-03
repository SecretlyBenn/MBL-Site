import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isUnawardedOut, RESULT_BY_CODE, putoutPosition } from "../app/scoring.ts";

/**
 * An out charged to the side, not to anybody in it.
 *
 * The league gives one for a rule infraction: it counts towards the three and
 * does nothing else. No batter is charged a time at bat, no fielder is
 * credited, and - the part that makes it unlike every other out - the batting
 * order does not move on. The man who was due up is still due up.
 *
 * It has to be written against somebody, because a play belongs to a batter,
 * so it goes against whoever was due. Everything that asks "who batted last"
 * therefore has to pass over it, or the side loses a turn in the order every
 * time one is called - which is a punishment nobody intended.
 */

const scoring = readFileSync("app/scoring.ts", "utf8");
const route = readFileSync("app/api/scorecards/[id]/at-bats/route.ts", "utf8");
const board = readFileSync("app/umpire/[scorecardId]/ScoringBoard.tsx", "utf8");
const scoreboard = readFileSync("db/scoreboard.ts", "utf8");
const grid = readFileSync("app/umpire/[scorecardId]/ScoreGrid.tsx", "utf8");

test("it takes an out and charges nobody a time at bat", () => {
  const row = RESULT_BY_CODE.get("UO");
  assert.ok(row, "the unawarded out is gone");
  assert.equal(row.defaultOuts, 1);
  assert.equal(row.isAtBat, false, "it would show as a time at bat against the man due up");
  assert.equal(row.isHit, false);
  assert.equal(row.wantsFielders, false, "nobody fielded it, so nobody should be asked for");
});

test("no fielder is credited with the putout", () => {
  assert.equal(putoutPosition("UO", null), null);
  assert.equal(putoutPosition("UO", "6"), null, "a stray fielder still took the credit");
});

test("every place that reads who batted last passes over it", () => {
  // Three of them, and missing one is a side quietly losing its turn.
  for (const [name, source] of [
    ["the at-bat route", route],
    ["the scoring board", board],
    ["the stadium scoreboard", scoreboard],
  ]) {
    const at = source.indexOf("lastForSide");
    assert.ok(at >= 0, `${name} no longer works out who batted last`);
    assert.match(
      source.slice(at, at + 320),
      /isUnawardedOut/,
      `${name} counts an unawarded out as a turn in the order`,
    );
  }
});

test("it takes no cell on the scorecard", () => {
  // It is not a plate appearance, and the cell it would fill is the one the
  // man due up still has to bat in.
  assert.match(grid, /isUnawardedOut/, "an unawarded out fills a batter's cell");
});

test("the helper only answers to this one result", () => {
  assert.equal(isUnawardedOut("UO"), true);
  for (const other of ["OUT", "K", "SKIP", "SAC", ""]) {
    assert.equal(isUnawardedOut(other), false, `${other} was treated as an unawarded out`);
  }
});

test("an out given by rule is a different thing and does use a turn", () => {
  // Out of order or hitting the ball twice is still the batter being out.
  const row = RESULT_BY_CODE.get("OUT");
  assert.ok(row, "the general out is gone");
  assert.equal(row.isAtBat, true);
  assert.equal(row.defaultOuts, 1);
  assert.equal(isUnawardedOut("OUT"), false);
});

test("the calls the league does not use are gone", () => {
  // Catcher's interference and hit batsmen do not happen here, and a button
  // for each is a thing to read past on every plate appearance.
  for (const code of ["HBP", "CI", "KL"]) {
    assert.equal(RESULT_BY_CODE.get(code), undefined, `${code} is still offered`);
  }
  assert.ok(scoring.includes('code: "SAC"'), "the sacrifice bunt is not written SAC");
  assert.equal(RESULT_BY_CODE.get("SH"), undefined, "SH is still offered alongside SAC");
});
