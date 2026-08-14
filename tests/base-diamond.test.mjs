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
