import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, PageShell } from "@/app/SiteNav";
import { getHistoricalSeason, getHistoricalSeasonPlayerStats, getHistoricalSeasonStandings } from "@/db/queries";
import { SeasonStatsTable } from "./SeasonStatsTable";
import { TeamLogo } from "@/app/TeamLogo";

export const dynamic = "force-dynamic";

export default async function SeasonPage({ params }: { params: Promise<{ seasonId: string }> }) {
  const { seasonId: value } = await params;
  const seasonId = Number(value);
  if (!Number.isInteger(seasonId)) notFound();
  const season = await getHistoricalSeason(seasonId);
  if (!season) notFound();

  const [standings, playerStats] = await Promise.all([
    getHistoricalSeasonStandings(seasonId),
    getHistoricalSeasonPlayerStats(seasonId),
  ]);
  const batters = playerStats.filter((row) => (row.atBats ?? 0) > 0).sort((a, b) => (b.battingAverage ?? 0) - (a.battingAverage ?? 0));
  const pitchers = playerStats.filter((row) => (row.inningsPitched ?? 0) > 0).sort((a, b) => (a.era ?? 99) - (b.era ?? 99));

  return (
    <PageShell title={season.name} subtitle={season.isPlayoffs ? "Playoffs" : "Regular season"}>
      <p className="mb-6 text-sm"><Link href="/seasons" className="text-white/50 hover:text-white">← All seasons</Link></p>
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">Standings</h2>
        {standings.length === 0 ? <EmptyState>No standings recorded for this season.</EmptyState> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[460px] border-collapse text-sm"><thead><tr className="border-b border-white/15 text-left text-xs uppercase tracking-wide text-white/50"><th className="py-2 pr-3">#</th><th className="py-2 pr-3">Team</th><th className="py-2 pr-3">Abbr.</th><th className="py-2 pr-3 text-right">W</th><th className="py-2 text-right">L</th></tr></thead><tbody>{standings.map((team, index) => <tr key={team.id} className="border-b border-white/5"><td className="py-2 pr-3 text-white/40">{index + 1}</td><td className="py-2 pr-3"><span className="flex items-center gap-3"><TeamLogo teamName={team.name} className="h-9 w-9" /><span>{team.name}</span></span></td><td className="py-2 pr-3 text-white/50">{team.abbreviation ?? "—"}</td><td className="py-2 pr-3 text-right font-semibold">{team.wins ?? "-"}</td><td className="py-2 text-right">{team.losses ?? "-"}</td></tr>)}</tbody></table></div>
        )}
      </section>
      <section className="mb-10"><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">Batting ({batters.length})</h2>{batters.length === 0 ? <EmptyState>No batting stats for this season.</EmptyState> : <SeasonStatsTable rows={batters} kind="batting" />}</section>
      <section><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">Pitching ({pitchers.length})</h2>{pitchers.length === 0 ? <EmptyState>No pitching stats for this season.</EmptyState> : <SeasonStatsTable rows={pitchers} kind="pitching" />}</section>
    </PageShell>
  );
}
