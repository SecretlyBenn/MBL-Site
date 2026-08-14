import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { MINIMUM_LINEUP, FULL_LINEUP } from "../app/scoring.ts";

const editor = readFileSync("app/umpire/[scorecardId]/LineupEditor.tsx", "utf8");
const route = readFileSync("app/api/scorecards/[id]/lineup/route.ts", "utf8");

/**
 * Short-handed games are ordinary in this league, not an exception. The editor
 * used to lay out exactly nine slots and refuse to save until every one was
 * filled, so a side of six could not take the field at all.
 */

test("four is the fewest that can play", () => {
  assert.equal(MINIMUM_LINEUP, 4);
  assert.equal(FULL_LINEUP, 9);
});

test("only the filled spots count towards a complete lineup", () => {
  // An empty spot at the bottom is one nobody filled, not an unfinished
  // lineup - the order just runs shorter and comes round sooner.
  assert.ok(editor.includes("filled.length >= MINIMUM_LINEUP"));
  assert.ok(!editor.includes("slots.every((slot) => slot.playerId && slot.position)"));
});

test("only the filled spots are sent, numbered from the top", () => {
  assert.ok(editor.includes("filled.map((slot, index) => ({"));
});

test("a spot can be added at the bottom for someone arriving late", () => {
  assert.ok(editor.includes("Add a spot at the bottom"));
});

test("the minimum is enforced on the server too", () => {
  // A rule that lives only in the screen is not a rule.
  assert.ok(route.includes("batters.length < MINIMUM_LINEUP"));
});
