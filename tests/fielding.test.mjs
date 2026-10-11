import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const route = readFileSync("app/api/scorecards/[id]/fielding/route.ts", "utf8");

/**
 * Changing positions reported success and changed nothing. The route wrote the
 * move into the history table and stopped there, but every part of the game
 * reads a player's position from the lineup - so the change was visible
 * nowhere, and the panel truthfully said it had happened.
 */

test("a position change reaches the lineup, not just the history", () => {
  assert.ok(route.includes("db.insert(fieldingChanges)"));
  assert.ok(route.includes("db\n        .update(scorecardLineups)"));
});

test("the lineup row updated is the one for that player on this scorecard", () => {
  assert.ok(route.includes("eq(scorecardLineups.playerId, assignment.playerId)"));
  assert.ok(route.includes("eq(scorecardLineups.scorecardId, scorecardId)"));
});

/**
 * Away from the field, which no longer exists.
 *
 * The bench used to be a destination for a position change: a man sent there
 * kept his place in the batting order, had his turn skipped while he was gone,
 * and came back on from a separate list. That is a third state between playing
 * and being out of the game, and the league has no use for it - somebody who
 * steps away is covered by moving a fielder into his position and moving them
 * back, and somebody who is replaced is out of the game for good.
 *
 * leftAtSequence stays in the schema and in fielding-history: two approved
 * cards carry it, and their box scores are built from it.
 */

const panel = readFileSync("app/umpire/[scorecardId]/DefensePanel.tsx", "utf8");
const substitution = readFileSync("app/umpire/[scorecardId]/SubstitutionPanel.tsx", "utf8");
const board = readFileSync("app/umpire/[scorecardId]/ScoringBoard.tsx", "utf8");
const substitute = readFileSync("app/api/scorecards/[id]/substitute/route.ts", "utf8");
const page = readFileSync("app/umpire/[scorecardId]/page.tsx", "utf8");

test("the bench is not somewhere a player can be sent", () => {
  assert.match(route, /new Set<string>\(POSITIONS\)/, "the route still accepts the bench");
  assert.doesNotMatch(panel, /<option value=\{BENCH\}>/, "a fielder can still be sent to the bench");
  assert.doesNotMatch(
    substitution,
    /<option value=\{BENCH\}>/,
    "the substitution panel can still bench somebody with nobody coming in",
  );
});

test("nothing marks a player as away from the field any more", () => {
  assert.doesNotMatch(route, /leftAtSequence: sequence/, "a position change still writes somebody off");
  assert.doesNotMatch(panel, /Back on/, "there is still a way back onto the field");
  assert.doesNotMatch(board, /undo: true/, "the board still has a way back onto the field");
});

test("a substitution still records the man going off, so his outs stop there", () => {
  // The move to the bench is what stops the box score crediting the substitute
  // with every out the man he replaced had already served - it is the one place
  // BENCH is still written.
  assert.ok(substitute.includes("position: BENCH"));
});

test("a player who has been replaced cannot come back in", () => {
  assert.ok(
    substitute.includes("That player has already been taken out of this game."),
    "the route lets a replaced player be sent back on",
  );
  assert.match(
    page,
    /!replaced\.has\(player\.id\)/,
    "the list of players available to come on still offers somebody already taken out",
  );
});
