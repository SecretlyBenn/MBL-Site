import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const src = readFileSync("app/api/scorecards/[id]/at-bats/[paId]/route.ts", "utf8");

/**
 * Deleting an at-bat failed outright once a runner had been retired during it.
 * A runner out points at the play that was standing when it happened, and the
 * database will not remove a row something else still references - so the
 * delete was refused with nothing to say why.
 */

test("runner outs are dealt with before the at-bat is removed", () => {
  const attached = src.indexOf("runnerOuts");
  const deleted = src.indexOf("db.delete(plateAppearances)");
  assert.ok(attached !== -1, "the delete must consider attached runner outs");
  assert.ok(attached < deleted, "they must be handled before the row goes");
});

test("the outs move to the play before rather than being erased", () => {
  // They really happened; losing them because the batter's line was corrected
  // would quietly change the number of outs in the inning.
  assert.ok(src.includes("plateAppearanceId: previous.id"));
  assert.ok(src.includes("outsRecorded: previous.outsRecorded + attached.length"));
});

test("the umpire is told what else the delete did", () => {
  assert.ok(src.includes("movedOuts"));
  assert.ok(src.includes("lostOuts"));
});
