/**
 * Turns a scraped MyStatsOnline league into SQL that adds it to the archive.
 *
 *   node scripts/import-mso-league.mjs <slug> <team-mode.json> <roster-mode.json> [out.sql]
 *
 * `scripts/import-mso.mjs` did this for the MBL when the MBL was the only
 * league on the site, and it begins by emptying every historical table -
 * running it now would delete fifteen seasons of somebody else's history. This
 * one touches only the seasons of the league it is given, matched on the
 * source's own season ids, so it can be run again after a re-scrape without
 * disturbing anything else.
 *
 * The parsing below is deliberately a copy of that script's rather than shared
 * with it. That one produced the live archive and must not change; this one
 * has a different job, and a bug fixed here should not rewrite history there.
 */
import fs from "node:fs";

const [slug, teamModePath, rosterModePath] = process.argv.slice(2);
const outputPath = process.argv[5] ?? `drizzle/seed-${slug}.sql`;

if (!slug || !teamModePath || !rosterModePath) {
  console.error("usage: node scripts/import-mso-league.mjs <slug> <team-mode.json> <roster-mode.json> [out.sql]");
  process.exit(1);
}

const teamMode = JSON.parse(fs.readFileSync(teamModePath, "utf8"));
const rosterMode = JSON.parse(fs.readFileSync(rosterModePath, "utf8"));

/** Header cell -> our column name. Anything unmapped is ignored. */
const BATTING = {
  G: "games", AB: "atBats", R: "runs", H: "hits", "2B": "doubles", "3B": "triples",
  HR: "homeRuns", RBI: "rbis", BB: "walks", SO: "strikeouts", SB: "stolenBases",
  AVG: "battingAverage", OBP: "onBasePct", SLG: "sluggingPct", OPS: "ops", TB: "totalBases",
  "1B": "singles", TPA: "plateAppearances", CS: "caughtStealing", SF: "sacFlies", LOB: "leftOnBase",
  // Fielding shares the batting table in the source.
  PO: "putouts", E: "errors", FPCT: "fieldingPct",
};

const PITCHING = {
  G: "pitchingGames", GS: "gamesStarted", W: "wins", L: "losses", SV: "saves",
  IP: "inningsPitched", H: "hitsAllowed", R: "runsAllowed", ER: "earnedRuns",
  HR: "homeRunsAllowed", SO: "strikeoutsPitched", BB: "walksAllowed", ERA: "era",
  WHIP: "whip", CG: "completeGames", SHO: "shutouts", BS: "blownSaves",
  "BB/X": "walksPerGame", "SO/X": "strikeoutsPerGame",
};

const REAL_COLUMNS = new Set([
  "battingAverage", "onBasePct", "sluggingPct", "ops", "inningsPitched", "era", "whip",
  "fieldingPct", "walksPerGame", "strikeoutsPerGame",
]);

const STAT_COLUMNS = [...new Set([...Object.values(BATTING), ...Object.values(PITCHING)])];

const SQL_COLUMN = {
  atBats: "at_bats", homeRuns: "home_runs", battingAverage: "batting_average",
  onBasePct: "on_base_pct", sluggingPct: "slugging_pct", totalBases: "total_bases",
  plateAppearances: "plate_appearances", caughtStealing: "caught_stealing",
  sacFlies: "sac_flies", leftOnBase: "left_on_base", stolenBases: "stolen_bases",
  fieldingPct: "fielding_pct", pitchingGames: "pitching_games", gamesStarted: "games_started",
  inningsPitched: "innings_pitched", hitsAllowed: "hits_allowed", runsAllowed: "runs_allowed",
  earnedRuns: "earned_runs", homeRunsAllowed: "home_runs_allowed",
  strikeoutsPitched: "strikeouts_pitched", walksAllowed: "walks_allowed",
  completeGames: "complete_games", blownSaves: "blown_saves",
  walksPerGame: "walks_per_game", strikeoutsPerGame: "strikeouts_per_game",
};
const column = (name) => SQL_COLUMN[name] ?? name;

function num(value, asReal) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (text === "" || text === "-" || text === "--") return null;
  const parsed = asReal ? Number.parseFloat(text) : Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Innings pitched use baseball notation, not decimals: the digit after the
 * point counts outs, so 7.1 is 7 1/3 innings and 7.2 is 7 2/3. Reading it as
 * a plain float understates every fractional outing.
 */
function parseInnings(value) {
  const raw = num(value, true);
  if (raw === null) return null;
  const whole = Math.trunc(raw);
  const outs = Math.round((raw - whole) * 10);
  if (outs === 1) return whole + 1 / 3;
  if (outs === 2) return whole + 2 / 3;
  return whole;
}

const sqlStr = (value) =>
  value === null || value === undefined ? "NULL" : `'${String(value).replace(/'/g, "''")}'`;
const sqlNum = (value) => (value === null || value === undefined ? "NULL" : String(value));

/** Picks the table whose header row contains the given label (e.g. "BATTERS"). */
const findTable = (tables, label) =>
  (tables ?? []).find((rows) => rows.length > 1 && rows[0].some((cell) => cell === label));

/** Maps a stat table into { playerName -> { column: value } }. */
function parseStatTable(table, mapping, nameHeader) {
  const result = new Map();
  if (!table) return result;
  const header = table[0];
  const nameIndex = header.indexOf(nameHeader);
  if (nameIndex === -1) return result;

  for (const row of table.slice(1)) {
    const playerName = (row[nameIndex] ?? "").trim();
    // The source tables end with an aggregate row that is not a player.
    if (!playerName || /^totals?$/i.test(playerName)) continue;
    const stats = {};
    header.forEach((cell, index) => {
      const name = mapping[cell];
      if (!name) return;
      stats[name] = name === "inningsPitched" ? parseInnings(row[index]) : num(row[index], REAL_COLUMNS.has(name));
    });
    result.set(playerName, stats);
  }
  return result;
}

/**
 * W/L records from the season's standings tables.
 *
 * The MBL's two tables are its American and National leagues, named by
 * headings that live outside the table and so never reach a scrape. This
 * league's divisions are equally unnamed here, and guessing at them would put
 * words in the league's mouth - so clubs are imported ungrouped and the
 * standings page shows one table.
 */
function parseStandings(standingsTables) {
  const records = new Map();
  for (const table of standingsTables ?? []) {
    if (!table || table.length < 2) continue;
    const header = table[0];
    const teamIndex = header.indexOf("Team");
    if (teamIndex === -1) continue;
    const at = (label) => header.indexOf(label);
    for (const row of table.slice(1)) {
      const name = (row[teamIndex] ?? "").trim();
      if (!name) continue;
      records.set(name, {
        wins: at("W") === -1 ? null : num(row[at("W")]),
        losses: at("L") === -1 ? null : num(row[at("L")]),
        ties: at("T") === -1 ? null : num(row[at("T")]),
        runsScored: at("RS") === -1 ? null : num(row[at("RS")]),
        runsAllowed: at("RA") === -1 ? null : num(row[at("RA")]),
      });
    }
  }
  return records;
}

/** "NPU Samurai" -> abbreviation NPU, name Samurai. A "(MIBL)" marker stays
 * on the name, because that is how the league itself labels those clubs. */
function parseTeamName(sourceName) {
  const source = String(sourceName ?? "").trim();
  const match = source.match(/^([A-Z]{2,4})\s+(.*)$/);
  return match
    ? { abbreviation: match[1], name: match[2].trim(), sourceName: source }
    : { abbreviation: null, name: source, sourceName: source };
}

// The source lists seasons newest first; the archive orders them oldest first.
const seasonOrder = rosterMode.seasons.map((season) => season.name).reverse();
const standingsBySeason = new Map(rosterMode.seasons.map((s) => [s.name, parseStandings(s.standingsTables)]));

// Which club a player finished the season with, for the "(+1)" note on a
// career line. Taken from the order the source lists their teams in.
const seasonEndTeam = new Map();
for (const record of teamMode.seasons) {
  for (const label of ["BATTERS", "PITCHERS"]) {
    for (const player of parseStatTable(findTable(record.tables, label), {}, label).keys()) {
      seasonEndTeam.set(`${record.seasonName}::${player}`, record.teamName);
    }
  }
}

const lines = [
  `-- Generated by scripts/import-mso-league.mjs for ${slug} - do not edit by hand.`,
  "-- Only this league's seasons are touched; every other league is left alone.",
  "",
  `-- The league this all belongs to. Everything below hangs off these seasons.`,
];

const sourceIds = [...new Set(teamMode.seasons.map((record) => record.seasonId))];
const idList = sourceIds.map((id) => sqlStr(String(id))).join(", ");
const seasonScope =
  `(SELECT id FROM historical_seasons WHERE source_season_id IN (${idList}) ` +
  `AND league_id = (SELECT id FROM leagues WHERE slug = ${sqlStr(slug)}))`;

// Re-importing after a fresh scrape replaces this league's seasons rather than
// adding a second copy of each.
lines.push(
  `DELETE FROM historical_roster_entries WHERE season_id IN ${seasonScope};`,
  `DELETE FROM historical_player_stats WHERE season_id IN ${seasonScope};`,
  `DELETE FROM historical_games WHERE season_id IN ${seasonScope};`,
  `DELETE FROM historical_teams WHERE season_id IN ${seasonScope};`,
  `DELETE FROM historical_seasons WHERE id IN ${seasonScope};`,
  "",
);

let seasonCount = 0;
let teamCount = 0;
let statRows = 0;
let rosterRows = 0;

for (const [index, seasonName] of seasonOrder.entries()) {
  const records = teamMode.seasons.filter((record) => record.seasonName === seasonName);
  if (records.length === 0) continue;
  const sourceSeasonId = records[0].seasonId;
  const isPlayoffs = /playoff/i.test(seasonName) ? 1 : 0;
  seasonCount += 1;

  lines.push(
    `-- ${seasonName}`,
    `INSERT INTO historical_seasons (name, source_season_id, is_playoffs, sort_order, league_id) ` +
      `VALUES (${sqlStr(seasonName)}, ${sqlStr(String(sourceSeasonId))}, ${isPlayoffs}, ${index}, ` +
      `(SELECT id FROM leagues WHERE slug = ${sqlStr(slug)}));`,
  );
  const seasonRef = `(SELECT id FROM historical_seasons WHERE source_season_id = ${sqlStr(String(sourceSeasonId))} AND league_id = (SELECT id FROM leagues WHERE slug = ${sqlStr(slug)}))`;
  const standings = standingsBySeason.get(seasonName) ?? new Map();

  for (const record of records) {
    const team = parseTeamName(record.teamName);
    const standing = standings.get(record.teamName) ?? {};
    teamCount += 1;
    lines.push(
      `INSERT INTO historical_teams (season_id, name, abbreviation, source_name, source_team_id, league, wins, losses, ties, runs_scored, runs_allowed) ` +
        `VALUES (${seasonRef}, ${sqlStr(team.name)}, ${sqlStr(team.abbreviation)}, ${sqlStr(team.sourceName)}, ` +
        `${sqlStr(String(record.teamId))}, NULL, ${sqlNum(standing.wins ?? null)}, ${sqlNum(standing.losses ?? null)}, ` +
        `${sqlNum(standing.ties ?? null)}, ${sqlNum(standing.runsScored ?? null)}, ${sqlNum(standing.runsAllowed ?? null)});`,
    );
    const teamRef = `(SELECT id FROM historical_teams WHERE season_id = ${seasonRef} AND source_team_id = ${sqlStr(String(record.teamId))})`;

    const batting = parseStatTable(findTable(record.tables, "BATTERS"), BATTING, "BATTERS");
    const pitching = parseStatTable(findTable(record.tables, "PITCHERS"), PITCHING, "PITCHERS");
    const players = new Set([...batting.keys(), ...pitching.keys()]);

    for (const player of players) {
      const stats = { ...(batting.get(player) ?? {}), ...(pitching.get(player) ?? {}) };
      const names = STAT_COLUMNS.filter((name) => stats[name] !== undefined && stats[name] !== null);
      const endedHere = seasonEndTeam.get(`${seasonName}::${player}`) === record.teamName ? 1 : 0;
      lines.push(
        `INSERT INTO historical_player_stats (season_id, historical_team_id, player_name, is_season_end_team` +
          (names.length ? `, ${names.map(column).join(", ")}` : "") +
          `) VALUES (${seasonRef}, ${teamRef}, ${sqlStr(player)}, ${endedHere}` +
          (names.length ? `, ${names.map((name) => sqlNum(stats[name])).join(", ")}` : "") +
          ");",
      );
      statRows += 1;
    }

    // The listed roster lives in its own table, keyed by a "Players" header.
    const rosterTable = findTable(record.tables, "Players");
    if (rosterTable) {
      const header = rosterTable[0];
      const nameIndex = header.indexOf("Players");
      const numberIndex = header.indexOf("Number");
      const positionIndex = header.indexOf("Positions");
      for (const row of rosterTable.slice(1)) {
        const player = (row[nameIndex] ?? "").trim();
        if (!player || /^totals?$/i.test(player)) continue;
        const jersey = numberIndex === -1 ? "" : (row[numberIndex] ?? "").trim();
        const positions = positionIndex === -1 ? "" : (row[positionIndex] ?? "").trim();
        lines.push(
          `INSERT INTO historical_roster_entries (season_id, historical_team_id, player_name, jersey_number, positions) ` +
            `VALUES (${seasonRef}, ${teamRef}, ${sqlStr(player)}, ${sqlStr(jersey || null)}, ${sqlStr(positions || null)});`,
        );
        rosterRows += 1;
      }
    }
  }
  lines.push("");
}

fs.writeFileSync(outputPath, lines.join("\n") + "\n");
console.log(`Wrote ${outputPath}`);
console.log(`  seasons: ${seasonCount}`);
console.log(`  team-seasons: ${teamCount}`);
console.log(`  player stat rows: ${statRows}`);
console.log(`  roster entries: ${rosterRows}`);
