import { and, eq, inArray, or } from "drizzle-orm";
import { getDb } from "./index";
import { getLogoOverrides } from "./logos";
import { logoKey, teamLogoPath } from "@/app/logo-key";
import { runnersOn, type BaseName } from "@/app/bases";
import { currentBases, gameState } from "@/app/derive-box-score";
import { nextInOrder } from "@/app/scoring";
import { games, players, plateAppearances, scorecardLineups, scorecards, teams } from "./schema";

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
 */

export type ScoreboardPlayer = {
  playerId: number;
  name: string;
};

export type ScoreboardSide = {
  teamId: number;
  name: string;
  abbreviation: string;
  color: string | null;
  logo: string | null;
  /** The order as handed in, with whoever holds each slot now. */
  lineup: { slot: number | null; playerId: number; name: string; position: string }[];
  /** Who bats next for this side, by the last slot it batted. */
  nextBatter: (ScoreboardPlayer & { slot: number | null }) | null;
  /** Whoever is standing at P for this side. */
  pitcher: ScoreboardPlayer | null;
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

  const state = gameState(ordered);
  const bases = currentBases(ordered);

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
        })),
      nextBatter: up
        ? { playerId: up.playerId, name: name(up.playerId), slot: up.battingOrder }
        : null,
      pitcher: onMound ? { playerId: onMound.playerId, name: name(onMound.playerId) } : null,
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
  };
}
