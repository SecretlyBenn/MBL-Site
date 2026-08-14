import { isSkip, RESULT_BY_CODE, type ResultCode } from "./scoring.ts";
import { advance, decodeBases, decodeRunners, EMPTY_BASES } from "./bases.ts";

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
  /** Whoever the league credits with the out, or null when nobody is. */
  putoutPlayerId?: number | null;
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
  strikeouts: number;
  stolenBases: number;
  totalBases: number;
  /**
   * Outs this player was credited with in the field. The league scores one per
   * play and no assists, so these are whole plays rather than shares of them.
   */
  putouts: number;
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
};

const emptyBatting = (playerId: number): BattingLine => ({
  playerId, plateAppearances: 0, atBats: 0, runs: 0, hits: 0, singles: 0, doubles: 0,
  triples: 0, homeRuns: 0, rbis: 0, walks: 0, strikeouts: 0, stolenBases: 0, totalBases: 0,
  putouts: 0,
});

const emptyPitching = (playerId: number): PitchingLine => ({
  playerId, outs: 0, inningsPitched: 0, battersFaced: 0, hits: 0, runs: 0,
  earnedRuns: 0, homeRuns: 0, walks: 0, strikeouts: 0,
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

export function deriveBoxScore(appearances: StoredPlateAppearance[]): DerivedBoxScore {
  const ordered = [...appearances].sort((a, b) => a.sequence - b.sequence);

  const batting = { away: new Map<number, BattingLine>(), home: new Map<number, BattingLine>() };
  const pitching = { away: new Map<number, PitchingLine>(), home: new Map<number, PitchingLine>() };
  const innings = { away: [] as number[], home: [] as number[] };
  const errors = { away: 0, home: 0 };

  for (const pa of ordered) {
    // A skipped batter never came to the plate. The order moved past them, but
    // nothing is charged to them or to the pitcher - counting it would give a
    // player who was not there a plate appearance and inflate batters faced.
    if (isSkip(pa.result)) continue;

    const definition = RESULT_BY_CODE.get(pa.result as ResultCode);
    const side = pa.isHomeBatting ? "home" : "away";
    // The pitcher belongs to the fielding side, which is the other one.
    const fieldingSide = pa.isHomeBatting ? "away" : "home";

    const batter = batting[side].get(pa.batterPlayerId) ?? emptyBatting(pa.batterPlayerId);
    const pitcher = pitching[fieldingSide].get(pa.pitcherPlayerId) ?? emptyPitching(pa.pitcherPlayerId);

    const runs = (pa.batterScored ? 1 : 0) + pa.otherRunsScored;

    batter.plateAppearances += 1;
    batter.stolenBases += pa.stolenBases;
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
      if (definition.isStrikeout) batter.strikeouts += 1;

      pitcher.battersFaced += 1;
      if (definition.isHit) pitcher.hits += 1;
      if (definition.code === "HR") pitcher.homeRuns += 1;
      if (definition.isWalk) pitcher.walks += 1;
      if (definition.isStrikeout) pitcher.strikeouts += 1;
    }

    pitcher.outs += pa.outsRecorded;
    pitcher.runs += runs;
    pitcher.earnedRuns += Math.max(0, runs - pa.unearnedRuns);

    if (pa.putoutPlayerId) {
      // The fielder bats for the other side, so their line lives there.
      const line =
        batting[fieldingSide].get(pa.putoutPlayerId) ?? emptyBatting(pa.putoutPlayerId);
      line.putouts += 1;
      batting[fieldingSide].set(pa.putoutPlayerId, line);
    }

    batting[side].set(pa.batterPlayerId, batter);
    pitching[fieldingSide].set(pa.pitcherPlayerId, pitcher);

    // Innings are 1-based and a side may not have batted in every one.
    const list = innings[side];
    while (list.length < pa.inning) list.push(0);
    list[pa.inning - 1] += runs;

    // An error is charged to the fielding side.
    if (pa.errorPosition !== null || pa.errorPlayerId !== null) errors[fieldingSide] += 1;
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

  return {
    awayBatting: [...batting.away.values()],
    homeBatting: [...batting.home.values()],
    awayPitching: [...pitching.away.values()],
    homePitching: [...pitching.home.values()],
    awayInnings: innings.away,
    homeInnings: innings.home,
    awayScore: total(innings.away),
    homeScore: total(innings.home),
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
 * Who is on base right now, replayed from the plays of the current
 * half-inning. The bases start empty each half, so only the plays since the
 * last change of sides matter - and replaying rather than storing a running
 * total means editing an earlier at-bat corrects the diamond too.
 */
export function currentBases(appearances: StoredPlateAppearance[]) {
  const derived = deriveBoxScore(appearances);
  if (derived.currentOuts >= 3) return EMPTY_BASES;

  const half = appearances
    .filter(
      (pa) =>
        pa.inning === derived.currentInning && pa.isHomeBatting === derived.isHomeBatting,
    )
    .sort((a, b) => a.sequence - b.sequence);

  let bases = EMPTY_BASES;
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

export function gameState(appearances: StoredPlateAppearance[], inningsPerGame = 6) {
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
