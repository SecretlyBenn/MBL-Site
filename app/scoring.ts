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
  { code: "FC", label: "Fielder's choice", group: "Out", defaultOuts: 1, isAtBat: true, isHit: false, bases: 0, wantsFielders: true },
  { code: "DP", label: "Double play", group: "Out", defaultOuts: 2, isAtBat: true, isHit: false, bases: 0, wantsFielders: true },
  { code: "TP", label: "Triple play", group: "Out", defaultOuts: 3, isAtBat: true, isHit: false, bases: 0, wantsFielders: true },
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

/** "F7", "G4-3", "K" - the shorthand the league already writes on paper. */
export function scoreNotation(result: ResultCode, fielders: string | null) {
  const prefix: Partial<Record<ResultCode, string>> = {
    FO: "F", LO: "L", PO: "P", GO: "G", DP: "DP", TP: "TP", SF: "SF", SH: "SH", FC: "FC", E: "E",
  };
  const head = prefix[result] ?? result;
  return fielders ? `${head}${fielders}` : head;
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
