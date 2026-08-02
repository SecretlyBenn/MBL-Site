import { and, asc, desc, eq, like, sql } from "drizzle-orm";
import { getDb } from "./index";
import {
  games,
  historicalPlayerStats,
  historicalSeasons,
  historicalTeams,
  players,
  scorecardLines,
  scorecards,
  teams,
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
      seasonName: historicalSeasons.name,
      sortOrder: historicalSeasons.sortOrder,
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
    })
    .from(historicalPlayerStats)
    .innerJoin(
      historicalTeams,
      eq(historicalPlayerStats.historicalTeamId, historicalTeams.id),
    )
    .where(eq(historicalPlayerStats.seasonId, seasonId));
}

/** Season leaderboard from the imported archive (e.g. most home runs all-time). */
export async function getHistoricalLeaders(
  column: "homeRuns" | "hits" | "rbis" | "strikeoutsPitched",
  limit = 10,
) {
  const db = getDb();
  const columnRef = historicalPlayerStats[column];
  return db
    .select({
      playerName: historicalPlayerStats.playerName,
      total: sql<number>`sum(${columnRef})`.as("total"),
    })
    .from(historicalPlayerStats)
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
