import { HistoricalTeamLink, PlayerProfileLink } from "@/app/EntityLinks";
import { EmptyState, PageShell, SectionHeader } from "@/app/SiteNav";
import { PlayerHead } from "@/app/PlayerHead";
import { TeamLogo } from "@/app/TeamLogo";
import {
  getHistoricalSeasons,
  getHistoricalSeasonStandings,
  getIndividualHistoricalStats,
  getPlayerAvatars,
} from "@/db/queries";
import { SeasonSelect } from "../SeasonSelect";

export const dynamic = "force-dynamic";

type Row = Awaited<ReturnType<typeof getIndividualHistoricalStats>>[number];
type Board = {
  key: keyof Row;
  label: string;
  /** The figures column heading - the front page names the stat there. */
  unit: string;
  ascending?: boolean;
  rate?: boolean;
};

const BATTING: Board[] = [
  { key: "battingAverage", label: "Batting average", unit: "AVG", rate: true },
  { key: "ops", label: "OPS", unit: "OPS", rate: true },
  { key: "homeRuns", label: "Home runs", unit: "HR" },
  { key: "rbis", label: "RBI", unit: "RBI" },
  { key: "hits", label: "Hits", unit: "H" },
  { key: "stolenBases", label: "Stolen bases", unit: "SB" },
];

const PITCHING: Board[] = [
  { key: "era", label: "ERA", unit: "ERA", ascending: true, rate: true },
  { key: "whip", label: "WHIP", unit: "WHIP", ascending: true, rate: true },
  { key: "strikeoutsPitched", label: "Strikeouts", unit: "SO" },
  { key: "wins", label: "Wins", unit: "W" },
  { key: "saves", label: "Saves", unit: "SV" },
  { key: "inningsPitched", label: "Innings pitched", unit: "IP" },
];

function value(row: Row, board: Board) {
  const result = Number(row[board.key] ?? 0);
  return board.rate ? result.toFixed(3).replace(/^0/, "") : result.toFixed(result % 1 ? 1 : 0);
}

function LeaderGroup({
  boards,
  rows,
  seasonId,
  teamIds,
  avatars,
}: {
  boards: Board[];
  rows: Row[];
  seasonId: number;
  teamIds: Record<string, number>;
  avatars: Record<string, string>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {boards.map((board) => {
        const leaders = [...rows]
          .sort((a, b) => {
            const difference = Number(a[board.key] ?? 0) - Number(b[board.key] ?? 0);
            return board.ascending ? difference : -difference;
          })
          .slice(0, 5);
        return (
          <div key={String(board.key)} className="data-table-shell">
            {/* Ranked, like the standings and the leaderboards on the front
                page, so a rank, a name and a figure line up across every card
                on the site rather than only within this one. */}
            <table className="data-table ranked w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: "2.75rem" }} />
                <col />
                <col style={{ width: "28%" }} />
                <col style={{ width: "20%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>RNK</th>
                  <th>{board.label}</th>
                  <th>Team</th>
                  <th>{board.unit}</th>
                </tr>
              </thead>
              <tbody>
                {leaders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-slate-600">
                      No data.
                    </td>
                  </tr>
                ) : (
                  leaders.map((row, index) => {
                    const teamName = row.teamName.replace(/ \(\+\d+\)$/, "");
                    return (
                      <tr key={row.playerName}>
                        <td>{index + 1}</td>
                        <td>
                          <span className="flex min-w-0 items-center gap-2">
                            <PlayerHead
                              uuid={avatars[row.playerName]}
                              name={row.playerName}
                              size={18}
                            />
                            <PlayerProfileLink name={row.playerName} className="truncate" />
                          </span>
                        </td>
                        <td>
                          <span className="flex min-w-0 items-center gap-1.5 text-slate-400">
                            <TeamLogo teamName={teamName} className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {teamIds[teamName] ? (
                                <HistoricalTeamLink
                                  name={teamName}
                                  seasonId={seasonId}
                                  teamId={teamIds[teamName]}
                                />
                              ) : (
                                teamName
                              )}
                            </span>
                          </span>
                        </td>
                        <td>{value(row, board)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export default async function LeadersPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const seasons = await getHistoricalSeasons();
  const requested = (await searchParams).season;
  const season = seasons.find((row) => String(row.id) === requested) ?? seasons[0];
  if (!season) return <PageShell title="Leaders"><EmptyState>No seasons are available.</EmptyState></PageShell>;

  const [rows, standings, avatars] = await Promise.all([
    getIndividualHistoricalStats(season.id),
    getHistoricalSeasonStandings(season.id),
    getPlayerAvatars(),
  ]);
  const batters = rows.filter((row) => (row.atBats ?? 0) > 0);
  const pitchers = rows.filter((row) => (row.inningsPitched ?? 0) > 0);
  const averageAtBats = batters.reduce((sum, row) => sum + Number(row.atBats ?? 0), 0) / Math.max(1, batters.length);
  const averageInnings = pitchers.reduce((sum, row) => sum + Number(row.inningsPitched ?? 0), 0) / Math.max(1, pitchers.length);
  const qualifiedBatters = batters.filter((row) => Number(row.atBats ?? 0) >= averageAtBats);
  const qualifiedPitchers = pitchers.filter((row) => Number(row.inningsPitched ?? 0) >= averageInnings);
  const teamIds = Object.fromEntries(standings.map((team) => [team.name, team.id]));

  return (
    <PageShell wide title="Leaders" subtitle={`${season.name} qualified statistical leaders`}>
      <div className="mb-6">
        <SeasonSelect seasons={seasons} selected={String(season.id)} />
      </div>
      <div className="space-y-6">
        <section>
          <SectionHeader
            title="Batting leaders"
            meta={`Minimum ${averageAtBats.toFixed(1)} at bats (league average)`}
          />
          <LeaderGroup
            boards={BATTING}
            rows={qualifiedBatters}
            seasonId={season.id}
            teamIds={teamIds}
            avatars={avatars}
          />
        </section>
        <section>
          <SectionHeader
            title="Pitching leaders"
            meta={`Minimum ${averageInnings.toFixed(1)} innings pitched (league average)`}
          />
          <LeaderGroup
            boards={PITCHING}
            rows={qualifiedPitchers}
            seasonId={season.id}
            teamIds={teamIds}
            avatars={avatars}
          />
        </section>
      </div>
    </PageShell>
  );
}
