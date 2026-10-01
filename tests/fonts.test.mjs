import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

/**
 * The site's typefaces are declared by hand in globals.css and served from
 * public/, which is not how this is normally done and needs to stay that way.
 *
 * `next/font/google` is the ordinary answer and silently did not work here:
 * vinext writes the build machine's own filesystem path into the @font-face it
 * generates, so the deployed site asked browsers for
 * file:///C:/Users/.../.vinext/fonts/... and got refused. Nothing failed
 * loudly - every page just rendered in the browser's fallback sans, which is
 * close enough to Geist that it went unnoticed for months. It only showed on
 * the stadium jumbotron, whose columns are measured against a condensed face.
 */

const css = readFileSync("app/globals.css", "utf8");
const layout = readFileSync("app/layout.tsx", "utf8");

test("no page loads a face through next/font", () => {
  // Written as an import check rather than a text search so the explanatory
  // comments, which all mention it, do not count.
  for (const [file, source] of [
    ["app/layout.tsx", layout],
    ["app/scoreboard/[teamId]/page.tsx", readFileSync("app/scoreboard/[teamId]/page.tsx", "utf8")],
  ]) {
    assert.doesNotMatch(
      source,
      /^import .* from "next\/font/m,
      `${file} loads a font through next/font, which does not reach the browser`,
    );
  }
});

test("every face the site asks for is actually declared", () => {
  for (const family of ["Geist", "Geist Mono", "Barlow Condensed"]) {
    assert.ok(
      css.includes(`font-family: "${family}"`),
      `${family} is no longer declared, so pages set in it fall back`,
    );
  }
});

test("every font file referenced is one that exists", () => {
  // The filenames are not hashed, so a font that is swapped or renamed has to
  // be renamed here too. Missing one is a silent fallback, not an error.
  const referenced = [...css.matchAll(/url\("(\/fonts\/[^"]+)"\)/g)].map((match) => match[1]);
  assert.ok(referenced.length >= 7, "faces have gone missing from the stylesheet");
  for (const path of referenced) {
    assert.ok(existsSync(`public${path}`), `${path} is referenced but not in public/`);
  }
});

test("the two names Tailwind's font utilities resolve through are defined", () => {
  // `@theme inline` maps font-sans and font-mono onto these. next/font used to
  // define them with a class on <body>; removing it without setting them here
  // leaves every font-sans utility on the site resolving to nothing.
  const theme = css.slice(css.indexOf("@theme inline"));
  assert.ok(theme.includes("--font-sans: var(--font-geist-sans)"));
  assert.ok(theme.includes("--font-mono: var(--font-geist-mono)"));

  const root = css.slice(css.indexOf(":root {"), css.indexOf("@media"));
  assert.ok(root.includes("--font-geist-sans:"), "font-sans now resolves to nothing");
  assert.ok(root.includes("--font-geist-mono:"), "font-mono now resolves to nothing");
});

test("each family keeps a fallback behind it", () => {
  // A jumbotron in a stadium and a page on a phone both have to be readable in
  // the moment before the file arrives, and if it never arrives.
  const root = css.slice(css.indexOf(":root {"), css.indexOf("@media"));
  assert.match(root, /--font-geist-sans:\s*"Geist",\s*\w/, "Geist has nothing behind it");
  assert.match(root, /--font-geist-mono:\s*"Geist Mono",\s*\w/, "Geist Mono has nothing behind it");
});

test("the extended latin files are only fetched when something needs them", () => {
  // This is what keeps the cost down: a browser downloads the extended file
  // only if the page contains a character from it, which for a league of
  // Minecraft usernames is almost never. Dropping the range would make every
  // reader fetch both halves of both families.
  const faces = css.split("@font-face").filter((block) => block.includes("latin-ext"));
  assert.equal(faces.length, 2, "the extended latin faces have changed");
  for (const face of faces) {
    assert.ok(face.includes("unicode-range:"), "an extended face is downloaded unconditionally");
  }
});

test("nothing unlayered overrides the body typeface", () => {
  // `body { font-family: Arial, Helvetica, sans-serif }` came with the starter
  // the project was generated from and sat here unnoticed. Unlayered CSS beats
  // every Tailwind utility however specific, so the whole site rendered in
  // Arial - and would have gone on doing so after the font files were fixed.
  // Comments stripped first, because the one left where that rule used to be
  // quotes it.
  const body = css
    .slice(css.search(/^body \{/m), css.indexOf("@layer components"))
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const declared = body.match(/font-family:\s*([^;]+);/);
  assert.ok(declared, "body no longer sets a typeface at all");
  assert.equal(declared[1].trim(), "var(--font-geist-sans)", "body is pinned to a system face again");
});
