import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * A GM's competition comes from the club they manage. An official has no club,
 * so without competitions of their own an MCBA umpire is shown MBL fixtures
 * and a head umpire reviews the other competition's cards.
 *
 * No rows means all of them, and that is the common case - the same people
 * call and review games in either competition - so every check has to treat
 * "nothing stored" as "all of them" rather than as "none".
 */

const read = (path) => readFileSync(path, "utf8");
const schema = read("db/schema.ts");
const roles = read("app/roles.ts");
const umpire = read("app/umpire/page.tsx");
const headUmpire = read("app/head-umpire/page.tsx");
const usersRoute = read("app/api/users/route.ts");
const row = read("app/admin/UserRoleRow.tsx");

test("an account's competitions are a set, not one", () => {
  const table = schema.slice(schema.indexOf("export const userLeagues = sqliteTable"));
  const body = table.slice(0, table.indexOf("});"));
  assert.ok(body.includes('integer("user_id")'), "the table does not say whose row it is");
  assert.ok(body.includes('integer("league_id")'), "the table does not say which competition");
  // A row is about one role, because somebody can umpire one competition and
  // write for another and one shared set could not say it.
  assert.ok(body.includes('text("role")'), "a row covers every role at once again");

  // The old single column could say one competition or all of them and
  // nothing in between, which stopped being the whole truth at three.
  const users = schema.slice(schema.indexOf("export const users = sqliteTable"));
  assert.ok(
    !users.slice(0, users.indexOf("});")).includes('integer("league_id")'),
    "the dead column is still in the schema, where something will read it",
  );
});

test("an official with nothing stored covers every competition", () => {
  const fn = roles.slice(roles.indexOf("export function coveredLeagues"));
  const body = fn.slice(0, fn.indexOf("\n}"));
  assert.ok(
    body.includes("narrowed.length === 0") && body.includes("return null"),
    'covering nothing is no longer read as "all of them"',
  );

  // Both pages ask the one function rather than keeping their own copy of the
  // comparison, which is how the newsroom came to have none at all.
  for (const [name, source] of [["umpire", umpire], ["head umpire", headUmpire]]) {
    assert.ok(source.includes("covers(leagueUser,"), `the ${name} page checks the league itself`);
    // Named roles, so an umpire narrowed to one competition is not also
    // narrowing what they may write.
    assert.match(source, /covers\(leagueUser, (UMPIRING|\["HEAD_UMPIRE"\])/, `the ${name} page asks about every role at once`);
    assert.ok(
      !source.includes("leagueUser.leagueId"),
      `the ${name} page still reads the single competition`,
    );
  }
});

test("a club filed under no competition reaches nobody narrowed to one", () => {
  // Otherwise an unfiled club turns up in every scoped official's list, which
  // is the opposite of what narrowing them was for.
  const fn = roles.slice(roles.indexOf("export function covers"));
  const body = fn.slice(0, fn.indexOf("\n}"));
  assert.ok(body.includes("leagueId != null"), "a club with no competition matches a scoped official");
});

test("the umpire's lists are filtered rather than just the page title", () => {
  // Both the games waiting to be claimed and the cards already open have to be
  // narrowed; filtering one and not the other leaves the other competition
  // reachable.
  assert.ok(umpire.includes("scheduled.filter("), "scheduled fixtures are not filtered by league");
  assert.ok(umpire.includes("rows.filter("), "open scorecards are not filtered by league");
  assert.ok(headUmpire.includes("allPending.filter("), "the review queue is not filtered by league");
  assert.ok(headUmpire.includes("allApproved.filter("), "approved cards are not filtered by league");
});

test("a role with no use for a competition does not keep one", () => {
  const body = usersRoute.slice(usersRoute.indexOf("export async function PATCH"));
  // A role not held is written as covering nothing, so a former umpire's
  // competitions cannot linger on an account that is no longer one.
  assert.ok(
    body.includes("if (!roles.includes(role))") && body.includes("leagueIds: []"),
    "a role that is no longer held keeps its competitions",
  );
  assert.ok(
    usersRoute.includes('const SCOPED_ROLES: Role[] = ["UMPIRE", "HEAD_UMPIRE", "WRITER"]'),
    "the roles a competition applies to are no longer named",
  );
  assert.ok(body.includes("setLeagues(payload.userId, scopes)"), "the update never writes them");
});

test("every competition ticked is stored as none of them", () => {
  // So that an official who covers everything still covers a fourth
  // competition the day one is added, rather than silently not covering it.
  const body = usersRoute.slice(usersRoute.indexOf("export async function PATCH"));
  assert.ok(
    body.includes("picked.length === all.length ? [] : picked"),
    "all of them ticked is stored as a list that will go stale",
  );
  // And the two cannot be confused from the other direction: an admin who
  // unticks everything has said nothing, which is a mistake, not a grant.
  assert.ok(
    body.includes("picked.length === 0") && body.includes("Pick at least one competition"),
    "an empty set is accepted and read back as everything",
  );
});

test("the admin page offers boxes, and refuses an empty set before saving", () => {
  assert.ok(row.includes('type="checkbox"') && row.includes("toggleLeague"), "the competitions are not a checklist");
  assert.ok(row.includes("needsLeague"), "unticking every competition can be saved");
  assert.ok(!row.includes("Both leagues"), "the picker still counts two competitions");
  // Nothing stored shows as all ticked, because that is what it means.
  assert.ok(
    row.includes("storedFor(role).length === 0 ? everyLeague : storedFor(role)"),
    "an official covering everything opens with nothing ticked",
  );
});

test("the competitions a scoped official covers are set together with the roles", () => {
  // Replacing them wholesale would leave a moment with no rows at all, and no
  // rows means every competition - so the gap would widen their access rather
  // than narrow it, which is the dangerous direction.
  const fn = usersRoute.slice(usersRoute.indexOf("async function setLeagues"));
  const body = fn.slice(0, fn.indexOf("\n}"));
  assert.ok(body.includes("inArray(userLeagues.leagueId, gone)"), "the old rows are cleared wholesale");
  // And a role at a time, so narrowing somebody's writing leaves their
  // umpiring alone.
  assert.ok(body.includes("eq(userLeagues.role, role)"), "one role's change rewrites the others");
  assert.ok(body.includes("added.length > 0"), "the new rows are not added");
});

test("one account can be narrowed differently for each role it holds", () => {
  // Umpiring the MBL and writing for the MCBA is an ordinary thing to be,
  // and one set per account could not say it: whichever competition you
  // picked was wrong about the other role.
  const fn = roles.slice(roles.indexOf("export function coveredLeagues"));
  const body = fn.slice(0, fn.indexOf("\n}"));
  assert.ok(body.includes("roles: Role[]"), "coverage is still asked per account");
  assert.ok(body.includes("scope.role === role"), "every role's rows are read as one set");
  // A role with nothing stored covers everything, and that wins over a
  // narrowed one: an umpire for both who writes for one still sees every game.
  assert.ok(body.includes("if (narrowed.length === 0) return null"), "a role covering all is narrowed");
  // Holding none of the roles asked about is not the same as covering all.
  assert.ok(body.includes("if (held.length === 0) return []"), "a role nobody holds covers everything");

  assert.ok(row.includes("byRole"), "the admin page still has one set of boxes");
  assert.ok(
    row.includes("SCOPED.filter((role) => roles.includes(role)).map((role) => ("),
    "the admin page does not offer a row per role held",
  );
});
