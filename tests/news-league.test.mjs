import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * MBL writers write MBL news and MCBA writers write MCBA news.
 *
 * This needs no role of its own. `users.league_id` already says which
 * competition an official's roles cover, with null meaning both, so an MBL
 * writer is a WRITER whose league is the MBL and a writer trusted with both is
 * one with no league at all. What was missing was that the newsroom ignored it
 * and filed every article under whichever competition came first in the table,
 * which meant nobody could write for the MCBA at all.
 */

const read = (path) => readFileSync(path, "utf8");
const roles = read("app/roles.ts");
const route = read("app/api/news/route.ts");
const newsroom = read("app/newsroom/page.tsx");
const form = read("app/newsroom/NewArticleForm.tsx");

test("a writer's competitions come from the league their role covers", () => {
  const fn = roles.slice(roles.indexOf("export function writableLeagues"));
  const body = fn.slice(0, fn.indexOf("\n}"));

  // Null means all of them, so a competition added to the leagues table
  // tomorrow is writable without anybody editing this.
  assert.ok(
    body.includes('hasRole(user, "ADMIN")') && body.includes("user.leagueId === null"),
    "an admin or an unscoped writer is no longer unrestricted",
  );
  assert.ok(body.includes("return null"), "all-competitions is no longer null");
  assert.ok(body.includes("return [user.leagueId]"), "a scoped writer is not held to their own league");
});

test("the article's competition is checked, not taken on trust", () => {
  // The form is not the only thing that can post here.
  assert.ok(route.includes("mayWriteFor(user, leagueId)"), "the posted competition is not checked");
  assert.ok(
    route.includes("leagues.some((league) => league.id === asked)"),
    "a competition that does not exist would be accepted",
  );
  assert.ok(/status: 403/.test(route), "writing for another competition is not refused");

  // The old behaviour: every article stamped with the first league in the
  // table, which is why there was no way to write for the MCBA.
  assert.ok(
    !route.includes("(await getLeagues())[0]?.id"),
    "articles are filed under the first competition again",
  );
});

test("a writer is only offered the competitions they cover", () => {
  assert.ok(newsroom.includes("writableLeagues(user)"), "the newsroom offers every competition");
  assert.ok(
    newsroom.includes("allowed === null || allowed.includes(league.id)"),
    "the picker is not filtered to what the writer covers",
  );

  // One option is not a choice, it is a question that wastes their time.
  assert.ok(form.includes("leagues.length > 1"), "a writer covering one competition is still asked");
  assert.ok(form.includes("leagueId"), "the form no longer says which competition it means");
});
