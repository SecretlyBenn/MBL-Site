import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Undo works by snapshotting the rows an action is about to change and naming
 * the rows it creates, rather than by writing an inverse per action. These
 * check that every mutating route actually records one - a route that forgets
 * leaves its action silently unundoable, which is the failure the button
 * exists to prevent.
 */

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const ROUTES = {
  "at-bats": "../app/api/scorecards/[id]/at-bats/route.ts",
  "runner moves": "../app/api/scorecards/[id]/runners/route.ts",
  "runner outs": "../app/api/scorecards/[id]/runner-outs/route.ts",
  substitutions: "../app/api/scorecards/[id]/substitute/route.ts",
  "position changes": "../app/api/scorecards/[id]/fielding/route.ts",
  "pitching changes": "../app/api/scorecards/[id]/pitching-change/route.ts",
  "leaving the field": "../app/api/scorecards/[id]/withdraw/route.ts",
};

for (const [what, path] of Object.entries(ROUTES)) {
  test(`${what} record an action that can be undone`, () => {
    assert.match(read(path), /recordAction\(/);
  });
}

test("an action that creates rows says which, so undo can remove them", () => {
  // A snapshot alone cannot undo an insert - there was no row to snapshot.
  for (const path of [ROUTES["at-bats"], ROUTES["runner outs"], ROUTES["position changes"]]) {
    assert.match(read(path), /attachCreated\(/);
  }
});

test("undo re-derives the score rather than adjusting it", () => {
  const route = read("../app/api/scorecards/[id]/undo/route.ts");
  assert.match(route, /resequenceInnings\(scorecardId\)/);
  assert.match(route, /deriveBoxScore\(rows\)/);
});

test("undo refuses on an approved card", () => {
  assert.match(
    read("../app/api/scorecards/[id]/undo/route.ts"),
    /approved and locked/,
  );
});

test("an action is only undone once", () => {
  const undo = read("../db/undo.ts");
  assert.match(undo, /row\.undoneAt === null/);
  assert.match(undo, /undoneAt: new Date\(\)\.toISOString\(\)/);
});

test("a play is removed only after the outs hanging off it", () => {
  // The foreign key from runner_outs would refuse the delete otherwise, which
  // is how deleting an at-bat used to fail outright.
  const undo = read("../db/undo.ts");
  const outs = undo.indexOf("runnerOuts.plateAppearanceId");
  const plays = undo.indexOf("delete(plateAppearances)");
  assert.ok(outs >= 0 && plays > outs);
});

test("the mound is read from the lineup, not from browser state", () => {
  const board = read("../app/umpire/[scorecardId]/ScoringBoard.tsx");
  // It was a dropdown whose value lived only on the page: it decided who later
  // at-bats were charged to and a refresh put the old pitcher back.
  assert.ok(!board.includes("setPitcherId"));
  assert.match(board, /pitching-change/);
});

test("both sides get a position panel, not just the one in the field", () => {
  const board = read("../app/umpire/[scorecardId]/ScoringBoard.tsx");
  assert.match(board, /\[false, true\]\.map\(\(isHome\) => \(\s*<DefensePanel/);
});
