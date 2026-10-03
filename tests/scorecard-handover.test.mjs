import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * A scorecard belongs to whoever sends it up, not whoever opened it.
 *
 * An umpire claims a game and then cannot see it through - they lose
 * connection, or they are needed elsewhere. Another umpire finishes it. The
 * card used to carry the first name for good, because submitted_by_user_id was
 * written once at the claim and never again, so the head umpire's review list
 * named someone who had not scored the game and sent corrections back to them.
 *
 * Nothing ever stopped the handover itself: any umpire in the competition can
 * open any game being scored. That is deliberate and these tests pin it, so
 * nobody "fixes" it into a lock and strands a game whose umpire has gone.
 */

const start = readFileSync("app/api/scorecards/start/route.ts", "utf8");
const finish = readFileSync("app/api/scorecards/[id]/finish/route.ts", "utf8");
const umpirePage = readFileSync("app/umpire/page.tsx", "utf8");
const scorecardPage = readFileSync("app/umpire/[scorecardId]/page.tsx", "utf8");
const headUmpire = readFileSync("app/head-umpire/page.tsx", "utf8");
const schema = readFileSync("db/schema.ts", "utf8");

test("the claim records both names", () => {
  assert.match(start, /submittedByUserId: user\.id/);
  assert.match(start, /startedByUserId: user\.id/, "the claim is no longer recorded");
});

test("finishing the game moves the card to whoever finished it", () => {
  const body = finish.slice(finish.indexOf(".update(scorecards)"));
  assert.match(body, /submittedByUserId: user\.id/, "the card still belongs to whoever opened it");
});

test("finishing does not touch who claimed it", () => {
  // The claim is the other half of the story and the only record that the game
  // changed hands at all.
  const body = finish.slice(finish.indexOf(".update(scorecards)"), finish.indexOf("await db\n      .update(games)"));
  assert.doesNotMatch(body, /startedByUserId/, "finishing overwrites the claim");
});

test("any umpire can open a game already being scored", () => {
  // The page asks for a role and nothing else. An ownership check here is what
  // would strand a game whose umpire has gone.
  assert.match(scorecardPage, /requireRole\(\["UMPIRE", "HEAD_UMPIRE", "ADMIN"\]/);
  assert.doesNotMatch(scorecardPage, /submittedByUserId/, "the scorecard page now checks who claimed it");
  assert.doesNotMatch(scorecardPage, /startedByUserId/, "the scorecard page now checks who claimed it");
});

test("the list of games being scored is not narrowed to one umpire", () => {
  // It is filtered by competition - `mine` - and by nothing else.
  const openList = umpirePage.slice(umpirePage.indexOf("const open ="), umpirePage.indexOf("const scheduled ="));
  assert.doesNotMatch(openList, /submittedByUserId|startedByUserId/,
    "games being scored are hidden from umpires who did not claim them");
});

test("starting a game that is already open rejoins it", () => {
  // Two live scorecards for one game would each derive a different score, so
  // the second umpire is handed the first one's card rather than a new one.
  assert.match(start, /resumed: true/);
});

test("the reviewer is told when a game changed hands", () => {
  assert.match(headUmpire, /startedByUserId !== scorecard\.submittedByUserId/,
    "a handover is no longer shown to the head umpire");
});

test("the claim is nullable, because older cards never recorded one", () => {
  const block = schema.slice(schema.indexOf("export const scorecards"), schema.indexOf("export const scorecardLines"));
  assert.match(block, /startedByUserId: integer\("started_by_user_id"\)\.references/);
  assert.doesNotMatch(
    block.slice(block.indexOf("startedByUserId"), block.indexOf("status:")),
    /notNull/,
    "a column added to a table with rows in it cannot be NOT NULL",
  );
});
