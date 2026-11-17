import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { draftSlots, repeatRounds } from "../db/draft-order.ts";

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
const migration2 = readFileSync("drizzle/0124_draft_signups_and_clock.sql", "utf8");

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

const start = readFileSync("app/api/drafts/start/route.ts", "utf8");
const signup = readFileSync("app/api/drafts/signup/route.ts", "utf8");
const button = readFileSync("app/[league]/draft/PickButton.tsx", "utf8");
const board = readFileSync("app/[league]/draft/page.tsx", "utf8");

test("nobody picks before an admin starts the draft", () => {
  // A board is set up days ahead; without this the first club could draft the
  // night it appears.
  assert.ok(picks.includes("if (!draft.startedAt)"), "a draft can be picked before it starts");
  assert.ok(start.includes('requireRoleForApi(["ADMIN"])'), "anybody can start a draft");
  // Sign-ups close as it starts, so the pool is not moving underneath it.
  assert.ok(start.includes("signupsOpen: false"), "sign-ups stay open once the draft is running");
});

test("un-starting is refused once anybody has picked", () => {
  const fn = start.slice(start.indexOf("export async function DELETE"));
  assert.ok(fn.includes("isNotNull(draftPicks.playerId)"), "a draft with picks can be un-started");
});

test("a GM only ever picks for their own club", () => {
  // The page decides what is worth drawing; this is the rule.
  assert.ok(picks.includes("user.teamId !== pick.teamId"), "a GM can pick for another club");
  assert.ok(
    board.includes('hasRole(user, "GM") && user?.teamId === clock?.teamId'),
    "the board offers the pool to a GM whose club is not up",
  );
  // An admin may still pick for whoever is up, and is told plainly that is
  // what they are doing.
  assert.ok(board.includes("as an admin, not as their GM"), "an admin is not told whose pick it is");
});

test("picking asks a second time, with the name in the question", () => {
  // A browser's confirm box is one return key from being agreed to, and "are
  // you sure?" does nothing about the real mistake, which is clicking the row
  // above the one you meant.
  assert.ok(button.includes("asking"), "there is no second step");
  assert.ok(button.includes("Yes, draft ${playerName}"), "the confirmation does not name the player");
  assert.ok(!button.includes("confirm("), "it still uses the browser's dialog");
});

test("a round tied to a competition takes only its players", () => {
  assert.ok(picks.includes("getRoundRules(draftId)"), "the round's competition is not checked");
  assert.ok(
    picks.includes("player.leagueId !== roundLeague"),
    "a player from another competition is accepted",
  );
  // A man with no competition is left out of such a round rather than let
  // into every one of them.
  assert.ok(draft.includes("round.leagueId === null ? undefined"), "the restriction is not applied");
});

test("a draft run off its sign-ups takes nobody else", () => {
  assert.ok(picks.includes('draft.poolSource === "SIGNUPS"'), "the pool source is ignored on a pick");
  assert.ok(
    draft.includes("innerJoin(players, eq(players.id, draftSignups.playerId))"),
    "an unmatched sign-up is draftable, which would mean inventing the player",
  );
});

test("signing up needs a Discord account and nothing else", () => {
  // The people signing up are players, and the site has never had accounts
  // for them - requiring a league role would mean nobody could sign up.
  assert.ok(signup.includes("await getSession()"), "sign-ups ask for a league role");
  assert.ok(!signup.match(/requireRoleForApi\(\["GM"/), "sign-ups are gated behind a club");
  assert.ok(signup.includes("rateLimit("), "the form can be filled in a thousand times");
  assert.ok(signup.includes("signupsOpen"), "sign-ups are accepted after they close");
});

test("a sign-up that matches nobody is recorded rather than invented", () => {
  // A typo would otherwise open a second career for somebody who already has
  // one, which is the mistake the archive is hardest to undo.
  const post = signup.slice(
    signup.indexOf("export async function POST"),
    signup.indexOf("export async function DELETE"),
  );
  assert.ok(post.includes("playerId: player?.id ?? null"), "an unmatched name creates a player");
  // Adding somebody new is an admin pressing a button on the sign-up, never
  // the sign-up itself: the name is typed by a stranger.
  assert.ok(!post.includes("insert(players)"), "signing up can create a player row");
});

test("withdrawing takes your own name off, not somebody else's", () => {
  const fn = signup.slice(signup.indexOf("export async function DELETE"));
  assert.ok(
    fn.includes("eq(draftSignups.discordId, session.discordId)"),
    "a withdrawal is found by an id in the request",
  );
});

test("the clock is worked out rather than stored", () => {
  // A pick taken back has to put the clock back with it, and a column would
  // have to remember to.
  const fn = draft.slice(draft.indexOf("export function deadlineFor"));
  const body = fn.slice(0, fn.indexOf("\n}"));
  assert.ok(body.includes("Math.max"), "the clock does not count from the later of the two");
  assert.ok(body.includes("!draft.pickSeconds || !draft.startedAt"), "a draft with no clock gets one");
});

const four = [10, 20, 30, 40];

test("a round can run whichever way the league says, whatever the mode", () => {
  // The pattern actually in use: forward, reversed, reversed, forward, and
  // then the same four again. That is not a snake and it is not straight, so
  // neither mode produces it and the rounds have to say it themselves.
  const pattern = new Map([
    [1, false],
    [2, true],
    [3, true],
    [4, false],
  ]);
  const slots = draftSlots(four, 4, "STRAIGHT", pattern);
  const inRound = (round) =>
    slots.filter((slot) => slot.round === round).map((slot) => slot.teamId);
  assert.deepEqual(inRound(1), [10, 20, 30, 40]);
  assert.deepEqual(inRound(2), [40, 30, 20, 10]);
  assert.deepEqual(inRound(3), [40, 30, 20, 10]);
  assert.deepEqual(inRound(4), [10, 20, 30, 40]);
});

test("a round that says nothing still follows the mode", () => {
  // Only round 3 is overruled; the rest snake as they always did.
  const slots = draftSlots(four, 4, "SNAKE", new Map([[3, true]]));
  const inRound = (round) =>
    slots.filter((slot) => slot.round === round).map((slot) => slot.teamId);
  assert.deepEqual(inRound(1), [10, 20, 30, 40]);
  assert.deepEqual(inRound(2), [40, 30, 20, 10]);
  assert.deepEqual(inRound(3), [40, 30, 20, 10], "the override was ignored");
  assert.deepEqual(inRound(4), [40, 30, 20, 10], "round 4 stopped following the snake");
});

test("a null in the pattern is not the same as false", () => {
  // Null means "whatever the mode says"; false means "as entered". A round
  // explicitly set forward in a snake has to stay forward.
  const asMode = draftSlots(four, 2, "SNAKE", new Map([[2, null]]));
  const forced = draftSlots(four, 2, "SNAKE", new Map([[2, false]]));
  assert.deepEqual(
    asMode.filter((slot) => slot.round === 2).map((slot) => slot.teamId),
    [40, 30, 20, 10],
  );
  assert.deepEqual(
    forced.filter((slot) => slot.round === 2).map((slot) => slot.teamId),
    [10, 20, 30, 40],
  );
});

test("the first few rounds repeat across the rest", () => {
  // Twenty dropdowns set by hand is twenty chances to set one wrong.
  const cycle = repeatRounds(["F", "R", "R", "F"], 10);
  assert.deepEqual(
    [...cycle.values()],
    ["F", "R", "R", "F", "F", "R", "R", "F", "F", "R"],
  );
  assert.equal(cycle.get(5), "F", "the cycle does not start again at round 5");
  assert.deepEqual([...repeatRounds([], 5).values()], [], "repeating nothing is not nothing");
});

const signupForm = readFileSync("app/[league]/draft/SignUpForm.tsx", "utf8");
const adminForm = readFileSync("app/admin/draft/DraftForm.tsx", "utf8");

test("a tournament's players are never a round's pool", () => {
  // It owns no players, so a round asking for them asks for a set that cannot
  // have anybody in it - which looks like an empty pool, not a mistake.
  assert.ok(
    setup.includes("known.filter((row) => !row.isTournament)"),
    "a round can be pointed at a competition that owns no players",
  );
  assert.ok(
    // Loosely, because this file is CRLF on the machine it is written on.
    /leagues[\s\S]{0,40}?[.]filter[(][(]option[)] => !option[.]isTournament[)]/.test(adminForm),
    "the admin page offers the tournament as a round's competition",
  );
  // And the competition the draft itself is for is still offerable, because
  // an expansion draft takes that competition's own players.
  assert.ok(
    !adminForm.includes("option.id !== leagueId"),
    "a draft cannot take its own competition's players, which an expansion draft does",
  );
});

test("signing up says which competition and what you play", () => {
  assert.ok(signup.includes("competition.isTournament"), "somebody can sign up for the tournament");
  assert.ok(signup.includes("POSITIONS.filter("), "positions are taken on trust");
  assert.ok(signup.includes("played.length === 0"), "a sign-up with no position is accepted");
  assert.ok(signupForm.includes("POSITIONS.map("), "the form does not offer the positions");
});

test("one sign-up each, found by the account rather than the form", () => {
  // Nobody puts themselves in twice to be drafted twice.
  assert.ok(
    signup.includes("eq(draftSignups.discordId, session.discordId)"),
    "a second sign-up is not found as the first one",
  );
  assert.ok(
    migration2.includes("UNIQUE INDEX IF NOT EXISTS draft_signups_once ON draft_signups (draft_id, discord_id)"),
    "the database allows two sign-ups from one account",
  );
});

test("a player new to the site is made deliberately, from the sign-up", () => {
  // Never by the sign-up itself: the name is typed by a stranger, and the
  // archive is keyed by name.
  assert.ok(signup.includes("if (create)"), "there is no way to add somebody new");
  assert.ok(
    signup.includes("lower(${players.displayName}) = lower(${row.typedName})"),
    "a name already on the site would be created a second time",
  );
  assert.ok(signup.includes("leagueId: row.leagueId"), "the new player gets no competition");
});
