import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Deleting a season removes an empty one and nothing else.
 *
 * Everything in the archive hangs off a season - teams, games, player totals,
 * roster entries - so a cascading delete here would be the one control on the
 * site capable of erasing a competition's published history in a click. The
 * archive has no staging copy and `0003_seed_historical.sql` is already a
 * lesson in how easily a destructive statement gets run by mistake, so what is
 * pinned here is the refusal, not the deletion.
 *
 * Read off the source rather than run: the route reaches the database through
 * @/db, which Node cannot resolve from a test, and what matters is which rows
 * the code is capable of deleting, which is a question about the code.
 */

const route = readFileSync("app/api/seasons/route.ts", "utf8");
const page = readFileSync("app/admin/seasons/page.tsx", "utf8");

/** One function's body, stopping at the next top-level declaration. */
function bodyOf(source, name) {
  const start = source.search(new RegExp(`(export )?(async )?function ${name}\\b`));
  assert.ok(start >= 0, `${name} is not declared`);
  const rest = source.slice(start);
  const next = rest.search(/\n(export )?(async )?function /);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

const remove = bodyOf(route, "DELETE");

test("only an admin can delete a season", () => {
  assert.match(
    remove,
    /requireRoleForApi\(\["ADMIN"\]\)/,
    "the delete route does not demand the ADMIN role",
  );
});

test("a season holding any history is refused", () => {
  // Each of the three is counted and each one blocks. If a future edit counts
  // them but stops short of refusing, the season would go and the rows under
  // it would be orphaned rather than removed.
  for (const table of ["historicalGames", "historicalPlayerStats", "historicalRosterEntries"]) {
    assert.match(remove, new RegExp(`from\\(${table}\\)`), `${table} is not counted before deleting`);
  }
  assert.match(remove, /blocking\.length > 0/, "nothing blocks on what was counted");
  assert.match(remove, /status: 409/, "a season with history is not refused");
});

test("the delete never cascades into the archive", () => {
  // The whole point. Only the season row and the clubs entered with it may be
  // deleted here; anything else must be refused above instead.
  const deletes = [...remove.matchAll(/db\s*\n?\s*\.delete\((\w+)\)/g)].map((match) => match[1]);
  assert.deepEqual(
    [...new Set(deletes)].sort(),
    ["historicalSeasons", "historicalTeams"],
    "the delete route touches tables other than the season and its clubs",
  );
});

test("the season being played cannot be deleted", () => {
  // The current season is stored by name rather than by id, so deleting it
  // leaves that setting pointing at a season that is gone and the next game
  // scored has nowhere to be filed.
  assert.match(remove, /currentSeasonName\(slug\)\) === season\.name/, "the current season is not checked");
});

test("the deletion is recorded", () => {
  assert.match(remove, /action: "season\.delete"/, "deleting a season writes no audit row");
});

test("the button is only offered for a season that holds nothing", () => {
  // The server decides either way, but an admin should not be shown a control
  // that was always going to refuse.
  assert.match(page, /holdsNothing\(season\) && \(\s*<DeleteButton/, "the delete button is not gated");
  // All four things that make a season undeletable have to reach the gate.
  // Named by what they are rather than by the variables that hold them, so
  // rearranging the page does not fail this while the meaning is intact.
  const gate = bodyOf(page, "AdminSeasonsPage");
  const required = [
    ["the season being played", /isCurrent\(season\)/],
    ["its games", /historicalGames\.seasonId/],
    ["its player totals", /historicalPlayerStats\.seasonId/],
    ["its roster entries", /historicalRosterEntries\.seasonId/],
  ];
  for (const [what, pattern] of required) {
    assert.match(gate, pattern, `the delete gate ignores ${what}`);
  }
});

test("emptiness is asked only of the seasons that could qualify", () => {
  // Counting every season's player totals and roster entries read both tables
  // end to end on every load - 4,444 roster rows to answer a yes or no about
  // one empty season - and a GROUP BY over a whole table visits every row
  // whatever indexes exist. Both lookups must stay restricted to a list of
  // candidate ids so they go through the season indexes instead.
  const gate = bodyOf(page, "AdminSeasonsPage");
  for (const table of ["historicalPlayerStats", "historicalRosterEntries"]) {
    const at = gate.indexOf(`.from(${table})`);
    assert.ok(at >= 0, `${table} is no longer queried on this page`);
    assert.ok(
      gate.slice(at, at + 160).includes(`inArray(${table}.seasonId`),
      `the ${table} lookup reads the whole table instead of the candidate seasons`,
    );
  }
});
