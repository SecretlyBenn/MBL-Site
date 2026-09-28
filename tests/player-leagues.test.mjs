import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * A player who appears in both competitions has two careers, not one. They are
 * shown as separate tabs and never added together - someone who hit .300 in
 * college and .220 in the MBL has two figures, and averaging them would invent
 * a third that describes neither.
 */

const page = readFileSync("app/[league]/players/history/[playerName]/page.tsx", "utf8");
const tabs = readFileSync("app/[league]/players/PlayerLeagues.tsx", "utf8");
const queries = readFileSync("db/queries.ts", "utf8");

test("a season's stats know which competition they belong to", () => {
  const body = queries.slice(queries.indexOf("export async function getPlayerHistoricalStats"));
  assert.ok(body.includes("leagueSlug"), "stat rows no longer carry their league");
});

test("both of a player's names are looked up together", () => {
  // The competitions file one person under the name they used there, so the
  // MCBA record and the MBL record sit under different names. Fetching only
  // the name in the address loses the other competition entirely.
  assert.ok(page.includes("getAccountNames"), "the page no longer finds the player's other name");
  assert.ok(
    queries.includes("export async function getAccountNames"),
    "the account-to-names lookup is gone",
  );
});

test("a competition the player never appeared in gets no tab", () => {
  assert.ok(
    page.includes("record.seasons.length > 0") || page.includes("(record) => record.seasons.length"),
    "empty leagues are no longer filtered out",
  );
});

test("the tab counts seasons played, not rows", () => {
  // A season split between two clubs is two rows and one season. Counting rows
  // told a player who moved mid-season they had played twice as many.
  assert.ok(
    page.includes("seasonCount: new Set(seasons.map((row) => row.seasonId)).size"),
    "the season count is no longer taken from distinct seasons",
  );
  assert.ok(
    !tabs.includes("record.seasons.length} season"),
    "the tab badge counts rows again",
  );
});

test("the two competitions are never added together", () => {
  // Each tab renders one league's rows. A single profile fed every row would
  // produce career totals spanning both, which is the thing to avoid.
  assert.ok(
    tabs.includes("seasons={current.seasons}") && tabs.includes("games={current.games}"),
    "the profile is no longer given one league's rows at a time",
  );
});
