import { isSkip, RESULT_BY_CODE, POSITION_NUMBER, type ResultCode } from "./scoring.ts";
import {
  advance,
  decodeBases,
  decodeRunners,
  EMPTY_BASES,
  runnersOn,
  type Bases,
} from "./bases.ts";

/**
 * Turns plate appearances into a box score. Everything public about a scored
 * game comes through here, so a corrected at-bat flows to the batting line, the
 * pitching line and the score without anything else needing to be kept in step.
 */

export type StoredPlateAppearance = {
  sequence: number;
  inning: number;
  isHomeBatting: boolean;
  batterPlayerId: number;
  pitcherPlayerId: number;
  result: string;
  fielders: string | null;
  rbis: number;
  batterScored: boolean;
  otherRunsScored: number;
  /** Stored end-state of the bases, when the umpire placed runners by hand. */
  basesAfter?: string | null;
  /** Which runners crossed the plate, as player ids. */
  runnersScored?: string | null;
  unearnedRuns: number;
  outsRecorded: number;
  errorPosition: number | null;
  errorPlayerId: number | null;
  stolenBases: number;
  /** Player ids of the runners who stole on this play. */
  stolenBy?: string | null;
  /** Whoever the league credits with the out, or null when nobody is. */
  putoutPlayerId?: number | null;
};

/**
 * A runner retired between plays. These never appear as plate appearances, so
 * the caught stealings and the tag-play putouts they carry reach the box score
 * only if they are handed in alongside.
 */
export type StoredRunnerOut = {
  runnerPlayerId: number;
  /** TAGGED, PICKED_OFF, CAUGHT_STEALING, FORCED. */
  kind: string;
  putoutPlayerId?: number | null;
};

/**
 * Where a fielder stood and from when. Starters carry sequence 0; every later
 * rearrangement is its own entry, so "who was at short in the fourth" is
 * answered by taking the latest entry at or before that play.
 */
export type FieldingSlot = {
  isHome: boolean;
  playerId: number;
  position: string;
  fromSequence: number;
  /** The play they left the game after, if they did. */
  untilSequence?: number | null;
};

export type BoxContext = {
  runnerOuts?: StoredRunnerOut[];
  /** Starting lineups plus every fielding change, in any order. */
  fielding?: FieldingSlot[];
};

export type BattingLine = {
  playerId: number;
  plateAppearances: number;
  atBats: number;
  runs: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbis: number;
  walks: number;
  hitByPitch: number;
  strikeouts: number;
  stolenBases: number;
  caughtStealing: number;
  sacFlies: number;
  sacBunts: number;
  /**
   * Runners this batter stranded. The league charges the whole inning's
   * stranded runners to the man who made the last out of it, so this is zero
   * for everyone else - two aboard when the third out is made is two left on
   * base against that batter, and nothing against the two who reached.
   */
  leftOnBase: number;
  totalBases: number;
  /**
   * Outs this player was credited with in the field. The league scores one per
   * play and no assists, so these are whole plays rather than shares of them.
   */
  putouts: number;
  /** Errors charged to this player, whether or not the batter reached. */
  errors: number;
  /**
   * Defensive outs that elapsed while this player was stationed at each
   * position, keyed by position. This is time on the field rather than plays
   * made, which is what decides someone's primary position.
   */
  positionOuts: Record<string, number>;
};

export type PitchingLine = {
  playerId: number;
  outs: number;
  /** Thirds of an inning as a decimal, for ERA - not baseball notation. */
  inningsPitched: number;
  battersFaced: number;
  hits: number;
  runs: number;
  earnedRuns: number;
  homeRuns: number;
  walks: number;
  strikeouts: number;
  /** Took the mound for the first batter of the game. */
  gamesStarted: number;
  completeGames: number;
  shutouts: number;
  wins: number;
  losses: number;
  saves: number;
  blownSaves: number;
};

const emptyBatting = (playerId: number): BattingLine => ({
  playerId, plateAppearances: 0, atBats: 0, runs: 0, hits: 0, singles: 0, doubles: 0,
  triples: 0, homeRuns: 0, rbis: 0, walks: 0, hitByPitch: 0, strikeouts: 0, stolenBases: 0,
  caughtStealing: 0, sacFlies: 0, sacBunts: 0, leftOnBase: 0, totalBases: 0,
  putouts: 0, errors: 0, positionOuts: {},
});

const emptyPitching = (playerId: number): PitchingLine => ({
  playerId, outs: 0, inningsPitched: 0, battersFaced: 0, hits: 0, runs: 0,
  earnedRuns: 0, homeRuns: 0, walks: 0, strikeouts: 0,
  gamesStarted: 0, completeGames: 0, shutouts: 0, wins: 0, losses: 0, saves: 0, blownSaves: 0,
});

export type DerivedBoxScore = {
  awayBatting: BattingLine[];
  homeBatting: BattingLine[];
  awayPitching: PitchingLine[];
  homePitching: PitchingLine[];
  /** Runs per inning, in order, for each side. */
  awayInnings: number[];
  homeInnings: number[];
  awayScore: number;
  homeScore: number;
  awayHits: number;
  homeHits: number;
  awayErrors: number;
  homeErrors: number;
  /** Outs in the half-inning currently being scored. */
  currentOuts: number;
  currentInning: number;
  isHomeBatting: boolean;
};

/**
 * Who was standing where on the fielding side when a given play happened.
 * The latest entry at or before the play wins, which is what makes a
 * mid-inning rearrangement take effect from that play onwards and not before.
 */
function alignmentAt(fielding: FieldingSlot[], isHome: boolean, sequence: number) {
  const byPlayer = new Map<number, { position: string; from: number }>();
  for (const slot of fielding) {
    if (slot.isHome !== isHome) continue;
    if (slot.fromSequence > sequence) continue;
    // Someone who has gone home is not serving outs at any position.
    if (slot.untilSequence !== undefined && slot.untilSequence !== null && sequence > slot.untilSequence) {
      byPlayer.delete(slot.playerId);
      continue;
    }
    const held = byPlayer.get(slot.playerId);
    if (!held || slot.fromSequence >= held.from) {
      byPlayer.set(slot.playerId, { position: slot.position, from: slot.fromSequence });
    }
  }
  // Two players cannot hold one position; the more recent assignment displaces
  // the older, which is how a swap reads when only one half of it was entered.
  const byPosition = new Map<string, { playerId: number; from: number }>();
  for (const [playerId, held] of byPlayer) {
    if (held.position === "DH") continue;
    if (!POSITION_NUMBER[held.position]) continue;
    const sitting = byPosition.get(held.position);
    if (!sitting || held.from >= sitting.from) {
      byPosition.set(held.position, { playerId, from: held.from });
    }
  }
  return byPosition;
}

/** A league game is six innings; anything past that is extra innings. */
export const REGULATION_INNINGS = 6;

/**
 * The last man to bat in each half-inning, keyed by inning and side.
 *
 * He is two things at once: the batter charged with whatever runners were
 * left standing, and - in extra innings - the runner his side starts the next
 * inning with on second.
 */
function lastBatterByHalf(ordered: StoredPlateAppearance[]) {
  const last = new Map<string, number>();
  for (const pa of ordered) {
    if (isSkip(pa.result)) continue;
    last.set(`${pa.inning}:${pa.isHomeBatting}`, pa.batterPlayerId);
  }
  return last;
}

/**
 * Who a side starts an extra inning with on second base: the batter who made
 * the last out of their previous inning.
 *
 * Returns null in regulation, and in an extra inning whose previous inning has
 * nobody to draw from - the first inning of a game cannot place a runner, and
 * neither can a half nobody batted in.
 */
export function extraInningsRunner(
  appearances: StoredPlateAppearance[],
  inning: number,
  isHomeBatting: boolean,
) {
  if (inning <= REGULATION_INNINGS) return null;
  const ordered = [...appearances].sort((a, b) => a.sequence - b.sequence);
  return lastBatterByHalf(ordered).get(`${inning - 1}:${isHomeBatting}`) ?? null;
}

/** The bases a half-inning opens with - empty, or the placed runner on second. */
export function startingBases(
  appearances: StoredPlateAppearance[],
  inning: number,
  isHomeBatting: boolean,
): Bases {
  const runner = extraInningsRunner(appearances, inning, isHomeBatting);
  return runner === null ? EMPTY_BASES : { first: null, second: runner, third: null };
}

export function deriveBoxScore(
  appearances: StoredPlateAppearance[],
  context: BoxContext = {},
): DerivedBoxScore {
  const ordered = [...appearances].sort((a, b) => a.sequence - b.sequence);

  const batting = { away: new Map<number, BattingLine>(), home: new Map<number, BattingLine>() };
  const pitching = { away: new Map<number, PitchingLine>(), home: new Map<number, PitchingLine>() };
  const innings = { away: [] as number[], home: [] as number[] };
  const errors = { away: 0, home: 0 };
  const fielding = context.fielding ?? [];

  // A fielder's line lives with their own side's batting, since that is where
  // the archive keeps fielding. Reached for by putouts, errors and time on the
  // field, none of which require the player to have batted.
  const fielderLine = (side: "home" | "away", playerId: number) => {
    const line = batting[side].get(playerId) ?? emptyBatting(playerId);
    batting[side].set(playerId, line);
    return line;
  };

  // Bases are replayed alongside the counting stats so that the runners still
  // standing when a half-inning ends can be charged to the man who ended it.
  let bases = EMPTY_BASES;
  let half: string | null = null;
  /** The last batter of the half in progress, and what he left behind. */
  let stranding: { side: "home" | "away"; batterPlayerId: number; runners: number } | null = null;
  /**
   * The runner placed on second to start an extra inning. He got there without
   * the pitcher letting him on, so a run he scores is not earned.
   */
  let placedRunner: number | null = null;
  const lastBatter = lastBatterByHalf(ordered);

  const flushStranded = () => {
    if (!stranding || stranding.runners === 0) return;
    const line = batting[stranding.side].get(stranding.batterPlayerId);
    if (line) line.leftOnBase += stranding.runners;
    stranding = null;
  };

  for (const pa of ordered) {
    const side = pa.isHomeBatting ? "home" : "away";
    // The pitcher belongs to the fielding side, which is the other one.
    const fieldingSide = pa.isHomeBatting ? "away" : "home";

    const thisHalf = `${pa.inning}:${pa.isHomeBatting}`;
    if (thisHalf !== half) {
      // The side has changed, so whoever batted last in the half just gone
      // stranded everyone still standing.
      flushStranded();
      // Extra innings open with the batter who made the last out of the
      // previous inning standing on second.
      placedRunner =
        pa.inning > REGULATION_INNINGS
          ? lastBatter.get(`${pa.inning - 1}:${pa.isHomeBatting}`) ?? null
          : null;
      bases =
        placedRunner === null
          ? EMPTY_BASES
          : { first: null, second: placedRunner, third: null };
      half = thisHalf;
    }

    // Defensive outs are time on the field: they are served by whoever was
    // standing there, whether or not the ball came anywhere near them.
    if (pa.outsRecorded > 0 && fielding.length > 0) {
      const alignment = alignmentAt(fielding, fieldingSide === "home", pa.sequence);
      for (const [position, holder] of alignment) {
        const line = fielderLine(fieldingSide, holder.playerId);
        line.positionOuts[position] = (line.positionOuts[position] ?? 0) + pa.outsRecorded;
      }
    }

    // A skipped batter never came to the plate. The order moved past them, but
    // nothing is charged to them or to the pitcher - counting it would give a
    // player who was not there a plate appearance and inflate batters faced.
    if (isSkip(pa.result)) continue;

    const definition = RESULT_BY_CODE.get(pa.result as ResultCode);

    const batter = batting[side].get(pa.batterPlayerId) ?? emptyBatting(pa.batterPlayerId);
    const pitcher =
      pitching[fieldingSide].get(pa.pitcherPlayerId) ?? emptyPitching(pa.pitcherPlayerId);

    const runs = (pa.batterScored ? 1 : 0) + pa.otherRunsScored;

    batter.plateAppearances += 1;
    batter.rbis += pa.rbis;
    if (pa.batterScored) batter.runs += 1;

    if (definition) {
      if (definition.isAtBat) batter.atBats += 1;
      if (definition.isHit) {
        batter.hits += 1;
        batter.totalBases += definition.bases;
        if (definition.code === "1B") batter.singles += 1;
        if (definition.code === "2B") batter.doubles += 1;
        if (definition.code === "3B") batter.triples += 1;
        if (definition.code === "HR") batter.homeRuns += 1;
      }
      if (definition.isWalk) batter.walks += 1;
      if (definition.code === "HBP") batter.hitByPitch += 1;
      if (definition.code === "SF") batter.sacFlies += 1;
      if (definition.code === "SH") batter.sacBunts += 1;
      if (definition.isStrikeout) batter.strikeouts += 1;

      pitcher.battersFaced += 1;
      if (definition.isHit) pitcher.hits += 1;
      if (definition.code === "HR") pitcher.homeRuns += 1;
      if (definition.isWalk) pitcher.walks += 1;
      if (definition.isStrikeout) pitcher.strikeouts += 1;
    }

    // A run belongs to the man who crossed the plate. Only the batter coming
    // round was ever credited, so every runner driven in by somebody else had
    // his run counted for the team and for nobody.
    const scorers = decodeRunners(pa.runnersScored);
    for (const playerId of scorers) {
      const line = batting[side].get(playerId) ?? emptyBatting(playerId);
      line.runs += 1;
      batting[side].set(playerId, line);
    }

    pitcher.outs += pa.outsRecorded;
    pitcher.runs += runs;
    // The placed runner reached second without the pitcher putting him there,
    // so his run is not charged to the earned-run average.
    const placedScored = placedRunner !== null && scorers.includes(placedRunner) ? 1 : 0;
    pitcher.earnedRuns += Math.max(0, runs - pa.unearnedRuns - placedScored);

    if (pa.putoutPlayerId) {
      fielderLine(fieldingSide, pa.putoutPlayerId).putouts += 1;
    }

    // An error is charged to the fielding side, and to the fielder by name
    // when the umpire said who booted it.
    if (pa.errorPosition !== null || pa.errorPlayerId !== null) {
      errors[fieldingSide] += 1;
      if (pa.errorPlayerId) fielderLine(fieldingSide, pa.errorPlayerId).errors += 1;
    }

    batting[side].set(pa.batterPlayerId, batter);
    pitching[fieldingSide].set(pa.pitcherPlayerId, pitcher);

    // Innings are 1-based and a side may not have batted in every one.
    const list = innings[side];
    while (list.length < pa.inning) list.push(0);
    list[pa.inning - 1] += runs;

    // Where the play left the bases, so the next one starts from it and this
    // batter can be charged with whoever he stranded.
    if (pa.basesAfter) {
      bases = decodeBases(pa.basesAfter);
    } else {
      bases = advance(bases, {
        batterPlayerId: pa.batterPlayerId,
        result: pa.result,
        scored: decodeRunners(pa.runnersScored),
      }).bases;
    }
    // Held rather than credited: it only becomes a stranding if nobody bats
    // after him in this half.
    stranding = { side, batterPlayerId: pa.batterPlayerId, runners: runnersOn(bases).length };

    // A steal goes to the runner who made it. Only a play recorded before
    // there was anywhere to put that has to fall back to the batter, and on
    // those the batter usually was the runner.
    if (pa.stolenBases > 0) {
      const thieves = decodeRunners(pa.stolenBy);
      if (thieves.length > 0) {
        for (const playerId of thieves) {
          const line = batting[side].get(playerId) ?? emptyBatting(playerId);
          line.stolenBases += 1;
          batting[side].set(playerId, line);
        }
      } else {
        batter.stolenBases += pa.stolenBases;
      }
    }
  }

  // The last half-inning of the game has nothing after it to trigger the
  // flush, so it is closed out here.
  flushStranded();

  // Runners retired between plays. The runner batted for his own side; the
  // fielder who got him bats for the other one.
  for (const out of context.runnerOuts ?? []) {
    const runnerSide = batting.home.has(out.runnerPlayerId) ? "home" : "away";
    if (out.kind === "CAUGHT_STEALING") {
      fielderLine(runnerSide, out.runnerPlayerId).caughtStealing += 1;
    }
    if (out.putoutPlayerId) {
      fielderLine(runnerSide === "home" ? "away" : "home", out.putoutPlayerId).putouts += 1;
    }
  }

  for (const line of pitching.away.values()) line.inningsPitched = line.outs / 3;
  for (const line of pitching.home.values()) line.inningsPitched = line.outs / 3;

  const last = ordered.at(-1);
  const currentInning = last?.inning ?? 1;
  const isHomeBatting = last?.isHomeBatting ?? false;
  const currentOuts = ordered
    .filter((pa) => pa.inning === currentInning && pa.isHomeBatting === isHomeBatting)
    .reduce((total, pa) => total + pa.outsRecorded, 0);

  const total = (list: number[]) => list.reduce((sum, runs) => sum + runs, 0);
  const sumBy = (lines: Iterable<BattingLine>, key: keyof BattingLine) =>
    [...lines].reduce((sum, line) => sum + (line[key] as number), 0);

  const awayScore = total(innings.away);
  const homeScore = total(innings.home);

  assignDecisions(ordered, pitching, { awayScore, homeScore });

  return {
    awayBatting: [...batting.away.values()],
    homeBatting: [...batting.home.values()],
    awayPitching: [...pitching.away.values()],
    homePitching: [...pitching.home.values()],
    awayInnings: innings.away,
    homeInnings: innings.home,
    awayScore,
    homeScore,
    awayHits: sumBy(batting.away.values(), "hits"),
    homeHits: sumBy(batting.home.values(), "hits"),
    awayErrors: errors.away,
    homeErrors: errors.home,
    currentOuts,
    currentInning,
    isHomeBatting,
  };
}

/**
 * Pitcher of record, saves and blown saves.
 *
 * The league plays six innings, so the rule that a starter must go five to
 * qualify for a win cannot apply - a starter would almost never reach it. What
 * is kept is the part that matters: the win belongs to whoever was pitching
 * when his side took the lead it never gave back, and the loss to whoever gave
 * up the run that put the other side ahead for good.
 */
function assignDecisions(
  ordered: StoredPlateAppearance[],
  pitching: { away: Map<number, PitchingLine>; home: Map<number, PitchingLine> },
  final: { awayScore: number; homeScore: number },
) {
  if (ordered.length === 0) return;

  const starterOf = (side: "home" | "away") =>
    ordered.find((pa) => (pa.isHomeBatting ? "away" : "home") === side)?.pitcherPlayerId ?? null;
  const finisherOf = (side: "home" | "away") =>
    [...ordered].reverse().find((pa) => (pa.isHomeBatting ? "away" : "home") === side)
      ?.pitcherPlayerId ?? null;

  for (const side of ["home", "away"] as const) {
    const starter = starterOf(side);
    if (starter === null) continue;
    const line = pitching[side].get(starter);
    if (line) line.gamesStarted = 1;
  }

  // A complete game is one pitcher for the whole of his side's defence; a
  // shutout is a complete game with nothing scored against it. Neither waits
  // on the game being decided, so both are settled before the tie check.
  for (const side of ["home", "away"] as const) {
    const lines = [...pitching[side].values()];
    if (lines.length !== 1) continue;
    const only = lines[0];
    only.completeGames = 1;
    if (only.runs === 0) only.shutouts = 1;
  }

  // A tie has no pitcher of record.
  if (final.homeScore === final.awayScore) return;

  const winner: "home" | "away" = final.homeScore > final.awayScore ? "home" : "away";
  const loser = winner === "home" ? "away" : "home";

  // Replay the score to find the play that put the winner ahead to stay.
  let away = 0;
  let home = 0;
  let leadTaken: { winningPitcher: number; losingPitcher: number } | null = null;
  for (const pa of ordered) {
    const before = winner === "home" ? home - away : away - home;
    const runs = (pa.batterScored ? 1 : 0) + pa.otherRunsScored;
    if (pa.isHomeBatting) home += runs;
    else away += runs;
    const after = winner === "home" ? home - away : away - home;
    if (before <= 0 && after > 0) {
      // The side batting here is the winner taking the lead, so the pitcher
      // who allowed it is the loser's. The winner's pitcher of record is
      // whoever was last on the mound for his own side.
      const allowed = pa.pitcherPlayerId;
      const ours = ordered
        .filter((row) => row.sequence <= pa.sequence && row.isHomeBatting !== pa.isHomeBatting)
        .at(-1)?.pitcherPlayerId;
      // Before the winner has taken the field there is no pitcher of record
      // yet; the next lead change settles it.
      if (ours !== undefined) leadTaken = { winningPitcher: ours, losingPitcher: allowed };
    }
  }

  if (leadTaken) {
    const win = pitching[winner].get(leadTaken.winningPitcher);
    if (win) win.wins = 1;
    const loss = pitching[loser].get(leadTaken.losingPitcher);
    if (loss) loss.losses = 1;
  }

  // The save goes to a reliever who finished a win he did not earn, with the
  // margin close enough that finishing it was worth something.
  const finisher = finisherOf(winner);
  const margin = Math.abs(final.homeScore - final.awayScore);
  if (finisher !== null) {
    const line = pitching[winner].get(finisher);
    if (line && line.wins === 0 && line.gamesStarted === 0 && margin <= 3) line.saves = 1;
  }

  // A blown save is a reliever who came in with his team ahead and gave the
  // lead away - which is exactly the pitcher charged with the loss when he was
  // not the starter.
  if (leadTaken) {
    const line = pitching[loser].get(leadTaken.losingPitcher);
    if (line && line.gamesStarted === 0 && line.losses === 1) line.blownSaves = 1;
  }
}

/**
 * Who was standing on the bases when a given play began.
 *
 * The live diamond answers "who is on now", which is the wrong question for a
 * play in a half-inning that is already over: correcting the seventh from the
 * ninth needs the runners as they stood then, and offering the current ones
 * makes a runner who scored back then impossible to name.
 */
export function basesBefore(appearances: StoredPlateAppearance[], sequence: number): Bases {
  const play = appearances.find((pa) => pa.sequence === sequence);
  if (!play) return EMPTY_BASES;

  const earlier = appearances
    .filter(
      (pa) =>
        pa.inning === play.inning &&
        pa.isHomeBatting === play.isHomeBatting &&
        pa.sequence < sequence,
    )
    .sort((a, b) => a.sequence - b.sequence);

  let bases = startingBases(appearances, play.inning, play.isHomeBatting);
  for (const pa of earlier) {
    if (pa.basesAfter) {
      bases = decodeBases(pa.basesAfter);
      continue;
    }
    bases = advance(bases, {
      batterPlayerId: pa.batterPlayerId,
      result: pa.result,
      scored: decodeRunners(pa.runnersScored),
    }).bases;
  }
  return bases;
}

/**
 * Who is on base right now, replayed from the plays of the current
 * half-inning. The bases start empty each half, so only the plays since the
 * last change of sides matter - and replaying rather than storing a running
 * total means editing an earlier at-bat corrects the diamond too.
 */
export function currentBases(appearances: StoredPlateAppearance[]) {
  const derived = deriveBoxScore(appearances);

  // The half just ended, so what matters is how the next one opens - empty in
  // regulation, and with the placed runner on second in extra innings.
  if (derived.currentOuts >= 3) {
    const nextInning = derived.isHomeBatting ? derived.currentInning + 1 : derived.currentInning;
    const nextIsHome = !derived.isHomeBatting;
    return startingBases(appearances, nextInning, nextIsHome);
  }

  const half = appearances
    .filter(
      (pa) =>
        pa.inning === derived.currentInning && pa.isHomeBatting === derived.isHomeBatting,
    )
    .sort((a, b) => a.sequence - b.sequence);

  let bases = startingBases(appearances, derived.currentInning, derived.isHomeBatting);
  for (const pa of half) {
    // A stored end-state wins: the umpire placed those runners by hand, and
    // re-inferring would quietly overrule them.
    if (pa.basesAfter) {
      bases = decodeBases(pa.basesAfter);
      continue;
    }
    bases = advance(bases, {
      batterPlayerId: pa.batterPlayerId,
      result: pa.result,
      scored: decodeRunners(pa.runnersScored),
    }).bases;
  }
  return bases;
}

export function gameState(
  appearances: StoredPlateAppearance[],
  inningsPerGame = REGULATION_INNINGS,
) {
  const derived = deriveBoxScore(appearances);
  const halfOver = derived.currentOuts >= 3;

  let inning = derived.currentInning;
  let isHomeBatting = derived.isHomeBatting;
  if (halfOver) {
    if (isHomeBatting) {
      inning += 1;
      isHomeBatting = false;
    } else {
      isHomeBatting = true;
    }
  }

  return {
    ...derived,
    inning,
    isHomeBatting,
    outs: halfOver ? 0 : derived.currentOuts,
    /** Regulation is over; the screen offers to finish rather than doing it. */
    isComplete: inning > inningsPerGame && !halfOver ? false : inning > inningsPerGame,
  };
}
