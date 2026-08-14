/**
 * What a plate appearance result means. One definition, used by the scoring
 * screen, the derived box score and the season totals - so they can't drift
 * apart the way three separate implementations would.
 *
 * `defaultOuts` and the rest are only defaults: an umpire can change the outs,
 * RBI and runs on any result. A tag-out on the basepaths, a runner thrown out
 * stretching a double, an appeal play - none of those fit a batting-result
 * dropdown, and an umpire who cannot record one is stuck. OTHER exists for
 * exactly that, and every other result stays adjustable.
 */
export type ResultCode =
  | "1B" | "2B" | "3B" | "HR"
  | "BB" | "IBB" | "HBP"
  | "K" | "KL"
  | "GO" | "FO" | "LO" | "PO"
  | "FC" | "DP" | "TP"
  | "SF" | "SH"
  | "E" | "CI"
  | "SKIP"
  | "OTHER";

export type ResultDefinition = {
  code: ResultCode;
  label: string;
  group: "Hit" | "On base" | "Out" | "Other";
  defaultOuts: number;
  /** Whether it counts as an official at-bat. Walks and sacrifices do not. */
  isAtBat: boolean;
  isHit: boolean;
  /** Total bases for the batter, for slugging. */
  bases: number;
  /** Prompts for the fielder digits, e.g. 6-3 on a groundout. */
  wantsFielders: boolean;
  /**
   * The out can fall on a runner rather than the batter, so the umpire is
   * asked who was retired. On a fielder's choice the batter reaches and a
   * runner is thrown out; a double play usually takes the batter and a runner,
   * but can take two runners instead.
   */
  retiresRunners?: boolean;
  /** Charged to the pitcher's line. */
  isStrikeout?: boolean;
  isWalk?: boolean;
};

export const RESULTS: ResultDefinition[] = [
  { code: "1B", label: "Single", group: "Hit", defaultOuts: 0, isAtBat: true, isHit: true, bases: 1, wantsFielders: false },
  { code: "2B", label: "Double", group: "Hit", defaultOuts: 0, isAtBat: true, isHit: true, bases: 2, wantsFielders: false },
  { code: "3B", label: "Triple", group: "Hit", defaultOuts: 0, isAtBat: true, isHit: true, bases: 3, wantsFielders: false },
  { code: "HR", label: "Home run", group: "Hit", defaultOuts: 0, isAtBat: true, isHit: true, bases: 4, wantsFielders: false },

  { code: "BB", label: "Walk", group: "On base", defaultOuts: 0, isAtBat: false, isHit: false, bases: 0, wantsFielders: false, isWalk: true },
  { code: "IBB", label: "Intentional walk", group: "On base", defaultOuts: 0, isAtBat: false, isHit: false, bases: 0, wantsFielders: false, isWalk: true },
  { code: "HBP", label: "Hit by pitch", group: "On base", defaultOuts: 0, isAtBat: false, isHit: false, bases: 0, wantsFielders: false },
  { code: "E", label: "Reached on error", group: "On base", defaultOuts: 0, isAtBat: true, isHit: false, bases: 0, wantsFielders: true },
  { code: "CI", label: "Catcher's interference", group: "On base", defaultOuts: 0, isAtBat: false, isHit: false, bases: 0, wantsFielders: false },

  { code: "K", label: "Strikeout (swinging)", group: "Out", defaultOuts: 1, isAtBat: true, isHit: false, bases: 0, wantsFielders: false, isStrikeout: true },
  { code: "KL", label: "Strikeout (looking)", group: "Out", defaultOuts: 1, isAtBat: true, isHit: false, bases: 0, wantsFielders: false, isStrikeout: true },
  { code: "GO", label: "Groundout", group: "Out", defaultOuts: 1, isAtBat: true, isHit: false, bases: 0, wantsFielders: true },
  { code: "FO", label: "Flyout", group: "Out", defaultOuts: 1, isAtBat: true, isHit: false, bases: 0, wantsFielders: true },
  { code: "LO", label: "Lineout", group: "Out", defaultOuts: 1, isAtBat: true, isHit: false, bases: 0, wantsFielders: true },
  { code: "PO", label: "Popout", group: "Out", defaultOuts: 1, isAtBat: true, isHit: false, bases: 0, wantsFielders: true },
  { code: "FC", label: "Fielder's choice", group: "Out", defaultOuts: 1, isAtBat: true, isHit: false, bases: 0, wantsFielders: true, retiresRunners: true },
  { code: "DP", label: "Double play", group: "Out", defaultOuts: 2, isAtBat: true, isHit: false, bases: 0, wantsFielders: true, retiresRunners: true },
  { code: "TP", label: "Triple play", group: "Out", defaultOuts: 3, isAtBat: true, isHit: false, bases: 0, wantsFielders: true, retiresRunners: true },
  { code: "SF", label: "Sacrifice fly", group: "Out", defaultOuts: 1, isAtBat: false, isHit: false, bases: 0, wantsFielders: true },
  { code: "SH", label: "Sacrifice bunt", group: "Out", defaultOuts: 1, isAtBat: false, isHit: false, bases: 0, wantsFielders: true },

  // A batter who is not there yet. The order moves on with no out and no
  // plate appearance charged - being late is not a time at bat, and an umpire
  // who has to invent an out to get past them would corrupt the inning.
  { code: "SKIP", label: "Skip — batter not here", group: "Other", defaultOuts: 0, isAtBat: false, isHit: false, bases: 0, wantsFielders: false },

  // The escape hatch. Anything the list above cannot express - a runner tagged
  // out between bases, an appeal, an interference call - is recorded here with
  // the outs and runs set by hand and a note describing what happened.
  { code: "OTHER", label: "Other (describe)", group: "Other", defaultOuts: 0, isAtBat: false, isHit: false, bases: 0, wantsFielders: true },
];

/** A skipped batter is a placeholder, not a plate appearance. */
export const isSkip = (result: string) => result === "SKIP";

export const RESULT_BY_CODE = new Map(RESULTS.map((result) => [result.code, result]));

/** Scorekeeping positions, indexed by their standard number. */
export const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_NUMBER: Record<string, number> = {
  P: 1, C: 2, "1B": 3, "2B": 4, "3B": 5, SS: 6, LF: 7, CF: 8, RF: 9,
};

/**
 * Positions written the way a scorebook writes them: by number, not by name.
 * "P" becomes 1, "SS" becomes 6, so a groundout to the pitcher reads G1 rather
 * than GP. A sequence keeps its dashes - "6-3" is already numbered and passes
 * through untouched.
 */
export function positionNumbers(fielders: string) {
  return fielders
    .split("-")
    .map((part) => {
      const trimmed = part.trim();
      const number = POSITION_NUMBER[trimmed.toUpperCase()];
      return number === undefined ? trimmed : String(number);
    })
    .join("-");
}

/** "F7", "G4-3", "K" - the shorthand the league already writes on paper. */
export function scoreNotation(result: ResultCode, fielders: string | null) {
  const prefix: Partial<Record<ResultCode, string>> = {
    FO: "F", LO: "L", PO: "P", GO: "G", DP: "DP", TP: "TP", SF: "SF", SH: "SH", FC: "FC", E: "E",
  };
  const head = prefix[result] ?? result;
  return fielders ? `${head}${positionNumbers(fielders)}` : head;
}

export type PlateAppearanceInput = {
  result: ResultCode;
  fielders: string | null;
  rbis: number;
  batterScored: boolean;
  otherRunsScored: number;
  unearnedRuns: number;
  outsRecorded: number;
  errorPosition: number | null;
  /** Runners retired on the play itself, by player id. */
  outRunners?: number[];
  /** Whether the batter was one of the outs. */
  batterOut?: boolean;
  /** Who is credited with each out, keyed by "batter" or the runner id. */
  outPutouts?: Record<string, string>;
  stolenBases: number;
  /** The bases as they stood when the play ended, as JSON. */
  basesAfter?: string | null;
  /** Which runners crossed the plate on the play, as JSON player ids. */
  runnersScored?: string | null;
  note: string | null;
};

/**
 * Rejects entries that would corrupt the game state rather than merely being
 * unusual - an inning cannot record four outs, and runs cannot be negative.
 * Deliberately permissive otherwise: odd plays are real, and the umpire is the
 * one who watched it happen.
 */
export function validatePlateAppearance(
  input: PlateAppearanceInput,
  outsBefore: number,
): string | null {
  if (!RESULT_BY_CODE.has(input.result)) return "Unknown result.";
  if (input.outsRecorded < 0 || input.outsRecorded > 3) return "Outs must be between 0 and 3.";
  if (outsBefore + input.outsRecorded > 3) {
    return `That would make ${outsBefore + input.outsRecorded} outs in the inning.`;
  }
  if (input.rbis < 0 || input.rbis > 4) return "RBI must be between 0 and 4.";
  if (input.otherRunsScored < 0 || input.otherRunsScored > 4) return "Runs must be between 0 and 4.";
  if (input.unearnedRuns < 0) return "Unearned runs cannot be negative.";
  const runs = (input.batterScored ? 1 : 0) + input.otherRunsScored;
  if (input.unearnedRuns > runs) return "More unearned runs than runs scored.";
  if (input.result === "OTHER" && !input.note?.trim()) {
    return "Describe what happened when using Other.";
  }
  return null;
}

/** How a runner was retired away from the plate. */
export const RUNNER_OUT_KINDS = ["TAGGED", "PICKED_OFF", "CAUGHT_STEALING", "FORCED"] as const;
export type RunnerOutKind = (typeof RUNNER_OUT_KINDS)[number];

export const RUNNER_OUT_LABELS: Record<RunnerOutKind, string> = {
  TAGGED: "Tagged out",
  PICKED_OFF: "Picked off",
  CAUGHT_STEALING: "Caught stealing",
  FORCED: "Out on the play",
};

/**
 * Which position is credited with the out, where the league's convention
 * decides it rather than the umpire.
 *
 * This league scores one putout per play and does not use assists, so a
 * groundout to short credits the shortstop - not the first baseman who caught
 * the throw. Most plays therefore credit whoever fielded the ball, which the
 * umpire has already said. Three do not:
 *
 *   - a strikeout credits nobody, because nobody made a play
 *   - a caught stealing credits the catcher, who threw
 *   - a pickoff credits the pitcher, who threw
 *
 * Returns the position, or null when nobody is credited.
 */
export function putoutPosition(
  result: ResultCode | RunnerOutKind,
  fielded: string | null,
): Position | null {
  if (result === "K" || result === "KL") return null;
  if (result === "CAUGHT_STEALING") return "C";
  if (result === "PICKED_OFF") return "P";
  if (result === "TAGGED" || result === "FORCED") return normalisePosition(fielded);

  const definition = RESULT_BY_CODE.get(result as ResultCode);
  // Nobody is retired, so there is no putout to give.
  if (!definition || definition.defaultOuts === 0) return null;
  return normalisePosition(fielded);
}

/**
 * The fielder a putout belongs to, from what the umpire chose. A sequence like
 * "6-3" names the fielder who started the play first, and under this league's
 * convention that is the one credited.
 */
function normalisePosition(fielded: string | null): Position | null {
  if (!fielded) return null;
  const first = fielded.split("-")[0]?.trim().toUpperCase();
  if (!first) return null;
  const byName = POSITIONS.find((position) => position === first);
  if (byName) return byName;
  // Written as a number, e.g. "6".
  const entry = Object.entries(POSITION_NUMBER).find(([, number]) => String(number) === first);
  return (entry?.[0] as Position | undefined) ?? null;
}

/** What happened to a batter beyond the result itself. */
export type AtBatExtras = {
  rbis: number;
  /** The batter came round to score. */
  scored: boolean;
  stolenBases: number;
  /** How the batter was retired on the bases afterwards, if they were. */
  retiredAs?: RunnerOutKind | null;
  /** The position credited with that out, as its number. */
  retiredBy?: number | null;
};

const RUNNER_OUT_SHORT: Record<RunnerOutKind, string> = {
  TAGGED: "TAG",
  PICKED_OFF: "PO",
  CAUGHT_STEALING: "CS",
  FORCED: "OUT",
};

/**
 * One cell of the scorecard: the result, then everything else the at-bat
 * produced - "2B + RBI + SB + R", "1B + TAG 4".
 *
 * A scorer reading the card wants the whole plate appearance at a glance
 * rather than the result alone, with the rest to be worked out from the box
 * score afterwards. Counts appear only when there is more than one, so the
 * common case stays short.
 */
export function atBatSummary(
  result: ResultCode,
  fielders: string | null,
  extras: AtBatExtras,
): string {
  const parts = [scoreNotation(result, fielders)];

  if (extras.rbis > 0) parts.push(extras.rbis > 1 ? `RBI ${extras.rbis}` : "RBI");
  if (extras.stolenBases > 0) {
    parts.push(extras.stolenBases > 1 ? `SB ${extras.stolenBases}` : "SB");
  }
  if (extras.scored) parts.push("R");

  if (extras.retiredAs) {
    const short = RUNNER_OUT_SHORT[extras.retiredAs];
    // The fielder is named where one made the play; a caught stealing and a
    // pickoff are always the catcher and the pitcher, so the number would say
    // nothing the code does not.
    parts.push(extras.retiredBy ? `${short} ${extras.retiredBy}` : short);
  }

  return parts.join(" + ");
}

/**
 * The fewest players a side can take the field with.
 *
 * Short-handed games are ordinary in this league rather than an exception, so
 * a lineup is whatever turned up - the order simply runs shorter and comes
 * round sooner. Below four there is no game to score.
 */
export const MINIMUM_LINEUP = 4;

/** The usual full side, and where the editor starts. */
export const FULL_LINEUP = 9;
