import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  games,
  historicalGameStats,
  historicalGames,
  historicalLineScores,
  historicalPlayerStats,
  historicalSeasons,
  historicalTeams,
  players,
  plateAppearances,
  fieldingChanges,
  runnerOuts,
  scorecardLineups,
  scorecards,
  teams,
} from "@/db/schema";
import { deriveBoxScore, type BattingLine, type PitchingLine } from "@/app/derive-box-score";
import { earnedRunAverage } from "@/app/scoring";

/**
 * Publishing an approved scorecard writes it into the historical tables the
 * public site already reads. Standings, statistics, leaders, the schedule and
 * box scores all come from there, so a game becomes visible everywhere at once
 * instead of needing a second read path for the current season.
 *
 * Season totals are recomputed from the games that feed them rather than
 * incremented, so re-publishing a corrected game lands the right numbers
 * instead of double-counting.
 */

/**
 * The season live games are published into. Season XII is still being played -
 * roughly half its schedule is in the archive as unplayed rows - so scored
 * games belong to it, not to a new season standing on its own.
 */
export const CURRENT_SEASON_NAME = "MBL Season XII";

/**
 * D1 caps the bound parameters in a single statement, and a multi-row insert
 * spends one per column per row - a full box score blows past it and the query
 * fails outright rather than degrading. Inserting in slices keeps every
 * statement inside the limit.
 */
const MAX_BOUND_PARAMETERS = 90;

async function insertInChunks<Row extends Record<string, unknown>>(
  insert: (rows: Row[]) => Promise<unknown>,
  rows: Row[],
) {
  if (rows.length === 0) return;
  const columns = Math.max(1, Object.keys(rows[0]).length);
  const perChunk = Math.max(1, Math.floor(MAX_BOUND_PARAMETERS / columns));
  for (let index = 0; index < rows.length; index += perChunk) {
    await insert(rows.slice(index, index + perChunk));
  }
}

async function currentSeasonId() {
  const db = getDb();
  const existing = await db.query.historicalSeasons.findFirst({
    where: eq(historicalSeasons.name, CURRENT_SEASON_NAME),
  });
  if (existing) return existing.id;

  const all = await db.select().from(historicalSeasons);
  const nextSort = Math.max(0, ...all.map((row) => row.sortOrder ?? 0)) + 1;
  const [created] = await db
    .insert(historicalSeasons)
    // Live seasons have no upstream export, so the source ids are synthetic -
    // they exist only so a re-import can still match rows by them.
    .values({ name: CURRENT_SEASON_NAME, sortOrder: nextSort, sourceSeasonId: "live" })
    .returning();
  return created.id;
}

async function seasonTeamId(seasonId: number, teamId: number) {
  const db = getDb();
  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team) throw new Error(`Unknown team ${teamId}`);

  const existing = await db.query.historicalTeams.findFirst({
    where: and(eq(historicalTeams.seasonId, seasonId), eq(historicalTeams.name, team.name)),
  });
  if (existing) return existing.id;

  const [created] = await db
    .insert(historicalTeams)
    .values({
      seasonId,
      name: team.name,
      abbreviation: team.abbreviation,
      sourceName: team.name,
      sourceTeamId: `live-${team.id}`,
      wins: 0,
      losses: 0,
      runsScored: 0,
      runsAllowed: 0,
    })
    .returning();
  return created.id;
}

export async function publishScorecard(scorecardId: number) {
  const db = getDb();

  const scorecard = await db.query.scorecards.findFirst({ where: eq(scorecards.id, scorecardId) });
  if (!scorecard) throw new Error("No such scorecard.");
  const game = await db.query.games.findFirst({ where: eq(games.id, scorecard.gameId) });
  if (!game) throw new Error("No such game.");

  const appearances = await db
    .select()
    .from(plateAppearances)
    .where(eq(plateAppearances.scorecardId, scorecardId));

  // Caught stealings, tag-play putouts and time on the field live outside the
  // plate appearances, so the box score is handed them rather than left to
  // infer stats that are nowhere in the at-bats.
  const [outs, lineups, changes] = await Promise.all([
    db.select().from(runnerOuts).where(eq(runnerOuts.scorecardId, scorecardId)),
    db.select().from(scorecardLineups).where(eq(scorecardLineups.scorecardId, scorecardId)),
    db.select().from(fieldingChanges).where(eq(fieldingChanges.scorecardId, scorecardId)),
  ]);

  const box = deriveBoxScore(appearances, {
    runnerOuts: outs,
    fielding: [
      ...lineups.map((row) => ({
        isHome: row.isHome,
        playerId: row.playerId,
        position: row.position,
        fromSequence: 0,
        // A player who left partway through served outs up to that point and
        // none after it.
        untilSequence: row.leftAtSequence,
      })),
      ...changes.map((row) => ({
        isHome: row.isHome,
        playerId: row.playerId,
        position: row.position,
        fromSequence: row.appliedAtSequence,
      })),
    ],
  });

  const seasonId = await currentSeasonId();
  const awayTeamId = await seasonTeamId(seasonId, game.awayTeamId);
  const homeTeamId = await seasonTeamId(seasonId, game.homeTeamId);

  // A fixture carried over from the archive keeps the archive's id, so it
  // publishes into the row already sitting on the schedule as unplayed.
  const sourceGameId = game.sourceGameId ?? `live-${game.id}`;

  // Replacing rather than inserting keeps re-publishing a corrected game
  // idempotent.
  const existingGame = await db.query.historicalGames.findFirst({
    where: eq(historicalGames.sourceGameId, sourceGameId),
  });
  if (existingGame) {
    await db.delete(historicalGameStats).where(eq(historicalGameStats.gameId, existingGame.id));
    await db.delete(historicalLineScores).where(eq(historicalLineScores.gameId, existingGame.id));
    await db.delete(historicalGames).where(eq(historicalGames.id, existingGame.id));
  }

  // A carried-over fixture keeps its place in the schedule and the date the
  // league published, rather than jumping to the end on the day it was scored.
  const allGames = await db.select({ id: historicalGames.id }).from(historicalGames);
  const [published] = await db
    .insert(historicalGames)
    .values({
      seasonId: existingGame?.seasonId ?? seasonId,
      sourceGameId,
      playedOn: existingGame?.playedOn ?? new Date(game.scheduledAt).toDateString(),
      awayTeamId,
      homeTeamId,
      awayScore: box.awayScore,
      homeScore: box.homeScore,
      sortOrder: existingGame?.sortOrder ?? allGames.length + 1,
    })
    .returning();

  const nameOf = new Map(
    (await db.select().from(players)).map((player) => [player.id, player.displayName]),
  );
  // The archive labels line-score rows with the team's nickname, which is what
  // the box score and schedule render beside the innings.
  const awayTeam = await db.query.teams.findFirst({ where: eq(teams.id, game.awayTeamId) });
  const homeTeam = await db.query.teams.findFirst({ where: eq(teams.id, game.homeTeamId) });
  const nickname = (name: string | undefined) => name?.split(" ").at(-1) ?? "";
  const teamLabel = (isHome: boolean) =>
    isHome ? nickname(homeTeam?.name) : nickname(awayTeam?.name);

  for (const isHome of [false, true]) {
    const innings = isHome ? box.homeInnings : box.awayInnings;
    await db.insert(historicalLineScores).values({
      gameId: published.id,
      isHome,
      teamLabel: teamLabel(isHome),
      innings: innings.join(","),
      runs: isHome ? box.homeScore : box.awayScore,
      hits: isHome ? box.homeHits : box.awayHits,
      errors: isHome ? box.homeErrors : box.awayErrors,
    });
  }

  const battingRows = (lines: BattingLine[], isHome: boolean) =>
    lines.map((line) => ({
      gameId: published.id,
      isHome,
      kind: "BATTING" as const,
      playerName: nameOf.get(line.playerId) ?? "Unknown",
      atBats: line.atBats,
      putouts: line.putouts,
      errors: line.errors,
      runs: line.runs,
      hits: line.hits,
      doubles: line.doubles,
      triples: line.triples,
      homeRuns: line.homeRuns,
      rbis: line.rbis,
      walks: line.walks,
      hitByPitch: line.hitByPitch,
      strikeouts: line.strikeouts,
      stolenBases: line.stolenBases,
      caughtStealing: line.caughtStealing,
      sacFlies: line.sacFlies,
      sacBunts: line.sacBunts,
      leftOnBase: line.leftOnBase,
      // Only worth a row when the player actually took the field; an empty
      // object would make every bench player look like a fielder.
      positionOuts:
        Object.keys(line.positionOuts).length > 0 ? JSON.stringify(line.positionOuts) : null,
    }));

  const pitchingRows = (lines: PitchingLine[], isHome: boolean) =>
    lines.map((line) => ({
      gameId: published.id,
      isHome,
      kind: "PITCHING" as const,
      playerName: nameOf.get(line.playerId) ?? "Unknown",
      inningsPitched: line.inningsPitched,
      hitsAllowed: line.hits,
      runsAllowed: line.runs,
      earnedRuns: line.earnedRuns,
      homeRunsAllowed: line.homeRuns,
      strikeoutsPitched: line.strikeouts,
      walksAllowed: line.walks,
      gamesStarted: line.gamesStarted,
      completeGames: line.completeGames,
      shutouts: line.shutouts,
      wins: line.wins,
      losses: line.losses,
      saves: line.saves,
      blownSaves: line.blownSaves,
    }));

  const statRows = [
    ...battingRows(box.awayBatting, false),
    ...battingRows(box.homeBatting, true),
    ...pitchingRows(box.awayPitching, false),
    ...pitchingRows(box.homePitching, true),
  ];
  await insertInChunks((rows) => db.insert(historicalGameStats).values(rows), statRows);

  await recomputeSeason(seasonId);
  return { seasonId, historicalGameId: published.id };
}

/**
 * Takes a published game back out of the public record, so a head umpire can
 * un-approve a game that was approved too early and the site stops counting it
 * until it is fixed and approved again.
 *
 * A fixture that came from the archive is returned to the schedule as unplayed
 * rather than deleted - it is still a game the league intends to play, and
 * deleting it would leave a hole in the season. A game with no archive origin
 * has nothing to return to, so its row goes.
 *
 * Season totals are recomputed afterwards, which is what actually removes the
 * game's stats from every player and team line.
 */
export async function unpublishScorecard(scorecardId: number) {
  const db = getDb();

  const scorecard = await db.query.scorecards.findFirst({ where: eq(scorecards.id, scorecardId) });
  if (!scorecard) throw new Error("No such scorecard.");
  const game = await db.query.games.findFirst({ where: eq(games.id, scorecard.gameId) });
  if (!game) throw new Error("No such game.");

  const sourceGameId = game.sourceGameId ?? `live-${game.id}`;
  const published = await db.query.historicalGames.findFirst({
    where: eq(historicalGames.sourceGameId, sourceGameId),
  });

  // Nothing published means nothing to withdraw - un-approving a game that
  // never reached the site is not an error.
  if (!published) return { seasonId: null };

  await db.delete(historicalGameStats).where(eq(historicalGameStats.gameId, published.id));
  await db.delete(historicalLineScores).where(eq(historicalLineScores.gameId, published.id));

  if (game.sourceGameId) {
    await db
      .update(historicalGames)
      .set({ awayScore: null, homeScore: null })
      .where(eq(historicalGames.id, published.id));
  } else {
    await db.delete(historicalGames).where(eq(historicalGames.id, published.id));
  }

  await recomputeSeason(published.seasonId);
  return { seasonId: published.seasonId };
}

/**
 * Rebuilds a season's player and team totals from its published games. Derived
 * rather than accumulated: correcting one game cannot leave a stale total
 * behind, because every total is recalculated from the same source.
 */
export async function recomputeSeason(seasonId: number) {
  const db = getDb();

  const seasonTeams = await db
    .select()
    .from(historicalTeams)
    .where(eq(historicalTeams.seasonId, seasonId));
  const teamIds = seasonTeams.map((team) => team.id);
  if (teamIds.length === 0) return;

  const seasonGames = await db
    .select()
    .from(historicalGames)
    .where(eq(historicalGames.seasonId, seasonId));
  const gameIds = seasonGames.map((row) => row.id);

  // Team records.
  for (const team of seasonTeams) {
    let wins = 0;
    let losses = 0;
    let runsScored = 0;
    let runsAllowed = 0;
    for (const game of seasonGames) {
      if (game.awayScore === null || game.homeScore === null) continue;
      const isAway = game.awayTeamId === team.id;
      const isHome = game.homeTeamId === team.id;
      if (!isAway && !isHome) continue;
      const scored = isAway ? game.awayScore : game.homeScore;
      const allowed = isAway ? game.homeScore : game.awayScore;
      runsScored += scored;
      runsAllowed += allowed;
      if (scored > allowed) wins += 1;
      else if (scored < allowed) losses += 1;
    }
    await db
      .update(historicalTeams)
      .set({ wins, losses, runsScored, runsAllowed })
      .where(eq(historicalTeams.id, team.id));
  }

  if (gameIds.length === 0) return;

  const stats = await db
    .select()
    .from(historicalGameStats)
    .where(inArray(historicalGameStats.gameId, gameIds));

  /**
   * Season stats that were scraped rather than scored carry columns a box score
   * has no room for - putouts, errors, fielding percentage, stolen bases,
   * caught stealing, sacrifice flies, saves, complete games. Recomputing from
   * game stats can only rebuild the counting lines, so the scraped row is kept
   * underneath and the derived fields are laid over it. Without this,
   * publishing one live game into an archived season silently thins every
   * player's line in it.
   */
  const existing = await db
    .select()
    .from(historicalPlayerStats)
    .where(inArray(historicalPlayerStats.historicalTeamId, teamIds));
  const priorByKey = new Map(
    existing.map(({ id: _id, ...row }) => [`${row.playerName}::${row.historicalTeamId}`, row]),
  );

  const gameById = new Map(seasonGames.map((game) => [game.id, game]));
  type Totals = Record<string, number>;
  const byPlayerTeam = new Map<
    string,
    { playerName: string; teamId: number; totals: Totals; batted: boolean; pitched: boolean }
  >();

  for (const row of stats) {
    const game = gameById.get(row.gameId);
    if (!game) continue;
    const teamId = row.isHome ? game.homeTeamId : game.awayTeamId;
    if (teamId === null) continue;
    const key = `${row.playerName}::${teamId}`;
    const entry = byPlayerTeam.get(key) ?? {
      playerName: row.playerName,
      teamId,
      totals: {},
      batted: false,
      pitched: false,
    };
    if (row.kind === "BATTING") entry.batted = true;
    else entry.pitched = true;
    const add = (field: string, value: number | null) => {
      if (value === null || value === undefined) return;
      entry.totals[field] = (entry.totals[field] ?? 0) + value;
    };

    if (row.kind === "BATTING") {
      add("games", 1);
      add("atBats", row.atBats);
      add("runs", row.runs);
      add("hits", row.hits);
      add("doubles", row.doubles);
      add("triples", row.triples);
      add("homeRuns", row.homeRuns);
      add("rbis", row.rbis);
      add("walks", row.walks);
      add("strikeouts", row.strikeouts);
      add("hitByPitch", row.hitByPitch);
      add("stolenBases", row.stolenBases);
      add("caughtStealing", row.caughtStealing);
      add("sacFlies", row.sacFlies);
      add("leftOnBase", row.leftOnBase);
      add("putouts", row.putouts);
      add("errors", row.errors);
    } else {
      add("pitchingGames", 1);
      add("inningsPitched", row.inningsPitched);
      add("hitsAllowed", row.hitsAllowed);
      add("runsAllowed", row.runsAllowed);
      add("earnedRuns", row.earnedRuns);
      add("homeRunsAllowed", row.homeRunsAllowed);
      add("strikeoutsPitched", row.strikeoutsPitched);
      add("walksAllowed", row.walksAllowed);
      add("gamesStarted", row.gamesStarted);
      add("completeGames", row.completeGames);
      add("shutouts", row.shutouts);
      add("wins", row.wins);
      add("losses", row.losses);
      add("saves", row.saves);
      add("blownSaves", row.blownSaves);
    }
    byPlayerTeam.set(key, entry);
  }

  await db.delete(historicalPlayerStats).where(inArray(historicalPlayerStats.historicalTeamId, teamIds));

  const rows = [...byPlayerTeam.values()].map(({ playerName, teamId, totals }) => {
    const atBats = totals.atBats ?? 0;
    const hits = totals.hits ?? 0;
    const walks = totals.walks ?? 0;
    const singles = hits - (totals.doubles ?? 0) - (totals.triples ?? 0) - (totals.homeRuns ?? 0);
    const totalBases =
      singles + 2 * (totals.doubles ?? 0) + 3 * (totals.triples ?? 0) + 4 * (totals.homeRuns ?? 0);
    const innings = totals.inningsPitched ?? 0;
    const hitByPitch = totals.hitByPitch ?? 0;
    const sacFlies = totals.sacFlies ?? 0;
    // Plate appearances, properly: everything that ends a turn at bat, not
    // just AB + BB, which loses hit batsmen and sacrifices.
    const onBase = atBats + walks + hitByPitch + sacFlies;
    // On-base percentage counts times reached over times up, and sacrifice
    // bunts are excluded from both by convention - they are not attempts to
    // reach.
    const reached = hits + walks + hitByPitch;
    const putouts = totals.putouts ?? 0;
    const fieldingChances = putouts + (totals.errors ?? 0);
    const pitchingGames = totals.pitchingGames ?? 0;

    return {
      ...priorByKey.get(`${playerName}::${teamId}`),
      seasonId,
      historicalTeamId: teamId,
      playerName,
      isSeasonEndTeam: true,
      games: totals.games ?? null,
      atBats: totals.atBats ?? null,
      runs: totals.runs ?? null,
      hits: totals.hits ?? null,
      doubles: totals.doubles ?? null,
      triples: totals.triples ?? null,
      homeRuns: totals.homeRuns ?? null,
      rbis: totals.rbis ?? null,
      walks: totals.walks ?? null,
      strikeouts: totals.strikeouts ?? null,
      hitByPitch: totals.hitByPitch ?? null,
      stolenBases: totals.stolenBases ?? null,
      caughtStealing: totals.caughtStealing ?? null,
      sacFlies: totals.sacFlies ?? null,
      leftOnBase: totals.leftOnBase ?? null,
      putouts: totals.putouts ?? null,
      errors: totals.errors ?? null,
      // The league scores no assists, so a fielder's chances are the plays he
      // made plus the ones he dropped.
      fieldingPct: fieldingChances > 0 ? putouts / fieldingChances : null,
      totalBases: atBats > 0 ? totalBases : null,
      singles: atBats > 0 ? singles : null,
      plateAppearances: onBase > 0 ? onBase : null,
      battingAverage: atBats > 0 ? hits / atBats : null,
      onBasePct: onBase > 0 ? reached / onBase : null,
      sluggingPct: atBats > 0 ? totalBases / atBats : null,
      ops: atBats > 0 ? reached / Math.max(1, onBase) + totalBases / atBats : null,
      pitchingGames: totals.pitchingGames ?? null,
      gamesStarted: totals.gamesStarted ?? null,
      completeGames: totals.completeGames ?? null,
      shutouts: totals.shutouts ?? null,
      wins: totals.wins ?? null,
      losses: totals.losses ?? null,
      saves: totals.saves ?? null,
      blownSaves: totals.blownSaves ?? null,
      inningsPitched: totals.inningsPitched ?? null,
      hitsAllowed: totals.hitsAllowed ?? null,
      runsAllowed: totals.runsAllowed ?? null,
      earnedRuns: totals.earnedRuns ?? null,
      homeRunsAllowed: totals.homeRunsAllowed ?? null,
      strikeoutsPitched: totals.strikeoutsPitched ?? null,
      walksAllowed: totals.walksAllowed ?? null,
      era: earnedRunAverage(totals.earnedRuns, innings),
      whip: innings > 0 ? ((totals.walksAllowed ?? 0) + (totals.hitsAllowed ?? 0)) / innings : null,
      walksPerGame: pitchingGames > 0 ? (totals.walksAllowed ?? 0) / pitchingGames : null,
      strikeoutsPerGame:
        pitchingGames > 0 ? (totals.strikeoutsPitched ?? 0) / pitchingGames : null,
    };
  });

  // A player with a scraped line but no box score in any counted game - a
  // forfeit-only appearance, or a season imported before per-game data - keeps
  // the line they already had rather than disappearing from the season.
  const rebuilt = new Set(rows.map((row) => `${row.playerName}::${row.historicalTeamId}`));
  const untouched = [...priorByKey].filter(([key]) => !rebuilt.has(key)).map(([, row]) => row);

  await insertInChunks(
    (chunk) => db.insert(historicalPlayerStats).values(chunk),
    [...rows, ...untouched] as typeof rows,
  );
}
