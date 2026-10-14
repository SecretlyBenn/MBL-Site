import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * The cover cropper's arithmetic, checked without a browser.
 *
 * It maps backwards: the writer moves the picture behind a fixed window, and
 * what has to be worked out is which rectangle of the original is showing
 * through, in the original's own pixels. A sign error there crops the opposite
 * corner, which looks plausible until somebody's head is missing.
 */

const source = readFileSync("app/newsroom/[id]/cover-crop.ts", "utf8");
const crop = await import(
  "data:text/javascript," +
    encodeURIComponent(source.replace(/export (const|function)/g, "export $1").replace(/: \{[^}]*\}|: number|<[^>]*>/g, ""))
);
const { OUT_WIDTH, OUT_HEIGHT, WIN_WIDTH, WIN_HEIGHT, baseScale, minZoom, room, sourceRect } = crop;

const WIDE = { width: 1920, height: 1080 };
const TALL = { width: 1024, height: 1536 };

test("the output is 16:9, and the window is the same shape", () => {
  assert.equal((OUT_WIDTH / OUT_HEIGHT).toFixed(4), (16 / 9).toFixed(4));
  assert.equal((WIN_WIDTH / WIN_HEIGHT).toFixed(4), (OUT_WIDTH / OUT_HEIGHT).toFixed(4));
});

test("at rest a 16:9 picture is taken whole", () => {
  // Nothing to choose: it already is the shape, so the crop is the picture.
  const scale = baseScale(WIDE);
  const cut = sourceRect(WIDE, scale, { x: 0, y: 0 });
  assert.equal(Math.round(cut.sx), 0);
  assert.equal(Math.round(cut.sy), 0);
  assert.equal(Math.round(cut.width), WIDE.width);
  assert.equal(Math.round(cut.height), WIDE.height);
});

test("at rest a tall picture is taken full width, centred", () => {
  const scale = baseScale(TALL);
  const cut = sourceRect(TALL, scale, { x: 0, y: 0 });
  assert.equal(Math.round(cut.sx), 0, "a tall picture should lose nothing from the sides");
  assert.equal(Math.round(cut.width), TALL.width);
  // 1024 wide at 16:9 is 576 tall, taken from the middle of 1536.
  assert.equal(Math.round(cut.height), 576);
  assert.equal(Math.round(cut.sy), (1536 - 576) / 2);
});

test("a picture that only just covers the window cannot be dragged", () => {
  const limit = room(WIDE, baseScale(WIDE));
  assert.equal(Math.round(limit.x), 0);
  assert.equal(Math.round(limit.y), 0);
});

test("dragging down takes the crop from higher up the picture", () => {
  // Pulling the picture down the screen brings its top into the window, so the
  // rectangle read out of the original has to move towards zero, not away.
  const scale = baseScale(TALL);
  const still = sourceRect(TALL, scale, { x: 0, y: 0 });
  const dragged = sourceRect(TALL, scale, { x: 0, y: 40 });
  assert.ok(dragged.sy < still.sy, "dragging down reads from further down, which is backwards");
});

test("zooming in takes less of the picture, from the middle", () => {
  const scale = baseScale(WIDE);
  const near = sourceRect(WIDE, scale * 2, { x: 0, y: 0 });
  assert.equal(Math.round(near.width), Math.round(WIDE.width / 2));
  assert.equal(Math.round(near.sx), Math.round(WIDE.width / 4));
});

test("the crop never reads outside the picture at the furthest drag", () => {
  for (const natural of [WIDE, TALL, { width: 800, height: 800 }]) {
    for (const zoom of [1, 1.5, 3]) {
      const scale = baseScale(natural) * zoom;
      const limit = room(natural, scale);
      for (const corner of [
        { x: limit.x, y: limit.y },
        { x: -limit.x, y: -limit.y },
      ]) {
        const cut = sourceRect(natural, scale, corner);
        assert.ok(cut.sx >= -0.5, `sx ${cut.sx} is off the left edge`);
        assert.ok(cut.sy >= -0.5, `sy ${cut.sy} is off the top edge`);
        assert.ok(cut.sx + cut.width <= natural.width + 0.5, "the crop runs off the right edge");
        assert.ok(cut.sy + cut.height <= natural.height + 0.5, "the crop runs off the bottom edge");
      }
    }
  }
});

/**
 * Zooming out far enough to fit the whole picture.
 *
 * Zoom 1 is the picture just covering the frame, which for anything not
 * already 16:9 means losing the overflow. The first covers posted here were
 * stat graphics whose first and last lines were exactly that overflow, so a
 * centred crop beheaded the numbers the picture existed to show.
 */

test("a picture that is not 16:9 can be zoomed out until all of it fits", () => {
  for (const natural of [{ width: 1597, height: 1080 }, TALL, { width: 800, height: 800 }]) {
    const floor = minZoom(natural);
    assert.ok(floor < 1, "the writer cannot zoom out past covering the frame");
    const cut = sourceRect(natural, baseScale(natural) * floor, { x: 0, y: 0 });
    // The window now takes in the whole picture and then some, so every edge
    // of the original is inside what gets drawn.
    assert.ok(cut.sx <= 0.5, `the left edge is still cut at ${cut.sx}`);
    assert.ok(cut.sy <= 0.5, `the top edge is still cut at ${cut.sy}`);
    assert.ok(cut.sx + cut.width >= natural.width - 0.5, "the right edge is still cut");
    assert.ok(cut.sy + cut.height >= natural.height - 0.5, "the bottom edge is still cut");
  }
});

test("a picture that is already 16:9 has nothing to zoom out of", () => {
  // It covers and fits at the same scale, so the floor is where it already is.
  assert.equal(minZoom(WIDE).toFixed(4), (1).toFixed(4));
});

test("the cropper opens showing the whole picture, not a crop of it", () => {
  const component = readFileSync("app/newsroom/[id]/CoverCropper.tsx", "utf8");
  assert.match(component, /setZoom\(minZoom\(/, "it opens already cut, without the writer choosing that");
  assert.match(component, /min=\{floor\}/, "the slider still stops at covering the frame");
});

test("the space around a zoomed-out picture is filled, never left transparent", () => {
  // WebP keeps transparency, so an unfilled cover would show the page through
  // it in one place and a black box in another once it is re-encoded.
  const component = readFileSync("app/newsroom/[id]/CoverCropper.tsx", "utf8");
  assert.match(component, /fillRect\(0, 0, OUT_WIDTH, OUT_HEIGHT\)/);
  assert.ok(
    component.indexOf("fillRect") < component.indexOf("drawImage"),
    "the backdrop is painted over the picture instead of behind it",
  );
});
