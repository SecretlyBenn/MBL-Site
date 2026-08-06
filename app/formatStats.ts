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
