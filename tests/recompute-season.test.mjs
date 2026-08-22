import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const publish = readFileSync(new URL("../db/publish.ts", import.meta.url), "utf8");

/**
 * Approving a game rebuilds the whole season around it. Both of these bit on
 * real approvals: one refused to run at all, the other ran and quietly threw
 * away figures it could not rebuild.
 */

test("a season's game stats are matched by subquery, not by binding every id", () => {
  // A season carries hundreds of games. One bound parameter per game overran
  // the limit D1 puts on a statement, and the head umpire got the failed query
  // and every id in it printed across the approval screen.
  const stats = publish.slice(publish.indexOf("const stats = await db"));
  const call = stats.slice(0, stats.indexOf(";"));
  assert.match(call, /db\s*\.select\(\{ id: historicalGames\.id \}\)/);
  assert.doesNotMatch(call, /gameIds/);
});

test("inserts stay under the same limit", () => {
  assert.ok(publish.includes("MAX_BOUND_PARAMETERS / columns"));
});

test("a pitcher's record survives a recompute that cannot rebuild it", () => {
  // Scraped seasons record wins, losses and saves on the season line only.
  // Recomputing from game rows that have never carried them returned null,
  // which would have wiped every pitcher's record in an archived season the
  // first time one of its games was approved.
  for (const column of [
    "wins",
    "losses",
    "saves",
    "blownSaves",
    "completeGames",
    "shutouts",
    "gamesStarted",
  ]) {
    assert.ok(
      publish.includes(`${column}: kept(totals.${column}, prior?.${column}),`),
      `${column} is rebuilt without falling back to the line it already had`,
    );
  }
});

test("a scored season still overwrites its own decisions", () => {
  // The fallback reads the old line only when the games carry nothing at all.
  // A season that was scored writes a number on every game - zero included -
  // so a pitcher who loses a win to a correction actually loses it.
  assert.ok(publish.includes("counted ?? before ?? null"));
});

test("counting stats are not kept from the old line", () => {
  // Rates are derived from the totals, so keeping a stat the recompute could
  // not rebuild would leave the total and its percentage disagreeing.
  for (const column of ["atBats", "hits", "runs", "rbis", "inningsPitched", "earnedRuns"]) {
    assert.ok(
      publish.includes(`${column}: totals.${column} ?? null,`),
      `${column} should be rebuilt outright`,
    );
  }
});
