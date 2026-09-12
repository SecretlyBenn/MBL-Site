/**
 * Scrapes per-game line scores and box scores from MyStatsOnline.
 *
 *   node scripts/scrape-mso-boxscores.mjs <schedule.json> [out.json]
 *
 * Takes a schedule produced by scrape-mso-schedule.mjs and fetches the game
 * page for every fixture that carries a score, writing the `games[]` shape
 * import-boxscores.mjs already expects. Unplayed and cancelled fixtures are
 * skipped - their pages exist but hold no box score.
 *
 * Pages are fetched one at a time with a short pause. The archive is a few
 * hundred games and this is somebody else's server.
 */
import fs from "node:fs";

const LEAGUE = "66329";
const schedulePath = process.argv[2];
const outPath = process.argv[3] ?? "mso-boxscores-fresh.json";

if (!schedulePath) {
  console.error("usage: node scripts/scrape-mso-boxscores.mjs <schedule.json> [out.json]");
  process.exit(1);
}

/** Same tag-stripping the schedule scraper uses - attributes first, then tags. */
const text = (html) =>
  html
    .replace(/<(\w+)\b[^>]*?((?:"[^"]*"|'[^']*'|[^'">])*)>/g, (m, tag) => `<${tag}>`)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

/** A table as rows of cell text. */
const parseTable = (table) =>
  [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((row) =>
    [...row[0].matchAll(/<t[dh][\s\S]*?<\/t[dh]>/gi)].map((cell) => text(cell[0])),
  );

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const schedule = JSON.parse(fs.readFileSync(schedulePath, "utf8"));
const wanted = schedule.seasons.flatMap((season) =>
  season.games
    .filter((game) => game.gameId && game.awayScore !== "" && game.awayScore !== "-")
    .map((game) => ({ seasonName: season.seasonName, gameId: game.gameId })),
);

console.log(`${wanted.length} games to fetch.`);

const games = [];
const failed = [];

for (const [index, entry] of wanted.entries()) {
  const url =
    `https://www.mystatsonline.com/ballsports/visitor/league/schedule_scores/game_score.aspx` +
    `?IDLeague=${LEAGUE}&IDGame=${entry.gameId}`;
  try {
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!response.ok) throw new Error(`returned ${response.status}`);
    const html = await response.text();
    const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => m[0]);

    // The page is one line score followed by batting/pitching for each side,
    // identified by their header cell rather than by position.
    const line = tables.find((t) => /<th[^>]*>\s*Team\s*</i.test(t) || /\bR\b[\s\S]*\bH\b[\s\S]*\bE\b/.test(text(t).slice(0, 60)));
    const batting = tables.filter((t) => /BATTERS/i.test(t)).map(parseTable);
    const pitching = tables.filter((t) => /PITCHERS/i.test(t)).map(parseTable);

    if (!line || batting.length === 0) throw new Error("no box score on page");

    games.push({
      seasonName: entry.seasonName,
      gameId: entry.gameId,
      line: parseTable(line),
      batting,
      pitching,
    });
  } catch (error) {
    failed.push({ gameId: entry.gameId, reason: String(error.message ?? error) });
  }

  if ((index + 1) % 25 === 0) console.log(`  ${index + 1}/${wanted.length}`);
  await sleep(200);
}

fs.writeFileSync(outPath, JSON.stringify({ games }, null, 1));
console.log(`Wrote ${games.length} box scores -> ${outPath}`);
if (failed.length) {
  console.log(`${failed.length} failed:`);
  for (const f of failed.slice(0, 10)) console.log(`  ${f.gameId}: ${f.reason}`);
}
