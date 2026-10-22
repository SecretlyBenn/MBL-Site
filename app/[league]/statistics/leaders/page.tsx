import type { Metadata } from "next";
import { EmptyState, PageShell, SectionHeader } from "@/app/SiteNav";
import {
  getHistoricalSeasons,
  getHistoricalSeasonStandings,
  getIndividualHistoricalStats,
  getAvatarsFor,
} from "@/db/queries";
import { BATTING, FIELDING, PITCHING, format, perGameLabels, type Board } from "../boards";
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
  searchParams: Promise<{ season?: string }>;
}) {
  const league = await leagueFrom(params);
  const seasons = await getHistoricalSeasons(league.id);
  const requested = (await searchParams).season;
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
  const averageAtBats =
    batters.reduce((sum, row) => sum + Number(row.atBats ?? 0), 0) / Math.max(1, batters.length);
  const averageInnings =
    pitchers.reduce((sum, row) => sum + Number(row.inningsPitched ?? 0), 0) /
    Math.max(1, pitchers.length);
  const qualifiedBatters = batters.filter((row) => Number(row.atBats ?? 0) >= averageAtBats);
  const qualifiedPitchers = pitchers.filter(
    (row) => Number(row.inningsPitched ?? 0) >= averageInnings,
  );
  const teamIds = Object.fromEntries(standings.map((team) => [team.name, team.id]));

  const group = (boards: Board[], all: Row[], qualified: Row[]) =>
    boards.map((board) => ({
      board,
      rows: build(board, board.qualified ? qualified : all, teamIds, avatars),
    }));

  const sections = [
    {
      title: "Batting leaders",
      meta: `Rate stats need ${averageAtBats.toFixed(1)} at bats (league average)`,
      boards: group(BATTING, batters, qualifiedBatters),
    },
    {
      title: "Pitching leaders",
      meta: `Rate stats need ${averageInnings.toFixed(1)} innings pitched (league average)`,
      boards: group(perGameLabels(PITCHING, league.inningsPerGame), pitchers, qualifiedPitchers),
    },
    {
      title: "Fielding leaders",
      meta: "The league scores no assists, so chances are putouts plus errors",
      boards: group(FIELDING, fielders, fielders),
    },
  ];

  return (
    <PageShell wide title="Leaders" subtitle={`${season.name} statistical leaders`}>
      <div className="mb-6">
        <SeasonSelect seasons={seasons} selected={String(season.id)} />
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
