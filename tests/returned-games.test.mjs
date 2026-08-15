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
