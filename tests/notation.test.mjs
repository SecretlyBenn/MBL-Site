import assert from "node:assert/strict";
import test from "node:test";
import { scoreNotation, positionNumbers } from "../app/scoring.ts";

test("a groundout to the pitcher reads G1, not GP", () => {
  assert.equal(scoreNotation("GO", "P"), "G1");
});

test("every position becomes its number", () => {
  assert.equal(positionNumbers("P"), "1");
  assert.equal(positionNumbers("C"), "2");
  assert.equal(positionNumbers("1B"), "3");
  assert.equal(positionNumbers("2B"), "4");
  assert.equal(positionNumbers("3B"), "5");
  assert.equal(positionNumbers("SS"), "6");
  assert.equal(positionNumbers("LF"), "7");
  assert.equal(positionNumbers("CF"), "8");
  assert.equal(positionNumbers("RF"), "9");
});

test("a groundout to short reads G6", () => {
  assert.equal(scoreNotation("GO", "SS"), "G6");
});

test("a fly to left reads F7", () => {
  assert.equal(scoreNotation("FO", "LF"), "F7");
});

test("a sequence already in numbers passes through", () => {
  // "6-3" comes from the shortcut options and is already scorebook notation.
  assert.equal(scoreNotation("GO", "6-3"), "G6-3");
});

test("a sequence written in names is numbered throughout", () => {
  assert.equal(scoreNotation("DP", "SS-2B-1B"), "DP6-4-3");
});

test("a result with no fielder is unchanged", () => {
  assert.equal(scoreNotation("K", null), "K");
  assert.equal(scoreNotation("1B", null), "1B");
});
