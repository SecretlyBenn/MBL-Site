import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * The dialog asked who made the error and the answer never left the browser:
 * the board sent errorPosition as a hardcoded null and no player at all, and
 * neither route wrote the column. Every error entered on an at-bat was
 * discarded - it reached no fielding line, no fielding percentage, and not
 * even the team error count.
 */

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const board = read("../app/umpire/[scorecardId]/ScoringBoard.tsx");
const post = read("../app/api/scorecards/[id]/at-bats/route.ts");
const patch = read("../app/api/scorecards/[id]/at-bats/[paId]/route.ts");

test("the board sends the fielder the umpire named", () => {
  assert.ok(board.includes("errorPlayerId: draft.errorPlayerId ? Number(draft.errorPlayerId) : null"));
});

test("the position is derived from that fielder, not left null", () => {
  assert.ok(board.includes("errorPosition: erredAt(draft.errorPlayerId)"));
  assert.ok(!board.includes("errorPosition: null,"));
});

test("recording an at-bat stores the fielder", () => {
  assert.ok(post.includes("errorPlayerId: body.errorPlayerId ?? null"));
});

test("correcting one keeps it rather than dropping it", () => {
  assert.ok(patch.includes("body.errorPlayerId !== undefined ? body.errorPlayerId : existing.errorPlayerId"));
});

test("opening a play to edit loads the error already on it", () => {
  // The form sends whatever is in it, so a blank here silently cleared the
  // error every time an umpire reopened a play to fix something else.
  assert.ok(board.includes('errorPlayerId: atBat.errorPlayerId ? String(atBat.errorPlayerId) : ""'));
});

test("the entry form offers the side that was fielding for the play being edited", () => {
  // Correcting a play from the half just gone means naming somebody from the
  // other team. Offering the current fielders made that impossible, and hid an
  // error already recorded because its fielder was not in the list.
  assert.ok(board.includes("row.isHome !== editing.isHomeBatting"));
  assert.ok(board.includes("fielders={entryFielders}"));
});

test("the diamond still uses the side out there now", () => {
  assert.ok(board.includes("fielders={fielderList}"));
});

test("an error already on a play is always visible", () => {
  const dialog = read("../app/umpire/[scorecardId]/AtBatDialog.tsx");
  assert.ok(dialog.includes("showMore || Boolean(draft.errorPlayerId)"));
});
