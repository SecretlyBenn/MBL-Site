import { and, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "./index";
import { getLogoOverrides } from "./logos";
import { getAvatarsFor, inningsPerGameFor } from "./queries";
import { currentSeasonName } from "./settings";
import { logoKey, teamLogoPath } from "@/app/logo-key";
import { runnersOn, type BaseName } from "@/app/bases";
import { REGULATION_INNINGS, currentBases, gameState } from "@/app/derive-box-score";
import { earnedRunAverage, nextInOrder } from "@/app/scoring";
import {
  games,
  historicalPlayerStats,
  historicalSeasons,
  players,
  plateAppearances,
  scorecardLineups,
  scorecards,
  teams,
} from "./schema";

/**
 * What a stadium's jumbotron needs from the site.
 *
 * The in-game plugin already owns the count, the outs, the score and the
 * inning - they are what the umpire types at the plate, and they reach the
 * screen over the plugin's own channel without the site being involved. What
 * the plugin has no idea about is who anybody is: the names on the bases, who
 * is up, who is pitching, and what the two clubs are called. That is all this
 * is for.
 *
 * Both sides carry their own next batter and their own pitcher, rather than
 * only the side the site believes is batting. The plugin is normally a play
 * ahead - the umpire calls the third out on the field well before they record
 * it here - so the board has to be able to name the other side's leadoff man
 * the moment the half turns over, without waiting for this to catch up.
 *
 * The line score and every man's figures for the day come out of the box score
 * that is derived here anyway, so they cost nothing to send. What is
 * deliberately *not* sent is season averages. Those live in the archive, keyed
 * by name, and reading them on a poll that runs every few seconds all evening
 * is the kind of query that has taken this site down before. A real board
 * leads with what a man has done today in any case.
 */

/** What a batter has done in this game. Not his season - see above. */
export type BatterGameLine = {
  atBats: number;
  hits: number;
  runs: number;
  homeRuns: number;
  rbis: number;
  walks: number;
  strikeouts: number;
};

/**
 * What a pitcher has done in this game. Outs rather than innings, so the board
 * can write 4.2 the way a scoreboard writes it without the thirds being
 * rounded on the way here.
 */
export type PitcherGameLine = {
  outs: number;
  hits: number;
  runs: number;
  earnedRuns: number;
  walks: number;
  strikeouts: number;
};

/**
 * What a player has done this season, which is the number a ballpark board
 * puts beside a name.
 *
 * Taken from the archive, which is where a season's totals live once a game is
 * approved, and from whichever season the league has set as the current one -
 * so during the playoffs these are playoff figures, on a handful of games.
 * That is what the Seasons page says the league is playing, and the board
 * should not quietly disagree with the rest of the site.
 *
 * A player who has changed club mid-season has a row per club, so the rows are
 * added together rather than taking the first.
 */
export type SeasonLine = {
  /** Worked out here: a board has no room to print hits and at-bats as well. */
  average: number | null;
  homeRuns: number;
  rbis: number;
  /** Nulls for somebody who has not pitched, which is most of a side. */
  era: number | null;
  wins: number;
  losses: number;
};

export type ScoreboardPlayer = {
  playerId: number;
  name: string;
  /**
   * The Minecraft account behind the name, which is where the head beside it
   * comes from. Null for a player nobody has linked, and the board draws a
   * blank square rather than a stranger's face.
   */
  uuid: string | null;
};

export type ScoreboardLineupRow = ScoreboardPlayer & {
  slot: number | null;
  position: string;
  line: BatterGameLine;
  season: SeasonLine | null;
};

export type ScoreboardSide = {
  teamId: number;
  name: string;
  abbreviation: string;
  color: string | null;
  logo: string | null;
  /** The order as handed in, with whoever holds each slot now. */
  lineup: ScoreboardLineupRow[];
  /** Who bats next for this side, by the last slot it batted. */
  nextBatter:
    | (ScoreboardPlayer & {
        slot: number | null;
        position: string;
        line: BatterGameLine;
        season: SeasonLine | null;
      })
    | null;
  /** Whoever is standing at P for this side. */
  pitcher: (ScoreboardPlayer & { line: PitcherGameLine; season: SeasonLine | null }) | null;
};

/**
 * The row of numbers that makes a scoreboard a scoreboard.
 *
 * `away` and `home` run only as far as each side has actually batted, so a
 * half-inning that has not been played is a gap rather than a nought - the
 * difference between being held scoreless and still being in the dugout.
 */
export type Linescore = {
  /** A full game here is six innings, not nine. */
  regulation: number;
  away: number[];
  home: number[];
  awayHits: number;
  homeHits: number;
  awayErrors: number;
  homeErrors: number;
};

export type Scoreboard = {
  /** The club whose stadium this board belongs to. */
  clubId: number;
  clubIsHome: boolean;
  gameId: number;
  scorecardId: number;
  away: ScoreboardSide;
  home: ScoreboardSide;
  /**
   * The site's reading of where the game is. The plugin's numbers win on
   * screen; these are sent so the board can tell whether its runners are still
   * the current ones.
   */
  inning: number;
  isHomeBatting: boolean;
  outs: number;
  awayScore: number;
  homeScore: number;
  /** Runners aboard, nearest home first - the order they would score in. */
  bases: { base: BaseName; playerId: number; name: string }[];
  linescore: Linescore;
};

/** Columns `deriveBoxScore` needs, and nothing else - this runs on a poll. */
const APPEARANCE_COLUMNS = {
  sequence: plateAppearances.sequence,
  inning: plateAppearances.inning,
  isHomeBatting: plateAppearances.isHomeBatting,
  batterPlayerId: plateAppearances.batterPlayerId,
  pitcherPlayerId: plateAppearances.pitcherPlayerId,
  battingSlot: plateAppearances.battingSlot,
  result: plateAppearances.result,
  fielders: plateAppearances.fielders,
  rbis: plateAppearances.rbis,
  batterScored: plateAppearances.batterScored,
  otherRunsScored: plateAppearances.otherRunsScored,
  unearnedRuns: plateAppearances.unearnedRuns,
  outsRecorded: plateAppearances.outsRecorded,
  errorPosition: plateAppearances.errorPosition,
  errorPlayerId: plateAppearances.errorPlayerId,
  stolenBases: plateAppearances.stolenBases,
  stolenBy: plateAppearances.stolenBy,
  putoutPlayerId: plateAppearances.putoutPlayerId,
  basesAfter: plateAppearances.basesAfter,
  runnersScored: plateAppearances.runnersScored,
};

/** A man who has not come to the plate yet still gets a line, all noughts. */
const NO_BATTING: BatterGameLine = {
  atBats: 0,
  hits: 0,
  runs: 0,
  homeRuns: 0,
  rbis: 0,
  walks: 0,
  strikeouts: 0,
};

const NO_PITCHING: PitcherGameLine = {
  outs: 0,
  hits: 0,
  runs: 0,
  earnedRuns: 0,
  walks: 0,
  strikeouts: 0,
};

/**
 * Season figures for the men in one game, kept for a while rather than read on
 * every poll.
 *
 * The query itself is cheap - the archive indexes player_name, and a game's
 * worth of players comes back in a couple of hundred rows - but this endpoint
 * is polled every few seconds for the whole of a three-hour evening, and a
 * couple of hundred rows two thousand times over is a quarter of the day's
 * read budget for one game. A season total cannot change while a game is being
 * played: it moves when a scorecard is approved, which is after the last pitch.
 * So it is looked up once and held.
 *
 * Module state in a Worker lives as long as the isolate does, which is not
 * promised. Losing it costs one more query, so there is nothing to handle.
 */
const SEASON_HELD_MS = 10 * 60 * 1000;
let seasonCache: { key: string; at: number; lines: Record<string, SeasonLine> } | null = null;

/** Names per statement, the way the rest of the site batches them for D1. */
const SEASON_BATCH = 80;

async function seasonLines(names: string[], leagueId: number | null) {
  const wanted = [...new Set(names)].sort();
  if (wanted.length === 0) return {};

  const seasonName = await currentSeasonName();
  const key = `${seasonName}|${leagueId ?? "none"}|${wanted.join(",")}`;
  const held = seasonCache;
  if (held && held.key === key && Date.now() - held.at < SEASON_HELD_MS) return held.lines;

  const db = getDb();
  const season = await db.query.historicalSeasons.findFirst({
    where: eq(historicalSeasons.name, seasonName),
  });
  // The current-season setting names one season for the whole site, and the
  // MCBA's seasons are not the MBL's. Rather than put one competition's
  // averages on the other's board, a club whose league the season does not
  // belong to simply gets none.
  if (!season || (leagueId !== null && season.leagueId !== null && season.leagueId !== leagueId)) {
    seasonCache = { key, at: Date.now(), lines: {} };
    return {};
  }

  // The length of a game here, which is the divisor in an earned run average:
  // six in the MBL and five in the MCBA.
  const inningsPerGame = await inningsPerGameFor(leagueId);

  const lines: Record<string, SeasonLine> = {};
  for (let at = 0; at < wanted.length; at += SEASON_BATCH) {
    const batch = wanted.slice(at, at + SEASON_BATCH);
    const rows = await db
      .select({
        name: historicalPlayerStats.playerName,
        atBats: sql<number>`sum(coalesce(${historicalPlayerStats.atBats}, 0))`,
        hits: sql<number>`sum(coalesce(${historicalPlayerStats.hits}, 0))`,
        homeRuns: sql<number>`sum(coalesce(${historicalPlayerStats.homeRuns}, 0))`,
        rbis: sql<number>`sum(coalesce(${historicalPlayerStats.rbis}, 0))`,
        innings: sql<number>`sum(coalesce(${historicalPlayerStats.inningsPitched}, 0))`,
        earnedRuns: sql<number>`sum(coalesce(${historicalPlayerStats.earnedRuns}, 0))`,
        wins: sql<number>`sum(coalesce(${historicalPlayerStats.wins}, 0))`,
        losses: sql<number>`sum(coalesce(${historicalPlayerStats.losses}, 0))`,
      })
      .from(historicalPlayerStats)
      .where(
        and(
          eq(historicalPlayerStats.seasonId, season.id),
          inArray(historicalPlayerStats.playerName, batch),
        ),
      )
      .groupBy(historicalPlayerStats.playerName);

    for (const row of rows) {
      lines[row.name] = {
        average: row.atBats > 0 ? row.hits / row.atBats : null,
        homeRuns: row.homeRuns,
        rbis: row.rbis,
        era: row.innings > 0 ? earnedRunAverage(row.earnedRuns, row.innings, inningsPerGame) : null,
        wins: row.wins,
        losses: row.losses,
      };
    }
  }

  seasonCache = { key, at: Date.now(), lines };
  return lines;
}

/**
 * A club's logo as an address the jumbotron can load.
 *
 * Resolved exactly the way `TeamLogo` resolves it, so the screen in the stadium
 * shows the same crest as the website - an uploaded logo first, then the one
 * that ships with the site. Made absolute because the mod's own bundled page is
 * a file:// document, where a relative path points at the player's own disk.
 */
function logoFor(teamName: string, overrides: Record<string, string>, origin: string) {
  const path = overrides[logoKey(teamName)] ?? teamLogoPath(teamName);
  return path ? new URL(path, origin).toString() : null;
}

/**
 * The live game at a club's ground, or null when there is not one.
 *
 * A club is looked for as the home side first. Their own stadium is where their
 * home games are played, so that is the game the screen there should show;
 * falling back to an away game means a club whose screen is lit on a night they
 * are away still sees their own score rather than a blank board.
 */
export async function getScoreboard(clubId: number, origin: string): Promise<Scoreboard | null> {
  const db = getDb();

  const live = await db
    .select()
    .from(games)
    .where(
      and(
        eq(games.status, "IN_PROGRESS"),
        or(eq(games.homeTeamId, clubId), eq(games.awayTeamId, clubId)),
      ),
    );
  if (live.length === 0) return null;

  const game = live.find((row) => row.homeTeamId === clubId) ?? live[0];

  const scorecard = await db.query.scorecards.findFirst({
    where: and(eq(scorecards.gameId, game.id), eq(scorecards.status, "IN_PROGRESS")),
  });
  if (!scorecard) return null;

  const [clubs, lineups, appearances, overrides] = await Promise.all([
    db.select().from(teams).where(inArray(teams.id, [game.awayTeamId, game.homeTeamId])),
    db.select().from(scorecardLineups).where(eq(scorecardLineups.scorecardId, scorecard.id)),
    db
      .select(APPEARANCE_COLUMNS)
      .from(plateAppearances)
      .where(eq(plateAppearances.scorecardId, scorecard.id)),
    getLogoOverrides(),
  ]);

  const awayClub = clubs.find((club) => club.id === game.awayTeamId);
  const homeClub = clubs.find((club) => club.id === game.homeTeamId);
  if (!awayClub || !homeClub) return null;

  // Ordered here rather than in SQL because every derivation below walks the
  // card in sequence, and an unordered read would put the last play first.
  // Left unannotated so the rows keep `battingSlot`, which the box score does
  // not need but the next batter is worked out from.
  const ordered = [...appearances].sort((a, b) => a.sequence - b.sequence);

  // Six innings in the MBL, five in the MCBA: it decides when the game is
  // over and how many columns the line score draws.
  const inningsPerGame = await inningsPerGameFor(awayClub.leagueId);
  const state = gameState(ordered, inningsPerGame);
  const bases = currentBases(ordered, inningsPerGame);

  const aboard = runnersOn(bases).map((runner) => runner.playerId);
  const wanted = [...new Set([...lineups.map((row) => row.playerId), ...aboard])];
  const roster = wanted.length
    ? await db
        .select({ id: players.id, displayName: players.displayName })
        .from(players)
        .where(inArray(players.id, wanted))
    : [];
  const nameOf = new Map(roster.map((player) => [player.id, player.displayName]));
  const name = (playerId: number) => nameOf.get(playerId) ?? "Unknown";

  // Heads come from the account id and never from the name, for the reason the
  // rest of the site gives: names get reused by strangers. One batched lookup
  // covers the two dozen men in a game, which is what getAvatarsFor is for.
  const avatars = await getAvatarsFor(roster.map((player) => player.displayName));
  const uuidOf = (playerId: number) => avatars[nameOf.get(playerId) ?? ""] ?? null;

  // Season figures are keyed by name, the way the whole archive is. Both clubs
  // are in one competition - a fixture takes its league from the clubs playing
  // it - so either one answers for which season applies.
  const season = await seasonLines(
    roster.map((player) => player.displayName),
    awayClub.leagueId,
  );
  const seasonOf = (playerId: number) => season[nameOf.get(playerId) ?? ""] ?? null;

  // Everybody's figures for the day, taken out of the box score that was
  // derived above anyway. Both sides go in one map because the man the board is
  // featuring may belong to either: when the plugin has rolled the half over,
  // the batter shown is the other side's leadoff man.
  const batting = new Map(
    [...state.awayBatting, ...state.homeBatting].map((line): [number, BatterGameLine] => [
      line.playerId,
      {
        atBats: line.atBats,
        hits: line.hits,
        runs: line.runs,
        homeRuns: line.homeRuns,
        rbis: line.rbis,
        walks: line.walks,
        strikeouts: line.strikeouts,
      },
    ]),
  );
  const pitching = new Map(
    [...state.awayPitching, ...state.homePitching].map((line): [number, PitcherGameLine] => [
      line.playerId,
      {
        outs: line.outs,
        hits: line.hits,
        runs: line.runs,
        earnedRuns: line.earnedRuns,
        walks: line.walks,
        strikeouts: line.strikeouts,
      },
    ]),
  );

  // Somebody who has walked off the field keeps their lineup row and their
  // batting slot, because in this league they come back - but the turn passes
  // over them and they are not standing anywhere. Same rule the umpire's board
  // uses, so the two cannot name different people.
  const onField = (row: { leftAtSequence: number | null }) => row.leftAtSequence === null;

  const sideOf = (isHome: boolean): ScoreboardSide => {
    const club = isHome ? homeClub : awayClub;
    const rows = lineups.filter((row) => row.isHome === isHome);

    // Whose turn it is, worked out the way the umpire's board works it out: the
    // first slot above the one that batted last. A count of plate appearances
    // modulo the lineup size drifts the moment the order is not a clean nine.
    const order = rows
      .filter((row) => row.battingOrder !== null && onField(row))
      .sort((a, b) => (a.battingOrder ?? 0) - (b.battingOrder ?? 0));
    const lastForSide = ordered
      .filter((row) => row.isHomeBatting === isHome)
      .sort((a, b) => b.sequence - a.sequence)[0];
    const up = nextInOrder(order, lastForSide?.battingSlot ?? null);

    // Whoever is standing at P. The position is what an umpire can see and fix,
    // so it wins over the pitching order - a change made before moving to P
    // once left the old pitcher holding the order while standing at first base.
    const standing = rows.filter(onField);
    const onMound =
      standing.find((row) => row.position === "P") ??
      standing
        .filter((row) => row.pitchingOrder !== null)
        .sort((a, b) => (b.pitchingOrder ?? 0) - (a.pitchingOrder ?? 0))[0];

    return {
      teamId: club.id,
      name: club.name,
      abbreviation: club.abbreviation,
      color: club.color,
      logo: logoFor(club.name, overrides, origin),
      lineup: rows
        .filter((row) => row.battingOrder !== null)
        .sort((a, b) => (a.battingOrder ?? 0) - (b.battingOrder ?? 0))
        .map((row) => ({
          slot: row.battingOrder,
          playerId: row.playerId,
          name: name(row.playerId),
          position: row.position,
          uuid: uuidOf(row.playerId),
          line: batting.get(row.playerId) ?? NO_BATTING,
          season: seasonOf(row.playerId),
        })),
      nextBatter: up
        ? {
            playerId: up.playerId,
            name: name(up.playerId),
            slot: up.battingOrder,
            position: up.position,
            uuid: uuidOf(up.playerId),
            line: batting.get(up.playerId) ?? NO_BATTING,
            season: seasonOf(up.playerId),
          }
        : null,
      pitcher: onMound
        ? {
            playerId: onMound.playerId,
            name: name(onMound.playerId),
            uuid: uuidOf(onMound.playerId),
            line: pitching.get(onMound.playerId) ?? NO_PITCHING,
            season: seasonOf(onMound.playerId),
          }
        : null,
    };
  };

  return {
    clubId,
    clubIsHome: game.homeTeamId === clubId,
    gameId: game.id,
    scorecardId: scorecard.id,
    away: sideOf(false),
    home: sideOf(true),
    inning: state.inning,
    isHomeBatting: state.isHomeBatting,
    outs: state.outs,
    awayScore: state.awayScore,
    homeScore: state.homeScore,
    bases: runnersOn(bases).map((runner) => ({
      base: runner.base,
      playerId: runner.playerId,
      name: name(runner.playerId),
    })),
    linescore: {
      regulation: inningsPerGame,
      away: state.awayInnings,
      home: state.homeInnings,
      awayHits: state.awayHits,
      homeHits: state.homeHits,
      awayErrors: state.awayErrors,
      homeErrors: state.homeErrors,
    },
  };
}
