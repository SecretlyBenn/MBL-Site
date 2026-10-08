import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * The published series windows belong to the MBL and must not reach the MCBA.
 *
 * These blocks are the MBL's own: "June 15 - June 24" and the rest, cut to the
 * MBL's game counts. The match used to be on any season name ending "Season
 * XII", which was safe only for as long as the Collegiate Association's
 * seasons were called "MCBA XII". They were renamed to read like the MBL's -
 * "MCBA Season XII" - and that name ends the same way, so the MCBA's schedule
 * would have been cut into the MBL's series and headed with the MBL's dates.
 *
 * Read off the source rather than imported, since the module is TypeScript and
 * Node cannot load it from a test. The regular expressions are pulled out and
 * run, so this tests what the function does and not merely how it is written.
 */

const source = readFileSync("app/season-series.ts", "utf8");
const body = source.slice(source.indexOf("export function seriesScheduleFor"));

const patterns = [...body.matchAll(/\/(\^?[^/\n]+?)\/\.test\(seasonName\)/g)].map(
  (match) => new RegExp(match[1]),
);

test("both season names are matched by a pattern", () => {
  assert.equal(patterns.length, 2, "expected one pattern for the season and one for its playoffs");
});

test("the MBL's own seasons still get their schedule", () => {
  for (const name of ["MBL Season XII", "MBL Season XII Playoffs"]) {
    assert.ok(
      patterns.some((pattern) => pattern.test(name)),
      `${name} no longer matches, so the MBL lost its published series`,
    );
  }
});

test("no MCBA season picks up the MBL's series", () => {
  // The renamed forms are the dangerous ones: they end exactly as the MBL's do.
  const mcba = [
    "MCBA Season XII",
    "MCBA Season XII Playoffs",
    "MCBA Season XIV",
    "MCBA Season XIV Playoffs",
    "MCBA Season XII Pre-season",
  ];
  for (const name of mcba) {
    assert.ok(
      !patterns.some((pattern) => pattern.test(name)),
      `${name} matches an MBL series schedule`,
    );
  }
});

test("a season with no published schedule gets none", () => {
  for (const name of ["MBL Season XI", "MBL Season XIII", "MCBA Season IX Playoffs"]) {
    assert.ok(
      !patterns.some((pattern) => pattern.test(name)),
      `${name} was given a schedule that was not published for it`,
    );
  }
});
