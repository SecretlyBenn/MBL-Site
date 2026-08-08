import { and, asc, desc, eq, like, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { getDb } from "./index";
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
  scorecardLines,
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
    era: totals.inningsPitched === 0 ? 0 : (totals.earnedRuns * 9) / totals.inningsPitched,
  };
}

/** Historical (imported) season lines for a player, newest season first. */
export async function getPlayerHistoricalStats(playerName: string) {
  const db = getDb();
  return db
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
    .select({
      playerName: historicalPlayerStats.playerName,
      teamName: historicalTeams.name,
      games: historicalPlayerStats.games,
      atBats: historicalPlayerStats.atBats,
      runs: historicalPlayerStats.runs,
      hits: historicalPlayerStats.hits,
      homeRuns: historicalPlayerStats.homeRuns,
      rbis: historicalPlayerStats.rbis,
      walks: historicalPlayerStats.walks,
      strikeouts: historicalPlayerStats.strikeouts,
      battingAverage: historicalPlayerStats.battingAverage,
      ops: historicalPlayerStats.ops,
      inningsPitched: historicalPlayerStats.inningsPitched,
      era: historicalPlayerStats.era,
      whip: historicalPlayerStats.whip,
      strikeoutsPitched: historicalPlayerStats.strikeoutsPitched,
      wins: historicalPlayerStats.wins,
      losses: historicalPlayerStats.losses,
      // Needed to rebuild rate stats when merging a player's multi-team lines.
      isSeasonEndTeam: historicalPlayerStats.isSeasonEndTeam,
      totalBases: historicalPlayerStats.totalBases,
      onBasePct: historicalPlayerStats.onBasePct,
      sluggingPct: historicalPlayerStats.sluggingPct,
      walksAllowed: historicalPlayerStats.walksAllowed,
      hitsAllowed: historicalPlayerStats.hitsAllowed,
      earnedRuns: historicalPlayerStats.earnedRuns,
      gamesStarted: historicalPlayerStats.gamesStarted,
      pitchingGames: historicalPlayerStats.pitchingGames,
      saves: historicalPlayerStats.saves,
      doubles: historicalPlayerStats.doubles,
      triples: historicalPlayerStats.triples,
      stolenBases: historicalPlayerStats.stolenBases,
      homeRunsAllowed: historicalPlayerStats.homeRunsAllowed,
    })
    .from(historicalPlayerStats)
    .innerJoin(
      historicalTeams,
      eq(historicalPlayerStats.historicalTeamId, historicalTeams.id),
    )
    .where(eq(historicalPlayerStats.seasonId, seasonId));
}

export type HistoricalStatViewRow = {
  seasonId: number;
  historicalTeamId: number;
  playerName: string;
  teamName: string;
  games: number | null;
  atBats: number | null;
  runs: number | null;
  hits: number | null;
  doubles: number | null;
  triples: number | null;
  homeRuns: number | null;
  rbis: number | null;
  walks: number | null;
  strikeouts: number | null;
  stolenBases: number | null;
  battingAverage: number | null;
  onBasePct: number | null;
  sluggingPct: number | null;
  ops: number | null;
  totalBases: number | null;
  pitchingGames: number | null;
  gamesStarted: number | null;
  wins: number | null;
  losses: number | null;
  saves: number | null;
  inningsPitched: number | null;
  hitsAllowed: number | null;
  runsAllowed: number | null;
  earnedRuns: number | null;
  homeRunsAllowed: number | null;
  strikeoutsPitched: number | null;
  walksAllowed: number | null;
  era: number | null;
  whip: number | null;
};

async function getHistoricalStatLines(seasonId?: number): Promise<HistoricalStatViewRow[]> {
  const db = getDb();
  const query = db
    .select({
      seasonId: historicalPlayerStats.seasonId,
      historicalTeamId: historicalTeams.id,
      playerName: historicalPlayerStats.playerName,
      teamName: historicalTeams.name,
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
      wins: historicalPlayerStats.wins,
      losses: historicalPlayerStats.losses,
      saves: historicalPlayerStats.saves,
      inningsPitched: historicalPlayerStats.inningsPitched,
      hitsAllowed: historicalPlayerStats.hitsAllowed,
      runsAllowed: historicalPlayerStats.runsAllowed,
      earnedRuns: historicalPlayerStats.earnedRuns,
      homeRunsAllowed: historicalPlayerStats.homeRunsAllowed,
      strikeoutsPitched: historicalPlayerStats.strikeoutsPitched,
      walksAllowed: historicalPlayerStats.walksAllowed,
      era: historicalPlayerStats.era,
      whip: historicalPlayerStats.whip,
      isSeasonEndTeam: historicalPlayerStats.isSeasonEndTeam,
    })
    .from(historicalPlayerStats)
    .innerJoin(historicalTeams, eq(historicalPlayerStats.historicalTeamId, historicalTeams.id));
  return seasonId === undefined ? query : query.where(eq(historicalPlayerStats.seasonId, seasonId));
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

const TOTAL_FIELDS = [
  "games", "atBats", "runs", "hits", "doubles", "triples", "homeRuns", "rbis", "walks",
  "strikeouts", "stolenBases", "totalBases", "pitchingGames", "gamesStarted", "wins", "losses",
  "saves", "inningsPitched", "hitsAllowed", "runsAllowed", "earnedRuns", "homeRunsAllowed",
  "strikeoutsPitched", "walksAllowed",
] as const;

function recalculateRates(row: HistoricalStatViewRow) {
  const atBats = row.atBats ?? 0;
  const hits = row.hits ?? 0;
  const walks = row.walks ?? 0;
  const innings = row.inningsPitched ?? 0;
  row.battingAverage = atBats ? hits / atBats : null;
  row.onBasePct = atBats + walks ? (hits + walks) / (atBats + walks) : null;
  row.sluggingPct = atBats ? (row.totalBases ?? 0) / atBats : null;
  row.ops = row.onBasePct === null || row.sluggingPct === null ? null : row.onBasePct + row.sluggingPct;
  row.era = innings ? ((row.earnedRuns ?? 0) * 9) / innings : null;
  row.whip = innings ? ((row.walksAllowed ?? 0) + (row.hitsAllowed ?? 0)) / innings : null;
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

  return mergePlayerLines(lines, (grouped) => {
    const names = new Set(grouped.map((line) => line.teamName));
    return names.size === 1 ? [...names][0] : "Multiple teams";
  });
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

const COUNTING_STATS = [
  "games", "atBats", "runs", "hits", "homeRuns", "rbis", "walks", "strikeouts",
  "inningsPitched", "strikeoutsPitched", "walksAllowed", "wins", "losses",
  "hitsAllowed", "earnedRuns", "totalBases",
] as const;

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

    const totals: Record<string, number | null> = {};
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
      era: innings > 0 ? ((totals.earnedRuns ?? 0) * 9) / innings : null,
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
  column: "homeRuns" | "hits" | "rbis" | "strikeoutsPitched",
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
