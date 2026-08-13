/**
 * Season XII is played in series rather than on fixed dates: a series has a
 * window, and the games in it happen whenever the two clubs can meet. The
 * schedule and the umpire's game list both group by series, so the split lives
 * here rather than in either page.
 *
 * The split is positional - the season's games in order, cut into blocks - so
 * a game's series is decided by where it falls in the season, not by its date.
 */
export const SEASON_XII_SERIES = [
  { window: "June 15 – June 24", games: 12 },
  { window: "June 25 – July 1", games: 12 },
  { window: "July 2 – July 9", games: 12 },
  { window: "July 10 – July 15", games: 12 },
  { window: "July 16 – July 23", games: 12 },
  { window: "August 2 – August 9", games: 12 },
  { window: "August 10 – August 15", games: 12 },
  { window: "August 16 – August 22", games: 12 },
  { window: "August 23 – August 28", games: 14 },
] as const;

/** Between series 5 and 6. Shown so the gap in play reads as intentional. */
export const ALL_STAR_BREAK_AFTER_SERIES = 5;

/**
 * Which series a game belongs to, from its 1-based place in the season's game
 * order. Returns null for a position past the published schedule rather than
 * inventing a series for it.
 */
export function seriesFor(position: number) {
  let cursor = 0;
  for (const [index, series] of SEASON_XII_SERIES.entries()) {
    cursor += series.games;
    if (position <= cursor) {
      return { number: index + 1, window: series.window };
    }
  }
  return null;
}
