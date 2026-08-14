import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const route = readFileSync("app/api/scorecards/[id]/at-bats/[paId]/route.ts", "utf8");
const diamond = readFileSync("app/umpire/[scorecardId]/BaseDiamond.tsx", "utf8");

/**
 * Deleting an at-bat failed outright once a runner had been retired during it.
 * A runner out points at the play it happened in, and the database will not
 * remove a row something else still references - so the delete was refused
 * with nothing to say why.
 */

test("runner outs are cleared before the at-bat is removed", () => {
  const cleared = route.indexOf("db.delete(runnerOuts)");
  const deleted = route.indexOf("db.delete(plateAppearances)");
  assert.ok(cleared !== -1, "the delete must clear attached runner outs");
  assert.ok(cleared < deleted, "they must go before the row they point at");
});

test("the outs go with the at-bat rather than moving elsewhere", () => {
  // The out happened inside the play. A tag on a ball that was never hit
  // cannot stand on its own, so keeping it would leave an out in the inning
  // with nothing behind it.
  assert.ok(!route.includes("plateAppearanceId: previous.id"));
  assert.ok(route.includes("removedOuts"));
});

test("a tag out asks who applied it", () => {
  // Nothing can work this out afterwards, and the league credits the putout to
  // the tagger - so the button waits for a fielder to be chosen.
  assert.ok(diamond.includes("Who made the tag?"));
  assert.ok(diamond.includes("disabled={!tagger}"));
});
