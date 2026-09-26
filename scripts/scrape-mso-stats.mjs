/**
 * Scrapes a league's season statistics from MyStatsOnline.
 *
 *   node scripts/scrape-mso-stats.mjs <IDLeague> <IDSeason,IDSeason,...> [prefix]
 *
 * Writes the two files import-mso.mjs expects. They came from a hand-made
 * extraction when the MBL's own history was imported; the MCBA has fourteen
 * seasons of its own, and doing that by hand fourteen times is how mistakes
 * get in.
 *
 * The visitor pages are public, so this needs no login. Season ids come from
 * the dropdown on the league's home page, and team ids from each season's
 * standings page. One request per season plus one per team, half a second
 * apart - this is somebody else's server.
 */
import fs from "node:fs";

const league = process.argv[2];
const seasonIds = (process.argv[3] ?? "").split(",").filter(Boolean);
const prefix = process.argv[4] ?? `mso-${league}`;

if (!league || seasonIds.length === 0) {
  console.error("usage: node scripts/scrape-mso-stats.mjs <IDLeague> <IDSeason,...> [prefix]");
  process.exit(1);
}

const BASE = "https://www.mystatsonline.com/ballsports/visitor/league";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function page(url) {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

/**
 * Strips tags and decodes the few entities the source actually emits.
 *
 * Team cells carry a tooltip in a title attribute whose own value contains
 * markup and stray ">" characters, so attributes are dropped before tags -
 * stripping tags first leaves the tooltip text behind as if it were content.
 */
const text = (html) =>
  html
    .replace(/<(\w+)\b[^>]*?((?:"[^"]*"|'[^']*'|[^'">])*)>/g, (m, tag) => `<${tag}>`)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

/** Every table on a page, as rows of plain cell text. */
function tablesIn(html) {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  return [...withoutScripts.matchAll(/<table[\s\S]*?<\/table>/gi)].map((table) =>
    [...table[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((row) =>
      [...row[0].matchAll(/<t[dh][\s\S]*?<\/t[dh]>/gi)].map((cell) => text(cell[0])),
    ),
  );
}

/** The name the source shows for a season, from the selected dropdown option. */
function seasonNameFrom(html, fallback) {
  const selected = html.match(/<option[^>]*selected[^>]*>([^<]*)</i);
  return selected ? text(selected[1]) : fallback;
}

const teamMode = { seasons: [] };
const rosterMode = { seasons: [] };

for (const seasonId of seasonIds) {
  const standingsUrl = `${BASE}/standings/standings.aspx?IDLeague=${league}&IDSeason=${seasonId}`;
  const standingsHtml = await page(standingsUrl);
  const seasonName = seasonNameFrom(standingsHtml, `Season ${seasonId}`);

  // Every club in the season, from the links the standings table makes to
  // each one's statistics.
  const teams = new Map();
  for (const match of standingsHtml.matchAll(
    /stats\/team\.aspx\?IDLeague=\d+&IDSeason=\d+&IDTeam=(\d+)"[^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const name = text(match[2]);
    if (name) teams.set(match[1], name);
  }

  const rosterSeason = { name: seasonName, standingsTables: tablesIn(standingsHtml), teams: [] };
  console.log(`${seasonName}: ${teams.size} teams`);

  for (const [teamId, teamName] of teams) {
    await wait(500);
    const teamHtml = await page(
      `${BASE}/stats/team.aspx?IDLeague=${league}&IDSeason=${seasonId}&IDTeam=${teamId}`,
    );
    const tables = tablesIn(teamHtml);
    teamMode.seasons.push({ seasonName, seasonId, teamName, teamId, tables });
    rosterSeason.teams.push({ teamName, teamId, tables });
    const players = tables
      .filter((rows) => rows.length > 1 && rows[0].some((cell) => /^(BATTERS|PITCHERS)$/.test(cell)))
      .reduce((total, rows) => total + rows.length - 1, 0);
    console.log(`  ${teamName}: ${players} stat rows`);
  }

  rosterMode.seasons.push(rosterSeason);
  await wait(500);
}

fs.writeFileSync(`${prefix}-team-mode.json`, JSON.stringify(teamMode, null, 1));
fs.writeFileSync(`${prefix}-roster-mode.json`, JSON.stringify(rosterMode, null, 1));
console.log(
  `\nwrote ${prefix}-team-mode.json and ${prefix}-roster-mode.json ` +
    `(${teamMode.seasons.length} team-seasons across ${rosterMode.seasons.length} seasons)`,
);
