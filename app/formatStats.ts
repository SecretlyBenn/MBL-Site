/**
 * A game nobody finished.
 *
 * A club that never shows up forfeits 1-0 with no box score, and that shape is
 * recognisable on its own - real 1-0 games carry stats. But a club can also
 * quit part way through a game it is losing, which leaves a genuine score and a
 * partial box score behind and looks like an ordinary loss. Nothing in the
 * numbers distinguishes that from a game played out, so it has to be recorded:
 * `status` is set to "FORFEIT" by hand and wins over the shape test.
 */
export function isForfeit(game: {
  homeScore: number | null;
  awayScore: number | null;
  hasStats: boolean;
  status?: string | null;
}) {
  const { homeScore: home, awayScore: away, hasStats, status } = game;
  if (status === "FORFEIT") return true;
  if (hasStats || home === null || away === null) return false;
  return (home === 1 && away === 0) || (home === 0 && away === 1);
}

export function formatInnings(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  const whole = Math.floor(value + 1e-6);
  const outs = Math.round((value - whole) * 3);
  if (outs >= 3) return String(whole + 1);
  return outs ? `${whole}.${outs}` : String(whole);
}

const MONTHS: Record<string, number> = {
  January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
  July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
};

/**
 * "Thursday November 2, 2023" as a sortable number, or null when the archive
 * recorded no readable date.
 *
 * The weekday is matched by name rather than stripped as a leading word: a
 * bare "June 15" would otherwise lose its month.
 */
export function playedOnValue(playedOn: string | null | undefined): number | null {
  if (!playedOn) return null;
  const match = /([A-Z][a-z]+)\s+(\d{1,2}),?\s*(\d{4})/.exec(playedOn);
  if (!match) return null;
  const [, month, day, year] = match;
  if (!(month in MONTHS)) return null;
  return Date.UTC(Number(year), MONTHS[month], Number(day));
}

/**
 * The first season whose per-inning runs were actually recorded.
 *
 * Before Season XI the league's stat takers entered a game's final runs, hits
 * and errors but not the inning-by-inning line, so those rows hold zeros that
 * do not add up to the score. Showing that grid would contradict the result, so
 * older games show the totals alone.
 */
export const FIRST_SEASON_WITH_INNINGS = 12;

export function hasInningByInning(seasonSortOrder: number | null | undefined) {
  return (seasonSortOrder ?? 0) >= FIRST_SEASON_WITH_INNINGS;
}
