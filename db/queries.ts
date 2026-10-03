import { and, asc, desc, eq, getTableColumns, inArray, isNotNull, like, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { getDb } from "./index";
import { playedOnValue } from "@/app/formatStats";
import { ERA_INNINGS, earnedRunAverage, perGame } from "@/app/scoring";
import {
  games,
  historicalGameStats,
  historicalGames,
  historicalLineScores,
  historicalPlayerStats,
  historicalRosterEntries,
  historicalSeasons,
  historicalTeams,
  leagues,
  players,
  rosterSpots,
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
export async function getStandings(leagueId?: number): Promise<StandingsRow[]> {
  const db = getDb();
  const [allTeams, finalGames] = await Promise.all([
    leagueId === undefined
      ? db.select().from(teams)
      : db.select().from(teams).where(eq(teams.leagueId, leagueId)),
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

export async function getScheduleWithTeams(leagueId?: number) {
  const db = getDb();
  const [allGames, allTeams] = await Promise.all([
    db.select().from(games).orderBy(games.scheduledAt),
    db.select().from(teams),
  ]);
  const teamById = new Map(allTeams.map((team) => [team.id, team]));

  return allGames
    .map((game) => ({
      ...game,
      homeTeam: teamById.get(game.homeTeamId) ?? null,
      awayTeam: teamById.get(game.awayTeamId) ?? null,
    }))
    // A fixture belongs to the league its clubs play in. Filtered here rather
    // than in SQL because the clubs are already in hand, and a game whose club
    // has gone missing should disappear from both leagues rather than show up
    // in the wrong one.
    .filter((game) =>
      leagueId === undefined
        ? true
        : game.homeTeam?.leagueId === leagueId || game.awayTeam?.leagueId === leagueId,
    );
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
    era: earnedRunAverage(totals.earnedRuns, totals.inningsPitched, await playerInnings(playerId)) ?? 0,
  };
}

/** The length of a game in the competition a live player belongs to. */
async function playerInnings(playerId: number) {
  const player = await getDb().query.players.findFirst({ where: eq(players.id, playerId) });
  return inningsPerGameFor(player?.leagueId);
}

/** Historical (imported) season lines for a player, newest season first. */
export async function getPlayerHistoricalStats(playerName: string | string[]) {
  const db = getDb();
  const names = Array.isArray(playerName) ? playerName : [playerName];
  if (names.length === 0) return [];
  const rows = await db
    .select({
      historicalTeamId: historicalTeams.id,
      seasonId: historicalSeasons.id,
      seasonName: historicalSeasons.name,
      sortOrder: historicalSeasons.sortOrder,
      // Which competition the season belongs to, so a player who appears in
      // both can have them kept apart rather than added together.
      leagueSlug: leagues.slug,
      leagueName: leagues.name,
      playerName: historicalPlayerStats.playerName,
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
      leftOnBase: historicalPlayerStats.leftOnBase,
      putouts: historicalPlayerStats.putouts,
      errors: historicalPlayerStats.errors,
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
      inningsPerGame: leagues.inningsPerGame,
    })
    .from(historicalPlayerStats)
    .innerJoin(historicalSeasons, eq(historicalPlayerStats.seasonId, historicalSeasons.id))
    .innerJoin(
      historicalTeams,
      eq(historicalPlayerStats.historicalTeamId, historicalTeams.id),
    )
    .leftJoin(leagues, eq(historicalSeasons.leagueId, leagues.id))
    .where(inArray(historicalPlayerStats.playerName, names))
    .orderBy(desc(historicalSeasons.sortOrder));

  // Recomputed from the earned runs and the innings - which are just counts,
  // and are right either way - rather than taken from the stored column, so
  // every ERA on the site is on the same footing. Each row is divided by the
  // length of a game in *its own* competition, which the join above carries:
  // the MBL plays six innings and the MCBA five, and one number for both put
  // every college pitcher a fifth too high.
  return rows.map(({ inningsPerGame, ...row }) => ({
    ...row,
    era: earnedRunAverage(row.earnedRuns, row.inningsPitched, inningsPerGame ?? ERA_INNINGS),
  }));
}

/**
 * The seasons of one league, newest first.
 *
 * Every archive page picks a season and works from it, so scoping this one
 * query is what keeps two leagues' histories apart on all of them. Called
 * without a league it returns every season, which only the admin area wants.
 */
export async function getHistoricalSeasons(leagueId?: number) {
  const db = getDb();
  const query = db.select().from(historicalSeasons);
  return (leagueId === undefined
    ? query
    : query.where(eq(historicalSeasons.leagueId, leagueId))
  ).orderBy(desc(historicalSeasons.sortOrder));
}

/** Every league the site holds, in the order they are offered. */
export async function getLeagues() {
  return getDb().select().from(leagues).orderBy(asc(leagues.sortOrder));
}

/**
 * How long a game is in a competition, which is the divisor in every rate the
 * site prints: an earned run average and the walk and strikeout rates beside
 * it are all per whole game here rather than per nine.
 *
 * Held for a few minutes rather than read on every call. There are two rows
 * and they change about never, but these run inside loops over a season's
 * worth of players, and a round trip each is a round trip too many.
 */
const LEAGUE_LENGTHS_HELD_MS = 5 * 60 * 1000;
let leagueLengths: { at: number; byId: Map<number, { innings: number; slug: string }> } | null = null;

/** Reads the two league rows, or hands back what was read a moment ago. */
async function leagueRows() {
  const held = leagueLengths;
  if (!held || Date.now() - held.at > LEAGUE_LENGTHS_HELD_MS) {
    const rows = await getDb()
      .select({ id: leagues.id, innings: leagues.inningsPerGame, slug: leagues.slug })
      .from(leagues);
    leagueLengths = {
      at: Date.now(),
      byId: new Map(rows.map((row) => [row.id, { innings: row.innings, slug: row.slug }])),
    };
  }
  return leagueLengths!.byId;
}

/**
 * A competition's slug from its id, for the things recorded against the slug
 * rather than the number - the current-season setting, and addresses.
 */
export async function leagueSlugFor(leagueId: number | null | undefined): Promise<string | null> {
  if (!leagueId) return null;
  return (await leagueRows()).get(leagueId)?.slug ?? null;
}

/**
 * The length of a game on a scorecard, taken from the clubs playing it.
 *
 * A fixture takes its competition from its clubs, so either one answers. This
 * is what the umpire's board and every scoring route need: it decides when the
 * game is over and from which inning a runner is placed on second.
 */
export async function inningsPerGameForScorecard(scorecardId: number): Promise<number> {
  const [row] = await getDb()
    .select({ leagueId: teams.leagueId })
    .from(scorecards)
    .innerJoin(games, eq(games.id, scorecards.gameId))
    .innerJoin(teams, eq(teams.id, games.homeTeamId))
    .where(eq(scorecards.id, scorecardId))
    .limit(1);
  return inningsPerGameFor(row?.leagueId);
}

export async function inningsPerGameForSeason(seasonId: number | null | undefined): Promise<number> {
  if (!seasonId) return ERA_INNINGS;
  const season = await getDb().query.historicalSeasons.findFirst({
    where: eq(historicalSeasons.id, seasonId),
  });
  return inningsPerGameFor(season?.leagueId);
}

export async function inningsPerGameFor(leagueId: number | null | undefined): Promise<number> {
  // A row with no competition behind it - an unfiled club, a player nobody has
  // placed - is read as the usual six rather than left without a rate at all.
  if (!leagueId) return ERA_INNINGS;
  return (await leagueRows()).get(leagueId)?.innings ?? ERA_INNINGS;
}

/** One league from the slug in the address, or null if there is no such league. */
export async function getLeagueBySlug(slug: string) {
  const [row] = await getDb().select().from(leagues).where(eq(leagues.slug, slug)).limit(1);
  return row ?? null;
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
  // Worked out here rather than asked of the caller: the club's own season
  // says which competition it is, and a page passing the wrong number would
  // be a quiet fifth of an error on every pitcher in the table.
  const club = await getDb().query.historicalTeams.findFirst({
    where: eq(historicalTeams.id, historicalTeamId),
  });
  const inningsPerGame = await inningsPerGameForSeason(club?.seasonId);
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
        // Batting, as a full line. The roster used to select six figures and
        // show them across a table stretched to the width of the page, which
        // is a lot of space to say very little.
        games: historicalPlayerStats.games,
        plateAppearances: historicalPlayerStats.plateAppearances,
        singles: historicalPlayerStats.singles,
        caughtStealing: historicalPlayerStats.caughtStealing,
        sacFlies: historicalPlayerStats.sacFlies,
        totalBases: historicalPlayerStats.totalBases,
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
        leftOnBase: historicalPlayerStats.leftOnBase,
        battingAverage: historicalPlayerStats.battingAverage,
        onBasePct: historicalPlayerStats.onBasePct,
        sluggingPct: historicalPlayerStats.sluggingPct,
        ops: historicalPlayerStats.ops,
        // Fielding travels with the batting line in the archive.
        putouts: historicalPlayerStats.putouts,
        errors: historicalPlayerStats.errors,
        fieldingPct: historicalPlayerStats.fieldingPct,
        // Pitching.
        pitchingGames: historicalPlayerStats.pitchingGames,
        gamesStarted: historicalPlayerStats.gamesStarted,
        wins: historicalPlayerStats.wins,
        losses: historicalPlayerStats.losses,
        saves: historicalPlayerStats.saves,
        inningsPitched: historicalPlayerStats.inningsPitched,
        hitsAllowed: historicalPlayerStats.hitsAllowed,
        runsAllowed: historicalPlayerStats.runsAllowed,
        homeRunsAllowed: historicalPlayerStats.homeRunsAllowed,
        walksAllowed: historicalPlayerStats.walksAllowed,
        strikeoutsPitched: historicalPlayerStats.strikeoutsPitched,
        completeGames: historicalPlayerStats.completeGames,
        shutouts: historicalPlayerStats.shutouts,
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
      era: earnedRunAverage(line.earnedRuns, line.inningsPitched, inningsPerGame),
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
    plateAppearances: number | null;
    singles: number | null;
    caughtStealing: number | null;
    sacFlies: number | null;
    totalBases: number | null;
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
    leftOnBase: number | null;
    battingAverage: number | null;
    onBasePct: number | null;
    sluggingPct: number | null;
    ops: number | null;
    putouts: number | null;
    errors: number | null;
    fieldingPct: number | null;
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
    walksAllowed: number | null;
    strikeoutsPitched: number | null;
    completeGames: number | null;
    shutouts: number | null;
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
      status: historicalGames.status,
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
      status: historicalGames.status,
      seasonId: historicalSeasons.id,
      seasonName: historicalSeasons.name,
      seasonSortOrder: historicalSeasons.sortOrder,
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

/**
 * Just enough of a game to title its page: the clubs, the score, the season.
 * The page itself loads every stat line, and a browser tab title should not
 * cost that a second time.
 */
export async function getHistoricalGameSummary(gameId: number) {
  const db = getDb();
  const away = alias(historicalTeams, "away_team");
  const home = alias(historicalTeams, "home_team");
  const [game] = await db
    .select({
      playedOn: historicalGames.playedOn,
      awayScore: historicalGames.awayScore,
      homeScore: historicalGames.homeScore,
      awayName: away.name,
      homeName: home.name,
      seasonName: historicalSeasons.name,
    })
    .from(historicalGames)
    .innerJoin(historicalSeasons, eq(historicalGames.seasonId, historicalSeasons.id))
    .leftJoin(away, eq(historicalGames.awayTeamId, away.id))
    .leftJoin(home, eq(historicalGames.homeTeamId, home.id))
    .where(eq(historicalGames.id, gameId))
    .limit(1);
  return game ?? null;
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

async function getHistoricalStatLines(seasonId?: number, leagueId?: number): Promise<HistoricalStatViewRow[]> {
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
  // A career spans seasons, and it has to stop at the league those seasons
  // belong to: a player drafted out of the MCBA has two careers, not one.
  const where = [
    seasonId === undefined ? undefined : eq(historicalPlayerStats.seasonId, seasonId),
    leagueId === undefined ? undefined : eq(historicalSeasons.leagueId, leagueId),
  ].filter((clause) => clause !== undefined);
  return where.length === 0 ? query : query.where(and(...where));
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
  inningsPerGame: number,
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
    recalculateRates({ ...row, teamName: teamNameFor(grouped) }, inningsPerGame),
  );
}

/** Merging per-team lines sums the same columns a season total does. */
const TOTAL_FIELDS = COUNTING_STATS;

function recalculateRates(row: HistoricalStatViewRow, inningsPerGame: number) {
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
  row.battingAverage = atBats ? hits / atBats : null;
  row.onBasePct = timesUp ? (hits + walks + hitByPitch) / timesUp : null;
  row.sluggingPct = atBats ? (row.totalBases ?? 0) / atBats : null;
  row.ops = row.onBasePct === null || row.sluggingPct === null ? null : row.onBasePct + row.sluggingPct;
  // No assists in this league, so a chance is a play made or a play muffed.
  row.fieldingPct = chances ? putouts / chances : null;
  row.era = earnedRunAverage(row.earnedRuns, innings, inningsPerGame);
  row.whip = innings ? ((row.walksAllowed ?? 0) + (row.hitsAllowed ?? 0)) / innings : null;
  row.walksPerGame = perGame(row.walksAllowed, innings, inningsPerGame);
  row.strikeoutsPerGame = perGame(row.strikeoutsPitched, innings, inningsPerGame);
  return row;
}

/**
 * One row per player, whether scoped to a season or spanning a career. A
 * mid-season trade produces one line per team in the source data; those are
 * merged here so a player never appears twice in the same table. The splits
 * remain available via getHistoricalPlayerStats for profile pages.
 */
export async function getIndividualHistoricalStats(seasonId?: number, leagueId?: number) {
  const lines = await getHistoricalStatLines(seasonId, leagueId);
  // Either way of naming the competition will do; a season says which one it
  // belongs to when the caller has not said.
  const inningsPerGame = leagueId
    ? await inningsPerGameFor(leagueId)
    : await inningsPerGameForSeason(seasonId);

  if (seasonId !== undefined) {
    return mergePlayerLines(lines, (grouped) => {
      const endedWith = grouped.find((line) => line.isSeasonEndTeam) ?? grouped[0];
      return grouped.length === 1
        ? endedWith.teamName
        : `${endedWith.teamName} (+${grouped.length - 1})`;
    }, inningsPerGame);
  }

  // Career totals show the team the player most recently played for, rather
  // than "Multiple teams" - the current club is what identifies someone at a
  // glance, and a career line covering four teams named none of them.
  return mergePlayerLines(lines, (grouped) => mostRecentTeam(grouped).teamName, inningsPerGame);
}

export type HistoricalTeamStatRow = HistoricalStatViewRow & { isLeagueAverage?: boolean };

export async function getHistoricalTeamStats(seasonId: number): Promise<HistoricalTeamStatRow[]> {
  const inningsPerGame = await inningsPerGameForSeason(seasonId);
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
  return [...teamsByName.values()].map((row) => recalculateRates(row, inningsPerGame));
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
export function aggregateSeasonLines(rows: SeasonStatLine[], inningsPerGame: number) {
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
      era: earnedRunAverage(totals.earnedRuns, innings, inningsPerGame),
      whip: innings > 0 ? ((totals.hitsAllowed ?? 0) + (totals.walksAllowed ?? 0)) / innings : null,
    };
  });
}

/** One row per player for a season, with multi-team stints already merged. */
export async function getHistoricalSeasonPlayerTotals(seasonId: number) {
  const inningsPerGame = await inningsPerGameForSeason(seasonId);
  return aggregateSeasonLines(await getHistoricalSeasonPlayerStats(seasonId), inningsPerGame);
}

/** Season leaderboard from the imported archive (e.g. most home runs all-time). */
export async function getHistoricalLeaders(
  column: "homeRuns" | "hits" | "runs" | "rbis" | "wins" | "strikeoutsPitched",
  limit = 10,
  seasonId?: number,
  leagueId?: number,
) {
  const db = getDb();
  const columnRef = historicalPlayerStats[column];
  const query = db
    .select({
      playerName: historicalPlayerStats.playerName,
      total: sql<number>`sum(${columnRef})`.as("total"),
    })
    .from(historicalPlayerStats)
    // Without a season this counts a whole career, and a career has to stop at
    // the league it was played in: players move between the two, and blending
    // them would credit an MCBA batter's home runs to the MBL's leaderboard.
    .innerJoin(historicalSeasons, eq(historicalPlayerStats.seasonId, historicalSeasons.id));

  // Summing across a player's multi-team lines is exactly right here - these
  // are counting stats, so a mid-season move shouldn't split their total.
  const where = [
    seasonId ? eq(historicalPlayerStats.seasonId, seasonId) : undefined,
    leagueId ? eq(historicalSeasons.leagueId, leagueId) : undefined,
  ].filter((clause) => clause !== undefined);
  const scoped = where.length > 0 ? query.where(and(...where)) : query;

  return scoped
    .groupBy(historicalPlayerStats.playerName)
    .orderBy(desc(sql`total`))
    .limit(limit);
}

/**
 * A club's active squad: the players who belong to it, plus anyone holding an
 * extra spot there.
 *
 * The extra spots are the MiBL. A player sent down keeps the club they belong
 * to and gains a spot on the affiliate, because the site cannot tell from one
 * day to the next whether they are down or have been recalled - so they are
 * available to both rather than moved between them.
 */
export async function getTeamRoster(teamId: number) {
  const db = getDb();
  return db
    .select()
    .from(players)
    .where(
      and(
        or(
          eq(players.teamId, teamId),
          inArray(
            players.id,
            db.select({ id: rosterSpots.playerId }).from(rosterSpots).where(eq(rosterSpots.teamId, teamId)),
          ),
        ),
        eq(players.status, "ACTIVE"),
      ),
    );
}

/** Names per profile lookup, under D1's cap of 100 bound parameters. */
const PROFILE_BATCH = 90;

/**
 * Archived name -> Minecraft account UUID, for the heads a page actually draws.
 *
 * A page that shows twenty players has no business reading the whole profile
 * table for them, and pages here run against a 10ms budget. Returned as a
 * plain object so it can cross into the stat tables without a query per row.
 */
export async function getAvatarsFor(names: string[]): Promise<Record<string, string>> {
  const profiles = await getProfilesFor(names);
  return Object.fromEntries(Object.entries(profiles).map(([name, row]) => [name, row.uuid]));
}

/**
 * The two clubs of a fixture, and the competition they share.
 *
 * A fixture takes its league from the clubs playing it, so both have to be in
 * the same one. One club from each would put the game in both competitions'
 * schedules and count it towards both sets of standings - and it is not a game
 * anybody plays, so it is refused at the point of scheduling rather than
 * cleaned up afterwards.
 *
 * `leagueId` is null when the clubs disagree, when one is missing, or when
 * either has no league at all.
 */
export async function fixtureClubs(awayTeamId: number, homeTeamId: number) {
  const db = getDb();
  const rows = await db
    .select({ id: teams.id, name: teams.name, leagueId: teams.leagueId })
    .from(teams)
    .where(inArray(teams.id, [awayTeamId, homeTeamId]));

  const away = rows.find((row) => row.id === awayTeamId) ?? null;
  const home = rows.find((row) => row.id === homeTeamId) ?? null;
  const shared =
    away !== null && home !== null && away.leagueId !== null && away.leagueId === home.leagueId;
  return { away, home, leagueId: shared ? away!.leagueId : null };
}

/**
 * Every name on the site belonging to the same Minecraft account, this one
 * included.
 *
 * The two competitions file a player under whatever name they used there, so
 * one person's MCBA record and their MBL record sit under different names -
 * Purpeyy and _purp__ are the same man. The account id is the only thing
 * tying them together, which is why linking heads turned up so many of them.
 *
 * A name with no account linked is on its own, and so is one whose account
 * nobody else shares.
 */
export async function getAccountNames(playerName: string): Promise<string[]> {
  const db = getDb();
  const [mine] = await db
    .select({ uuid: minecraftProfiles.uuid })
    .from(minecraftProfiles)
    .where(eq(minecraftProfiles.playerName, playerName))
    .limit(1);
  if (!mine) return [playerName];

  const rows = await db
    .select({ playerName: minecraftProfiles.playerName })
    .from(minecraftProfiles)
    .where(eq(minecraftProfiles.uuid, mine.uuid));
  const others = rows.map((row) => row.playerName).filter((name) => name !== playerName);
  return [playerName, ...others];
}

/** An account as the site knows it: the id a head comes from, and today's name. */
export type LinkedAccount = { uuid: string; currentName: string };

/**
 * Archived name -> the Minecraft account behind it.
 *
 * `currentName` is what the account answers to now, which is not always the
 * name the archive filed the player under: the head route refreshes it
 * whenever it finds the account renamed, so it stays true without anyone
 * editing anything. Pages about a player today can show it; the stat tables
 * keep the name used at the time, because that is the record.
 */
export async function getProfilesFor(names: string[]): Promise<Record<string, LinkedAccount>> {
  const wanted = [...new Set(names)];
  if (wanted.length === 0) return {};

  // D1 refuses a statement with more than 100 bound parameters, and a season's
  // statistics table names two hundred players - asking for them in one go
  // threw on every page that showed a whole season.
  const db = getDb();
  const batches: string[][] = [];
  for (let start = 0; start < wanted.length; start += PROFILE_BATCH) {
    batches.push(wanted.slice(start, start + PROFILE_BATCH));
  }

  const found = await Promise.all(
    batches.map((batch) =>
      db
        .select({
          playerName: minecraftProfiles.playerName,
          uuid: minecraftProfiles.uuid,
          currentName: minecraftProfiles.currentName,
        })
        .from(minecraftProfiles)
        .where(inArray(minecraftProfiles.playerName, batch)),
    ),
  );
  return Object.fromEntries(
    found.flat().map((row) => [row.playerName, { uuid: row.uuid, currentName: row.currentName }]),
  );
}

/**
 * Every game a player appears in, newest first, with the opponent and whether
 * their side won. Feeds the game log on a player's profile.
 *
 * Batting and pitching lines are separate rows in the archive, so both are
 * returned and the caller shows whichever tab is open.
 */
export async function getPlayerGameLog(playerName: string | string[]) {
  const db = getDb();
  const names = Array.isArray(playerName) ? playerName : [playerName];
  if (names.length === 0) return [];
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
      // The competition the game belongs to, so a player who appears in both
      // has each log kept to its own.
      leagueSlug: leagues.slug,
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
      leftOnBase: historicalGameStats.leftOnBase,
      putouts: historicalGameStats.putouts,
      errors: historicalGameStats.errors,
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
    .leftJoin(leagues, eq(historicalSeasons.leagueId, leagues.id))
    .where(inArray(historicalGameStats.playerName, names));

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

/**
 * One line about every season: how many clubs, how many games, and the club
 * that won the most of them.
 *
 * The seasons page used to be a list of names with nothing to choose between
 * them. Two grouped queries answer it for every season at once - a query per
 * season would be sixteen round trips on a page that is mostly links.
 */
export async function getSeasonSummaries() {
  const db = getDb();
  const [games, clubs] = await Promise.all([
    db
      .select({
        seasonId: historicalGames.seasonId,
        games: sql<number>`count(*)`,
        played: sql<number>`sum(case when ${historicalGames.homeScore} is not null then 1 else 0 end)`,
      })
      .from(historicalGames)
      .groupBy(historicalGames.seasonId),
    db
      .select({
        seasonId: historicalTeams.seasonId,
        name: historicalTeams.name,
        wins: historicalTeams.wins,
        losses: historicalTeams.losses,
      })
      .from(historicalTeams),
  ]);

  const byGames = new Map(games.map((row) => [row.seasonId, row]));
  const summaries = new Map<
    number,
    { seasonId: number; teams: number; games: number; played: number; leaderName: string | null; leaderWins: number; leaderLosses: number }
  >();

  for (const club of clubs) {
    const tally = byGames.get(club.seasonId);
    const summary = summaries.get(club.seasonId) ?? {
      seasonId: club.seasonId,
      teams: 0,
      games: Number(tally?.games ?? 0),
      played: Number(tally?.played ?? 0),
      leaderName: null,
      leaderWins: -1,
      leaderLosses: 0,
    };
    summary.teams += 1;
    // Most wins, and fewest losses where two clubs won the same number. In a
    // playoff season that is whoever went furthest.
    const wins = club.wins ?? 0;
    const losses = club.losses ?? 0;
    if (wins > summary.leaderWins || (wins === summary.leaderWins && losses < summary.leaderLosses)) {
      summary.leaderName = club.name;
      summary.leaderWins = wins;
      summary.leaderLosses = losses;
    }
    summaries.set(club.seasonId, summary);
  }

  return [...summaries.values()].map((summary) => ({
    ...summary,
    leaderWins: Math.max(0, summary.leaderWins),
  }));
}
