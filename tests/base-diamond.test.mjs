import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const src = readFileSync("app/umpire/[scorecardId]/BaseDiamond.tsx", "utf8");

/**
 * The diamond is behind the umpire login, so these guard the conditions that
 * made it fail rather than the rendering. Every one of them fails silently:
 * the drop simply never happens, with no error anywhere to follow.
 */

test("the drag carries a payload", () => {
  // A drag with no data attached is refused by the browser before it starts,
  // which is why dropping a runner did nothing at all.
  assert.ok(src.includes('dataTransfer.setData("text/plain"'));
});

test("dragging over a base cancels the default handling", () => {
  assert.ok(src.includes("onDragOver={(event) => {"));
  assert.ok(src.includes('event.dataTransfer.dropEffect = "move";'));
});

test("dropping cancels the default handling", () => {
  assert.ok(src.includes("onDrop={(event) => {"));
});

test("the drop reads the runner back off the drag", () => {
  // Carried with the drag rather than read from state, so a re-render midway
  // cannot lose track of who is being moved.
  assert.ok(src.includes('event.dataTransfer.getData("text/plain")'));
});

test("a runner can also be moved without dragging", () => {
  // A base responds to a plain click, so the diamond works on a trackpad and
  // on a touchscreen, where dragging is awkward or impossible.
  assert.ok(src.includes("move(picked, spot.base)"));
});

test("one gesture cannot send two moves", () => {
  // A drop is followed by a click on the same base. Without a gate the first
  // move scored the runner and the second asked the server to move someone
  // who was already home - which it rightly refused, while the run stayed.
  assert.ok(src.includes("if (inFlight.current) return;"));
});

test("the scorecard page sends the stored base state to the browser", () => {
  // The regression this guards, and it was invisible from the server side:
  // every fix to how the bases are recorded was correct, and none of it
  // reached the screen. The page listed the columns it passed and these two
  // were not among them, so the diamond re-derived the bases from the results
  // alone - and runners the record said had scored stayed standing on base.
  const page = readFileSync("app/umpire/[scorecardId]/page.tsx", "utf8");
  assert.ok(page.includes("basesAfter: row.basesAfter"));
  assert.ok(page.includes("runnersScored: row.runnersScored"));
});

test("every runner move asks why", () => {
  // The regression: the diamond skipped the prompt for anyone "forced". But
  // being forced describes who the batter pushes along on a batted ball, and
  // nothing on the diamond is batted - so with runners on first and second
  // both were treated as forced and moved silently, recording no reason.
  assert.ok(!src.includes("forcedRunners"), "the diamond must not consult forced runners");
  assert.ok(src.includes('setAsking({ playerId, to })'));
});

test("the prompt offers a steal, an error, and something else", () => {
  assert.ok(src.includes('"STEAL"'));
  assert.ok(src.includes('"ERROR"'));
  assert.ok(src.includes('"OTHER"'));
});

test("advancing on the play just gone is offered, and leads", () => {
  // The commonest reason by far, so it is the first option and the default
  // action rather than something to hunt for.
  assert.ok(src.includes("On the last play"));
  assert.ok(src.includes('"PLAY"'));
});

test("a runner can be put back", () => {
  // The runners are placed forward automatically now, so getting one back to
  // where they actually held up has to be possible - and is a correction, not
  // something that happened on the field, so it is not interrogated.
  assert.ok(src.includes("ORDER.indexOf(to) < ORDER.indexOf(runner.base)"));
  assert.ok(src.includes('send(playerId, to, "PLAY")'));
});
