import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * An article's cover belongs to the article, not to its place in the list.
 *
 * The home page drew a picture only for the newest piece, so publishing a new
 * article took the picture off the one before it. Nothing was deleted - the
 * cover_image_id was still on the row - but it read as the upload having been
 * lost, which is worse than it looking plain.
 */

const home = readFileSync("app/[league]/page.tsx", "utf8");

test("a cover is shown for every article that has one", () => {
  assert.ok(
    !home.includes("index === 0 && article.coverImageId"),
    "the home page only draws a cover for the newest article again",
  );
  assert.match(home, /\{article\.coverImageId && \(/, "the home page stopped drawing covers at all");
});

/**
 * These covers are as often a tall graphic of somebody's stat line as a wide
 * photograph. object-cover fills the frame by cutting the overflow away, which
 * beheaded the text that was the whole point of the picture.
 */

const frames = [
  ["the home page", "app/[league]/page.tsx"],
  ["the news list", "app/[league]/news/page.tsx"],
  ["the article page", "app/[league]/news/[slug]/page.tsx"],
  ["the editor", "app/newsroom/[id]/ArticleEditor.tsx"],
];

test("no cover frame crops the picture", () => {
  for (const [name, file] of frames) {
    const source = readFileSync(file, "utf8");
    const covers = source.match(/news\/image\/\$\{[^}]+\}/g) ?? [];
    assert.ok(covers.length > 0, `${name} no longer renders a cover`);
    assert.ok(
      !/object-cover/.test(source),
      `${name} still crops a cover to its frame, which cuts the top and bottom off a stat graphic`,
    );
  }
});

/**
 * Covers are cut to one shape rather than used as uploaded.
 *
 * One article led with a tall stat graphic and the next with a square crest,
 * and no single frame holds both: filling it cuts the words off the graphic,
 * fitting it inside leaves the crest swimming in bars. So the writer chooses
 * the crop, the way a profile picture is set anywhere else, and every cover is
 * written out at the same size.
 */

const editor = readFileSync("app/newsroom/[id]/ArticleEditor.tsx", "utf8");

test("choosing a cover goes through the cropper, never straight to the article", () => {
  assert.ok(
    !/onClick=\{\(\) => setCoverImageId\(id\)\}/.test(editor),
    "a picture can still be made the cover without being cut to shape",
  );
  assert.match(editor, /setCropping\(id\)/, "the picker no longer opens the cropper");
  assert.match(editor, /if \(coverImageId === null\) setCropping\(id\)/, "the first upload skips the crop");
});
