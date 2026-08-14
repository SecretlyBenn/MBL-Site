import assert from "node:assert/strict";
import test from "node:test";
import { atBatSummary } from "../app/scoring.ts";

const plain = { rbis: 0, scored: false, stolenBases: 0 };

test("a result on its own is just the result", () => {
  assert.equal(atBatSummary("1B", null, plain), "1B");
  assert.equal(atBatSummary("GO", "SS", plain), "G6");
});

test("a double that drove a run in, stole and scored", () => {
  assert.equal(
    atBatSummary("2B", null, { rbis: 1, scored: true, stolenBases: 1 }),
    "2B + RBI + SB + R",
  );
});

test("a single then tagged out at second base", () => {
  assert.equal(
    atBatSummary("1B", null, { ...plain, retiredAs: "TAGGED", retiredBy: 4 }),
    "1B + TAG 4",
  );
});

test("counts appear only when there is more than one", () => {
  assert.equal(atBatSummary("1B", null, { ...plain, rbis: 1 }), "1B + RBI");
  assert.equal(atBatSummary("2B", null, { ...plain, rbis: 2 }), "2B + RBI 2");
  assert.equal(atBatSummary("1B", null, { ...plain, stolenBases: 2 }), "1B + SB 2");
});

test("a grand slam reads as four driven in and a run", () => {
  assert.equal(atBatSummary("HR", null, { rbis: 4, scored: true, stolenBases: 0 }), "HR + RBI 4 + R");
});

test("a pickoff and a caught stealing name no fielder", () => {
  // The pitcher and the catcher take those putouts by convention, so the
  // number would repeat what the code already says.
  assert.equal(atBatSummary("BB", null, { ...plain, retiredAs: "PICKED_OFF" }), "BB + PO");
  assert.equal(atBatSummary("1B", null, { ...plain, retiredAs: "CAUGHT_STEALING" }), "1B + CS");
});
