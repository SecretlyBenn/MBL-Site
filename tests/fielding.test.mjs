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

/**
 * The bench as a destination.
 *
 * Somebody walks out of a game with nobody to replace them, which happens here
 * constantly. A substitution needs an incoming player and a position change
 * used to leave the man standing where he was, so there was a separate "Left"
 * button doing a third thing. Now the bench is just another place to send him,
 * which is both what an umpire reaches for and one thing to undo.
 */

const panel = readFileSync("app/umpire/[scorecardId]/DefensePanel.tsx", "utf8");
const substitution = readFileSync("app/umpire/[scorecardId]/SubstitutionPanel.tsx", "utf8");
const board = readFileSync("app/umpire/[scorecardId]/ScoringBoard.tsx", "utf8");

test("the bench is an allowed destination and is offered in both panels", () => {
  assert.match(route, /new Set<string>\(\[\.\.\.POSITIONS, BENCH\]\)/, "the route rejects the bench");
  assert.match(panel, /<option value=\{BENCH\}>/, "a fielder cannot be sent to the bench");
  assert.match(substitution, /<option value=\{BENCH\}>/, "the substitution panel cannot bench anybody");
});

test("several men may sit on the bench at once", () => {
  // It is not a position, so the check for two players in one place has to let
  // it through - otherwise the second man off is refused.
  for (const [name, source] of [["the route", route], ["the panel", panel]]) {
    const at = source.indexOf("position !== BENCH");
    assert.ok(at > 0, `${name} treats a second man on the bench as a duplicate position`);
  }
});

test("benching marks him gone without moving him off his position", () => {
  // The position is where he is put back, and what "Back on" reads. The
  // sequence is what makes his turn skipped and frees the spot he was in.
  assert.match(route, /benched \? \{ leftAtSequence: sequence \}/);
  assert.match(
    route,
    /\{ position: assignment\.position, leftAtSequence: null \}/,
    "being given a position no longer brings a benched man back",
  );
});

test("nobody comes in off the bench on a move onto it", () => {
  assert.match(substitution, /if \(chosen === BENCH\) setInId\(""\)/);
  assert.match(substitution, /!outId \|\| \(!inId && !toTheBench\)/, "the bench still demands a replacement");
});

test("the separate button for leaving is gone", () => {
  assert.doesNotMatch(panel, /onWithdraw/, "the panel still takes its own way off the field");
  assert.doesNotMatch(board, /withdraw`, "POST", \{ playerId \}/, "the board still has a second way off");
  // The way back on is not a list of assignments - it has to say where - so
  // that half of the route is still used.
  assert.match(board, /withdraw`, "POST", \{\n\s+playerId,\n\s+undo: true/);
});
