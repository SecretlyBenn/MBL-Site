import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { draftSlots } from "../db/draft-order.ts";

/**
 * The order is written down once, when the draft is made, and read back as it
 * stands. So this is where the two modes are actually decided - everything
 * afterwards just looks for the first slot with nobody in it.
 */

const clubs = [10, 20, 30];
const teamsIn = (slots, round) => slots.filter((slot) => slot.round === round).map((slot) => slot.teamId);

test("a straight draft runs the same order every round", () => {
  const slots = draftSlots(clubs, 3, "STRAIGHT");
  assert.deepEqual(teamsIn(slots, 1), [10, 20, 30]);
  assert.deepEqual(teamsIn(slots, 2), [10, 20, 30]);
  assert.deepEqual(teamsIn(slots, 3), [10, 20, 30]);
});

test("a snake turns the order round on the even rounds", () => {
  const slots = draftSlots(clubs, 4, "SNAKE");
  assert.deepEqual(teamsIn(slots, 1), [10, 20, 30]);
  assert.deepEqual(teamsIn(slots, 2), [30, 20, 10]);
  assert.deepEqual(teamsIn(slots, 3), [10, 20, 30]);
  assert.deepEqual(teamsIn(slots, 4), [30, 20, 10]);
});

test("a snake does not reverse the order it was given", () => {
  // Reversing in place would turn every later round the wrong way round, and
  // the first round of the next draft laid out from the same list.
  const order = [10, 20, 30];
  draftSlots(order, 4, "SNAKE");
  assert.deepEqual(order, [10, 20, 30]);
});

test("picks are numbered straight through, from one", () => {
  const slots = draftSlots(clubs, 5, "SNAKE");
  assert.equal(slots.length, 15);
  assert.deepEqual(
    slots.map((slot) => slot.overall),
    Array.from({ length: 15 }, (_, index) => index + 1),
  );
});

test("every club gets one pick a round, whatever the mode", () => {
  for (const mode of ["STRAIGHT", "SNAKE"]) {
    const slots = draftSlots(clubs, 6, mode);
    for (const club of clubs) {
      assert.equal(
        slots.filter((slot) => slot.teamId === club).length,
        6,
        `${club} does not get six picks in a ${mode} draft`,
      );
    }
  }
});

test("no rounds is no picks rather than an error", () => {
  assert.deepEqual(draftSlots(clubs, 0, "STRAIGHT"), []);
});

const draft = readFileSync("db/draft.ts", "utf8");
const picks = readFileSync("app/api/drafts/pick/route.ts", "utf8");
const setup = readFileSync("app/api/drafts/route.ts", "utf8");
const migration = readFileSync("drizzle/0123_drafts.sql", "utf8");

test("changing a draft keeps the picks already made", () => {
  // The order gets corrected mid-draft - somebody is missing, two clubs are
  // the wrong way round - and starting over would lose the evening's work.
  const fn = draft.slice(draft.indexOf("export async function layOutPicks"));
  const body = fn.slice(0, fn.indexOf("\n}"));
  assert.ok(body.includes("isNull(draftPicks.playerId)"), "every pick is cleared, made or not");
  assert.ok(body.includes("taken.has(slot.overall)"), "a made pick is laid out over");
});

test("a man cannot be drafted twice", () => {
  // Two GMs clicking together is the ordinary way it would happen, so it is
  // the database that refuses rather than a check that can be raced.
  assert.ok(
    migration.includes("UNIQUE INDEX IF NOT EXISTS draft_picks_player ON draft_picks (draft_id, player_id)"),
    "nothing stops the same player going to two clubs",
  );
});

test("the pick on the clock is taken by whoever's turn it is", () => {
  assert.ok(picks.includes("user.teamId !== pick.teamId"), "a GM can pick out of turn");
  assert.ok(/status: 403/.test(picks), "picking out of turn is not refused");
  // Written against the slot still being empty, so two clicks cannot both win.
  assert.ok(
    picks.includes("isNull(draftPicks.playerId)") && picks.includes("if (!taken)"),
    "a pick that was just made is overwritten",
  );
});

test("a draft's clubs all come from its own competition", () => {
  // A fixture takes its competition from the clubs playing it, so a draft that
  // mixed them would put a man on a club he can never play for.
  assert.ok(setup.includes("clubsOf(leagueId, teamIds)"), "the clubs are not checked");
  assert.ok(setup.includes("new Set(teamIds).size !== teamIds.length"), "a club can be in the order twice");
});

test("only the last pick can be taken back", () => {
  // Undoing one from the middle would leave the clock pointing at a gap and
  // every club after it having picked out of turn.
  const fn = picks.slice(picks.indexOf("export async function DELETE"));
  assert.ok(fn.includes("desc(draftPicks.overall)"), "any pick can be undone");
  assert.ok(fn.includes('requireRoleForApi(["ADMIN"])'), "a GM can undo their own pick");
});

test("a tournament's picks borrow players rather than moving them", () => {
  // The whole point of the off-season tournament: a club's claim is a roster
  // spot, and the man's own club is not touched.
  const fn = draft.slice(draft.indexOf("export async function placeDraftedPlayer"));
  const body = fn.slice(0, fn.indexOf("\n}"));
  assert.ok(body.includes("rosterSpots"), "a tournament pick moves the player");
  assert.ok(
    body.indexOf("isTournament") < body.indexOf("update(players)"),
    "a tournament pick writes to players",
  );
});
