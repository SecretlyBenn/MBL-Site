/**
 * A forfeit is recorded as a 1-0 win with no box score - nobody played, so no
 * player accumulated a stat. Real 1-0 games are common and do carry stats, so
 * the missing box score is the part that identifies a forfeit.
 */
export function isForfeit(game: {
  homeScore: number | null;
  awayScore: number | null;
  hasStats: boolean;
}) {
  const { homeScore: home, awayScore: away, hasStats } = game;
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
