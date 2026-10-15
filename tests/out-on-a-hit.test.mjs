import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * A runner thrown out on a hit.
 *
 * Going for home from second on a double is the ordinary version. The card
 * advances runners with the batter - a double moves everyone up two - and
 * anyone carried past third is counted home, so the run stood whatever the
 * umpire did. The two controls that would have said otherwise were both out of
 * reach: "how many outs on the play" appeared only when the result already
 * carried an out, which no hit does, and "who was put out" only above one out.
 */

const dialog = readFileSync("app/umpire/[scorecardId]/AtBatDialog.tsx", "utf8");

test("the outs on a play can be set whatever the result was", () => {
  assert.ok(
    !/const isOut =/.test(dialog),
    "the outs picker is gated again, so a hit cannot carry an out",
  );
  assert.match(dialog, /How many outs on the play\?/);
});

test("an out the batter does not account for asks who was put out", () => {
  // On a hit the batter reached, so any out belongs to a runner and the
  // putout has to land on somebody.
  assert.match(
    dialog,
    /draft\.outsRecorded > \(draft\.batterOut \? 1 : 0\)/,
    "naming the runner is still only asked for above one out",
  );
});
