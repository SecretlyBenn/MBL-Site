/**
 * Converts the scraped MyStatsOnline archive into a SQL seed file for the
 * historical_* tables.
 *
 *   node scripts/import-mso.mjs <team-mode.json> <roster-mode.json> [out.sql]
 *
 * Two inputs, because the source site splits the data across two views:
 *   team-mode.json   - scraped with "Team full season/series stats" selected.
 *                      Authoritative for player stats: it includes players who
 *                      left the team mid-season, and credits each player only
 *                      for what they did WITH THAT TEAM. A player who changed
 *                      teams mid-season therefore appears once per team, which
 *                      is what we want.
 *   roster-mode.json - the older default-view scrape, kept solely for its
 *                      season standings tables (W/L), which the team pages
 *                      don't carry.
 *
 * The generated SQL deletes and repopulates the historical tables only - it
 * never touches the live league tables.
 */
import fs from "node:fs";
import path from "node:path";

const teamModePath = process.argv[2];
const rosterModePath = process.argv[3];
const outputPath = process.argv[4] ?? path.join("drizzle", "seed-historical.sql");

if (!teamModePath || !rosterModePath) {
  console.error(
    "usage: node scripts/import-mso.mjs <team-mode.json> <roster-mode.json> [out.sql]",
  );
  process.exit(1);
}

/**
 * Same human behind two different accounts; their lines are merged under the
 * later name so career totals aren't split in half.
 */
const PLAYER_ALIASES = {
  OrganTrafficking: "squidsseesghosts",
  "True North": "truenorth_gaming",
};

const canonicalPlayer = (name) => PLAYER_ALIASES[name] ?? name;

/**
 * The team-mode scrape is a flat list of team-seasons; reshape it into the
 * per-season structure below, borrowing standings from the roster-mode file.
 */
function buildRaw() {
  const teamMode = JSON.parse(fs.readFileSync(teamModePath, "utf8"));
  const rosterMode = JSON.parse(fs.readFileSync(rosterModePath, "utf8"));

  const standingsBySeason = new Map(
    rosterMode.seasons.map((season) => [season.name, season.standingsTables ?? []]),
  );
  // Preserve the source's newest-first season ordering.
  const order = rosterMode.seasons.map((season) => season.name);

  const bySeason = new Map();
  for (const record of teamMode.seasons) {
    if (!bySeason.has(record.seasonName)) {
      bySeason.set(record.seasonName, {
        name: record.seasonName,
        id: record.seasonId,
        standingsTables: standingsBySeason.get(record.seasonName) ?? [],
        teams: [],
      });
    }
    bySeason.get(record.seasonName).teams.push({
      teamName: record.teamName,
      teamId: record.teamId,
      tables: record.tables,
    });
  }

  const seasons = order
    .filter((name) => bySeason.has(name))
    .map((name) => bySeason.get(name));
  for (const [name, season] of bySeason) {
    if (!order.includes(name)) seasons.push(season);
  }

  // The roster-mode view lists each player under the team they were on when
  // the season closed, which is the only ordering signal in the export.
  const seasonEndTeam = new Map();
  for (const season of rosterMode.seasons) {
    for (const team of season.teams ?? []) {
      for (const label of ["BATTERS", "PITCHERS"]) {
        const table = (team.tables ?? []).find(
          (rows) => rows.length > 1 && rows[0].some((cell) => cell === label),
        );
        if (!table) continue;
        const nameIndex = table[0].indexOf(label);
        if (nameIndex === -1) continue;
        for (const row of table.slice(1)) {
          const player = (row[nameIndex] ?? "").trim();
          if (!player || /^totals?$/i.test(player)) continue;
          seasonEndTeam.set(`${season.name}::${player}`, team.teamName);
        }
      }
    }
  }

  return { seasons, seasonEndTeam };
}

const raw = buildRaw();

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
  "1B": "singles",
  TPA: "plateAppearances",
  CS: "caughtStealing",
  SF: "sacFlies",
  LOB: "leftOnBase",
  // Fielding shares the batting table in the source.
  PO: "putouts",
  E: "errors",
  FPCT: "fieldingPct",
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
  CG: "completeGames",
  SHO: "shutouts",
  BS: "blownSaves",
  PC: "pitchCount",
  "BB/X": "walksPerGame",
  "SO/X": "strikeoutsPerGame",
};

const REAL_COLUMNS = new Set([
  "battingAverage",
  "onBasePct",
  "sluggingPct",
  "ops",
  "inningsPitched",
  "era",
  "whip",
  "fieldingPct",
  "walksPerGame",
  "strikeoutsPerGame",
]);

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
 * a plain float understates every fractional outing and corrupts anything
 * derived from it.
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

/**
 * The source's pitching table has no walks column - only WHIP, which is
 * (hits + walks) / innings. Invert it to recover the walk count.
 */
function deriveWalksAllowed({ whip, inningsPitched, hitsAllowed }) {
  if (whip === null || inningsPitched === null || hitsAllowed === null) return null;
  if (inningsPitched <= 0) return null;
  const walks = Math.round(whip * inningsPitched - hitsAllowed);
  return walks >= 0 ? walks : null;
}

/**
 * Games played and games started weren't tracked reliably in the league's
 * first two recorded seasons; the source shows placeholder values that would
 * read as real counts.
 */
const SEASONS_WITHOUT_GAME_COUNTS = new Set(["MBL Season IV", "MBL Season V"]);

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
  Expos: "Toronto Expos",
  Otters: "Hershey Otters",
  Blizzards: "Colorado Blizzards",
  Thunderbirds: "Arizona Thunderbirds",
  Jazz: "Utah Jazz",
  Piranhas: "Tijuana Piranhas",
  Beacons: "Baltimore Beacons",
  Wildcats: "Boston Wildcats",
  Pistons: "Pittsburgh Pistons",
  Aces: "San Antonio Aces",
  Wolves: "Texas Wolves",
  Boom: "Miami Boom",
  Surf: "Atlantic City Surf",
  Penguins: "Portland Penguins",
  Villagers: "Desert Valley Villagers",
  Nimbis: "Vancouver Nimbis",
  Parrots: "Toronto Blue Parrots",
  Alpacas: "Los Angeles Alpacas",
  Evokers: "Electro Valley Evokers",
  Crusaders: "Chicago Crusaders",
  Sabertooths: "San Diego Saber Tooths",
  Embers: "St. Augustine Embers",
  Flamingos: "New Orleans Flamingo",
  Aviators: "Colorado Aviators",
  Dolphins: "Golden State Dolphins",
  Gothams: "New York Gothams",
  Hurricanes: "Houston Hurricanes",
  Riptide: "Florida Riptide",
  Mafia: "Miami Mafia",
  Platypi: "Kansas City Platypi",
};

const LEGACY_NICKNAMES = [
  ...Object.keys(FRANCHISE_NAMES),
  "Thunderbirds", "Sabertooths", "Hurricanes", "Villagers", "Piranhas",
  "Crusaders", "Wildcats", "Flamingos", "Aviators", "Platypi", "Penguins",
  "Pistons", "Gothams", "Beacons", "Dolphins", "Alpacas", "Evokers",
  "Riptide", "Parrots", "Embers", "Wolves", "Nimbis", "Mafia", "Boom",
  "Aces", "Surf",
].sort((a, b) => b.length - a.length);

/**
 * The source's own prefixes are inconsistent across seasons - the same
 * franchise appears as TW, TX, TX4 and TXW - and several don't correspond to
 * the team name at all. These are the league's canonical abbreviations, keyed
 * by nickname so every season of a franchise gets the same one. Nicknames not
 * listed here keep whatever prefix the source used.
 */
const CANONICAL_ABBREVIATIONS = {
  Grizzlies: "CFG", Surf: "ACS", Villagers: "DVV", Hurricanes: "HH",
  Wildcats: "BW", Gothams: "NYG", Piranhas: "TP", Wolves: "TXW",
  Voodoo: "LAV", Embers: "SAE", Boom: "MB", Mafia: "MM",
  Platypi: "KCP", Pistons: "PIP", Otters: "HEO", Knights: "CNK",
  Sunset: "MS", Expos: "TEX", Jazz: "UTJ", Blizzards: "CBL",
  Panthers: "PHP",
};

/** Splits the source's three-character prefix from the actual franchise name. */
function parseTeamName(sourceName) {
  const source = String(sourceName ?? "").trim();
  const withoutSeason = source.replace(/\s+S\d+$/i, "").trim();
  const nickname = LEGACY_NICKNAMES.find((candidate) => withoutSeason.endsWith(candidate)) ?? withoutSeason.slice(3);
  const sourceAbbreviation = withoutSeason.slice(0, -nickname.length).toUpperCase() || null;
  return {
    abbreviation: CANONICAL_ABBREVIATIONS[nickname] ?? sourceAbbreviation,
    nickname,
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

/**
 * Pulls W/L records out of the season's standings tables.
 *
 * The source renders exactly two tables per season, one per league, in a fixed
 * order: the first is the American League, the second the National. The league
 * name itself is a heading outside the table, so it isn't in the scrape - the
 * position is the only signal we have.
 */
const LEAGUE_BY_TABLE_INDEX = ["AMERICAN", "NATIONAL"];

function parseStandings(standingsTables) {
  const records = new Map();
  const tables = standingsTables ?? [];
  for (const [tableIndex, table] of tables.entries()) {
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
      const rsIndex = header.indexOf("RS");
      const raIndex = header.indexOf("RA");
      records.set(name, {
        wins: winIndex === -1 ? null : num(row[winIndex]),
        losses: lossIndex === -1 ? null : num(row[lossIndex]),
        ties: tieIndex === -1 ? null : num(row[tieIndex]),
        league: LEAGUE_BY_TABLE_INDEX[tableIndex] ?? null,
        runsScored: rsIndex === -1 ? null : num(row[rsIndex]),
        runsAllowed: raIndex === -1 ? null : num(row[raIndex]),
      });
    }
  }
  return records;
}

const statColumns = [
  ...new Set([...Object.values(BATTING), ...Object.values(PITCHING)]),
];

/**
 * Games the source records wrongly, corrected here rather than by editing the
 * database by hand - a re-import rebuilds historical_games from scratch and
 * would silently undo any manual fix.
 *
 * A forfeit is stored as 1-0 with no box score, which is how the rest of the
 * site recognises one. Dropped rows are fixtures the source lists that were
 * never played and never will be.
 */
const DROP_GAME = Symbol("drop");
const GAME_CORRECTIONS = [
  // Never played; the source leaves them on the schedule indefinitely.
  { season: "MBL Season X", date: /June 8/, away: "Grizzlies", home: "Otters", unplayedOnly: true, fix: DROP_GAME },
  { season: "MBL Season X", date: /August 25/, away: "Dolphins", home: "Grizzlies", fix: DROP_GAME },
  { season: "MBL Season VII", date: /November 30/, away: "Alpacas", home: "Villagers", unplayedOnly: true, fix: DROP_GAME },
  { season: "MBL Season VII", date: /December 16/, away: "Wolves", home: "Alpacas", unplayedOnly: true, fix: DROP_GAME },
  // Played, then wiped when the game was forfeited.
  { season: "MBL Season X", date: /June 24/, away: "Otters", home: "Grizzlies", fix: { awayScore: "0", homeScore: "1" } },
];

/**
 * The Jul 14 Grizzlies-Pistons forfeit is absent from the source altogether:
 * it was played, then removed when the forfeit wiped its stats.
 */
const MISSING_GAMES = [
  {
    season: "MBL Season X",
    date: "Sunday July 14, 2024",
    away: "Grizzlies",
    home: "Pistons",
    awayScore: "1",
    homeScore: "0",
  },
];

function correctionFor(seasonName, game) {
  const match = GAME_CORRECTIONS.find(
    (rule) =>
      rule.season === seasonName &&
      rule.date.test(game.date ?? "") &&
      nicknameOf(game.away) === nicknameOf(rule.away) &&
      nicknameOf(game.home) === nicknameOf(rule.home) &&
      // Some corrections target only the unplayed duplicate of a fixture that
      // also has a real, completed meeting on the same matchup.
      (!rule.unplayedOnly || num(game.awayScore) === null),
  );
  return match?.fix ?? null;
}

/**
 * Optional third input: the schedule scrape. Its team cells are bare nicknames
 * ("Wolves", "Wolves S4") rather than the prefixed names used elsewhere, so
 * games are matched back to teams by nickname within the same season.
 */
const schedulePath = process.argv[5];
const gameIdsPath = process.argv[6];
const schedule = schedulePath
  ? JSON.parse(fs.readFileSync(schedulePath, "utf8"))
  : { seasons: [] };

const scheduleBySeason = new Map(
  schedule.seasons.map((season) => [season.seasonName, season.games ?? []]),
);

// Positional game ids from the same schedule pages, so per-game stats can be
// attached later without depending on row ordering.
const gameIds = gameIdsPath ? JSON.parse(fs.readFileSync(gameIdsPath, "utf8")) : { seasons: [] };
const gameIdsBySeason = new Map(gameIds.seasons.map((s) => [s.seasonName, s.gameIds ?? []]));

const nicknameOf = (value) =>
  String(value ?? "").replace(/\s+S\d+$/i, "").trim().toLowerCase();

const lines = [
  "-- Generated by scripts/import-mso.mjs - do not edit by hand.",
  "-- Historical archive only; live league tables are untouched.",
  "DELETE FROM historical_games;",
  "DELETE FROM historical_roster_entries;",
  "DELETE FROM historical_player_stats;",
  "DELETE FROM historical_teams;",
  "DELETE FROM historical_seasons;",
  "",
];

/** Averages/rates - summing these across merged rows would be meaningless. */
const RATE_COLUMNS = new Set([
  "battingAverage", "onBasePct", "sluggingPct", "ops", "era", "whip",
]);

let seasonId = 0;
let teamId = 0;
let statRows = 0;
let aliasMerges = 0;
let unassignedLeague = 0;
let rosterRows = 0;
let gameRows = 0;
const unmatchedGames = [];
let derivedWalks = 0;
let seasonEndFlags = 0;

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
  // Nickname -> historical_teams.id, so the schedule can be joined to teams.
  const teamIdByNickname = new Map();

  for (const team of season.teams ?? []) {
    teamId += 1;
    teamIdByNickname.set(nicknameOf(parseTeamName(team.teamName).nickname), teamId);
    const record = records.get(team.teamName) ?? {
      wins: null, losses: null, ties: null, league: null, runsScored: null, runsAllowed: null,
    };
    const parsedTeam = parseTeamName(team.teamName);
    if (!record.league) unassignedLeague += 1;

    lines.push(
      `INSERT INTO historical_teams (id, season_id, name, abbreviation, source_name, source_team_id, league, wins, losses, ties, runs_scored, runs_allowed) VALUES (${teamId}, ${seasonId}, ${sqlStr(
        parsedTeam.name,
      )}, ${sqlStr(parsedTeam.abbreviation)}, ${sqlStr(parsedTeam.sourceName)}, ${sqlStr(team.teamId)}, ${sqlStr(record.league)}, ${sqlNum(record.wins)}, ${sqlNum(record.losses)}, ${sqlNum(
        record.ties,
      )}, ${sqlNum(record.runsScored)}, ${sqlNum(record.runsAllowed)});`,
    );

    const batting = parseStatTable(findTable(team.tables, "BATTERS"), BATTING, "BATTERS");
    const pitching = parseStatTable(findTable(team.tables, "PITCHERS"), PITCHING, "PITCHERS");

    // IP needs the untouched cell text, since parseStatTable already coerced it
    // to a float and lost the baseball-notation meaning of the decimal.
    const rawInnings = new Map();
    const pitchingTable = findTable(team.tables, "PITCHERS");
    if (pitchingTable) {
      const nameIndex = pitchingTable[0].indexOf("PITCHERS");
      const ipIndex = pitchingTable[0].indexOf("IP");
      if (nameIndex !== -1 && ipIndex !== -1) {
        for (const row of pitchingTable.slice(1)) {
          const name = (row[nameIndex] ?? "").trim();
          if (name && !/^totals?$/i.test(name)) rawInnings.set(name, row[ipIndex]);
        }
      }
    }

    // Merge aliased accounts, so one person on one team in one season stays a
    // single row even if the source listed them under two names.
    const merged = new Map();
    for (const sourceName of new Set([...batting.keys(), ...pitching.keys()])) {
      const stats = { ...(batting.get(sourceName) ?? {}), ...(pitching.get(sourceName) ?? {}) };

      stats.inningsPitched = parseInnings(rawInnings.get(sourceName));
      stats.walksAllowed = deriveWalksAllowed(stats);
      if (stats.walksAllowed !== null) derivedWalks += 1;

      if (SEASONS_WITHOUT_GAME_COUNTS.has(season.name)) {
        stats.games = null;
        stats.pitchingGames = null;
        stats.gamesStarted = null;
      }

      const name = canonicalPlayer(sourceName);
      if (!merged.has(name)) {
        merged.set(name, stats);
        continue;
      }
      const existing = merged.get(name);
      for (const [column, value] of Object.entries(stats)) {
        if (value === null || value === undefined) continue;
        // Rates can't be summed; recomputing them from merged counts is out of
        // scope here, so keep whichever line already had one.
        if (RATE_COLUMNS.has(column)) {
          existing[column] = existing[column] ?? value;
        } else {
          existing[column] = (existing[column] ?? 0) + value;
        }
      }
      aliasMerges += 1;
    }

    // The listed roster lives in its own table, keyed by a "Players" header.
    const rosterTable = findTable(team.tables, "Players");
    if (rosterTable) {
      const header = rosterTable[0];
      const nameIndex = header.indexOf("Players");
      const numberIndex = header.indexOf("Number");
      const positionIndex = header.indexOf("Positions");
      for (const row of rosterTable.slice(1)) {
        const sourceName = (row[nameIndex] ?? "").trim();
        if (!sourceName || /^totals?$/i.test(sourceName)) continue;
        const jersey = numberIndex === -1 ? "" : (row[numberIndex] ?? "").trim();
        const positions = positionIndex === -1 ? "" : (row[positionIndex] ?? "").trim();
        lines.push(
          `INSERT INTO historical_roster_entries (season_id, historical_team_id, player_name, jersey_number, positions) VALUES (${seasonId}, ${teamId}, ${sqlStr(
            canonicalPlayer(sourceName),
          )}, ${sqlStr(jersey || null)}, ${sqlStr(positions || null)});`,
        );
        rosterRows += 1;
      }
    }

    for (const [playerName, stats] of merged) {
      const values = statColumns.map((column) => sqlNum(stats[column] ?? null));
      const columnSql = statColumns
        .map((column) => column.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`))
        .join(", ");

      // Alias-merged players are keyed in the roster view under either name.
      const endedHere = [playerName, ...Object.keys(PLAYER_ALIASES).filter(
        (alias) => PLAYER_ALIASES[alias] === playerName,
      )].some((name) => raw.seasonEndTeam.get(`${season.name}::${name}`) === team.teamName);
      if (endedHere) seasonEndFlags += 1;

      lines.push(
        `INSERT INTO historical_player_stats (season_id, historical_team_id, player_name, is_season_end_team, ${columnSql}) VALUES (${seasonId}, ${teamId}, ${sqlStr(
          playerName,
        )}, ${endedHere ? 1 : 0}, ${values.join(", ")});`,
      );
      statRows += 1;
    }
  }
  // Seasons IV and V are excluded from schedule/scores entirely - their
  // per-game records aren't reliable enough to publish.
  const seasonGames = SEASONS_WITHOUT_GAME_COUNTS.has(season.name)
    ? []
    : scheduleBySeason.get(season.name) ?? [];

  for (const [index, game] of seasonGames.entries()) {
    const awayId = teamIdByNickname.get(nicknameOf(game.away)) ?? null;
    const homeId = teamIdByNickname.get(nicknameOf(game.home)) ?? null;
    if (awayId === null || homeId === null) {
      unmatchedGames.push(`${season.name}: ${game.away} @ ${game.home}`);
      continue;
    }
    const correction = correctionFor(season.name, game);
    if (correction === DROP_GAME) continue;
    if (correction) Object.assign(game, correction);
    lines.push(
      `INSERT INTO historical_games (season_id, source_game_id, played_on, start_time, away_team_id, home_team_id, away_score, home_score, note, sort_order) VALUES (${seasonId}, ${sqlStr(
        (gameIdsBySeason.get(season.name) ?? [])[index] ?? null,
      )}, ${sqlStr(
        game.date,
      )}, ${sqlStr(game.time || null)}, ${awayId}, ${homeId}, ${sqlNum(num(game.awayScore))}, ${sqlNum(
        num(game.homeScore),
      )}, ${sqlStr(game.note || null)}, ${index});`,
    );
    gameRows += 1;
  }

  // Games the source omits entirely. They sort after the scraped fixtures for
  // the season, which only affects ordering within their own date.
  for (const [offset, game] of MISSING_GAMES.filter((row) => row.season === season.name).entries()) {
    const awayId = teamIdByNickname.get(nicknameOf(game.away)) ?? null;
    const homeId = teamIdByNickname.get(nicknameOf(game.home)) ?? null;
    if (awayId === null || homeId === null) {
      unmatchedGames.push(`${season.name} (missing-game): ${game.away} @ ${game.home}`);
      continue;
    }
    lines.push(
      `INSERT INTO historical_games (season_id, source_game_id, played_on, start_time, away_team_id, home_team_id, away_score, home_score, note, sort_order) VALUES (${seasonId}, NULL, ${sqlStr(
        game.date,
      )}, NULL, ${awayId}, ${homeId}, ${sqlNum(num(game.awayScore))}, ${sqlNum(
        num(game.homeScore),
      )}, NULL, ${seasonGames.length + offset});`,
    );
    gameRows += 1;
  }

  lines.push("");
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join("\n"), "utf8");

console.log(
  `Wrote ${outputPath}\n  seasons: ${seasonId}\n  team-seasons: ${teamId}\n` +
    `  player stat rows: ${statRows}\n  alias merges applied: ${aliasMerges}`,
);
