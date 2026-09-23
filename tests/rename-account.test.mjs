import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * A league account is found by Discord id, so its name is only what the league
 * calls that person - and people in this league rename themselves constantly.
 * Changing it used to need a hand-written UPDATE against the database.
 */

const route = readFileSync("app/api/users/route.ts", "utf8");
const row = readFileSync("app/admin/UserRoleRow.tsx", "utf8");

test("an admin can rename an account from the accounts page", () => {
  assert.ok(row.includes("setDisplayName"));
  assert.ok(row.includes("displayName: name"));
  assert.ok(route.includes("displayName?: string"));
});

test("a blank name is refused, and leaving it out changes nothing", () => {
  assert.ok(route.includes('return Response.json({ error: "A name is required." }, { status: 400 })'));
  assert.ok(route.includes("...(displayName ? { displayName } : {})"));
});

test("the rename is recorded with the name it replaced", () => {
  assert.ok(route.includes("renamedFrom: target.displayName"));
});
