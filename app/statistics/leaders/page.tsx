import type { Metadata } from "next";
import { EmptyState, PageShell, SectionHeader } from "@/app/SiteNav";
import {
  getHistoricalSeasons,
  getHistoricalSeasonStandings,
  getIndividualHistoricalStats,
  getPlayerAvatars,
} from "@/db/queries";
import { SeasonSelect } from "../SeasonSelect";
import { LeaderBoard, type LeaderRow } from "./LeaderBoard";

export const metadata: Metadata = {
  title: "League Leaders",
  description:
    "The Minecraft Baseball League's statistical leaders in batting and pitching, by season.",
  alternates: { canonical: "/statistics/leaders" },
};

export const dynamic = "force-dynamic";

type Row = Awaited<ReturnType<typeof getIndividualHistoricalStats>>[number];
type Board = {
  key: keyof Row;
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
};

const BATTING: Board[] = [
  { key: "battingAverage", label: "Batting average", unit: "AVG", rate: true, qualified: true },
  { key: "onBasePct", label: "On-base percentage", unit: "OBP", rate: true, qualified: true },
  { key: "sluggingPct", label: "Slugging", unit: "SLG", rate: true, qualified: true },
  { key: "ops", label: "OPS", unit: "OPS", rate: true, qualified: true },
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
];

const PITCHING: Board[] = [
  { key: "era", label: "ERA", unit: "ERA", ascending: true, decimals: 2, qualified: true },
  { key: "whip", label: "WHIP", unit: "WHIP", ascending: true, decimals: 2, qualified: true },
  {
    key: "strikeoutsPerGame",
    label: "Strikeouts per 6",
    unit: "SO/6",
    decimals: 2,
    qualified: true,
  },
  { key: "walksPerGame", label: "Fewest walks per 6", unit: "BB/6", ascending: true, decimals: 2, qualified: true },
  { key: "strikeoutsPitched", label: "Strikeouts", unit: "SO" },
  { key: "wins", label: "Wins", unit: "W" },
  { key: "saves", label: "Saves", unit: "SV" },
  { key: "inningsPitched", label: "Innings pitched", unit: "IP", decimals: 1 },
  { key: "completeGames", label: "Complete games", unit: "CG" },
  { key: "shutouts", label: "Shutouts", unit: "SHO" },
  { key: "pitchingGames", label: "Games pitched", unit: "G" },
  { key: "gamesStarted", label: "Games started", unit: "GS" },
];

const FIELDING: Board[] = [
  { key: "putouts", label: "Putouts", unit: "PO" },
  { key: "fieldingPct", label: "Fielding percentage", unit: "FPCT", rate: true, qualified: true },
];

function format(row: Row, board: Board) {
  const raw = row[board.key];
  if (raw === null || raw === undefined) return "-";
  const result = Number(raw);
  if (board.rate) return result.toFixed(3).replace(/^0/, "");
  if (board.decimals !== undefined) return result.toFixed(board.decimals);
  return String(Math.round(result));
}

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
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const seasons = await getHistoricalSeasons();
  const requested = (await searchParams).season;
  const season = seasons.find((row) => String(row.id) === requested) ?? seasons[0];
  if (!season) {
    return (
      <PageShell title="Leaders">
        <EmptyState>No seasons are available.</EmptyState>
      </PageShell>
    );
  }

  const [rows, standings, avatars] = await Promise.all([
    getIndividualHistoricalStats(season.id),
    getHistoricalSeasonStandings(season.id),
    getPlayerAvatars(),
  ]);

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
      boards: group(PITCHING, pitchers, qualifiedPitchers),
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
                <LeaderBoard
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
