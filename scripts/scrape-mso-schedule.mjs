/**
 * Scrapes one season's schedule and scores from MyStatsOnline.
 *
 *   node scripts/scrape-mso-schedule.mjs <IDSeason> [out.json]
 *
 * The visitor pages are public, so this needs no login. Season ids come from
 * the season dropdown on the schedule page; MBL Season XII is 109541.
 *
 * Output matches the `seasons[].games[]` shape that import-mso.mjs and
 * import-boxscores.mjs already expect, so a fresh scrape drops straight into
 * the existing pipeline. An unplayed game keeps MyStatsOnline's "-" score.
 */
import fs from "node:fs";

const LEAGUE = "66329";
const seasonId = process.argv[2];
const outPath = process.argv[3] ?? `mso-schedule-${seasonId}.json`;

if (!seasonId) {
  console.error("usage: node scripts/scrape-mso-schedule.mjs <IDSeason> [out.json]");
  process.exit(1);
}

const url =
  `https://www.mystatsonline.com/ballsports/visitor/league/schedule_scores/schedule.aspx` +
  `?IDLeague=${LEAGUE}&IDSeason=${seasonId}`;

const html = await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => {
  if (!r.ok) throw new Error(`${url} returned ${r.status}`);
  return r.text();
});

/**
 * Strips tags and decodes the few entities the source actually emits.
 *
 * Team cells carry a tooltip in a title attribute whose own value contains
 * markup and stray ">" characters, so attributes are dropped before tags -
 * stripping tags first leaves the tooltip text behind as if it were content.
 */
const text = (html_) =>
  html_
    .replace(/<(\w+)\b[^>]*?((?:"[^"]*"|'[^']*'|[^'">])*)>/g, (m, tag) => `<${tag}>`)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

/** A team cell repeats the club's name; the tooltip adds "Team location : ...". */
const teamName = (cell) => cell.split(/\s+Team\s|\s+Coach\s/)[0].split(/\s+/)[0];

const seasonName = (() => {
  const selected = html.match(/<option[^>]*selected[^>]*>([^<]*)</i);
  return selected ? text(selected[1]) : `Season ${seasonId}`;
})();

// The schedule is one table; a single-cell row is a date heading and every
// following row is a game played on that date.
const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => m[0]);
const table = tables.find((t) => /Away team/i.test(t) && /Home team/i.test(t));
if (!table) throw new Error("schedule table not found - page layout changed");

const games = [];
let date = null;
for (const row of table.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
  const cells = [...row[0].matchAll(/<t[dh][\s\S]*?<\/t[dh]>/gi)].map((c) => text(c[0]));
  if (cells.length === 1) {
    date = cells[0];
    continue;
  }
  if (cells.length < 6 || /Away team/i.test(cells[1])) continue;
  const [time, away, awayScore, note, homeScore, home] = cells;
  // The score cell links to the game's own page. Carrying the id here keeps
  // box scores matched to games by id rather than by position, which a
  // cancelled or re-ordered fixture would otherwise throw off.
  games.push({
    date,
    time,
    gameId: row[0].match(/IDGame=(\d+)/)?.[1] ?? null,
    away: teamName(away),
    awayScore,
    homeScore,
    home: teamName(home),
    note,
    location: cells[6] ?? "",
    status: cells[7] ?? "",
  });
}

const played = games.filter((g) => g.awayScore !== "" && g.awayScore !== "-").length;
fs.writeFileSync(outPath, JSON.stringify({ seasons: [{ seasonId, seasonName, games }] }, null, 1));
console.log(`${seasonName}: ${games.length} games, ${played} scored -> ${outPath}`);
