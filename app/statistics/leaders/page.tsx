import { HistoricalTeamLink, PlayerProfileLink } from "@/app/EntityLinks";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { getHistoricalSeasons, getHistoricalSeasonStandings, getIndividualHistoricalStats } from "@/db/queries";
import { SeasonSelect } from "../SeasonSelect";

export const dynamic = "force-dynamic";

type Row = Awaited<ReturnType<typeof getIndividualHistoricalStats>>[number];
type Board = { key: keyof Row; label: string; ascending?: boolean; rate?: boolean };

const BATTING: Board[] = [
  { key: "battingAverage", label: "Batting average", rate: true },
  { key: "ops", label: "OPS", rate: true },
  { key: "homeRuns", label: "Home runs" },
  { key: "rbis", label: "RBI" },
  { key: "hits", label: "Hits" },
  { key: "stolenBases", label: "Stolen bases" },
];

const PITCHING: Board[] = [
  { key: "era", label: "ERA", ascending: true, rate: true },
  { key: "whip", label: "WHIP", ascending: true, rate: true },
  { key: "strikeoutsPitched", label: "Strikeouts" },
  { key: "wins", label: "Wins" },
  { key: "saves", label: "Saves" },
  { key: "inningsPitched", label: "Innings pitched" },
];

function value(row: Row, board: Board) {
  const result = Number(row[board.key] ?? 0);
  return board.rate ? result.toFixed(3).replace(/^0/, "") : result.toFixed(result % 1 ? 1 : 0);
}

function LeaderGroup({ boards, rows, seasonId, teamIds }: { boards: Board[]; rows: Row[]; seasonId: number; teamIds: Record<string, number> }) {
  return <div className="space-y-5">{boards.map((board) => {
    const leaders = [...rows].sort((a, b) => {
      const difference = Number(a[board.key] ?? 0) - Number(b[board.key] ?? 0);
      return board.ascending ? difference : -difference;
    }).slice(0, 5);
    return <section key={String(board.key)}>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{board.label}</h3>
      <div className="data-table-shell"><table className="data-table text-sm">
        <colgroup><col style={{ width: "9%" }} /><col style={{ width: "40%" }} /><col style={{ width: "35%" }} /><col style={{ width: "16%" }} /></colgroup>
        <thead><tr><th>#</th><th>Player</th><th>Team</th><th>{board.label}</th></tr></thead>
        <tbody>{leaders.map((row, index) => {
          const teamName = row.teamName.replace(/ \(\+\d+\)$/, "");
          return <tr key={row.playerName}><td className="text-slate-500">{index + 1}</td><td><PlayerProfileLink name={row.playerName} /></td><td className="text-slate-400">{teamIds[teamName] ? <HistoricalTeamLink name={row.teamName} seasonId={seasonId} teamId={teamIds[teamName]} /> : row.teamName}</td><td className="text-blue-400">{value(row, board)}</td></tr>;
        })}</tbody>
      </table></div>
    </section>;
  })}</div>;
}

export default async function LeadersPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const seasons = await getHistoricalSeasons();
  const requested = (await searchParams).season;
  const season = seasons.find((row) => String(row.id) === requested) ?? seasons[0];
  if (!season) return <PageShell title="Leaders"><EmptyState>No seasons are available.</EmptyState></PageShell>;

  const [rows, standings] = await Promise.all([getIndividualHistoricalStats(season.id), getHistoricalSeasonStandings(season.id)]);
  const batters = rows.filter((row) => (row.atBats ?? 0) > 0);
  const pitchers = rows.filter((row) => (row.inningsPitched ?? 0) > 0);
  const averageAtBats = batters.reduce((sum, row) => sum + Number(row.atBats ?? 0), 0) / Math.max(1, batters.length);
  const averageInnings = pitchers.reduce((sum, row) => sum + Number(row.inningsPitched ?? 0), 0) / Math.max(1, pitchers.length);
  const qualifiedBatters = batters.filter((row) => Number(row.atBats ?? 0) >= averageAtBats);
  const qualifiedPitchers = pitchers.filter((row) => Number(row.inningsPitched ?? 0) >= averageInnings);
  const teamIds = Object.fromEntries(standings.map((team) => [team.name, team.id]));

  return <PageShell wide title="Leaders" subtitle={`${season.name} qualified statistical leaders`}>
    <div className="mb-6"><SeasonSelect seasons={seasons} selected={String(season.id)} /></div>
    <div className="grid gap-8 xl:grid-cols-2">
      <section><div className="mb-4"><h2 className="text-lg font-bold">Batting leaders</h2><p className="text-xs text-slate-500">Minimum {averageAtBats.toFixed(1)} at bats (league average)</p></div><LeaderGroup boards={BATTING} rows={qualifiedBatters} seasonId={season.id} teamIds={teamIds} /></section>
      <section><div className="mb-4"><h2 className="text-lg font-bold">Pitching leaders</h2><p className="text-xs text-slate-500">Minimum {averageInnings.toFixed(1)} innings pitched (league average)</p></div><LeaderGroup boards={PITCHING} rows={qualifiedPitchers} seasonId={season.id} teamIds={teamIds} /></section>
    </div>
  </PageShell>;
}
