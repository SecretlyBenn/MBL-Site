import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const route = readFileSync("app/api/scorecards/[id]/at-bats/route.ts", "utf8");

/**
 * The browser used to decide whose turn it was and the server took its word.
 * A page a beat behind named the batter who had just hit, so he was recorded
 * twice and the man after him never came up - the card showed one player with
 * two results in a single at-bat and his team-mate skipped.
 */

test("the server decides who is batting", () => {
  assert.ok(route.includes("const batterPlayerId = dueUp.playerId;"));
  // Nothing downstream may use the batter the screen claimed.
  assert.ok(!route.includes("body.batterPlayerId"));
});

test("the turn comes from the last slot used, not a count of appearances", () => {
  // A count only holds while every trip through the order is exactly its
  // length. Deleting an at-bat, or a lineup shorter than nine, shifts every
  // turn after it.
  assert.ok(route.includes("row.battingOrder === lastForSide.battingSlot"));
  assert.ok(route.includes("order[(lastIndex + 1) % order.length]"));
});

test("a side with no batting order is refused rather than guessed at", () => {
  assert.ok(route.includes("That side has no batting order."));
});
