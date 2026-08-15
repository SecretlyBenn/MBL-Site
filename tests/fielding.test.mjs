import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const route = readFileSync("app/api/scorecards/[id]/fielding/route.ts", "utf8");

/**
 * Changing positions reported success and changed nothing. The route wrote the
 * move into the history table and stopped there, but every part of the game
 * reads a player's position from the lineup - so the change was visible
 * nowhere, and the panel truthfully said it had happened.
 */

test("a position change reaches the lineup, not just the history", () => {
  assert.ok(route.includes("db.insert(fieldingChanges)"));
  assert.ok(route.includes("db\n        .update(scorecardLineups)"));
});

test("the lineup row updated is the one for that player on this scorecard", () => {
  assert.ok(route.includes("eq(scorecardLineups.playerId, assignment.playerId)"));
  assert.ok(route.includes("eq(scorecardLineups.scorecardId, scorecardId)"));
});
