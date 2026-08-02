/**
 * Converts the scraped MyStatsOnline archive into a SQL seed file for the
 * historical_* tables.
 *
 *   node scripts/import-mso.mjs <path-to-mso-raw.json> [out.sql]
 *
 * The generated SQL deletes and repopulates the historical tables only - it
 * never touches the live league tables.
 */
import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2];
const outputPath = process.argv[3] ?? path.join("drizzle", "seed-historical.sql");

if (!inputPath) {
  console.error("usage: node scripts/import-mso.mjs <mso-raw.json> [out.sql]");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));

/** Header cell -> our column name. Anything unmapped is ignored. */
const BATTING = {
  G: "games",
  AB: "atBats",
  R: "runs",
  H: "hits",
  "2B": "doubles",
  "3B": "triples",
  HR: "homeRuns",
  RBI: "rbis",
  BB: "walks",
  SO: "strikeouts",
  SB: "stolenBases",
  AVG: "battingAverage",
  OBP: "onBasePct",
  SLG: "sluggingPct",
  OPS: "ops",
  TB: "totalBases",
};

const PITCHING = {
  G: "pitchingGames",
  GS: "gamesStarted",
  W: "wins",
  L: "losses",
  SV: "saves",
  IP: "inningsPitched",
  H: "hitsAllowed",
  R: "runsAllowed",
  ER: "earnedRuns",
  HR: "homeRunsAllowed",
  SO: "strikeoutsPitched",
  BB: "walksAllowed",
  ERA: "era",
  WHIP: "whip",
};

const REAL_COLUMNS = new Set([
  "battingAverage",
  "onBasePct",
  "sluggingPct",
  "ops",
  "inningsPitched",
  "era",
  "whip",
]);

function num(value, asReal) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (text === "" || text === "-" || text === "--") return null;
  const parsed = asReal ? Number.parseFloat(text) : Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function sqlStr(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNum(value) {
  return value === null || value === undefined ? "NULL" : String(value);
}

const FRANCHISE_NAMES = {
  Panthers: "Philadelphia Panthers",
  Sunset: "Miami Sunset",
  Grizzlies: "California Grizzlies",
  Knights: "Cincinnati Knights",
  Voodoo: "Louisiana Voodoo",
  Expos: "Montreal Expos",
  Otters: "Hershey Otters",
  Blizzards: "Colorado Blizzards",
  Thunderbirds: "Arizona Thunderbirds",
  Jazz: "Utah Jazz",
};

const LEGACY_NICKNAMES = [
  ...Object.keys(FRANCHISE_NAMES),
  "Thunderbirds", "Sabertooths", "Hurricanes", "Villagers", "Piranhas",
  "Crusaders", "Wildcats", "Flamingos", "Aviators", "Platypi", "Penguins",
  "Pistons", "Gothams", "Beacons", "Dolphins", "Alpacas", "Evokers",
  "Riptide", "Parrots", "Embers", "Wolves", "Nimbis", "Mafia", "Boom",
  "Aces", "Surf",
].sort((a, b) => b.length - a.length);

/** Splits the source's three-character prefix from the actual franchise name. */
function parseTeamName(sourceName) {
  const source = String(sourceName ?? "").trim();
  const withoutSeason = source.replace(/\s+S\d+$/i, "").trim();
  const nickname = LEGACY_NICKNAMES.find((candidate) => withoutSeason.endsWith(candidate)) ?? withoutSeason.slice(3);
  const abbreviation = withoutSeason.slice(0, -nickname.length).toUpperCase() || null;
  return {
    abbreviation,
    name: FRANCHISE_NAMES[nickname] ?? nickname,
    sourceName: source,
  };
}

/** Picks the table whose header row contains the given label (e.g. "BATTERS"). */
function findTable(tables, label) {
  return tables.find((rows) => rows.length > 1 && rows[0].some((cell) => cell === label));
}

/** Maps a stat table into { playerName -> { column: value } }. */
function parseStatTable(table, mapping, nameHeader) {
  const result = new Map();
  if (!table) return result;

  const header = table[0];
  const nameIndex = header.indexOf(nameHeader);
  if (nameIndex === -1) return result;

  for (const row of table.slice(1)) {
    const playerName = (row[nameIndex] ?? "").trim();
    if (!playerName) continue;
    // The source tables end with an aggregate row ("TOTAL"/"TOTALS") that is
    // not a player - including it would top every leaderboard.
    if (/^totals?$/i.test(playerName)) continue;

    const stats = {};
    header.forEach((cell, index) => {
      const column = mapping[cell];
      if (!column) return;
      stats[column] = num(row[index], REAL_COLUMNS.has(column));
    });
    result.set(playerName, stats);
  }
  return result;
}

/** Pulls W/L records for each team out of the season's standings tables. */
function parseStandings(standingsTables) {
  const records = new Map();
  for (const table of standingsTables ?? []) {
    if (!table || table.length < 2) continue;
    const header = table[0];
    const teamIndex = header.indexOf("Team");
    const winIndex = header.indexOf("W");
    const lossIndex = header.indexOf("L");
    const tieIndex = header.indexOf("T");
    if (teamIndex === -1) continue;

    for (const row of table.slice(1)) {
      const name = (row[teamIndex] ?? "").trim();
      if (!name) continue;
      records.set(name, {
        wins: winIndex === -1 ? null : num(row[winIndex]),
        losses: lossIndex === -1 ? null : num(row[lossIndex]),
        ties: tieIndex === -1 ? null : num(row[tieIndex]),
      });
    }
  }
  return records;
}

const statColumns = [
  ...new Set([...Object.values(BATTING), ...Object.values(PITCHING)]),
];

const lines = [
  "-- Generated by scripts/import-mso.mjs - do not edit by hand.",
  "-- Historical archive only; live league tables are untouched.",
  "DELETE FROM historical_player_stats;",
  "DELETE FROM historical_teams;",
  "DELETE FROM historical_seasons;",
  "",
];

let seasonId = 0;
let teamId = 0;
let statRows = 0;

raw.seasons.forEach((season, seasonIndex) => {
  seasonId += 1;
  const isPlayoffs = /playoff/i.test(season.name) ? 1 : 0;
  // Source lists newest first; store ascending so higher = more recent.
  const sortOrder = raw.seasons.length - seasonIndex;

  lines.push(
    `INSERT INTO historical_seasons (id, name, source_season_id, is_playoffs, sort_order) VALUES (${seasonId}, ${sqlStr(
      season.name,
    )}, ${sqlStr(season.id)}, ${isPlayoffs}, ${sortOrder});`,
  );

  const records = parseStandings(season.standingsTables);

  for (const team of season.teams ?? []) {
    teamId += 1;
    const record = records.get(team.teamName) ?? { wins: null, losses: null, ties: null };
    const parsedTeam = parseTeamName(team.teamName);

    lines.push(
      `INSERT INTO historical_teams (id, season_id, name, abbreviation, source_name, source_team_id, wins, losses, ties) VALUES (${teamId}, ${seasonId}, ${sqlStr(
        parsedTeam.name,
      )}, ${sqlStr(parsedTeam.abbreviation)}, ${sqlStr(parsedTeam.sourceName)}, ${sqlStr(team.teamId)}, ${sqlNum(record.wins)}, ${sqlNum(record.losses)}, ${sqlNum(
        record.ties,
      )});`,
    );

    const batting = parseStatTable(findTable(team.tables, "BATTERS"), BATTING, "BATTERS");
    const pitching = parseStatTable(findTable(team.tables, "PITCHERS"), PITCHING, "PITCHERS");

    for (const playerName of new Set([...batting.keys(), ...pitching.keys()])) {
      const stats = { ...(batting.get(playerName) ?? {}), ...(pitching.get(playerName) ?? {}) };
      const values = statColumns.map((column) => sqlNum(stats[column] ?? null));
      const columnSql = statColumns
        .map((column) => column.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`))
        .join(", ");

      lines.push(
        `INSERT INTO historical_player_stats (season_id, historical_team_id, player_name, ${columnSql}) VALUES (${seasonId}, ${teamId}, ${sqlStr(
          playerName,
        )}, ${values.join(", ")});`,
      );
      statRows += 1;
    }
  }
  lines.push("");
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join("\n"), "utf8");

console.log(
  `Wrote ${outputPath}\n  seasons: ${seasonId}\n  team-seasons: ${teamId}\n  player stat rows: ${statRows}`,
);
