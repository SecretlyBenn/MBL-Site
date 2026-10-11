import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

/**
 * A runner thrown out trying for the next base, which used to have to go in as
 * a caught stealing.
 *
 * Dragging a runner to a base offered one way of not getting there - "Caught
 * stealing - he never got there" - so a man who tagged up from third and was
 * thrown out at the plate was recorded as having been caught stealing. That is
 * a real stat and it reached the published box score and the season totals;
 * see drizzle/0086. A runner going on a batted ball or a tag-up is entitled to
 * go, and nobody is credited with holding him.
 */

const diamond = readFileSync("app/umpire/[scorecardId]/BaseDiamond.tsx", "utf8");
const route = readFileSync("app/api/scorecards/[id]/runner-outs/route.ts", "utf8");
const schema = readFileSync("db/schema.ts", "utf8");

test("being thrown out trying is not recorded as a steal", () => {
  assert.ok(
    diamond.includes('sendOut(asking.playerId, "TAGGED", asking.to)'),
    "a runner who did not reach the base can only be recorded as caught stealing",
  );
  // The steal is still there - it is a real thing that happens - so the two
  // have to be told apart rather than one replacing the other.
  assert.ok(
    diamond.includes('sendOut(asking.playerId, "CAUGHT_STEALING")'),
    "there is no longer any way to record a caught stealing",
  );
});

test("the card records which base he was retired at", () => {
  assert.match(schema, /out_at/, "where a runner was retired is not stored");
  assert.match(
    route,
    /payload\.to && payload\.to !== from/,
    "the base he was going for is not kept, so the card can only name the one he left",
  );
});

test("a tag on the bag and a pickoff are left as they were", () => {
  // Both retire a man where he is standing, so there is no second base to
  // name and the column stays null rather than repeating the first.
  assert.match(route, /outAt: payload\.to && payload\.to !== from \? payload\.to : null/);
});
