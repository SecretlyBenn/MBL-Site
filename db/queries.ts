import { and, asc, desc, eq, getTableColumns, isNotNull, like, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { getDb } from "./index";
import { playedOnValue } from "@/app/formatStats";
import { earnedRunAverage } from "@/app/scoring";
import {
  games,
  historicalGameStats,
  historicalGames,
  historicalLineScores,
  historicalPlayerStats,
  historicalRosterEntries,
  historicalSeasons,
  historicalTeams,
  players,
  fieldingChanges,
  scorecardLines,
  scorecardLineups,
  scorecards,
  teams,
  minecraftProfiles,
} from "./schema";

export type StandingsRow = {
  teamId: number;
  name: string;
  abbreviation: string;
  color: string | null;
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
  gamesPlayed: number;
  winPct: number;
  gamesBack: number;
};

/**
 * Standings computed from FINAL games only. Ties aren't possible in baseball,
 * so a game with equal scores is treated as not yet decided and skipped.
 */
export async function getStandings(): Promise<StandingsRow[]> {
  const db = getDb();
  const [allTeams, finalGames] = await Promise.all([
    db.select().from(teams),
    db.select().from(games).where(eq(games.status, "FINAL")),
  ]);

  const rows = new Map<number, StandingsRow>(
    allTeams.map((team) => [
      team.id,
      {
        teamId: team.id,
        name: team.name,
        abbreviation: team.abbreviation,
        color: team.color,
        wins: 0,
        losses: 0,
        runsScored: 0,
        runsAllowed: 0,
        gamesPlayed: 0,
        winPct: 0,
        gamesBack: 0,
      },
    ]),
  );

  for (const game of finalGames) {
    const home = rows.get(game.homeTeamId);
    const away = rows.get(game.awayTeamId);
    if (!home || !away) continue;
    if (game.homeScore === null || game.awayScore === null) continue;
    if (game.homeScore === game.awayScore) continue;

    home.gamesPlayed += 1;
    away.gamesPlayed += 1;
    home.runsScored += game.homeScore;
    home.runsAllowed += game.awayScore;
    away.runsScored += game.awayScore;
    away.runsAllowed += game.homeScore;

    if (game.homeScore > game.awayScore) {
      home.wins += 1;
      away.losses += 1;
    } else {
      away.wins += 1;
      home.losses += 1;
    }
  }

  const standings = [...rows.values()].map((row) => ({
    ...row,
    winPct: row.gamesPlayed === 0 ? 0 : row.wins / row.gamesPlayed,
  }));

  standings.sort((a, b) => b.winPct - a.winPct || b.wins - a.wins || a.losses - b.losses);

  const leader = standings[0];
  if (leader) {
    for (const row of standings) {
      row.gamesBack = ((leader.wins - row.wins) + (row.losses - leader.losses)) / 2;
    }
  }

  return standings;
}

export async function getScheduleWithTeams() {
  const db = getDb();
  const [allGames, allTeams] = await Promise.all([
    db.select().from(games).orderBy(games.scheduledAt),
    db.select().from(teams),
  ]);
  const teamById = new Map(allTeams.map((team) => [team.id, team]));

  return allGames.map((game) => ({
    ...game,
    homeTeam: teamById.get(game.homeTeamId) ?? null,
    awayTeam: teamById.get(game.awayTeamId) ?? null,
  }));
}

export type CareerBatting = {
  atBats: number;
  hits: number;
  runs: number;
  rbis: number;
  homeRuns: number;
  walks: number;
  strikeouts: number;
  average: number;
};

/**
 * Live career batting/pitching totals for one player. Only APPROVED scorecards
 * count - pending or returned submissions must never reach public stats.
 */
export async function getPlayerLiveStats(playerId: number) {
  const db = getDb();
  const rows = await db
    .select({
      atBats: scorecardLines.atBats,
      hits: scorecardLines.hits,
      runs: scorecardLines.runs,
      rbis: scorecardLines.rbis,
      homeRuns: scorecardLines.homeRuns,
      walks: scorecardLines.walks,
      strikeouts: scorecardLines.strikeouts,
      inningsPitched: scorecardLines.inningsPitched,
      earnedRuns: scorecardLines.earnedRuns,
      strikeoutsPitched: scorecardLines.strikeoutsPitched,
      walksAllowed: scorecardLines.walksAllowed,
    })
    .from(scorecardLines)
    .innerJoin(scorecards, eq(scorecardLines.scorecardId, scorecards.id))
    .where(and(eq(scorecardLines.playerId, playerId), eq(scorecards.status, "APPROVED")));

  const totals = rows.reduce(
    (acc, row) => ({
      atBats: acc.atBats + row.atBats,
      hits: acc.hits + row.hits,
      runs: acc.runs + row.runs,
      rbis: acc.rbis + row.rbis,
      homeRuns: acc.homeRuns + row.homeRuns,
      walks: acc.walks + row.walks,
      strikeouts: acc.strikeouts + row.strikeouts,
      inningsPitched: acc.inningsPitched + row.inningsPitched,
      earnedRuns: acc.earnedRuns + row.earnedRuns,
      strikeoutsPitched: acc.strikeoutsPitched + row.strikeoutsPitched,
      walksAllowed: acc.walksAllowed + row.walksAllowed,
    }),
    {
      atBats: 0,
      hits: 0,
      runs: 0,
      rbis: 0,
      homeRuns: 0,
      walks: 0,
      strikeouts: 0,
      inningsPitched: 0,
      earnedRuns: 0,
      strikeoutsPitched: 0,
      walksAllowed: 0,
    },
  );

  return {
    ...totals,
    gamesLogged: rows.length,
    average: totals.atBats === 0 ? 0 : totals.hits / totals.atBats,
    era: earnedRunAverage(totals.earnedRuns, totals.inningsPitched) ?? 0,
  };
}

/** Historical (imported) season lines for a player, newest season first. */
export async function getPlayerHistoricalStats(playerName: string) {
  const db = getDb();
  const rows = await db
    .select({
      historicalTeamId: historicalTeams.id,
      seasonId: historicalSeasons.id,
      seasonName: historicalSeasons.name,
      sortOrder: historicalSeasons.sortOrder,
      teamName: historicalTeams.name,
      isSeasonEndTeam: historicalPlayerStats.isSeasonEndTeam,
      games: historicalPlayerStats.games,
      atBats: historicalPlayerStats.atBats,
      runs: historicalPlayerStats.runs,
      hits: historicalPlayerStats.hits,
      doubles: historicalPlayerStats.doubles,
      triples: historicalPlayerStats.triples,
      homeRuns: historicalPlayerStats.homeRuns,
      rbis: historicalPlayerStats.rbis,
      walks: historicalPlayerStats.walks,
      strikeouts: historicalPlayerStats.strikeouts,
      stolenBases: historicalPlayerStats.stolenBases,
      battingAverage: historicalPlayerStats.battingAverage,
      onBasePct: historicalPlayerStats.onBasePct,
      sluggingPct: historicalPlayerStats.sluggingPct,
      ops: historicalPlayerStats.ops,
      totalBases: historicalPlayerStats.totalBases,
      pitchingGames: historicalPlayerStats.pitchingGames,
      gamesStarted: historicalPlayerStats.gamesStarted,
      saves: historicalPlayerStats.saves,
      inningsPitched: historicalPlayerStats.inningsPitched,
      hitsAllowed: historicalPlayerStats.hitsAllowed,
      runsAllowed: historicalPlayerStats.runsAllowed,
      earnedRuns: historicalPlayerStats.earnedRuns,
      homeRunsAllowed: historicalPlayerStats.homeRunsAllowed,
      walksAllowed: historicalPlayerStats.walksAllowed,
      era: historicalPlayerStats.era,
      whip: historicalPlayerStats.whip,
      strikeoutsPitched: historicalPlayerStats.strikeoutsPitched,
      wins: historicalPlayerStats.wins,
      losses: historicalPlayerStats.losses,
    })
    .from(historicalPlayerStats)
    .innerJoin(historicalSeasons, eq(historicalPlayerStats.seasonId, historicalSeasons.id))
    .innerJoin(
      historicalTeams,
      eq(historicalPlayerStats.historicalTeamId, historicalTeams.id),
    )
    .where(eq(historicalPlayerStats.playerName, playerName))
    .orderBy(desc(historicalSeasons.sortOrder));

  // The archive's stored ERA was worked out over nine innings, which is not
  // the length of a game in this league. Recomputing from the earned runs and
  // the innings - which are just counts, and are right either way - keeps
  // every ERA on the site on the same footing instead of leaving the imported
  // seasons a third higher than the ones scored here.
  return rows.map((row) => ({
    ...row,
    era: earnedRunAverage(row.earnedRuns, row.inningsPitched),
  }));
}

export async function getHistoricalSeasons() {
  const db = getDb();
  return db.select().from(historicalSeasons).orderBy(desc(historicalSeasons.sortOrder));
}

export async function searchHistoricalPlayers(query: string, page = 1, pageSize = 20) {
  const db = getDb();
  const normalized = query.trim();
  const where = normalized
    ? like(historicalPlayerStats.playerName, `%${normalized}%`)
    : undefined;
  const safePage = Math.max(1, page);
  const [rows, totals] = await Promise.all([
    db
      .select({
        playerName: historicalPlayerStats.playerName,
        seasons: sql<number>`count(distinct ${historicalPlayerStats.seasonId})`.as("seasons"),
      })
      .from(historicalPlayerStats)
      .where(where)
      .groupBy(historicalPlayerStats.playerName)
      .orderBy(asc(historicalPlayerStats.playerName))
      .limit(pageSize)
      .offset((safePage - 1) * pageSize),
    db
      .select({ total: sql<number>`count(distinct ${historicalPlayerStats.playerName})`.as("total") })
      .from(historicalPlayerStats)
      .where(where),
  ]);
  return { rows, total: Number(totals[0]?.total ?? 0), page: safePage, pageSize };
}

export async function getHistoricalSeasonStandings(seasonId: number) {
  const db = getDb();
  return db
    .select()
    .from(historicalTeams)
    .where(eq(historicalTeams.seasonId, seasonId))
    .orderBy(desc(historicalTeams.wins));
}

/**
 * A team's roster for one season, paired with each player's stat line for that
 * team. Roster entries and stat lines are separate sources: someone can be
 * listed without appearing in a game, or record stats after being added late,
 * so this unions both rather than joining one onto the other.
 */
export async function getHistoricalTeamRoster(historicalTeamId: number) {
  const db = getDb();
  const [listed, statLines] = await Promise.all([
    db
      .select({
        playerName: historicalRosterEntries.playerName,
        jerseyNumber: historicalRosterEntries.jerseyNumber,
        positions: historicalRosterEntries.positions,
      })
      .from(historicalRosterEntries)
      .where(eq(historicalRosterEntries.historicalTeamId, historicalTeamId)),
    db
      .select({
        playerName: historicalPlayerStats.playerName,
        games: historicalPlayerStats.games,
        atBats: historicalPlayerStats.atBats,
        hits: historicalPlayerStats.hits,
        homeRuns: historicalPlayerStats.homeRuns,
        rbis: historicalPlayerStats.rbis,
        battingAverage: historicalPlayerStats.battingAverage,
        ops: historicalPlayerStats.ops,
        inningsPitched: historicalPlayerStats.inningsPitched,
        strikeoutsPitched: historicalPlayerStats.strikeoutsPitched,
        // Selected so the ERA can be worked out over a six-inning game rather
        // than taken from the archive, which recorded it over nine.
        earnedRuns: historicalPlayerStats.earnedRuns,
        era: historicalPlayerStats.era,
        whip: historicalPlayerStats.whip,
      })
      .from(historicalPlayerStats)
      .where(eq(historicalPlayerStats.historicalTeamId, historicalTeamId)),
  ]);

  const byName = new Map<string, Record<string, unknown>>();
  for (const entry of listed) byName.set(entry.playerName, { ...entry, played: false });
  for (const line of statLines) {
    byName.set(line.playerName, {
      ...(byName.get(line.playerName) ?? { jerseyNumber: null, positions: null }),
      ...line,
      era: earnedRunAverage(line.earnedRuns, line.inningsPitched),
      played: true,
    });
  }

  return [...byName.values()].sort((a, b) =>
    String(a.playerName).localeCompare(String(b.playerName), undefined, { sensitivity: "base" }),
  ) as Array<{
    playerName: string;
    jerseyNumber: string | null;
    positions: string | null;
    played: boolean;
    games: number | null;
    atBats: number | null;
    hits: number | null;
    homeRuns: number | null;
    rbis: number | null;
    battingAverage: number | null;
    ops: number | null;
    inningsPitched: number | null;
    strikeoutsPitched: number | null;
    era: number | null;
    whip: number | null;
  }>;
}

/**
 * Every archived game for a season, oldest first. Team names are resolved here
 * so callers don't have to join twice for home and away.
 */
export async function getHistoricalSchedule(seasonId: number, historicalTeamId?: number) {
  const db = getDb();
  const away = alias(historicalTeams, "away_team");
  const home = alias(historicalTeams, "home_team");

  const rows = await db
    .select({
      id: historicalGames.id,
      sourceGameId: historicalGames.sourceGameId,
      playedOn: historicalGames.playedOn,
      startTime: historicalGames.startTime,
      awayScore: historicalGames.awayScore,
      homeScore: historicalGames.homeScore,
      note: historicalGames.note,
      sortOrder: historicalGames.sortOrder,
      awayTeamId: historicalGames.awayTeamId,
      homeTeamId: historicalGames.homeTeamId,
      awayName: away.name,
      homeName: home.name,
      awayAbbr: away.abbreviation,
      homeAbbr: home.abbreviation,
    })
    .from(historicalGames)
    .leftJoin(away, eq(historicalGames.awayTeamId, away.id))
    .leftJoin(home, eq(historicalGames.homeTeamId, home.id))
    .where(eq(historicalGames.seasonId, seasonId))
    .orderBy(asc(historicalGames.sortOrder));

  const filtered =
    historicalTeamId === undefined
      ? rows
      : rows.filter(
          (row) => row.awayTeamId === historicalTeamId || row.homeTeamId === historicalTeamId,
        );

  // Attach line scores so the schedule can render a box score per game without
  // a query per row.
  const lineScores = await db
    .select({
      gameId: historicalLineScores.gameId,
      isHome: historicalLineScores.isHome,
      innings: historicalLineScores.innings,
      runs: historicalLineScores.runs,
      hits: historicalLineScores.hits,
      errors: historicalLineScores.errors,
    })
    .from(historicalLineScores)
    .innerJoin(historicalGames, eq(historicalLineScores.gameId, historicalGames.id))
    .where(eq(historicalGames.seasonId, seasonId));

  const byGame = new Map<number, typeof lineScores>();
  for (const row of lineScores) {
    const bucket = byGame.get(row.gameId) ?? [];
    bucket.push(row);
    byGame.set(row.gameId, bucket);
  }

  // Which games have a box score at all - the schedule needs this to tell a
  // forfeit apart from a genuine 1-0 game.
  const statted = await db
    .selectDistinct({ gameId: historicalGameStats.gameId })
    .from(historicalGameStats)
    .innerJoin(historicalGames, eq(historicalGameStats.gameId, historicalGames.id))
    .where(eq(historicalGames.seasonId, seasonId));
  const hasStats = new Set(statted.map((row) => row.gameId));

  return filtered.map((row) => ({
    ...row,
    hasStats: hasStats.has(row.id),
    away: byGame.get(row.id)?.find((line) => !line.isHome) ?? null,
    home: byGame.get(row.id)?.find((line) => line.isHome) ?? null,
  }));
}

/** Full detail for one archived game: teams, line score and both box scores. */
export async function getHistoricalGame(gameId: number) {
  const db = getDb();
  const away = alias(historicalTeams, "away_team");
  const home = alias(historicalTeams, "home_team");

  const [game] = await db
    .select({
      id: historicalGames.id,
      playedOn: historicalGames.playedOn,
      startTime: historicalGames.startTime,
      awayScore: historicalGames.awayScore,
      homeScore: historicalGames.homeScore,
      note: historicalGames.note,
      seasonId: historicalSeasons.id,
      seasonName: historicalSeasons.name,
      awayTeamId: historicalGames.awayTeamId,
      homeTeamId: historicalGames.homeTeamId,
      awayName: away.name,
      homeName: home.name,
    })
    .from(historicalGames)
    .innerJoin(historicalSeasons, eq(historicalGames.seasonId, historicalSeasons.id))
    .leftJoin(away, eq(historicalGames.awayTeamId, away.id))
    .leftJoin(home, eq(historicalGames.homeTeamId, home.id))
    .where(eq(historicalGames.id, gameId))
    .limit(1);

  if (!game) return null;

  const [lineScores, stats] = await Promise.all([
    db
      .select()
      .from(historicalLineScores)
      .where(eq(historicalLineScores.gameId, gameId))
      .orderBy(asc(historicalLineScores.isHome)),
    db
      .select()
      .from(historicalGameStats)
      .where(eq(historicalGameStats.gameId, gameId))
      .orderBy(asc(historicalGameStats.id)),
  ]);

  return { game, lineScores, stats };
}

export async function getHistoricalSeason(seasonId: number) {
  const db = getDb();
  return db.query.historicalSeasons.findFirst({
    where: eq(historicalSeasons.id, seasonId),
  });
}

/** All player stat lines for one archived season, with their team name. */
export async function getHistoricalSeasonPlayerStats(seasonId: number) {
  const db = getDb();
  return db
    // Every stored column, rather than a hand-kept list: a column left out here
    // reads as blank on the season pages instead of failing, so the list drifts
    // silently as the schema grows.
    .select({
      ...getTableColumns(historicalPlayerStats),
      teamName: historicalTeams.name,
    })
    .from(historicalPlayerStats)
    .innerJoin(
      historicalTeams,
      eq(historicalPlayerStats.historicalTeamId, historicalTeams.id),
    )
    .where(eq(historicalPlayerStats.seasonId, seasonId));
}

/**
 * A stored stat line with its team name and where its season falls in league
 * history. Derived from the table so every column comes along automatically -
 * a column missing from a hand-kept list shows up as a blank in the merged
 * tables rather than as an error, so the list is not hand-kept.
 */
export type HistoricalStatViewRow = typeof historicalPlayerStats.$inferSelect & {
  teamName: string;
  /**
   * Season ordering. Not the same as `seasonId` - the archive was imported
   * oldest-first under one numbering and the current season carries id 1, so
   * "most recent" has to come from here.
   */
  seasonSort: number | null;
};

async function getHistoricalStatLines(seasonId?: number): Promise<HistoricalStatViewRow[]> {
  const db = getDb();
  const query = db
    .select({
      ...getTableColumns(historicalPlayerStats),
      teamName: historicalTeams.name,
      seasonSort: historicalSeasons.sortOrder,
    })
    .from(historicalPlayerStats)
    .innerJoin(historicalTeams, eq(historicalPlayerStats.historicalTeamId, historicalTeams.id))
    .innerJoin(historicalSeasons, eq(historicalPlayerStats.seasonId, historicalSeasons.id));
  return seasonId === undefined ? query : query.where(eq(historicalPlayerStats.seasonId, seasonId));
}

/**
 * Every column that is a running total rather than a rate, so it can be summed
 * across a player's per-team lines. Rates (AVG, OBP, SLG, OPS, ERA, WHIP,
 * FPCT, BB/G, SO/G) are deliberately absent - they are recomputed from these
 * sums, because averaging an average weights a three-at-bat line the same as a
 * full season.
 *
 * A column missing from this list silently becomes blank in every merged
 * table, so it is kept in step with the schema rather than trimmed to whatever
 * a particular page happened to need.
 */
const COUNTING_STATS = [
  // Batting
  "games", "atBats", "runs", "hits", "doubles", "triples", "homeRuns", "rbis", "walks",
  "strikeouts", "stolenBases", "totalBases", "singles", "plateAppearances", "caughtStealing",
  "sacFlies", "leftOnBase", "hitByPitch", "putouts", "errors",
  // Pitching
  "pitchingGames", "gamesStarted", "wins", "losses", "saves", "inningsPitched", "hitsAllowed",
  "runsAllowed", "earnedRuns", "homeRunsAllowed", "strikeoutsPitched", "walksAllowed",
  "completeGames", "shutouts", "blownSaves",
] as const;

/**
 * The line from the latest season a player appears in, preferring the team
 * they finished that season with. Seasons are ordered by `seasonSort`, not by
 * id - the archive numbering does not run in chronological order.
 */
function mostRecentTeam(lines: HistoricalStatViewRow[]) {
  const latest = Math.max(...lines.map((line) => line.seasonSort ?? 0));
  const inLatest = lines.filter((line) => (line.seasonSort ?? 0) === latest);
  return inLatest.find((line) => line.isSeasonEndTeam) ?? inLatest[0];
}

/**
 * Collapses a player's per-team lines into one row. `teamNameFor` decides what
 * to show in the team column, which differs by context: a single season labels
 * the team they finished on, a career spanning several teams says so instead.
 */
function mergePlayerLines(
  lines: HistoricalStatViewRow[],
  teamNameFor: (lines: HistoricalStatViewRow[]) => string,
) {
  const merged = new Map<string, HistoricalStatViewRow & { lines: HistoricalStatViewRow[] }>();
  for (const line of lines) {
    let row = merged.get(line.playerName);
    if (!row) {
      row = { ...line, lines: [] };
      for (const field of TOTAL_FIELDS) row[field] = 0;
      merged.set(line.playerName, row);
    }
    row.lines.push(line);
    for (const field of TOTAL_FIELDS) {
      row[field] = (row[field] ?? 0) + (line[field] ?? 0);
    }
  }

  return [...merged.values()].map(({ lines: grouped, ...row }) =>
    recalculateRates({ ...row, teamName: teamNameFor(grouped) }),
  );
}

/** Merging per-team lines sums the same columns a season total does. */
const TOTAL_FIELDS = COUNTING_STATS;

function recalculateRates(row: HistoricalStatViewRow) {
  const atBats = row.atBats ?? 0;
  const hits = row.hits ?? 0;
  const walks = row.walks ?? 0;
  const innings = row.inningsPitched ?? 0;
  const hitByPitch = row.hitByPitch ?? 0;
  const sacFlies = row.sacFlies ?? 0;
  // Times up, for on-base percentage: everything that ended a turn at bat
  // apart from a sacrifice bunt, which by convention counts in neither half
  // of the fraction.
  const timesUp = atBats + walks + hitByPitch + sacFlies;
  const putouts = row.putouts ?? 0;
  const chances = putouts + (row.errors ?? 0);
  const pitchingGames = row.pitchingGames ?? 0;
  row.battingAverage = atBats ? hits / atBats : null;
  row.onBasePct = timesUp ? (hits + walks + hitByPitch) / timesUp : null;
  row.sluggingPct = atBats ? (row.totalBases ?? 0) / atBats : null;
  row.ops = row.onBasePct === null || row.sluggingPct === null ? null : row.onBasePct + row.sluggingPct;
  // No assists in this league, so a chance is a play made or a play muffed.
  row.fieldingPct = chances ? putouts / chances : null;
  row.era = earnedRunAverage(row.earnedRuns, innings);
  row.whip = innings ? ((row.walksAllowed ?? 0) + (row.hitsAllowed ?? 0)) / innings : null;
  row.walksPerGame = pitchingGames ? (row.walksAllowed ?? 0) / pitchingGames : null;
  row.strikeoutsPerGame = pitchingGames ? (row.strikeoutsPitched ?? 0) / pitchingGames : null;
  return row;
}

/**
 * One row per player, whether scoped to a season or spanning a career. A
 * mid-season trade produces one line per team in the source data; those are
 * merged here so a player never appears twice in the same table. The splits
 * remain available via getHistoricalPlayerStats for profile pages.
 */
export async function getIndividualHistoricalStats(seasonId?: number) {
  const lines = await getHistoricalStatLines(seasonId);

  if (seasonId !== undefined) {
    return mergePlayerLines(lines, (grouped) => {
      const endedWith = grouped.find((line) => line.isSeasonEndTeam) ?? grouped[0];
      return grouped.length === 1
        ? endedWith.teamName
        : `${endedWith.teamName} (+${grouped.length - 1})`;
    });
  }

  // Career totals show the team the player most recently played for, rather
  // than "Multiple teams" - the current club is what identifies someone at a
  // glance, and a career line covering four teams named none of them.
  return mergePlayerLines(lines, (grouped) => mostRecentTeam(grouped).teamName);
}

export type HistoricalTeamStatRow = HistoricalStatViewRow & { isLeagueAverage?: boolean };

export async function getHistoricalTeamStats(seasonId: number): Promise<HistoricalTeamStatRow[]> {
  const lines = await getHistoricalStatLines(seasonId);
  const teamsByName = new Map<string, HistoricalTeamStatRow>();
  for (const line of lines) {
    let row = teamsByName.get(line.teamName);
    if (!row) {
      row = { ...line, playerName: line.teamName };
      for (const field of TOTAL_FIELDS) row[field] = 0;
      teamsByName.set(line.teamName, row);
    }
    for (const field of TOTAL_FIELDS) row[field] = (row[field] ?? 0) + (line[field] ?? 0);
  }
  return [...teamsByName.values()].map(recalculateRates);
}

type SeasonStatLine = Awaited<ReturnType<typeof getHistoricalSeasonPlayerStats>>[number];


/**
 * Collapses a player's per-team lines into one season total.
 *
 * A player who changed teams mid-season has one row per team (that's how the
 * source records it, and the splits are preserved for profile pages). For
 * league-wide tables we want a single line: counting stats summed, rate stats
 * recomputed from those sums - never averaged, which would weight a 3-at-bat
 * stint the same as a 200-at-bat one - and the team shown is wherever they
 * finished the season.
 */
export function aggregateSeasonLines(rows: SeasonStatLine[]) {
  const byPlayer = new Map<string, SeasonStatLine[]>();
  for (const row of rows) {
    const existing = byPlayer.get(row.playerName);
    if (existing) existing.push(row);
    else byPlayer.set(row.playerName, [row]);
  }

  return [...byPlayer.entries()].map(([playerName, lines]) => {
    const sum = (key: (typeof COUNTING_STATS)[number]) =>
      lines.reduce((total, line) => total + Number(line[key] ?? 0), 0);
    const anyValue = (key: (typeof COUNTING_STATS)[number]) =>
      lines.some((line) => line[key] !== null && line[key] !== undefined);

    // Keyed by the stat list rather than `string`, so spreading these below
    // keeps every column visible to callers instead of collapsing to an index
    // signature.
    const totals = {} as Record<(typeof COUNTING_STATS)[number], number | null>;
    for (const key of COUNTING_STATS) totals[key] = anyValue(key) ? sum(key) : null;

    const atBats = totals.atBats ?? 0;
    const walks = totals.walks ?? 0;
    const innings = totals.inningsPitched ?? 0;

    const endedWith = lines.find((line) => line.isSeasonEndTeam) ?? lines[0];

    return {
      ...totals,
      playerName,
      teamName: endedWith.teamName,
      teamCount: lines.length,
      battingAverage: atBats > 0 ? (totals.hits ?? 0) / atBats : null,
      onBasePct: atBats + walks > 0 ? ((totals.hits ?? 0) + walks) / (atBats + walks) : null,
      sluggingPct: atBats > 0 ? (totals.totalBases ?? 0) / atBats : null,
      ops:
        atBats > 0
          ? ((totals.hits ?? 0) + walks) / (atBats + walks) + (totals.totalBases ?? 0) / atBats
          : null,
      era: earnedRunAverage(totals.earnedRuns, innings),
      whip: innings > 0 ? ((totals.hitsAllowed ?? 0) + (totals.walksAllowed ?? 0)) / innings : null,
    };
  });
}

/** One row per player for a season, with multi-team stints already merged. */
export async function getHistoricalSeasonPlayerTotals(seasonId: number) {
  return aggregateSeasonLines(await getHistoricalSeasonPlayerStats(seasonId));
}

/** Season leaderboard from the imported archive (e.g. most home runs all-time). */
export async function getHistoricalLeaders(
  column: "homeRuns" | "hits" | "runs" | "rbis" | "wins" | "strikeoutsPitched",
  limit = 10,
  seasonId?: number,
) {
  const db = getDb();
  const columnRef = historicalPlayerStats[column];
  const query = db
    .select({
      playerName: historicalPlayerStats.playerName,
      total: sql<number>`sum(${columnRef})`.as("total"),
    })
    .from(historicalPlayerStats);

  // Summing across a player's multi-team lines is exactly right here - these
  // are counting stats, so a mid-season move shouldn't split their total.
  const scoped = seasonId
    ? query.where(eq(historicalPlayerStats.seasonId, seasonId))
    : query;

  return scoped
    .groupBy(historicalPlayerStats.playerName)
    .orderBy(desc(sql`total`))
    .limit(limit);
}

export async function getTeamRoster(teamId: number) {
  const db = getDb();
  return db
    .select()
    .from(players)
    .where(and(eq(players.teamId, teamId), eq(players.status, "ACTIVE")));
}

/**
 * Archived name -> Minecraft account UUID, for rendering player heads. Returned
 * as a plain object so it can cross the server/client boundary into the stat
 * tables without a second query per row.
 */
export async function getPlayerAvatars(): Promise<Record<string, string>> {
  const db = getDb();
  const rows = await db
    .select({ playerName: minecraftProfiles.playerName, uuid: minecraftProfiles.uuid })
    .from(minecraftProfiles);
  return Object.fromEntries(rows.map((row) => [row.playerName, row.uuid]));
}

/**
 * Every game a player appears in, newest first, with the opponent and whether
 * their side won. Feeds the game log on a player's profile.
 *
 * Batting and pitching lines are separate rows in the archive, so both are
 * returned and the caller shows whichever tab is open.
 */
export async function getPlayerGameLog(playerName: string) {
  const db = getDb();
  const away = alias(historicalTeams, "away_team");
  const home = alias(historicalTeams, "home_team");

  const rows = await db
    .select({
      gameId: historicalGames.id,
      playedOn: historicalGames.playedOn,
      sortOrder: historicalGames.sortOrder,
      // Game order restarts at zero each season, so ordering the log needs the
      // season's place in league history as well - without it a game from
      // Season XII sorts among games from Season IV.
      seasonSort: historicalSeasons.sortOrder,
      seasonName: historicalSeasons.name,
      isHome: historicalGameStats.isHome,
      kind: historicalGameStats.kind,
      awayName: away.name,
      homeName: home.name,
      awayScore: historicalGames.awayScore,
      homeScore: historicalGames.homeScore,
      atBats: historicalGameStats.atBats,
      runs: historicalGameStats.runs,
      hits: historicalGameStats.hits,
      doubles: historicalGameStats.doubles,
      triples: historicalGameStats.triples,
      homeRuns: historicalGameStats.homeRuns,
      rbis: historicalGameStats.rbis,
      walks: historicalGameStats.walks,
      strikeouts: historicalGameStats.strikeouts,
      inningsPitched: historicalGameStats.inningsPitched,
      hitsAllowed: historicalGameStats.hitsAllowed,
      runsAllowed: historicalGameStats.runsAllowed,
      earnedRuns: historicalGameStats.earnedRuns,
      strikeoutsPitched: historicalGameStats.strikeoutsPitched,
      walksAllowed: historicalGameStats.walksAllowed,
    })
    .from(historicalGameStats)
    .innerJoin(historicalGames, eq(historicalGameStats.gameId, historicalGames.id))
    .innerJoin(historicalSeasons, eq(historicalGames.seasonId, historicalSeasons.id))
    .leftJoin(away, eq(historicalGames.awayTeamId, away.id))
    .leftJoin(home, eq(historicalGames.homeTeamId, home.id))
    .where(eq(historicalGameStats.playerName, playerName));

  return rows
    .map((row) => {
      const own = row.isHome ? row.homeScore : row.awayScore;
      const other = row.isHome ? row.awayScore : row.homeScore;
      return {
        ...row,
        opponent: row.isHome ? row.awayName : row.homeName,
        // Null rather than a guess when a game has no recorded score.
        won: own === null || other === null ? null : own > other,
        scoreLine: own === null || other === null ? null : `${own}-${other}`,
      };
    })
    // Newest first, by the date the log actually shows. Within a season the
    // game order is the schedule order, and Season XII schedules a series
    // window rather than a day - the two clubs meet whenever they can inside
    // it, so schedule order and the order games were played come apart. A game
    // the archive left undated falls back to the schedule.
    .sort(
      (a, b) =>
        (b.seasonSort ?? 0) - (a.seasonSort ?? 0) ||
        (playedOnValue(b.playedOn) ?? 0) - (playedOnValue(a.playedOn) ?? 0) ||
        (b.sortOrder ?? 0) - (a.sortOrder ?? 0),
    );
}

/**
 * The number and position the archive last recorded for a player. Almost no
 * imported roster row carries either, so this is usually null and the profile
 * simply omits the line rather than showing an empty one.
 */
export async function getPlayerRosterIdentity(playerName: string) {
  const db = getDb();
  const [row] = await db
    .select({
      jerseyNumber: historicalRosterEntries.jerseyNumber,
      positions: historicalRosterEntries.positions,
      sortOrder: historicalSeasons.sortOrder,
    })
    .from(historicalRosterEntries)
    .innerJoin(historicalSeasons, eq(historicalRosterEntries.seasonId, historicalSeasons.id))
    .where(eq(historicalRosterEntries.playerName, playerName))
    .orderBy(desc(historicalSeasons.sortOrder))
    .limit(1);
  return row ?? null;
}

/**
 * A player's primary position: the one they have spent the most defensive outs
 * standing at in games that reached the public record.
 *
 * The archive did not import positions - 22 of nearly 2,000 roster rows carry
 * one - so this is built from what umpires actually record. Time on the field
 * is what counts, not how many lineup cards list someone somewhere: a player
 * who starts at short and moves to right in the first inning is a right
 * fielder for that game, and counting the two entries equally would say
 * otherwise. A player with no scored games yet has no primary position, and
 * the profile shows a dash rather than a guess.
 *
 * Returned for every player at once: a profile page would otherwise pay for a
 * query per player, and the stat tables want the same answer for a whole page
 * of them.
 */
export async function getPrimaryPositions(): Promise<Record<string, string>> {
  const db = getDb();

  const rows = await db
    .select({ name: historicalGameStats.playerName, positionOuts: historicalGameStats.positionOuts })
    .from(historicalGameStats)
    .where(isNotNull(historicalGameStats.positionOuts));

  const tally = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (!row.positionOuts) continue;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(row.positionOuts) as Record<string, unknown>;
    } catch {
      continue;
    }
    const counts = tally.get(row.name) ?? new Map<string, number>();
    for (const [position, outs] of Object.entries(parsed)) {
      // A designated hitter is a batting slot, not a place on the field, so it
      // never becomes someone's primary position.
      if (position === "DH" || typeof outs !== "number") continue;
      counts.set(position, (counts.get(position) ?? 0) + outs);
    }
    tally.set(row.name, counts);
  }

  const primary: Record<string, string> = {};
  for (const [name, counts] of tally) {
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (best) primary[name] = best[0];
  }
  return primary;
}

/**
 * The agreed date and time for each upcoming fixture, keyed by the archive's
 * game id, along with whether an umpire has already started scoring it.
 *
 * A fixture belongs to the published season; the arrangement is a separate row
 * that clubs create and withdraw. Only arranged games are offered to umpires,
 * so this is what the schedule reads to know which is which.
 */
export async function getScheduledTimes(): Promise<
  Record<string, { scheduledAt: string; claimed: boolean }>
> {
  const db = getDb();
  const rows = await db
    .select({
      sourceGameId: games.sourceGameId,
      scheduledAt: games.scheduledAt,
      scorecardId: scorecards.id,
    })
    .from(games)
    .leftJoin(scorecards, eq(scorecards.gameId, games.id));

  const byFixture: Record<string, { scheduledAt: string; claimed: boolean }> = {};
  for (const row of rows) {
    if (!row.sourceGameId) continue;
    const existing = byFixture[row.sourceGameId];
    byFixture[row.sourceGameId] = {
      scheduledAt: row.scheduledAt,
      claimed: Boolean(existing?.claimed) || row.scorecardId !== null,
    };
  }
  return byFixture;
}
