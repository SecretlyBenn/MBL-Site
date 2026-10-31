import type { HistoricalStatViewRow } from "@/db/queries";

/**
 * Which leaderboards exist, and how each one is read.
 *
 * Shared by the season leaders and the single-season records, because the two
 * pages ask the same question over different ground - who was best this
 * season, and who has ever been best in a season. If one page gained a board
 * the other did not, the records page would be missing a record somebody had
 * just seen on a leaderboard, which is the kind of gap nobody reports and
 * everybody notices.
 */
export type Board = {
  key: keyof HistoricalStatViewRow;
  label: string;
  /** The figures column heading. */
  unit: string;
  /** Lowest first - ERA, WHIP and the other stats you want less of. */
  ascending?: boolean;
  /** Shown to three decimals, with the leading zero dropped. */
  rate?: boolean;
  /** Shown to two decimals. Averages that run above one, like ERA. */
  decimals?: number;
  /**
   * Rate stats are only meaningful over enough playing time, so they are
   * restricted to the qualified field. A counting stat is not: the home run
   * leader led whether or not he played every game, and holding him to a
   * minimum would leave the board saying somebody else did.
   */
  qualified?: boolean;
  /**
   * What this board is called upside down, for the pages that show the worst
   * qualified season rather than the best.
   *
   * Only a rate has one. The bottom of a counting board is not a record, it
   * is a list of men who barely played: the fewest at-bats in a season is
   * whoever turned up once, and the fewest games started is a man who started
   * none. So a board is reversible exactly when somebody has written down
   * what its other end is called, which is the same eight boards that need a
   * qualifying minimum - and for the same reason, because a rate is the only
   * thing that stays meaningful when you read it from the wrong end.
   */
  worstLabel?: string;
};

/** Whether this board is worth reading from the bottom. */
export function reversible(board: Board): boolean {
  return board.worstLabel !== undefined;
}

/**
 * The same board, worst first.
 *
 * Only the direction changes. The qualifying minimum stays exactly as it was,
 * which is the whole point: the worst batting average anybody has ever had is
 * not a man who went nought for two, it is a man who played the season.
 */
export function worst(board: Board): Board {
  return { ...board, label: board.worstLabel ?? board.label, ascending: !board.ascending };
}

export const BATTING: Board[] = [
  { key: "battingAverage", label: "Batting average", unit: "AVG", rate: true, qualified: true, worstLabel: "Lowest batting average" },
  { key: "onBasePct", label: "On-base percentage", unit: "OBP", rate: true, qualified: true, worstLabel: "Lowest on-base percentage" },
  { key: "sluggingPct", label: "Slugging", unit: "SLG", rate: true, qualified: true, worstLabel: "Lowest slugging" },
  { key: "ops", label: "OPS", unit: "OPS", rate: true, qualified: true, worstLabel: "Lowest OPS" },
  { key: "hits", label: "Hits", unit: "H" },
  { key: "homeRuns", label: "Home runs", unit: "HR" },
  { key: "rbis", label: "RBI", unit: "RBI" },
  { key: "runs", label: "Runs", unit: "R" },
  { key: "doubles", label: "Doubles", unit: "2B" },
  { key: "triples", label: "Triples", unit: "3B" },
  { key: "totalBases", label: "Total bases", unit: "TB" },
  { key: "walks", label: "Walks", unit: "BB" },
  { key: "stolenBases", label: "Stolen bases", unit: "SB" },
  { key: "plateAppearances", label: "Plate appearances", unit: "PA" },
  { key: "atBats", label: "At bats", unit: "AB" },
  // The ones nobody wants to lead. They are still records - somebody did
  // strike out more times in a season than anyone else ever has - and a
  // leaderboard that only shows the flattering half of the box score is
  // telling half the story. Most first, like every other board, because the
  // fewest of a bad thing is a list of men who barely played.
  { key: "strikeouts", label: "Strikeouts", unit: "SO" },
  { key: "leftOnBase", label: "Left on base", unit: "LOB" },
];

export const PITCHING: Board[] = [
  { key: "era", label: "ERA", unit: "ERA", ascending: true, decimals: 2, qualified: true, worstLabel: "Highest ERA" },
  { key: "whip", label: "WHIP", unit: "WHIP", ascending: true, decimals: 2, qualified: true, worstLabel: "Highest WHIP" },
  {
    key: "strikeoutsPerGame",
    label: "Strikeouts per 6",
    unit: "SO/6",
    decimals: 2,
    qualified: true,
    worstLabel: "Fewest strikeouts per 6",
  },
  { key: "walksPerGame", label: "Fewest walks per 6", unit: "BB/6", ascending: true, decimals: 2, qualified: true, worstLabel: "Most walks per 6" },
  { key: "strikeoutsPitched", label: "Strikeouts", unit: "SO" },
  { key: "wins", label: "Wins", unit: "W" },
  { key: "saves", label: "Saves", unit: "SV" },
  { key: "inningsPitched", label: "Innings pitched", unit: "IP", decimals: 1 },
  { key: "completeGames", label: "Complete games", unit: "CG" },
  { key: "shutouts", label: "Shutouts", unit: "SHO" },
  { key: "pitchingGames", label: "Games pitched", unit: "G" },
  { key: "gamesStarted", label: "Games started", unit: "GS" },
  { key: "hitsAllowed", label: "Hits allowed", unit: "H" },
  { key: "runsAllowed", label: "Runs allowed", unit: "R" },
  { key: "earnedRuns", label: "Earned runs", unit: "ER" },
  { key: "homeRunsAllowed", label: "Home runs allowed", unit: "HR" },
  { key: "walksAllowed", label: "Walks allowed", unit: "BB" },
  { key: "losses", label: "Losses", unit: "L" },
];

/**
 * No fielding percentage. With no assists scored, a chance is a putout or an
 * error, and in one season almost everybody handles every chance - so the
 * board was thirty men tied on 1.000 and told you nothing about any of them.
 * The errors behind it are the part worth reading.
 */
export const FIELDING: Board[] = [
  { key: "putouts", label: "Putouts", unit: "PO" },
  { key: "errors", label: "Errors", unit: "E" },
];

/**
 * The per-game boards are named after the game they are measured over, so the
 * heading follows the competition: "per 6" in the MBL and "per 5" in the MCBA.
 * A fixed six over a column of fifths is a worse label than none.
 */
export function perGameLabels(boards: Board[], inningsPerGame: number): Board[] {
  if (inningsPerGame === 6) return boards;
  return boards.map((board) => ({
    ...board,
    label: board.label.replace(" per 6", ` per ${inningsPerGame}`),
    worstLabel: board.worstLabel?.replace(" per 6", ` per ${inningsPerGame}`),
    unit: board.unit.replace("/6", `/${inningsPerGame}`),
  }));
}

export function format(row: HistoricalStatViewRow, board: Board) {
  const raw = row[board.key];
  if (raw === null || raw === undefined) return "-";
  const result = Number(raw);
  if (board.rate) return result.toFixed(3).replace(/^0/, "");
  if (board.decimals !== undefined) return result.toFixed(board.decimals);
  return String(Math.round(result));
}
