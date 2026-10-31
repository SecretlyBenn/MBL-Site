import type { Metadata } from "next";
import { EmptyState, PageShell, SectionHeader } from "@/app/SiteNav";
import { minInningsPitched, minPlateAppearances } from "@/app/scoring";
import {
  getHistoricalSeasons,
  getHistoricalSeasonStandings,
  getIndividualHistoricalStats,
  getAvatarsFor,
  clubOf,
} from "@/db/queries";
import { BATTING, FIELDING, PITCHING, format, perGameLabels, reversible, worst, type Board } from "../boards";
import { WorstToggle } from "../WorstToggle";
import { SeasonSelect } from "../SeasonSelect";
import { LeaderBoard, type LeaderRow } from "./LeaderBoard";
import { leagueFrom } from "../../league";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string }>;
}): Promise<Metadata> {
  const { league } = await params;
  return {
    title: "League Leaders",
    description:
      "The Minecraft Baseball League's statistical leaders in batting and pitching, by season.",
    alternates: { canonical: `/${league}/statistics/leaders` },
  };
}

export const dynamic = "force-dynamic";

type Row = Awaited<ReturnType<typeof getIndividualHistoricalStats>>[number];

/**
 * A board's whole field, in order, ready for the client to show five of and
 * open to the rest.
 *
 * Players with nothing to show are dropped rather than listed at zero. A
 * shutouts board padded to eighty names, seventy-eight of them on nought, is
 * not a leaderboard.
 */
function build(
  board: Board,
  rows: Row[],
  teamIds: Record<string, number>,
  avatars: Record<string, string>,
): LeaderRow[] {
  return rows
    .filter((row) => {
      const raw = row[board.key];
      return raw !== null && raw !== undefined && (board.ascending || Number(raw) > 0);
    })
    .sort((a, b) => {
      const difference = Number(a[board.key] ?? 0) - Number(b[board.key] ?? 0);
      return board.ascending ? difference : -difference;
    })
    .map((row) => {
      // A career line names the club they finished with and counts the rest,
      // like "Arizona Thunderbirds (+2)". The crest and the link need the club.
      const teamName = row.teamName.replace(/ \(\+\d+\)$/, "");
      return {
        playerName: row.playerName,
        teamName,
        teamId: teamIds[teamName] ?? null,
        uuid: avatars[row.playerName],
        value: format(row, board),
      };
    });
}

export default async function LeadersPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ season?: string; worst?: string }>;
}) {
  const league = await leagueFrom(params);
  const seasons = await getHistoricalSeasons(league.id);
  const asked = await searchParams;
  const requested = asked.season;
  // The boards read from the other end. Only the rate boards have another end
  // worth reading, so the rest are left out rather than reversed: the fewest
  // home runs in a season is not a record, it is whoever turned up once.
  const showWorst = asked.worst === "1";
  const season = seasons.find((row) => String(row.id) === requested) ?? seasons[0];
  if (!season) {
    return (
      <PageShell title="Leaders">
        <EmptyState>No seasons are available.</EmptyState>
      </PageShell>
    );
  }

  const [rows, standings] = await Promise.all([
    getIndividualHistoricalStats(season.id),
    getHistoricalSeasonStandings(season.id),
  ]);
  // Only the heads this season's boards can draw. The profile table holds
  // every player the league has ever had, and grows with each new one.
  const avatars = await getAvatarsFor(rows.map((row) => row.playerName));

  const batters = rows.filter((row) => (row.atBats ?? 0) > 0);
  const pitchers = rows.filter((row) => (row.inningsPitched ?? 0) > 0);
  const fielders = rows.filter((row) => ((row.putouts ?? 0) + (row.errors ?? 0)) > 0);
  // One and a half plate appearances for every game his own club played, and
  // an inning for every one of them for a pitcher.
  //
  // The bar used to be the season's own average at-bats, which moved with
  // whoever turned out: a season where half the league played twice dragged it
  // down until four good at-bats could win a batting title, and a season of
  // regulars pushed it up until a man who played most of the year was shut
  // out. Neither had anything to do with how much baseball he played.
  //
  // It is his club's games rather than the season's, so a club that played a
  // shorter schedule - a forfeited week, a late entry - is judged on the games
  // it actually had rather than against clubs who played more.
  const gamesByClub = new Map(
    standings.map((team) => [team.name, (team.wins ?? 0) + (team.losses ?? 0)]),
  );
  // A traded player's line is filed under the club he finished with, and that
  // name carries how many others he turned out for. The club is the name
  // underneath it.
  const clubGames = (teamName: string) => gamesByClub.get(clubOf(teamName)) ?? 0;
  const qualifiedBatters = batters.filter(
    (row) => Number(row.plateAppearances ?? 0) >= minPlateAppearances(clubGames(row.teamName)),
  );
  // Only the four rate boards ask for innings - ERA, WHIP and the two per-six
  // figures. A save or a complete game is a thing that happened, and no number
  // of innings makes it more true; a closer would never reach a starter's bar
  // and his saves are not worth less for it.
  const qualifiedPitchers = pitchers.filter(
    (row) => Number(row.inningsPitched ?? 0) >= minInningsPitched(clubGames(row.teamName)),
  );
  // The longest schedule any club played, which is what the headings quote:
  // every club in a normal season played it, and a note cannot name a
  // different figure for each one.
  const longest = Math.max(0, ...gamesByClub.values());
  const teamIds = Object.fromEntries(standings.map((team) => [team.name, team.id]));

  const group = (boards: Board[], all: Row[], qualified: Row[]) =>
    (showWorst ? boards.filter(reversible).map(worst) : boards).map((board) => ({
      board,
      rows: build(board, board.qualified ? qualified : all, teamIds, avatars),
    }));

  const sections = [
    {
      title: showWorst ? "Batting, worst first" : "Batting leaders",
      meta: `Rate stats need 1.5 plate appearances a game - ${minPlateAppearances(longest)} over ${longest}`,
      boards: group(BATTING, batters, qualifiedBatters),
    },
    {
      title: showWorst ? "Pitching, worst first" : "Pitching leaders",
      meta: `ERA, WHIP and the per-six boards need an inning a game - ${minInningsPitched(longest)} over ${longest}`,
      boards: group(perGameLabels(PITCHING, league.inningsPerGame), pitchers, qualifiedPitchers),
    },
    {
      title: showWorst ? "Fielding, worst first" : "Fielding leaders",
      meta: "No assists are scored in this league, so these two are the whole of a fielder's record",
      boards: group(FIELDING, fielders, fielders),
    },
    // A section with nothing in it is a heading over blank space. Fielding has
    // no rate board, so it has nothing to show worst first.
  ].filter((section) => section.boards.length > 0);

  return (
    <PageShell wide title="Leaders" subtitle={`${season.name} statistical leaders`}>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <SeasonSelect seasons={seasons} selected={String(season.id)} />
        <WorstToggle worst={showWorst} />
      </div>
      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title}>
            <SectionHeader title={section.title} meta={section.meta} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {section.boards.map(({ board, rows: boardRows }) => (
                <LeaderBoard leagueSlug={league.slug}
                  key={String(board.key)}
                  label={board.label}
                  unit={board.unit}
                  rows={boardRows}
                  seasonId={season.id}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
