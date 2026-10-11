import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

/**
 * The bench a side names before the game.
 *
 * An MBL club names up to five players with its lineup and only those five
 * may come into the game. A college club names none - its roster turns up as
 * it turns up - so there a substitution may still bring in anybody on it.
 *
 * Up to five rather than exactly five: a club that can only find three
 * substitutes still has a game to play, and one that finds none simply cannot
 * substitute.
 */

const schema = readFileSync("db/schema.ts", "utf8");
const queries = readFileSync("db/queries.ts", "utf8");
const editor = readFileSync("app/umpire/[scorecardId]/LineupEditor.tsx", "utf8");
const page = readFileSync("app/umpire/[scorecardId]/page.tsx", "utf8");
const lineup = readFileSync("app/api/scorecards/[id]/lineup/route.ts", "utf8");
const substitute = readFileSync("app/api/scorecards/[id]/substitute/route.ts", "utf8");

test("the limit is the league's own, not a number in the code", () => {
  // innings_per_game and has_minor_league already live there, and a constant
  // here recomputed every MCBA pitcher's ERA a fifth too high once.
  assert.match(schema, /benchLimit: integer\("bench_limit"\)/);
  assert.ok(queries.includes("export async function benchLimitForScorecard"));
  for (const [name, source] of [
    ["the lineup route", lineup],
    ["the substitute route", substitute],
    ["the scoring page", page],
  ]) {
    assert.ok(
      source.includes("benchLimitForScorecard") || source.includes("benchLimit"),
      `${name} does not read the bench rule from the league`,
    );
  }
});

test("the bench is its own table, not a row in the lineup", () => {
  // A bench player holds no batting order and stands nowhere, so every check
  // that reads a lineup would have to know to skip him.
  assert.match(schema, /export const scorecardBench = sqliteTable\("scorecard_bench"/);
});

test("up to the limit, not exactly it", () => {
  assert.match(
    lineup,
    /named\.length > benchLimit/,
    "the route does not refuse more than the limit",
  );
  assert.doesNotMatch(
    lineup,
    /named\.length !== benchLimit/,
    "the route demands a full bench, so a short-handed club cannot start",
  );
});

test("a man cannot be in the order and on the bench at once", () => {
  assert.ok(lineup.includes("Somebody is in the lineup and on the bench at the same time."));
  assert.match(
    editor,
    /\.\.\.reserves\.filter\(Boolean\),/,
    "the editor does not count the bench when looking for a player named twice",
  );
});

test("only a named player can come into the game", () => {
  assert.ok(
    substitute.includes("That player is not on the bench this side named before the game."),
    "the substitute route lets anybody on the roster come in",
  );
  assert.match(
    page,
    /benchLimit === null \|\| declared\.has\(player\.id\)/,
    "the list offered to the umpire is not restricted to the named bench",
  );
});

test("a competition with no bench is left alone", () => {
  // Null means the MCBA, and every card saved before any of this existed.
  assert.match(
    lineup,
    /named\.length > 0 && benchLimit === null/,
    "a bench can be stored for a competition that does not have one",
  );
});
