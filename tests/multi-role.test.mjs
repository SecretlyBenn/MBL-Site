import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * An account holds a set of roles, not one.
 *
 * The danger in this change is not that someone gets too little access - they
 * would say so - but that a guard quietly grants too much, or that a role
 * someone lost keeps working because one call site still reads an old field.
 */

const schema = readFileSync("db/schema.ts", "utf8");
const roles = readFileSync("app/roles.ts", "utf8");
const usersRoute = readFileSync("app/api/users/route.ts", "utf8");
const schedule = readFileSync("app/api/games/schedule/route.ts", "utf8");
const migration = readFileSync("drizzle/0064_multi_role.sql", "utf8");

test("nothing reads a single role off an account any more", () => {
  // A leftover `user.role` would compile as `undefined` against a string and
  // fail open or closed depending on the comparison - exactly the kind of bug
  // that shows up months later as "why can't the umpire get in".
  const sources = [
    "app/roles.ts",
    "app/api/users/route.ts",
    "app/api/news/route.ts",
    "app/api/games/schedule/route.ts",
    "app/gm/page.tsx",
    "app/umpire/page.tsx",
    "app/head-umpire/page.tsx",
    "app/newsroom/page.tsx",
    "app/admin/UserRoleRow.tsx",
    "app/admin/accounts/page.tsx",
  ];
  for (const file of sources) {
    const text = readFileSync(file, "utf8");
    assert.ok(
      !/\buser\.role\b|\bleagueUser\.role\b|\bviewer\.role\b/.test(text),
      `${file} still reads a single role`,
    );
  }
});

test("the users table no longer carries a role column", () => {
  const table = schema.slice(
    schema.indexOf("export const users = sqliteTable"),
    schema.indexOf("export const userRoles"),
  );
  assert.ok(!/role: text\("role"\)/.test(table), "users still has a role column");
  assert.ok(schema.includes('sqliteTable("user_roles"'), "user_roles is gone");
});

test("an account with no roles holds nothing", () => {
  // Not "falls back to the least role" - taking someone's last role has to
  // leave them with no access, or removing access would be impossible.
  assert.ok(
    roles.includes("roles: held.map((entry) => entry.role as Role)"),
    "roles are no longer read from user_roles",
  );
  assert.ok(
    /hasAnyRole\(user[^)]*\)\s*\{\s*\n?\s*return user \? roles\.some/.test(roles) ||
      roles.includes("return user ? roles.some((role) => user.roles.includes(role)) : false;"),
    "hasAnyRole no longer refuses a user with no roles",
  );
});

test("both guards refuse a signed-in account that holds nothing", () => {
  const guards = roles.match(/if \(!leagueUser \|\| !hasAnyRole\(leagueUser, allowedRoles\)\)/g) ?? [];
  assert.equal(guards.length, 2, "requireRole and requireRoleForApi no longer both check");
});

test("an admin cannot remove their own admin role", () => {
  assert.ok(
    usersRoute.includes('target.id === leagueUser.id && !roles.includes("ADMIN")'),
    "an admin can lock the league out of the accounts page again",
  );
});

test("roles are replaced without a gap where the account holds nothing", () => {
  // Clearing then re-inserting leaves a moment where a request would be turned
  // away from a page the person has every right to be on.
  const setRoles = usersRoute.slice(usersRoute.indexOf("async function setRoles"));
  const body = setRoles.slice(0, setRoles.indexOf("\n}"));
  assert.ok(!/delete\(userRoles\)\s*\n?\s*\.where\(eq\(userRoles\.userId, userId\)\)\s*;/.test(body),
    "setRoles clears every role before putting them back");
  assert.ok(body.includes("inArray(userRoles.role, gone)"), "only the removed roles are deleted");
});

test("a club and a league are cleared when the role that carried them goes", () => {
  assert.ok(
    usersRoute.includes('roles.includes("GM") ? payload.teamId ?? null : null'),
    "a former GM keeps authority over a roster",
  );
  assert.ok(
    usersRoute.includes('["UMPIRE", "HEAD_UMPIRE", "WRITER"].includes(role)'),
    "a former umpire's league can linger",
  );
});

test("holding two roles grants the wider authority, not the narrower", () => {
  // A head umpire who also runs a club is still a head umpire. Reading GM
  // first would take away access they already had.
  assert.ok(
    schedule.includes('if (hasAnyRole(user, ["HEAD_UMPIRE", "ADMIN"])) return;'),
    "scheduling no longer checks the wider roles first",
  );
});

test("the migration keeps every existing account's access", () => {
  assert.ok(
    /INSERT OR IGNORE INTO user_roles[\s\S]*SELECT id, role FROM users/.test(migration),
    "the migration no longer carries existing roles across",
  );
  assert.ok(
    migration.indexOf("INSERT OR IGNORE INTO user_roles") <
      migration.indexOf("ALTER TABLE users DROP COLUMN role"),
    "the column is dropped before it is read",
  );
  assert.ok(migration.includes("CREATE UNIQUE INDEX"), "one account could hold a role twice");
});
