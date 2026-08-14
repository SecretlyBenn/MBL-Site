import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const src = readFileSync("app/umpire/[scorecardId]/BaseDiamond.tsx", "utf8");

// These four are what make an HTML5 drag actually complete. Any one missing and
// the drop silently never fires, which is exactly how this failed.
test("the drag carries a payload", () => {
  assert.match(src, /dataTransfer\.setData\(/);
});

test("dragging over a base cancels the default handling", () => {
  assert.match(src, /onDragOver=\{\(event\) => \{[\s\S]*?event\.preventDefault\(\)/);
});

test("dropping cancels the default handling", () => {
  assert.match(src, /onDrop=\{\(event\) => \{[\s\S]*?event\.preventDefault\(\)/);
});

test("the drop reads the runner back off the drag", () => {
  assert.match(src, /dataTransfer\.getData\("text\/plain"\)/);
});

test("a runner can also be moved without dragging", () => {
  assert.match(src, /onClick=\{\(\) => picked !== null && move\(picked, spot\.base\)\}/);
});
