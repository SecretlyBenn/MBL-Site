import assert from "node:assert/strict";
import test from "node:test";
import { putoutPosition } from "../app/scoring.ts";

/**
 * The league scores one putout per play and does not use assists. These pin
 * the rule down, because it differs from how the rest of baseball scores it
 * and the difference is easy to reintroduce by accident.
 */

test("a groundout to short credits the shortstop, not first base", () => {
  assert.equal(putoutPosition("GO", "SS"), "SS");
});

test("a groundout written as a sequence credits whoever started it", () => {
  // "6-3" is short to first. Elsewhere the first baseman takes the putout and
  // the shortstop an assist; here there are no assists and the shortstop has
  // it.
  assert.equal(putoutPosition("GO", "6-3"), "SS");
  assert.equal(putoutPosition("GO", "SS-1B"), "SS");
});

test("a strikeout credits nobody", () => {
  assert.equal(putoutPosition("K", null), null);
  assert.equal(putoutPosition("KL", "C"), null);
});

test("a caught stealing credits the catcher", () => {
  assert.equal(putoutPosition("CAUGHT_STEALING", null), "C");
  // Even if a fielder was named, the convention decides it.
  assert.equal(putoutPosition("CAUGHT_STEALING", "2B"), "C");
});

test("a pickoff credits the pitcher", () => {
  assert.equal(putoutPosition("PICKED_OFF", null), "P");
  assert.equal(putoutPosition("PICKED_OFF", "1B"), "P");
});

test("a tag credits whoever applied it", () => {
  assert.equal(putoutPosition("TAGGED", "3B"), "3B");
  assert.equal(putoutPosition("TAGGED", "5"), "3B");
});

test("a fly out credits the fielder who caught it", () => {
  assert.equal(putoutPosition("FO", "CF"), "CF");
});

test("a play that retires nobody has no putout", () => {
  assert.equal(putoutPosition("1B", "SS"), null);
  assert.equal(putoutPosition("BB", null), null);
});

test("a forced runner's putout reads like any other", () => {
  // Whoever started the play takes it, whether the umpire named a position or
  // a sequence - so a double play turned 6-4-3 credits the shortstop for the
  // runner and, separately, whoever took the batter.
  assert.equal(putoutPosition("FORCED", "6-4"), "SS");
  assert.equal(putoutPosition("FORCED", "2B"), "2B");
});
