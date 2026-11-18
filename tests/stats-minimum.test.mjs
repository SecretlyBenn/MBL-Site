import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * The minimum on the statistics tables is typed, not picked.
 *
 * It used to be a dropdown of four numbers, which answered four questions
 * and refused every other one - the first thing a reader asked about the
 * site was why they could not put their own number in.
 */

const table = readFileSync("app/[league]/statistics/StatsTable.tsx", "utf8");

test("the minimum is a number you can type", () => {
  assert.ok(table.includes('type="number"'), "the minimum is still a fixed list");
  assert.ok(!/<select value={minimum}/.test(table), "the old dropdown is still there");
  // The four common ones stay one click away rather than being lost.
  assert.ok(table.includes("<datalist"), "the suggestions were dropped entirely");
  assert.ok(table.includes("[10, 25, 50, 100]"), "the batting suggestions are gone");
  assert.ok(table.includes("[5, 10, 25, 50]"), "the pitching suggestions are gone");
});

test("an empty box means no minimum rather than zero players", () => {
  // Number("") is 0 and the filter only applies above 0, so clearing the box
  // shows everybody - which is what the old "All" option did.
  assert.ok(table.includes('useState("")'), "the box starts with a number in it");
  assert.ok(table.includes("floor > 0"), "an empty or unreadable box would filter everybody out");
  assert.ok(table.includes('placeholder="All"'), "an empty box does not say what it means");
});

test("the typed minimum still drives the filter and resets the page", () => {
  assert.ok(table.includes("const floor = Number(minimum);"), "the typed value is not read");
  assert.ok(
    table.includes("num(row.atBats) + num(row.walks) >= floor"),
    "batting no longer filters on plate appearances",
  );
  assert.ok(table.includes("num(row.inningsPitched) >= floor"), "pitching no longer filters");
  // Otherwise you are left on page 4 of a list that is now one page long.
  assert.ok(/setMinimum\(event\.target\.value\);\s*setPage\(0\);/.test(table), "the page is not reset");
});
