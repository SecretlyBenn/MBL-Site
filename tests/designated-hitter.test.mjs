import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * In this league a designated hitter bats for **any** fielder, not only the
 * pitcher. A side will bat for a shortstop who cannot hit as readily as for a
 * pitcher, and the editor used to assume the pitcher and offer nothing else.
 *
 * The rule is league-specific, so it reads like something to tidy away into
 * "the DH bats for the pitcher" later. These say not to.
 */

const editor = readFileSync("app/umpire/[scorecardId]/LineupEditor.tsx", "utf8");
const route = readFileSync("app/api/scorecards/[id]/lineup/route.ts", "utf8");

test("the DH bats for a fielder chosen by name, not for whoever pitches", () => {
  assert.ok(
    !editor.includes("dhPitcherId"),
    "the editor is back to naming a pitcher rather than any fielder",
  );
  assert.ok(editor.includes("benchedId"), "there is no longer a fielder the DH bats for");
  assert.ok(
    editor.includes("setBenchedPosition"),
    "the fielder sitting out is pinned to one position again",
  );
});

test("the man the DH bats for is not offered twice", () => {
  // He is on the card and on the field. Naming him in the order as well puts
  // one player in two places, and the order comes round to somebody who is
  // not batting.
  const chosen = editor.slice(editor.indexOf("const chosen ="), editor.indexOf("const duplicate"));
  assert.ok(chosen.includes("benchedId"), "the duplicate check ignores the fielder sitting out");
});

test("the starting pitcher is asked for either way", () => {
  // He used to be inferred from which box the DH question was in, which only
  // worked while the man sitting out was always the pitcher.
  assert.ok(
    editor.includes("Number(slot.playerId) === Number(starterId) ? 1 : null"),
    "the pitcher in the order is no longer matched by name",
  );
  assert.ok(
    editor.includes("Number(benchedId) === Number(starterId) ? 1 : null"),
    "a pitcher who sits out of the order can no longer be the starter",
  );
});

test("the route does not take the screen's word for it", () => {
  assert.ok(
    route.includes("Only one player can be the starting pitcher."),
    "two players can open the same game again",
  );
  assert.ok(
    route.includes("The DH is batting for somebody who is not on this card."),
    "a DH can bat for a player who is not in the game",
  );
  assert.ok(
    route.includes("cannot also be in the batting order"),
    "the player a DH bats for can be in the order as well",
  );
});

test("a lineup with a DH is ten rows, which is why it is inserted in slices", () => {
  // Eleven columns a row: nine batters fits in D1's hundred bound parameters,
  // ten does not. The DH is the only thing that adds a tenth row, so this
  // check and the DH rule stand or fall together.
  assert.ok(route.includes("insertInChunks"), "a lineup is inserted in one statement again");
});
