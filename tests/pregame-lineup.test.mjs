import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

/**
 * Changing a lineup before the game, which used to be impossible.
 *
 * The scoring page showed the lineup editors only until each side had a
 * lineup at all, and then swapped them for the scoring board with no way
 * back. An umpire who had put somebody in the wrong place was left with the
 * defence panel, which writes the move down as having happened during the
 * game - so Game 4 of the World Series carried two position changes in the
 * first inning that nobody ever made. See drizzle/0085.
 *
 * Before the first play a lineup is still only a lineup, and that is the line
 * these tests hold: the editors stay reachable until somebody has batted, and
 * the defence panel refuses to move anybody until then.
 */

const page = readFileSync("app/umpire/[scorecardId]/page.tsx", "utf8");
const editor = readFileSync("app/umpire/[scorecardId]/LineupEditor.tsx", "utf8");
const lineupRoute = readFileSync("app/api/scorecards/[id]/lineup/route.ts", "utf8");
const fieldingRoute = readFileSync("app/api/scorecards/[id]/fielding/route.ts", "utf8");

test("the scoring page offers a way back to the lineups", () => {
  assert.ok(page.includes("?lineups=1"), "there is no way back to the lineup editors");
  assert.match(
    page,
    /appearances\.length > 0/,
    "the page decides on the lineups rather than on whether anything has been played",
  );
});

test("the editors open on the card that is already saved", () => {
  // Reopening blank would mean retyping ten names to move one man, which is
  // how the defence panel came to be the easier way to fix a lineup.
  assert.equal(
    (page.match(/<LineupEditor/g) ?? []).length,
    2,
    "both sides no longer get an editor",
  );
  assert.equal(
    (page.match(/existing=\{/g) ?? []).length,
    2,
    "an editor is opened without the lineup it is meant to be changing",
  );
  assert.match(editor, /existing\?: Saved\[\]/, "the editor cannot be given a saved lineup");
});

test("a position change is refused before the first play", () => {
  assert.match(
    fieldingRoute,
    /appearances\.length === 0/,
    "the defence panel still records moves against a game nobody has played",
  );
  assert.ok(
    fieldingRoute.includes("change the lineup instead"),
    "the refusal does not say what to do instead",
  );
});

test("two players cannot be given the same position", () => {
  // The starting pitcher is chosen separately from the position dropdowns, so
  // one card went in with two players at P and nobody at first base.
  assert.ok(
    lineupRoute.includes("Two players are given the same position."),
    "the route accepts two players in one place",
  );
  assert.ok(
    editor.includes("Two players are in the same position."),
    "the editor does not say when two players are in one place",
  );
});

test("a lineup saved before the first play clears the moves it replaces", () => {
  // Those rows take effect from the first play, so left behind they overrule
  // the card that has just replaced them - and the undo entry behind them
  // still holds the card they were correcting.
  assert.match(
    lineupRoute,
    /delete\(fieldingChanges\)/,
    "a pre-game position change survives the lineup that replaces it",
  );
  assert.ok(
    lineupRoute.includes("retireActionsCreating"),
    "undo can still restore the lineup the new card replaced",
  );
});
