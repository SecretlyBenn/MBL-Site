/**
 * Works out a playoff bracket from the games a playoff season holds.
 *
 * The archive records games, not series or rounds, and the format has changed
 * over the years: some seasons give the top clubs a bye, series have run to
 * three, five and seven games, and a series that ended early can still carry
 * the fixture that was never needed. So nothing here assumes a format. It
 * reads the bracket back out of who played whom, and when:
 *
 *  - A series is every game between the same two clubs.
 *  - A series' round is one more than the latest round either club had
 *    already played in. A club with a bye has played in none, so it meets the
 *    winner of round one in round two, which is where it belongs.
 *  - A club that turns up in a later round won the series before it. The
 *    last round has no later round, so it is decided by games won once none
 *    are left to play.
 */

export type BracketGame = {
  id: number;
  awayTeamId: number | null;
  homeTeamId: number | null;
  awayScore: number | null;
  homeScore: number | null;
  playedOn: string | null;
};

export type BracketTeam = { id: number; name: string; league: string | null };

export type Series = {
  key: string;
  round: number;
  /** The club at home in the first game sits on top, as the higher seed does. */
  top: number;
  bottom: number;
  wins: Record<number, number>;
  /** Played games, in order. */
  results: { id: number; winnerId: number; score: string }[];
  remaining: number;
  winnerId: number | null;
  /** AMERICAN or NATIONAL when both clubs share a league; a final crosses them. */
  league: string | null;
  firstDate: string | null;
};

export type Round = {
  number: number;
  label: string;
  /** A null slot is a series whose clubs are not known yet. */
  series: (Series | null)[];
};

const played = (game: BracketGame) => game.awayScore !== null && game.homeScore !== null;

export function buildBracket(games: BracketGame[], teams: BracketTeam[]): Round[] {
  const leagueOf = new Map(teams.map((team) => [team.id, team.league]));
  const series = new Map<string, Series>();

  for (const game of games) {
    const { awayTeamId: away, homeTeamId: home } = game;
    if (away === null || home === null) continue;
    const key = `${Math.min(away, home)}-${Math.max(away, home)}`;

    let entry = series.get(key);
    if (!entry) {
      const league = leagueOf.get(away) === leagueOf.get(home) ? (leagueOf.get(home) ?? null) : null;
      entry = {
        key,
        round: 0,
        top: home,
        bottom: away,
        wins: { [home]: 0, [away]: 0 },
        results: [],
        remaining: 0,
        winnerId: null,
        league,
        firstDate: game.playedOn,
      };
      series.set(key, entry);
    }

    if (played(game)) {
      const homeWon = (game.homeScore ?? 0) > (game.awayScore ?? 0);
      const winnerId = homeWon ? home : away;
      entry.wins[winnerId] += 1;
      // Written from the top club's side, so a row of results reads one way.
      const topScore = entry.top === home ? game.homeScore : game.awayScore;
      const bottomScore = entry.top === home ? game.awayScore : game.homeScore;
      entry.results.push({ id: game.id, winnerId, score: `${topScore}-${bottomScore}` });
    } else {
      entry.remaining += 1;
    }
  }

  // Rounds, in the order each series first appears on the schedule.
  const latestRound = new Map<number, number>();
  for (const entry of series.values()) {
    entry.round = 1 + Math.max(latestRound.get(entry.top) ?? 0, latestRound.get(entry.bottom) ?? 0);
    latestRound.set(entry.top, entry.round);
    latestRound.set(entry.bottom, entry.round);
  }

  const all = [...series.values()];
  const lastRound = Math.max(0, ...all.map((entry) => entry.round));

  for (const entry of all) {
    const advanced = [entry.top, entry.bottom].filter((teamId) =>
      all.some((other) => other.round > entry.round && (other.top === teamId || other.bottom === teamId)),
    );
    if (advanced.length === 1) {
      entry.winnerId = advanced[0];
    } else if (entry.remaining === 0 && entry.results.length > 0 && entry.wins[entry.top] !== entry.wins[entry.bottom]) {
      entry.winnerId = entry.wins[entry.top] > entry.wins[entry.bottom] ? entry.top : entry.bottom;
    }
  }

  const rounds: Round[] = [];
  for (let number = 1; number <= lastRound; number += 1) {
    const inRound = all.filter((entry) => entry.round === number);
    const previous = rounds[rounds.length - 1]?.series ?? [];

    if (number === 1) {
      // One league's side of the bracket above the other's.
      const leagueOrder = (entry: Series) => (entry.league === "AMERICAN" ? 0 : entry.league === "NATIONAL" ? 1 : 2);
      inRound.sort((a, b) => leagueOrder(a) - leagueOrder(b));
    } else {
      // Each series sits level with the series that fed it, so the bracket
      // reads across. A pairing of two clubs with byes has no feeder and goes
      // to the bottom.
      const feederIndex = (entry: Series) =>
        Math.min(
          ...[entry.top, entry.bottom].map((teamId) => {
            const index = previous.findIndex((other) => other && (other.top === teamId || other.bottom === teamId));
            return index === -1 ? Number.POSITIVE_INFINITY : index;
          }),
        );
      inRound.sort((a, b) => feederIndex(a) - feederIndex(b));
    }
    rounds.push({ number, label: `Round ${number}`, series: inRound });
  }

  // Rounds that have not been scheduled yet still have a place in a bracket,
  // so the page shows where the winners are headed. They are marked as open
  // slots - no clubs, no dates - rather than guessed.
  while (rounds.length > 0 && rounds[rounds.length - 1].series.length > 1) {
    const count = Math.ceil(rounds[rounds.length - 1].series.length / 2);
    rounds.push({ number: rounds.length + 1, label: `Round ${rounds.length + 1}`, series: Array(count).fill(null) });
  }
  if (rounds.length > 1) rounds[rounds.length - 1].label = "Final";

  return rounds;
}
