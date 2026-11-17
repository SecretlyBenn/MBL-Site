import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * A game sent back for correction has to remain reachable. It is not a game to
 * claim - it already has an umpire and a card full of at-bats - so if it is
 * also missing from the list of games being scored it exists on no page at all.
 */

const listing = readFileSync("app/umpire/page.tsx", "utf8");
const review = readFileSync("app/api/scorecards/[id]/review/route.ts", "utf8");
const finish = readFileSync("app/api/scorecards/[id]/finish/route.ts", "utf8");

test("the umpire page lists returned cards alongside the ones in progress", () => {
  assert.ok(listing.includes('"IN_PROGRESS", "PENDING", "RETURNED"'));
});

test("the umpire is told why it came back", () => {
  assert.ok(listing.includes("reviewNote"));
  assert.ok(listing.includes("Sent back"));
});

test("returning a game takes the fixture out of the review queue", () => {
  const returnBlock = review.slice(review.indexOf('payload.decision === "RETURN"'));
  assert.ok(returnBlock.includes('status: "IN_PROGRESS"'));
});

test("a returned card can be submitted for review again", () => {
  assert.ok(finish.includes('scorecard.status !== "RETURNED"'));
});

test("a game cannot be sent back without saying why", () => {
  // The umpire who scored it is being asked to open it up and find something,
  // and "returned" on its own does not tell them what. Reopening an approved
  // game is the same question with the stats coming off the site as well, so
  // the note is the only record of what was wrong with it.
  assert.ok(
    review.includes('payload.decision !== "APPROVE" && !note'),
    "returning or reopening still accepts an empty reason",
  );
  assert.ok(review.includes("payload.note?.trim()"), "whitespace counts as a reason");
  assert.ok(/status: 400/.test(review), "an empty reason is not refused");

  // And not only on the button, which is a courtesy rather than a check.
  const actions = readFileSync("app/head-umpire/ReviewActions.tsx", "utf8");
  assert.equal(
    (actions.match(/disabled=\{busy \|\| !note\.trim\(\)\}/g) ?? []).length,
    2,
    "one of the two send-back buttons can still be pressed with nothing typed",
  );
  assert.ok(!actions.includes("(optional)"), "reopening still calls the reason optional");
});
